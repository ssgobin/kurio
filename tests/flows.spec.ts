import {test,expect,type Page,type TestInfo} from '@playwright/test';

type Scenario='default'|'slow'|'out-of-order'|'empty-market'|'favorite-failure'|'expired-session'|'price-change'|'order-timeout'|'payment-rejected'|'network-error'|'wallet-rejected';

async function resetApp(page:Page){
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-kurio-mocks','ready');
  await page.evaluate(async()=>{localStorage.clear();sessionStorage.clear();await fetch('/api/mock/reset',{method:'POST'})});
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-kurio-app','ready');
  await expect.poll(async()=>page.evaluate(()=>document.documentElement.dataset.kurioSocket)).toBe('connected');
}
async function scenario(page:Page,value:Scenario){await expect(page.locator('html')).toHaveAttribute('data-kurio-mocks','ready');await page.evaluate(async value=>{await fetch('/api/mock/scenario',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario:value})})},value)}
const mobile=(info:TestInfo)=>info.project.name==='mobile';
const marketSearch=(page:Page,info:TestInfo)=>mobile(info)?page.getByLabel('Explorar coleções'):page.getByLabel('Buscar NFTs');
async function login(page:Page,email='contato@email.com',password='kurio123'){
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);await page.getByLabel('Senha',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/profile/);await expect(page.getByRole('heading',{name:'Perfil do colecionador'})).toBeVisible();
}
async function openFilters(page:Page,info:TestInfo){if(mobile(info)){await page.getByRole('button',{name:'Abrir filtros'}).click();return page.getByRole('dialog',{name:'Filtros'})}return page.locator('.filters')}

test.beforeEach(async({page})=>{await resetApp(page)});

test('1. URL owns search, combined filters, sorting, pagination and history',async({page},info)=>{
  await page.goto('/market');
  await marketSearch(page,info).fill('Nomad');
  await expect(page).toHaveURL(/search=Nomad/);
  await page.getByLabel('Ordenar NFTs').selectOption('price-asc');
  const filters=await openFilters(page,info);await filters.getByRole('button',{name:/Polygon/}).click();
  if(mobile(info))await filters.getByRole('button',{name:'Fechar filtros'}).click();
  await expect(page).toHaveURL(/network=Polygon/);await expect(page).toHaveURL(/sort=price-asc/);await expect(page).toHaveURL(/page=1/);
  const combined=page.url();
  await page.goto('/market?sort=recent&page=2');await expect(page.getByText(/Página 2 de/)).toBeVisible();
  await page.goBack();await expect(page).toHaveURL(combined);await expect(marketSearch(page,info)).toHaveValue('Nomad');
});

