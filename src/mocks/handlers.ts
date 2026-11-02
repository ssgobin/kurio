import { delay, http, HttpResponse, ws } from 'msw';
import { toSocketIo } from '@mswjs/socket.io-binding';
import { nfts, type Collection, type Network, type Nft } from './data';
import {
  activeCart, activePromoCode, bumpRequest, currentUserRecord, getScenario, hydrateCart, mergeGuestCartIntoUser, mutateDb,
  newId, publicDbSnapshot, readDb, resetDb, sessionRecord, sessionUser, setActiveCart, setActivePromoCode, setScenario, writeDb,
  type WalletRecord
} from './db';
import { formatEthUnits, multiplyEth, parseEth, percentOf, sumEth } from '../lib/eth';
import type { ApiErrorBody, CartResponse, MockScenario, NftListResponse, NftUpdatedPayload, OrderResponse, OrderUpdatedPayload, QuoteResponse, RealtimeEvent } from '../types/api';

type SocketIoClient=ReturnType<typeof toSocketIo>['client'];
const socketLink=ws.link('ws://kurio.local');
const socketClients=new Set<SocketIoClient>();
const json=<T>(body:T,init?:ResponseInit)=>HttpResponse.json(body as never,init);
const error=(message:string,status:number,code:ApiErrorBody['code'],fields?:Record<string,string>)=>json<ApiErrorBody>({message,code,fields},{status});
const required=(value:unknown)=>typeof value==='string'&&value.trim().length>0;
const nowIso=()=>new Date().toISOString();

