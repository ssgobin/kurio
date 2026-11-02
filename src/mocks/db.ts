import { nfts, type Network } from './data';
import type { CartItem, MockScenario, OrderResponse, SessionUser } from '../types/api';

export type Profile = {
  displayName: string;
  username: string;
  email: string;
  ens: string;
  walletAlias: string;
  avatar?: string;
};

export type WalletRecord = {
  id: string;
  label: string;
  alias: string;
  network: Network;
  profileName: string;
  address: string;
  secondaryAddress?: string;
  type: 'MetaMask'|'Coinbase Wallet'|'WalletConnect';
  referralCode: string;
  email: string;
  ens: string;
  primary: boolean;
};

export type StoredCartItem = { id:string; nftId:string; edition:string; quantity:number; priceSnapshot:string; nftVersion:number };
type UserRecord = {
  id: string;
  email: string;
  username: string;
  salt: string;
  passwordHash: string;
  profile: Profile;
  wallets: WalletRecord[];
  favorites: string[];
  cart: StoredCartItem[];
  orders: OrderResponse[];
  promoCode: string | null;
};

type SessionRecord = { userId:string; sessionId:string; token:string; expiresAt:string } | null;
type CatalogState = Record<string,{price:string;available:number;version:number}>;
type IdempotencyRecord = { userId:string; payloadHash:string; orderId:string };

type DB = {
  users: UserRecord[];
  session: SessionRecord;
  guestCart: StoredCartItem[];
  guestPromoCode: string | null;
  catalog: CatalogState;
  idempotency: Record<string,IdempotencyRecord>;
  scenario: MockScenario;
  requestCounter: number;
};

const DB_KEY='kurio-mock-db-v6';
const primaryWallet:WalletRecord={id:'wallet-principal',label:'Principal',alias:'Principal',network:'Ethereum',profileName:'Kurio Collector',address:'0xA91F...E82C',secondaryAddress:'',type:'Coinbase Wallet',referralCode:'KURIO',email:'contato@email.com',ens:'collector',primary:true};
const reserveWallet:WalletRecord={id:'wallet-reserva',label:'Reserva',alias:'Reserva',network:'Polygon',profileName:'Kurio Collector',address:'0xB21D...91AF',secondaryAddress:'nova.kurio.eth',type:'WalletConnect',referralCode:'KURIO',email:'contato@email.com',ens:'nova',primary:false};
const initialCart:StoredCartItem[]=[
  {id:'cart-emerald',nftId:'emerald-ape-042',edition:'1/50',quantity:1,priceSnapshot:'1.19',nftVersion:1},
  {id:'cart-violet',nftId:'violet-nomad-314',edition:'1/1',quantity:1,priceSnapshot:'1.39',nftVersion:1},
  {id:'cart-ivory',nftId:'ivory-baron-088',edition:'1/10',quantity:2,priceSnapshot:'1.79',nftVersion:1},
  {id:'cart-golden',nftId:'golden-beat-207',edition:'1/50',quantity:2,priceSnapshot:'0.99',nftVersion:1},
];

const initial:DB={
  users:[
    {id:'user-demo',email:'contato@email.com',username:'collector',salt:'kurio-demo-salt',passwordHash:'862e9ddc0931b6f968e3e9f424dd450b31c80c5b1456370c0ecaf63f1aee407a',profile:{displayName:'Kurio Collector',username:'collector',email:'contato@email.com',ens:'nova',walletAlias:'Principal'},wallets:[reserveWallet,primaryWallet],favorites:['emerald-ape-042'],cart:[],orders:[],promoCode:null},
    {id:'user-alt',email:'outro@email.com',username:'galaxy',salt:'kurio-alt-salt',passwordHash:'432bf6838afb890ae103717f241e1b76620ca7bc73e10dd4b8adc8233a24dac8',profile:{displayName:'Galaxy Collector',username:'galaxy',email:'outro@email.com',ens:'galaxy',walletAlias:'Main'},wallets:[{...primaryWallet,id:'wallet-alt',label:'Galaxy Main',alias:'Galaxy',profileName:'Galaxy Collector',address:'0x2222...BEEF',email:'outro@email.com',ens:'galaxy'}],favorites:['cosmic-bloom-118'],cart:[],orders:[],promoCode:null}
  ],
  session:null,
  guestCart:initialCart,
  guestPromoCode:null,
  catalog:Object.fromEntries(nfts.map(n=>[n.id,{price:n.price,available:n.available,version:n.version}])),
  idempotency:{},scenario:'default',requestCounter:0
};

