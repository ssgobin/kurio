# Kurio — NFT Marketplace

Implementação do desafio frontend de um marketplace de NFTs, com fluxos completos de descoberta, compra e conta do colecionador. A aplicação usa APIs REST e eventos Socket.IO simulados na camada de rede com MSW, sem depender de backend ou serviços privados.

Repositório: <https://github.com/ssgobin/kurio>

## Stack obrigatória

- React 19 e TypeScript;
- TanStack Router para rotas, busca na URL e proteção de páginas privadas;
- TanStack Query para estado remoto, cache, mutations e atualização otimista;
- Axios para todas as chamadas REST da interface;
- Socket.IO Client para eventos em tempo real;
- Tailwind CSS e componentes no padrão shadcn/ui com Radix e CVA;
- MSW para REST, cenários de falha e transporte Socket.IO simulado;
- Playwright para E2E e regressão visual;
- Lighthouse CI para performance, acessibilidade, boas práticas e SEO.

## Pré-requisitos

- Node.js 20 ou superior;
- npm;
- Chromium do Playwright para executar os testes.

## Instalação e execução

```bash
git clone https://github.com/ssgobin/kurio.git
cd kurio
npm install
npx playwright install chromium
copy .env.example .env
npm run dev
```

No macOS/Linux, substitua `copy` por `cp`.

A aplicação ficará disponível em `http://localhost:5173`. O `postinstall`, `predev` e `prebuild` geram `public/mockServiceWorker.js` de forma não interativa.

### Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_ENABLE_MSW` | `true` | Ativa os mocks REST e Socket.IO. Deve permanecer habilitada no build de demonstração. |

Use `.env.example` como referência. Com `VITE_ENABLE_MSW=false`, a aplicação espera serviços externos compatíveis com os mesmos contratos.

## Credenciais e dados de demonstração

| Usuário | Senha |
| --- | --- |
| `contato@email.com` | `kurio123` |
| `outro@email.com` | `galaxy456` |

As senhas dos registros simulados são persistidas como digest SHA-256 de `salt:senha`; os valores acima são apenas entradas públicas para demonstração.

Cupons disponíveis:

- `KURIO10`: 10% de desconto;
- `GENESIS5`: 5% de desconto;
- `EXPIRED`: retorna erro determinístico de cupom expirado;
- qualquer outro código: retorna erro de cupom inválido.

## Comandos

```bash
npm run dev                 # Vite com MSW habilitado
npm run typecheck           # verificação TypeScript
npm run lint                # ESLint sem tolerância a warnings
npm run build               # build otimizado de produção
npm run preview             # serve o build localmente
npm run test:e2e            # 12 grupos de fluxo em desktop e mobile
npm run test:e2e:ui         # Playwright em modo interativo
npm run test:e2e:update     # gera/atualiza as 8 baselines visuais
npm run test:e2e:visual     # compara as baselines visuais
npm run lighthouse          # build + 3 auditorias por página e perfil
npm run validate            # tipos + lint + build + E2E
npm run submission:check    # valida os artefatos obrigatórios
```

## Escopo funcional entregue

- Busca, filtros combinados, ordenação e paginação persistidos na URL.
- Detalhe com acesso direto, NFT inexistente, edição indisponível e limite de quantidade.
- Favoritos autenticados com atualização otimista e rollback.
- Carrinho REST persistente para visitante, mesclagem após login, quantidades e cupons.
- Cotações autoritativas com valores ETH decimais calculados sem ponto flutuante.
- Checkout com validação, conexão/recusa de carteira e revalidação de preço e estoque.
- Pedido idempotente, estados pendente/confirmado/recusado e recuperação após timeout ou refresh.
- Cadastro, login, logout, expiração de sessão e isolamento entre usuários.
- Perfil, avatar, senha e carteiras com validação e persistência.
- Eventos versionados `nft.updated` e `order.updated`, proteção contra eventos antigos e reconciliação REST.
- Skeletons com shimmer, suporte a movimento reduzido, navegação por teclado e controle de foco.
- Layouts responsivos para desktop, tablet e mobile.

## Cenários determinísticos do MSW

Altere o cenário pelo console do navegador ou nos testes:

```js
await fetch('/api/mock/scenario', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({scenario: 'slow'}),
})
```

| Cenário | Como reproduzir/efeito |
| --- | --- |
| `default` | Fluxos padrão de sucesso. |
| `slow` | Respostas lentas para validar skeletons. |
| `out-of-order` | Latência alternada para validar descarte de respostas obsoletas. |
| `empty-market` | Catálogo sem resultados. |
| `network-error` | Indisponibilidade HTTP 503 no catálogo. |
| `favorite-failure` | Falha transitória e rollback do favorito. |
| `expired-session` | Sessão expirada e redirecionamento para login. |
| `price-change` | Cotação fica desatualizada antes da compra. |
| `order-timeout` | Pedido é criado, a resposta expira e o cliente o recupera pela chave idempotente. |
| `payment-rejected` | Pedido termina como recusado e preserva o carrinho. |
| `wallet-rejected` | Simula recusa ao conectar a carteira. |

Para restaurar usuários, sessão, carrinhos, catálogo, pedidos e cenário:

```js
await fetch('/api/mock/reset', {method: 'POST'})
location.reload()
```

Para simular uma alteração realtime:

```js
await fetch('/api/mock/realtime/nft/emerald-ape-042', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({price: '2.50', available: 1}),
})
```

## Contratos e arquitetura

Os contratos REST, payloads dos eventos, política de sessão, persistência do carrinho, idempotência, cache e reconciliação entre REST e Socket.IO estão documentados em [ARCHITECTURE.md](./ARCHITECTURE.md).

A relação entre cada requisito do desafio e sua evidência no código/testes está em [COMPLIANCE.md](./COMPLIANCE.md).

## Testes e evidências

`tests/flows.spec.ts` implementa os 12 grupos exigidos e executa cada fluxo em Chromium desktop e mobile. Cada teste restaura o banco MSW antes de iniciar. O Playwright retém trace em falhas e gera relatório HTML.

A regressão visual cobre início, detalhe, carrinho e pagamento nos dois perfis, totalizando oito baselines versionadas.

Última validação local:

- TypeScript: aprovado;
- ESLint: aprovado sem warnings;
- build de produção: aprovado;
- E2E: 24/24 aprovados;
- regressão visual: 8/8 aprovada;
- checklist automatizado de submissão: aprovado.

## Lighthouse

As configurações auditam `/` e `/nft/emerald-ape-042`, três vezes em mobile e desktop, usando o build de produção. Os relatórios HTML/JSON e as medianas estão em `reports/lighthouse/mobile` e `reports/lighthouse/desktop`.

| Perfil/página | Performance | Acessibilidade | Boas práticas | SEO |
| --- | ---: | ---: | ---: | ---: |
| Mobile `/` | 70 | 100 | 96 | 100 |
| Mobile detalhe | 79 | 100 | 96 | 100 |
| Desktop `/` | 97 | 98 | 96 | 100 |
| Desktop detalhe | 98 | 95 | 96 | 100 |

No mobile, performance permanece abaixo da meta de 90 devido principalmente à inicialização dos runtimes obrigatórios do MSW e Socket.IO na thread principal. A auditoria mantém toda a funcionalidade habilitada. As otimizações aplicadas incluem imagens JPEG locais, preload do LCP, lazy loading por rota e divisão de vendors.

[Endereço público na vercel](https://kurio-virid.vercel.app/?page=1)