async function hashPassword(salt:string,password:string){
  const bytes=new TextEncoder().encode(`${salt}:${password}`);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('');
}
function liveNft(id:string):Nft|undefined{const base=nfts.find(n=>n.id===id);const live=readDb().catalog[id];return base&&live?{...base,...live}:undefined}
function requireUser(){return currentUserRecord()}
async function networkDelay(request?:Request){
  const scenario=getScenario();
  if(scenario==='slow'){await delay(900);return}
  if(scenario==='out-of-order'){
    const count=bumpRequest();
    await delay(count%2===0?80:650);return;
  }
  if(request?.url.includes('/nfts'))await delay(140);
  else await delay(80);
}
function cartResponse():CartResponse{return {items:hydrateCart(),promoCode:activePromoCode(),updatedAt:nowIso()}}
function cartVersion(items=hydrateCart()){return items.map(i=>`${i.id}:${i.quantity}:${i.nftVersion}:${i.nft.price}`).sort().join('|')||'empty'}
function promoFor(code?:string|null){
  const normalized=(code??'').trim().toUpperCase();
  if(!normalized)return null;
  if(normalized==='KURIO10')return {code:normalized,label:'10% de desconto',discountBasisPoints:1000};
  if(normalized==='GENESIS5')return {code:normalized,label:'5% de desconto',discountBasisPoints:500};
  if(normalized==='EXPIRED')throw Object.assign(new Error('Cupom expirado.'),{status:410,code:'VALIDATION_ERROR'});
  throw Object.assign(new Error('Código promocional inválido.'),{status:404,code:'NOT_FOUND'});
}
function buildQuote(promoCode?:string|null):QuoteResponse{
  const items=hydrateCart();
  const promo=promoFor(promoCode===undefined?activePromoCode():promoCode);
  const lineUnits=items.map(i=>multiplyEth(i.nft.price,i.quantity));
  const subtotalUnits=sumEth(lineUnits);
  const discountUnits=promo?percentOf(subtotalUnits,promo.discountBasisPoints):0n;
  const feeUnits=items.length?parseEth('0.016'):0n;
  const totalUnits=subtotalUnits-discountUnits+feeUnits;
  const stale=items.some(i=>i.changed||i.quantity>i.nft.available);
  const version=cartVersion(items);
  return {
    id:`quote:${version}:${promo?.code??'none'}`,
    cartVersion:version,
    subtotal:formatEthUnits(subtotalUnits,3),discount:formatEthUnits(discountUnits,3),networkFee:formatEthUnits(feeUnits,3),total:formatEthUnits(totalUnits,3),promo,
    items:items.map(i=>({cartItemId:i.id,nftId:i.nftId,quantity:i.quantity,unitPrice:i.nft.price,available:i.nft.available,nftVersion:i.nft.version})),
    stale,expiresAt:new Date(Date.now()+30_000).toISOString()
  };
}
function emitEvent<T>(eventName:'nft.updated'|'order.updated',event:RealtimeEvent<T>){for(const client of socketClients)client.emit(eventName,event)}
function emitNftUpdated(id:string){const nft=liveNft(id);if(!nft)return;emitEvent<NftUpdatedPayload>('nft.updated',{eventId:newId('evt'),resourceId:id,version:nft.version,occurredAt:nowIso(),sessionId:null,userId:null,payload:{price:nft.price,available:nft.available,edition:nft.edition}})}
function emitOrderUpdated(order:OrderResponse,userId:string,sessionId:string|null){emitEvent<OrderUpdatedPayload>('order.updated',{eventId:newId('evt'),resourceId:order.id,version:order.version,occurredAt:nowIso(),sessionId,userId,payload:{status:order.status,tx:order.tx,rejectionReason:order.rejectionReason}})}
function removePurchasedItems(userId:string,order:OrderResponse){mutateDb(db=>{const user=db.users.find(u=>u.id===userId);if(!user)return;for(const bought of order.receipt.items){const line=user.cart.find(i=>i.nftId===bought.nftId&&i.edition===bought.edition);if(!line)continue;line.quantity-=bought.quantity;if(line.quantity<=0)user.cart=user.cart.filter(i=>i.id!==line.id)}})}
function resolveOrderIfDue(orderId:string,userId:string,sessionId:string|null){
  let updated:OrderResponse|undefined;
  mutateDb(db=>{const user=db.users.find(u=>u.id===userId);const order=user?.orders.find(o=>o.id===orderId);if(!order||order.status!=='pending'||!order.resolveAt||Date.parse(order.resolveAt)>Date.now())return;const reject=order.resolution==='rejected';order.status=reject?'rejected':'confirmed';order.version+=1;order.updatedAt=nowIso();if(reject)order.rejectionReason='Pagamento recusado pela rede simulada.';else order.tx=`0xKURIO${Math.random().toString(16).slice(2,14).toUpperCase()}`;updated={...order,receipt:{...order.receipt,items:order.receipt.items.map(i=>({...i}))}}});
  if(updated){if(updated.status==='confirmed')removePurchasedItems(userId,updated);emitOrderUpdated(updated,userId,sessionId)}
}
function scheduleOrderResolution(orderId:string,userId:string,sessionId:string|null){
  setTimeout(()=>resolveOrderIfDue(orderId,userId,sessionId),900);
}
function parsePage(value:string|null,fallback:number){const n=Number(value);return Number.isInteger(n)&&n>0?n:fallback}