let memory:DB|null=null;
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
const canStore=()=>typeof localStorage!=='undefined';

export function readDb():DB{
  if(memory)return memory;
  if(canStore()){
    try{const raw=localStorage.getItem(DB_KEY);if(raw){memory=JSON.parse(raw) as DB;return memory}}catch{memory=null}
  }
  memory=clone(initial);return memory;
}
export function writeDb(db:DB){memory=db;if(canStore()){try{localStorage.setItem(DB_KEY,JSON.stringify(db))}catch{/* storage may be unavailable */}}}
export function mutateDb<T>(fn:(db:DB)=>T):T{const db=readDb();const result=fn(db);writeDb(db);return result}
export function resetDb(){memory=clone(initial);writeDb(memory)}
export function newId(prefix:string){return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}
export function currentUserRecord(){const db=readDb();if(!db.session)return null;if(Date.parse(db.session.expiresAt)<=Date.now()){db.session=null;writeDb(db);return null}return db.users.find(u=>u.id===db.session!.userId)??null}
export function sessionUser():SessionUser|null{const u=currentUserRecord();return u?{id:u.id,email:u.email,username:u.username}:null}
export function sessionRecord(){currentUserRecord();return readDb().session}
export function requireUserRecord(){return currentUserRecord()}
export function activeCart(){const user=currentUserRecord();return user?user.cart:readDb().guestCart}
export function setActiveCart(items:StoredCartItem[]){mutateDb(db=>{const user=db.session?db.users.find(u=>u.id===db.session!.userId):null;if(user)user.cart=items;else db.guestCart=items})}
export function hydrateCart():CartItem[]{const db=readDb();return activeCart().flatMap(item=>{const base=nfts.find(n=>n.id===item.nftId);const live=db.catalog[item.nftId];if(!base||!live)return[];const nft={...base,price:live.price,available:live.available,version:live.version};return [{...item,nft,changed:item.priceSnapshot!==live.price||item.nftVersion!==live.version}]})}
export function mergeGuestCartIntoUser(user:UserRecord){const db=readDb();for(const guest of db.guestCart){const found=user.cart.find(i=>i.nftId===guest.nftId&&i.edition===guest.edition);if(found)found.quantity=Math.min(99,found.quantity+guest.quantity);else user.cart.push({...guest,id:newId('cart')})}db.guestCart=[];if(!user.promoCode&&db.guestPromoCode)user.promoCode=db.guestPromoCode;db.guestPromoCode=null;writeDb(db)}
export function activePromoCode(){const user=currentUserRecord();return user?user.promoCode:readDb().guestPromoCode}
export function setActivePromoCode(code:string|null){mutateDb(db=>{const user=db.session?db.users.find(u=>u.id===db.session!.userId):null;if(user)user.promoCode=code;else db.guestPromoCode=code})}
export function setScenario(scenario:MockScenario){mutateDb(db=>{db.scenario=scenario})}
export function getScenario(){return readDb().scenario}
export function bumpRequest(){return mutateDb(db=>++db.requestCounter)}
export function publicDbSnapshot(){const db=readDb();return {scenario:db.scenario,session:db.session,guestCart:db.guestCart,users:db.users.map(u=>({id:u.id,email:u.email,username:u.username,profile:u.profile,wallets:u.wallets,favorites:u.favorites,cart:u.cart,orders:u.orders}))}}
