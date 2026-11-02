# Arquitetura — Kurio NFT Marketplace

## Visão geral

O Kurio é uma aplicação exclusivamente frontend. Não existe backend de produção: o MSW intercepta o tráfego REST e WebSocket no navegador, enquanto a interface consome esses serviços pela mesma fronteira que usaria com APIs reais.

Responsabilidades principais:

- React e TypeScript: interface e contratos;
- TanStack Router: rotas, search params e proteção de páginas privadas;
- TanStack Query: estado remoto, cache, mutations, retry e invalidação;
- Axios: transporte de todas as operações REST da interface;
- Socket.IO Client: consumo de eventos em tempo real;
- MSW e `@mswjs/socket.io-binding`: simulação REST e Socket.IO;
- Tailwind e primitivas shadcn/ui: apresentação e acessibilidade;
- Playwright e Lighthouse CI: validação funcional, visual e de qualidade.

## Fronteiras e propriedade do estado

### Estado remoto

Sessão, catálogo, detalhes, favoritos, carrinho, cotações, perfil, carteiras e pedidos pertencem à API simulada e são lidos por TanStack Query. O contexto em `src/state/store.tsx` é uma fachada sobre Query/REST; ele não mantém uma segunda base de carrinho ou conta.

### Estado da URL

Busca, coleção, rede, preços mínimo/máximo, aba, ordenação e página são search params do TanStack Router. Assim, filtros sobrevivem a refresh, podem ser compartilhados e são restaurados pelo histórico. Alterar um filtro reinicia a paginação.

### Persistência local do mock

`src/mocks/db.ts` usa `localStorage` apenas para simular persistência do servidor entre recarregamentos. Componentes não acessam essa base diretamente.

A base contém:

- catálogo público e suas versões;
- carrinho do visitante;
- dois ou mais usuários, cada um com recursos privados próprios;
- sessão ativa;
- registros de idempotência;
- cenário determinístico selecionado.

Perfil, carteiras, favoritos, carrinho e pedidos ficam aninhados por usuário, impedindo exposição entre contas.

## Sessão e isolamento

`GET /api/session` retorna usuário, identificador de sessão e expiração. As rotas `/checkout`, `/profile`, `/wallets`, `/favorites` e `/orders/:id` consultam essa sessão no `beforeLoad`.

No logout ou troca de usuário:

1. caches privados do TanStack Query são removidos;
2. listeners da sessão anterior são liberados;
3. a ponte realtime passa a usar o novo `userId/sessionId`;
4. eventos de outra sessão são ignorados.

Senhas não são armazenadas em texto claro. O mock persiste digest SHA-256 de `salt:senha`. Em um backend real seria obrigatório usar um KDF lento, como Argon2, bcrypt ou scrypt.

## Contratos REST

Todas as chamadas de negócio da interface usam a instância Axios de `src/lib/http.ts`. Erros seguem um corpo tipado com `message`, `code` e, quando aplicável, `fields`.

### Conta e sessão

| Método | Rota | Responsabilidade |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Cadastra, valida conflito e cria sessão. |
| `POST` | `/api/auth/login` | Autentica e mescla o carrinho visitante. |
| `GET` | `/api/session` | Recupera ou rejeita a sessão expirada. |
| `POST` | `/api/auth/logout` | Encerra a sessão. |
| `POST` | `/api/auth/forgot` | Simula recuperação de senha. |

### NFTs

| Método | Rota | Responsabilidade |
| --- | --- | --- |
| `GET` | `/api/nfts?search&collection&network&minPrice&maxPrice&tab&sort&page&pageSize` | Filtra, ordena e pagina no servidor simulado. |
| `GET` | `/api/nfts/:id` | Retorna detalhe ou 404. |

As queries recebem o `AbortSignal` do TanStack Query. Respostas canceladas ou obsoletas não substituem resultados mais recentes.

### Favoritos

| Método | Rota |
| --- | --- |
| `GET` | `/api/favorites` |
| `POST` | `/api/favorites/:nftId` |
| `DELETE` | `/api/favorites/:nftId` |

A mutation atualiza o cache de forma otimista, guarda o snapshot anterior e executa rollback em caso de falha.

### Carrinho e cupom

| Método | Rota |
| --- | --- |
| `GET` | `/api/cart` |
| `POST` | `/api/cart/items` |
| `PUT` | `/api/cart/items/:cartItemId` |
| `DELETE` | `/api/cart/items/:cartItemId` |
| `POST` | `/api/cart/revalidate` |
| `POST` | `/api/cart/promo` |
| `DELETE` | `/api/cart/promo` |

O carrinho visitante persiste após refresh e é mesclado com o carrinho do usuário no login. Cada item mantém preço e versão observados para detectar mudanças no catálogo.

### Cotação

`POST /api/quote` é a referência para subtotal, desconto, taxa de rede e total. Valores ETH trafegam como strings decimais e são calculados com `BigInt` escalado em `src/lib/eth.ts`, sem erros de ponto flutuante.

Se preço, disponibilidade ou versão mudarem, a cotação retorna `stale` e o checkout exige uma nova confirmação.