export const handlers=[
  http.get('/api/nfts',async({request})=>{
    await networkDelay(request);const scenario=getScenario();if(scenario==='network-error')return error('Serviço de catálogo temporariamente indisponível.',503,'NETWORK_ERROR');const url=new URL(request.url);
    const search=(url.searchParams.get('search')??'').trim().toLowerCase();const collection=url.searchParams.get('collection') as Collection|null;const network=url.searchParams.get('network') as Network|null;
    const minPrice=url.searchParams.get('minPrice');const maxPrice=url.searchParams.get('maxPrice');const tab=url.searchParams.get('tab')??'all';const sort=url.searchParams.get('sort')??'recent';const page=parsePage(url.searchParams.get('page'),1);const pageSize=Math.min(12,parsePage(url.searchParams.get('pageSize'),6));
    let result=scenario==='empty-market'?[]:nfts.map(n=>liveNft(n.id)!).filter(Boolean);
    result=result.filter(n=>(!search||`${n.name} ${n.collection} ${n.network}`.toLowerCase().includes(search))&&(!collection||n.collection===collection)&&(!network||n.network===network)&&(!minPrice||parseEth(n.price)>=parseEth(minPrice))&&(!maxPrice||parseEth(n.price)<=parseEth(maxPrice)));
    if(tab==='new')result=result.filter(n=>Date.parse(n.createdAt)>=Date.parse('2026-10-27T00:00:00Z'));
    if(tab==='trending')result=[...result].sort((a,b)=>b.popularity-a.popularity);else if(sort==='price-asc')result=[...result].sort((a,b)=>Number(a.price)-Number(b.price));else if(sort==='price-desc')result=[...result].sort((a,b)=>Number(b.price)-Number(a.price));else result=[...result].sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
    const total=result.length,totalPages=Math.max(1,Math.ceil(total/pageSize)),safePage=Math.min(page,totalPages),start=(safePage-1)*pageSize;
    return json<NftListResponse>({items:result.slice(start,start+pageSize),page:safePage,pageSize,total,totalPages});
  }),
  http.get('/api/nfts/:id',async({params})=>{await networkDelay();const nft=liveNft(String(params.id));return nft?json(nft):error('NFT não encontrado.',404,'NOT_FOUND')}),

  http.post('/api/auth/login',async({request})=>{await networkDelay();const body=await request.json() as {email?:string;password?:string};if(!required(body.email)||!required(body.password))return error('Informe e-mail e senha.',422,'VALIDATION_ERROR',{email:'Obrigatório',password:'Obrigatório'});const db=readDb();const user=db.users.find(u=>u.email.toLowerCase()===body.email!.trim().toLowerCase());if(!user||await hashPassword(user.salt,body.password!)!==user.passwordHash)return error('E-mail ou senha inválidos.',401,'UNAUTHORIZED');const sessionId=newId('session');db.session={userId:user.id,sessionId,token:newId('token'),expiresAt:new Date(Date.now()+60*60_000).toISOString()};writeDb(db);mergeGuestCartIntoUser(user);return json({user:{id:user.id,email:user.email,username:user.username},expiresAt:readDb().session!.expiresAt,sessionId});}),
  http.post('/api/auth/register',async({request})=>{await networkDelay();const body=await request.json() as {user?:string;email?:string;password?:string;confirmPassword?:string};const fields:Record<string,string>={};if(!required(body.user))fields.user='Informe o nome de usuário.';if(!/^\S+@\S+\.\S+$/.test(body.email??''))fields.email='Informe um e-mail válido.';if((body.password?.length??0)<8)fields.password='Use pelo menos 8 caracteres.';if(body.password!==body.confirmPassword)fields.confirmPassword='As senhas não coincidem.';if(Object.keys(fields).length)return error('Revise os campos informados.',422,'VALIDATION_ERROR',fields);const db=readDb();if(db.users.some(u=>u.email.toLowerCase()===body.email!.toLowerCase()))return error('Já existe uma conta com este e-mail.',409,'CONFLICT',{email:'E-mail já cadastrado.'});const id=newId('user'),salt=newId('salt'),passwordHash=await hashPassword(salt,body.password!);const email=body.email!.trim(),username=body.user!.trim();const user={id,email,username,salt,passwordHash,profile:{displayName:username,username,email,ens:'',walletAlias:''},wallets:[],favorites:[],cart:[],orders:[],promoCode:null};db.users.push(user);db.session={userId:id,sessionId:newId('session'),token:newId('token'),expiresAt:new Date(Date.now()+60*60_000).toISOString()};writeDb(db);mergeGuestCartIntoUser(user);return json({user:{id,email,username},expiresAt:readDb().session!.expiresAt,sessionId:readDb().session!.sessionId},{status:201});}),
  http.post('/api/auth/forgot',async({request})=>{await networkDelay();const body=await request.json() as {email?:string};if(!required(body.email))return error('Informe seu e-mail.',422,'VALIDATION_ERROR',{email:'Obrigatório'});return json({ok:true,message:'Se o e-mail existir, as instruções de recuperação foram enviadas (simulação).'})}),
  http.get('/api/session',()=>{if(getScenario()==='expired-session')mutateDb(db=>{if(db.session)db.session.expiresAt=new Date(Date.now()-1).toISOString()});const user=sessionUser(),session=sessionRecord();return user&&session?json({user,expiresAt:session.expiresAt,sessionId:session.sessionId}):error('Sessão inválida ou expirada.',401,'SESSION_EXPIRED')}),
  http.post('/api/auth/logout',()=>{mutateDb(db=>{db.session=null});return json({ok:true})}),

  http.get('/api/profile',()=>{const u=requireUser();return u?json(u.profile):error('Sessão necessária.',401,'UNAUTHORIZED')}),
  http.put('/api/profile',async({request})=>{const user=requireUser();if(!user)return error('Sessão necessária.',401,'UNAUTHORIZED');const body=await request.json() as Partial<typeof user.profile>;const fields:Record<string,string>={};if(!required(body.displayName))fields.displayName='Obrigatório.';if(!required(body.username))fields.username='Obrigatório.';if(!/^\S+@\S+\.\S+$/.test(body.email??''))fields.email='E-mail inválido.';if(Object.keys(fields).length)return error('Revise os dados do perfil.',422,'VALIDATION_ERROR',fields);Object.assign(user.profile,body);writeDb(readDb());return json(user.profile)}),
  http.put('/api/profile/password',async({request})=>{const user=requireUser();if(!user)return error('Sessão necessária.',401,'UNAUTHORIZED');const body=await request.json() as {current?:string;next?:string;confirm?:string};if(await hashPassword(user.salt,body.current??'')!==user.passwordHash)return error('Senha atual incorreta.',422,'VALIDATION_ERROR',{current:'Senha atual incorreta.'});if((body.next?.length??0)<8)return error('A nova senha precisa ter pelo menos 8 caracteres.',422,'VALIDATION_ERROR',{next:'Mínimo de 8 caracteres.'});if(body.next!==body.confirm)return error('A confirmação da nova senha não confere.',422,'VALIDATION_ERROR',{confirm:'Senhas diferentes.'});user.passwordHash=await hashPassword(user.salt,body.next!);writeDb(readDb());return json({ok:true})}),

  http.post('/api/wallets/connect',async({request})=>{const user=requireUser();if(!user)return error('Sessão necessária.',401,'UNAUTHORIZED');const body=await request.json() as {walletId?:string;provider?:string};if(getScenario()==='wallet-rejected')return error('A conexão com a carteira foi recusada na simulação.',409,'CONFLICT');if(!user.wallets.some(w=>w.id===body.walletId))return error('Carteira não encontrada.',404,'NOT_FOUND');if(!required(body.provider))return error('Selecione um provedor.',422,'VALIDATION_ERROR');await delay(180);return json({connected:true,walletId:body.walletId,provider:body.provider})}),
  http.get('/api/wallets',()=>{const u=requireUser();return u?json(u.wallets):error('Sessão necessária.',401,'UNAUTHORIZED')}),
  http.post('/api/wallets',async({request})=>{const user=requireUser();if(!user)return error('Sessão necessária.',401,'UNAUTHORIZED');const body=await request.json() as Partial<WalletRecord>;if(!required(body.label)||!required(body.address)||!required(body.network)||!required(body.type))return error('Preencha os dados obrigatórios da carteira.',422,'VALIDATION_ERROR');const wallet:WalletRecord={id:newId('wallet'),label:body.label!,alias:body.alias||body.label!,network:body.network!,profileName:body.profileName||user.profile.displayName,address:body.address!,secondaryAddress:body.secondaryAddress||'',type:body.type!,referralCode:body.referralCode||'',email:body.email||user.email,ens:body.ens||'',primary:Boolean(body.primary)||!user.wallets.length};if(wallet.primary)user.wallets.forEach(w=>w.primary=false);user.wallets.push(wallet);writeDb(readDb());return json(wallet,{status:201})}),
  http.put('/api/wallets/:id',async({params,request})=>{const user=requireUser();if(!user)return error('Sessão necessária.',401,'UNAUTHORIZED');const wallet=user.wallets.find(w=>w.id===params.id);if(!wallet)return error('Carteira não encontrada.',404,'NOT_FOUND');const body=await request.json() as Partial<WalletRecord>;if(body.primary)user.wallets.forEach(w=>w.primary=false);Object.assign(wallet,body,{id:wallet.id});writeDb(readDb());return json(wallet)}),
  http.delete('/api/wallets/:id',({params})=>{const user=requireUser();if(!user)return error('Sessão necessária.',401,'UNAUTHORIZED');const wallet=user.wallets.find(w=>w.id===params.id);if(!wallet)return error('Carteira não encontrada.',404,'NOT_FOUND');if(wallet.primary&&user.wallets.length>1)return error('Defina outra carteira principal antes de remover esta.',409,'CONFLICT');user.wallets=user.wallets.filter(w=>w.id!==params.id);writeDb(readDb());return json({ok:true})}),

  http.get('/api/favorites',()=>{const user=requireUser();return user?json(user.favorites.map(id=>liveNft(id)).filter(Boolean)):error('Sessão necessária.',401,'UNAUTHORIZED')}),
  http.post('/api/favorites/:id',({params})=>{const user=requireUser();if(!user)return error('Sessão necessária.',401,'UNAUTHORIZED');if(getScenario()==='favorite-failure')return error('Falha transitória ao atualizar favorito.',503,'NETWORK_ERROR');const id=String(params.id);if(!liveNft(id))return error('NFT não encontrado.',404,'NOT_FOUND');if(!user.favorites.includes(id))user.favorites.push(id);writeDb(readDb());return json({favorite:true})}),
  http.delete('/api/favorites/:id',({params})=>{const user=requireUser();if(!user)return error('Sessão necessária.',401,'UNAUTHORIZED');if(getScenario()==='favorite-failure')return error('Falha transitória ao atualizar favorito.',503,'NETWORK_ERROR');user.favorites=user.favorites.filter(id=>id!==String(params.id));writeDb(readDb());return json({favorite:false})}),

  http.get('/api/cart',async()=>{await networkDelay();return json(cartResponse())}),
  http.post('/api/cart/items',async({request})=>{const body=await request.json() as {nftId?:string;edition?:string;quantity?:number};const nft=body.nftId?liveNft(body.nftId):undefined;if(!nft)return error('NFT não encontrado.',404,'NOT_FOUND');const quantity=Math.max(1,Math.trunc(body.quantity??1));if(quantity>nft.available)return error('Quantidade indisponível.',409,'OUT_OF_STOCK');const items=activeCart();const found=items.find(i=>i.nftId===nft.id&&i.edition===(body.edition||nft.edition));if(found)found.quantity=Math.min(nft.available,found.quantity+quantity);else items.push({id:newId('cart'),nftId:nft.id,edition:body.edition||nft.edition,quantity,priceSnapshot:nft.price,nftVersion:nft.version});setActiveCart(items);return json(cartResponse(),{status:201})}),
  http.put('/api/cart/items/:id',async({params,request})=>{const body=await request.json() as {quantity?:number};const items=activeCart();const item=items.find(i=>i.id===params.id);if(!item)return error('Item do carrinho não encontrado.',404,'NOT_FOUND');const nft=liveNft(item.nftId)!;const quantity=Math.trunc(body.quantity??item.quantity);if(quantity<=0){setActiveCart(items.filter(i=>i.id!==item.id));return json(cartResponse())}if(quantity>nft.available)return error('Quantidade indisponível.',409,'OUT_OF_STOCK');item.quantity=quantity;setActiveCart(items);return json(cartResponse())}),
  http.delete('/api/cart/items/:id',({params})=>{const items=activeCart();if(!items.some(i=>i.id===params.id))return error('Item do carrinho não encontrado.',404,'NOT_FOUND');setActiveCart(items.filter(i=>i.id!==params.id));return json(cartResponse())}),
  http.post('/api/cart/revalidate',()=>{const items=activeCart();for(const item of items){const nft=liveNft(item.nftId);if(!nft)continue;if(item.quantity>nft.available)return error(`${nft.name} não possui mais quantidade suficiente.`,409,'OUT_OF_STOCK');item.priceSnapshot=nft.price;item.nftVersion=nft.version}setActiveCart(items);return json(cartResponse())}),
  http.post('/api/cart/promo',async({request})=>{const body=await request.json() as {code?:string};try{const promo=promoFor(body.code);if(!promo)return error('Digite um código promocional.',422,'VALIDATION_ERROR');setActivePromoCode(promo.code);return json({promo,cart:cartResponse()})}catch(e){const err=e as Error&{status?:number;code?:ApiErrorBody['code']};return error(err.message,err.status??400,err.code??'VALIDATION_ERROR')}}),
  http.delete('/api/cart/promo',()=>{setActivePromoCode(null);return json(cartResponse())}),
  http.post('/api/quote',async({request})=>{await networkDelay();if(getScenario()==='price-change'){const first=activeCart()[0];if(first){mutateDb(db=>{const live=db.catalog[first.nftId];live.price=formatEthUnits(parseEth(live.price)+parseEth('0.10'),2);live.version+=1});emitNftUpdated(first.nftId)}setScenario('default')}const body=await request.json() as {promoCode?:string|null};try{return json(buildQuote(body.promoCode))}catch(e){const err=e as Error&{status?:number;code?:ApiErrorBody['code']};return error(err.message,err.status??400,err.code??'VALIDATION_ERROR')}}),

  http.post('/api/orders',async({request})=>{const user=requireUser(),session=sessionRecord();if(!user||!session)return error('Sessão necessária para finalizar a compra.',401,'UNAUTHORIZED');const key=request.headers.get('Idempotency-Key');if(!key)return error('Chave de idempotência obrigatória.',422,'VALIDATION_ERROR');const body=await request.json() as {quoteId?:string;walletId?:string;provider?:string;promoCode?:string|null;collector?:{name?:string;email?:string}};if(!required(body.collector?.name)||!/^\S+@\S+\.\S+$/.test(body.collector?.email??''))return error('Revise os dados do colecionador.',422,'VALIDATION_ERROR',{name:'Obrigatório',email:'E-mail inválido'});const payloadHash=JSON.stringify(body);const db=readDb(),existing=db.idempotency[key];if(existing){if(existing.userId!==user.id||existing.payloadHash!==payloadHash)return error('Chave de idempotência reutilizada com conteúdo diferente.',409,'IDEMPOTENCY_CONFLICT');const order=user.orders.find(o=>o.id===existing.orderId);return order?json(order):error('Pedido idempotente não encontrado.',404,'NOT_FOUND')}
    const wallet=user.wallets.find(w=>w.id===body.walletId);if(!wallet)return error('Selecione uma carteira válida.',422,'VALIDATION_ERROR');let quote:QuoteResponse;try{quote=buildQuote(body.promoCode)}catch(e){return error((e as Error).message,422,'VALIDATION_ERROR')}if(body.quoteId!==quote.id||quote.stale)return error('A cotação mudou. Revise os novos valores antes de confirmar.',409,'QUOTE_STALE');const items=hydrateCart();if(!items.length)return error('Seu carrinho está vazio.',422,'VALIDATION_ERROR');if(items.some(i=>i.quantity>i.nft.available))return error('Uma edição ficou indisponível.',409,'OUT_OF_STOCK');
    const order:OrderResponse={id:newId('order'),status:'pending',version:1,idempotencyKey:key,createdAt:nowIso(),updatedAt:nowIso(),walletId:wallet.id,network:wallet.network,provider:body.provider||wallet.type,tx:null,resolveAt:new Date(Date.now()+900).toISOString(),resolution:getScenario()==='payment-rejected'?'rejected':'confirmed',receipt:{items:items.map(i=>({nftId:i.nftId,name:i.nft.name,edition:i.edition,quantity:i.quantity,unitPrice:i.nft.price,lineTotal:formatEthUnits(multiplyEth(i.nft.price,i.quantity),3)})),subtotal:quote.subtotal,discount:quote.discount,networkFee:quote.networkFee,total:quote.total,promoCode:quote.promo?.code??null}};user.orders.unshift(order);db.idempotency[key]={userId:user.id,payloadHash,orderId:order.id};writeDb(db);scheduleOrderResolution(order.id,user.id,session.sessionId);if(getScenario()==='order-timeout'){await delay(450);return error('Timeout após a criação do pedido. Reenvie com a mesma chave para recuperar o pedido.',504,'ORDER_TIMEOUT')}return json(order,{status:202});
  }),
  http.get('/api/orders/:id',({params})=>{const user=requireUser(),session=sessionRecord();if(!user)return error('Sessão necessária.',401,'UNAUTHORIZED');resolveOrderIfDue(String(params.id),user.id,session?.sessionId??null);const order=user.orders.find(o=>o.id===params.id);return order?json(order):error('Pedido não encontrado.',404,'NOT_FOUND')}),
  http.get('/api/orders/by-idempotency/:key',({params})=>{const user=requireUser(),session=sessionRecord();if(!user)return error('Sessão necessária.',401,'UNAUTHORIZED');const ref=readDb().idempotency[String(params.key)];if(!ref||ref.userId!==user.id)return error('Pedido não encontrado.',404,'NOT_FOUND');resolveOrderIfDue(ref.orderId,user.id,session?.sessionId??null);const order=user.orders.find(o=>o.id===ref.orderId);return order?json(order):error('Pedido não encontrado.',404,'NOT_FOUND')}),

  http.post('/api/mock/reset',()=>{resetDb();return json({ok:true})}),
  http.get('/api/mock/scenario',()=>json({scenario:getScenario()})),
  http.post('/api/mock/scenario',async({request})=>{const body=await request.json() as {scenario?:MockScenario};const allowed:MockScenario[]=['default','slow','out-of-order','empty-market','favorite-failure','expired-session','price-change','order-timeout','payment-rejected','network-error','wallet-rejected'];if(!body.scenario||!allowed.includes(body.scenario))return error('Cenário inválido.',422,'VALIDATION_ERROR');setScenario(body.scenario);return json({scenario:body.scenario})}),
  http.post('/api/mock/session/expire',()=>{mutateDb(db=>{if(db.session)db.session.expiresAt=new Date(Date.now()-1000).toISOString()});return json({ok:true})}),
  http.post('/api/mock/realtime/nft/:id',async({params,request})=>{const id=String(params.id),current=readDb().catalog[id];if(!current)return error('NFT não encontrado.',404,'NOT_FOUND');const body=await request.json() as {price?:string;available?:number;version?:number};if(body.version!==undefined&&body.version<=current.version){emitEvent<NftUpdatedPayload>('nft.updated',{eventId:newId('evt'),resourceId:id,version:body.version,occurredAt:nowIso(),sessionId:null,userId:null,payload:{price:body.price??current.price,available:body.available??current.available,edition:nfts.find(n=>n.id===id)?.edition??'1/1'}});return json(liveNft(id))}mutateDb(db=>{const state=db.catalog[id];state.price=body.price??state.price;state.available=body.available??state.available;state.version=body.version??state.version+1});emitNftUpdated(id);return json(liveNft(id))}),
  http.post('/api/mock/realtime/order/:id',async({params,request})=>{const user=requireUser(),session=sessionRecord();if(!user||!session)return error('Sessão necessária.',401,'UNAUTHORIZED');const order=user.orders.find(o=>o.id===params.id);if(!order)return error('Pedido não encontrado.',404,'NOT_FOUND');const body=await request.json() as {version?:number;status?:OrderResponse['status']};const version=body.version??order.version;emitEvent<OrderUpdatedPayload>('order.updated',{eventId:newId('evt'),resourceId:order.id,version,occurredAt:nowIso(),sessionId:session.sessionId,userId:user.id,payload:{status:body.status??order.status,tx:order.tx,rejectionReason:order.rejectionReason}});return json({ok:true})}),
  http.get('/api/mock/debug',()=>json(publicDbSnapshot())),

  socketLink.addEventListener('connection',(connection)=>{const io=toSocketIo(connection);socketClients.add(io.client);io.client.emit('mock.ready',{connectedAt:nowIso()});connection.client.addEventListener('close',()=>socketClients.delete(io.client))})
];