test('2. direct NFT route handles existing, missing and unavailable editions',async({page})=>{
  await page.goto('/nft/emerald-ape-042');await expect(page.getByRole('heading',{name:'Emerald Ape #042'})).toBeVisible();
  await page.evaluate(async()=>{await fetch('/api/mock/realtime/nft/emerald-ape-042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({available:0})})});
  await expect(page.getByText('Edição esgotada')).toBeVisible();await expect(page.getByRole('button',{name:'Comprar NFT'})).toBeDisabled();
  await page.goto('/nft/not-a-real-nft');await expect(page.getByRole('heading',{name:'NFT não encontrado'})).toBeVisible();
});

test('3. registration conflict, session expiry and user isolation work',async({page})=>{
  await page.goto('/register');
  await page.getByLabel('Nome de usuário').fill('duplicado');await page.getByLabel('E-mail').fill('contato@email.com');await page.getByLabel('Senha',{exact:true}).fill('abcdefgh');await page.getByLabel('Confirmar senha').fill('abcdefgh');
  await page.getByRole('button',{name:'Criar perfil'}).click();await expect(page.getByRole('alert')).toContainText('Já existe uma conta');
  await login(page);await page.evaluate(async()=>{await fetch('/api/mock/session/expire',{method:'POST'})});await page.goto('/wallets');await expect(page).toHaveURL(/\/login\?redirect=/);
  await page.getByLabel('E-mail').fill('outro@email.com');await page.getByLabel('Senha',{exact:true}).fill('galaxy456');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(/\/wallets/);
  await page.goto('/favorites');const favorites=page.locator('.account-content');await expect(favorites.getByText('Cosmic Bloom #118')).toBeVisible();await expect(favorites.getByText('Emerald Ape #042')).toHaveCount(0);
});

test('4. favorite mutation is optimistic, rolls back on failure and persists on success',async({page})=>{
  await login(page);await page.goto('/nft/sage-nomad-009');await scenario(page,'favorite-failure');
  await page.getByRole('button',{name:'Favoritar NFT'}).click();await expect(page.getByRole('alert')).toContainText('Falha transitória');
  const failedFavorites=await page.evaluate(async()=>await (await fetch('/api/favorites')).json() as Array<{id:string}>);expect(failedFavorites.some(x=>x.id==='sage-nomad-009')).toBeFalsy();
  await scenario(page,'default');await page.getByRole('button',{name:'Favoritar NFT'}).click();await page.goto('/favorites');await expect(page.getByText('Sage Nomad #009')).toBeVisible();await page.reload();await expect(page.getByText('Sage Nomad #009')).toBeVisible();
});

test('5. REST cart persists for guest/login and validates coupons and quantities',async({page})=>{
  await page.goto('/cart');const emerald=page.locator('article').filter({hasText:'Emerald Ape #042'}).first();await emerald.getByLabel('Aumentar quantidade').click();await expect(emerald.getByText('2.38 ETH')).toBeVisible();
  await page.reload();await expect(page.locator('article').filter({hasText:'Emerald Ape #042'}).getByText('2.38 ETH')).toBeVisible();
  const promo=page.getByLabel('Código promocional');await promo.fill('INVALID');await page.getByRole('button',{name:'Aplicar',exact:true}).click();await expect(page.getByRole('alert')).toContainText('inválido');
  await promo.fill('EXPIRED');await page.getByRole('button',{name:'Aplicar',exact:true}).click();await expect(page.getByRole('alert')).toContainText('expirado');
  await promo.fill('KURIO10');await page.getByRole('button',{name:'Aplicar',exact:true}).click();await expect(page.getByRole('status')).toContainText('10% de desconto');
  await page.goto('/login?redirect=%2Fcart');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(/\/cart/);await expect(page.getByText('2.38 ETH')).toBeVisible();
});

test('6. full purchase reaches pending then confirmed receipt and removes bought items',async({page})=>{
  await login(page);await page.goto('/cart');await page.getByRole('link',{name:'Conectar e finalizar'}).click();await expect(page.getByRole('heading',{name:'Pagamento com carteira'})).toBeVisible();
  await page.getByRole('button',{name:'Confirmar compra'}).click();await expect(page).toHaveURL(/\/orders\/order-/);await expect(page.getByRole('heading',{name:/Pedido pendente|Compra confirmada/})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Compra confirmada'})).toBeVisible({timeout:8_000});await expect(page.getByText(/0xKURIO/)).toBeVisible();await expect(page.getByRole('heading',{name:'Itens do recibo'})).toBeVisible();
  await page.goto('/cart');await expect(page.getByRole('heading',{name:'Seu carrinho está vazio'})).toBeVisible();
});

test('7. rejected payment preserves cart and timeout recovers the same idempotent order',async({page})=>{
  await login(page);await page.goto('/checkout');await page.getByRole('button',{name:/MetaMask/}).click();await scenario(page,'wallet-rejected');await page.getByRole('button',{name:'Conectar carteira'}).click();await expect(page.getByRole('alert')).toContainText('recusada');await scenario(page,'payment-rejected');await page.getByRole('button',{name:'Conectar carteira'}).click();await page.getByRole('button',{name:'Confirmar compra'}).click();await expect(page.getByRole('heading',{name:'Pagamento recusado'})).toBeVisible({timeout:8_000});
  await page.goto('/cart');await expect(page.getByText('Emerald Ape #042')).toBeVisible();
  await page.evaluate(()=>sessionStorage.removeItem('kurio-checkout-idempotency'));await scenario(page,'order-timeout');await page.goto('/checkout');await page.getByRole('button',{name:'Confirmar compra'}).click();await expect(page).toHaveURL(/\/orders\/order-/);await expect(page.getByRole('heading',{name:'Compra confirmada'})).toBeVisible({timeout:8_000});
  const debug=await page.evaluate(async()=>await (await fetch('/api/mock/debug')).json() as {users:Array<{email:string;orders:unknown[]}>});const user=debug.users.find(x=>x.email==='contato@email.com');expect(user?.orders).toHaveLength(2);
});

test('8. profile, avatar, password and wallet validation/persistence are functional',async({page})=>{
  await login(page);const display=page.getByLabel('Nome de exibição');await display.fill('');await page.getByRole('button',{name:'Salvar',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();
  await display.fill('João Collector');const file=page.locator('input[type=file]');await file.setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:Buffer.from('89504e470d0a1a0a','hex')});await page.getByRole('button',{name:'Salvar',exact:true}).click();await expect(page.getByRole('status')).toContainText('Perfil salvo');
  await page.getByLabel('Senha atual').fill('errada');await page.getByLabel('Nova senha',{exact:true}).fill('novasenha123');await page.getByLabel('Confirmar nova senha').fill('novasenha123');await page.getByRole('button',{name:'Alterar senha'}).click();await expect(page.getByRole('alert')).toContainText('incorreta');
  await page.goto('/wallets');await page.getByRole('button',{name:'Adicionar',exact:true}).first().click();await page.getByLabel('Nome de exibição').fill('Ledger Demo');await page.getByRole('button',{name:'Salvar carteira'}).click();await expect(page.getByRole('alert')).toBeVisible();
  await page.getByLabel('Endereço da carteira').fill('0xDEMO123');await page.getByRole('button',{name:'Salvar carteira'}).click();await expect(page.getByRole('status')).toContainText('Carteira salva');await page.reload();await expect(page.getByText('Ledger Demo',{exact:true})).toBeVisible();
});

test('9. nft.updated changes catalog/cart and stale quote blocks checkout until review',async({page})=>{
  await login(page);await page.goto('/cart');await expect(page.locator('html')).toHaveAttribute('data-kurio-socket','connected');
  await page.evaluate(async()=>{await fetch('/api/mock/realtime/nft/emerald-ape-042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({price:'2.50',available:1})})});
  await expect(page.getByRole('status')).toContainText('mercado mudou');await expect(page.getByText('2.50 ETH')).toBeVisible();await expect(page.getByRole('button',{name:'Revise a cotação acima'})).toBeDisabled();
  await page.getByRole('button',{name:/Aceitar novos valores/}).click();await expect(page.getByRole('link',{name:'Conectar e finalizar'})).toBeVisible();
});

test('10. old realtime events do not regress state and pending order recovers after refresh',async({page})=>{
  await login(page);await page.goto('/nft/emerald-ape-042');await expect(page.locator('html')).toHaveAttribute('data-kurio-mocks','ready');await expect(page.getByRole('heading',{name:'Emerald Ape #042'})).toBeVisible();await page.evaluate(async()=>{await fetch('/api/mock/realtime/nft/emerald-ape-042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({price:'2.50',version:2})})});await expect(page.getByText('2.50 ETH')).toBeVisible();
  await page.evaluate(async()=>{await fetch('/api/mock/realtime/nft/emerald-ape-042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({price:'0.01',version:1})})});await expect(page.getByText('2.50 ETH')).toBeVisible();
  await page.evaluate(async()=>{await fetch('/api/cart/revalidate',{method:'POST'})});
  await page.goto('/checkout');await page.getByRole('button',{name:'Confirmar compra'}).click();await expect(page).toHaveURL(/\/orders\/order-/);const url=page.url();await page.reload();await expect(page).toHaveURL(url);await expect(page.getByRole('heading',{name:'Compra confirmada'})).toBeVisible({timeout:8_000});
  const id=url.split('/').pop()!;await page.evaluate(async id=>{await fetch(`/api/mock/realtime/order/${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,status:'pending'})})},id);await expect(page.getByRole('heading',{name:'Compra confirmada'})).toBeVisible();
});

test('11. keyboard navigation, dialog focus and validation are accessible',async({page},info)=>{
  if(mobile(info)){
    await page.goto('/market');const trigger=page.getByRole('button',{name:'Abrir filtros'});await trigger.focus();await trigger.press('Enter');const dialog=page.getByRole('dialog',{name:'Filtros'});await expect(dialog).toBeVisible();await page.keyboard.press('Tab');await expect(dialog.locator(':focus')).toHaveCount(1);await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
  }else{
    await page.goto('/login');const email=page.getByLabel('E-mail');await email.focus();await page.keyboard.press('Tab');await expect(page.getByLabel('Senha',{exact:true})).toBeFocused();await page.getByLabel('E-mail').fill('');await page.getByLabel('Senha',{exact:true}).fill('');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();
  }
});

test('12. skeletons appear under slow network and catalog recovers from controlled failure',async({page})=>{
  await scenario(page,'slow');await page.goto('/market');await expect(page.getByLabel('Carregando catálogo')).toBeVisible();await expect(page.locator('.product-card,.m-card').first()).toBeVisible({timeout:8_000});
  await scenario(page,'network-error');await page.reload();await expect(page.getByRole('alert')).toContainText('Não foi possível carregar o mercado');await scenario(page,'default');await page.getByRole('button',{name:'Tentar novamente'}).click();await expect(page.locator('.product-card,.m-card').first()).toBeVisible();
});