### Pedidos e idempotência

| Método | Rota | Responsabilidade |
| --- | --- | --- |
| `POST` | `/api/orders` | Cria um pedido com header `Idempotency-Key`. |
| `GET` | `/api/orders/:id` | Recupera estado e recibo. |
| `GET` | `/api/orders/by-idempotency/:key` | Recupera tentativa após timeout. |

A mesma chave e o mesmo payload retornam o mesmo pedido. Reutilizar a chave com outro conteúdo retorna HTTP 409. No cenário `order-timeout`, o pedido é persistido antes da resposta 504 e o cliente o recupera sem duplicar a compra.

O pedido começa como `pending` e termina como `confirmed` ou `rejected`. O recibo é um snapshot imutável de itens, edições, quantidades, preços, desconto, taxa e total. Apenas uma confirmação remove do carrinho as quantidades compradas.

### Perfil e carteiras

| Método | Rota |
| --- | --- |
| `GET`, `PUT` | `/api/profile` |
| `PUT` | `/api/profile/password` |
| `GET`, `POST` | `/api/wallets` |
| `PUT`, `DELETE` | `/api/wallets/:id` |
| `POST` | `/api/wallets/connect` |

Validações retornam erros por campo. Alterações confirmadas são persistidas no usuário ativo.

## Tempo real e reconciliação

`src/components/RealtimeSync.tsx` é a única ponte entre Socket.IO e TanStack Query. `src/lib/socket.ts` mantém uma conexão compartilhada e evita conexões concorrentes durante o import dinâmico.

Eventos:

```text
nft.updated   { eventId, resourceId, version, occurredAt, payload }
order.updated { eventId, resourceId, version, occurredAt, userId, sessionId, payload }
```

Regras:

1. versões por recurso são monotônicas;
2. eventos duplicados ou antigos são ignorados;
3. `nft.updated` atualiza catálogo/detalhe e invalida carrinho/cotação afetados;
4. `order.updated` só é aceito para usuário e sessão ativos;
5. ao conectar/reconectar, recursos ativos são reconciliados pela API REST;
6. listeners são removidos no encerramento do ciclo de vida;
7. REST continua sendo a fonte autoritativa; realtime acelera atualização e invalidação.

O transporte simulado usa `socket.io-client` e o binding Socket.IO sobre a interceptação WebSocket do MSW. Não existem setters ou callbacks diretos da interface para fingir eventos.

## Cenários de mock

`POST /api/mock/scenario` seleciona `default`, `slow`, `out-of-order`, `empty-market`, `network-error`, `favorite-failure`, `expired-session`, `price-change`, `order-timeout`, `payment-rejected` ou `wallet-rejected`.

Endpoints de controle usados pelos E2E:

- `POST /api/mock/reset`: restaura integralmente as fixtures;
- `POST /api/mock/session/expire`: expira a sessão;
- `POST /api/mock/realtime/nft/:id`: altera e publica um NFT versionado;
- `POST /api/mock/realtime/order/:id`: publica um estado de pedido;
- `GET /api/mock/debug`: fornece inspeção determinística aos testes.

## Política de cache e falhas

- `staleTime` padrão de 15 segundos;
- políticas mais restritas para sessão, carrinho e cotação;
- retries limitados e desabilitados para erros determinísticos de sessão/validação;
- mutations sem retry automático;
- chaves privadas incluem o identificador do usuário;
- mutations e eventos invalidam somente recursos que podem ter ficado obsoletos;
- estados de carregamento, vazio, erro, sucesso e atualização são representados na UI.

## Acessibilidade e responsividade

- Dialog Radix no filtro mobile, com foco preso, fechamento por Escape e restauração do foco;
- labels associados, `aria-invalid`, alertas/status acessíveis e foco visível;
- navegação mobile identificada e botões com nomes acessíveis;
- skeletons com dimensões reservadas para evitar layout shift;
- `prefers-reduced-motion` desativa animações;
- layouts específicos para telefone, tablet e desktop.

## Testes e auditoria

`tests/flows.spec.ts` cobre os 12 grupos exigidos em desktop e mobile. `tests/visual.spec.ts` cobre início, detalhe, carrinho e pagamento nos dois perfis. O estado MSW é restaurado antes de cada teste.

Lighthouse CI executa três medições para início e detalhe em mobile e desktop. Desktop atende a todas as metas; mobile atende acessibilidade, boas práticas e SEO, mas permanece abaixo da meta de performance pelo custo de inicialização do MSW e do transporte Socket.IO na thread principal. Nenhuma funcionalidade é desativada exclusivamente para a auditoria.

## Decisões de UI e limitações

Os assets raster originais do Figma não puderam ser integralmente exportados devido ao limite da conta. O projeto usa JPEGs locais otimizados em `public/assets`, sem URLs temporárias. Medidas, paleta, hierarquia e contexto visual disponível foram preservados.

Estados de foco, carregamento, erro e feedback acessível complementam o Figma quando não havia frame específico. Páginas de perfil, carteiras e confirmação receberam comportamento mobile coerente mesmo sem todos os frames correspondentes.
