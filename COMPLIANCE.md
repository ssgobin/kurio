# Matriz de conformidade

Esta matriz relaciona os critérios do desafio às evidências de implementação e aos testes automatizados.

| Área | Evidência no projeto | Evidência automatizada |
| --- | --- | --- |
| Stack obrigatória | React/TypeScript, Router, Query, Axios, Socket.IO, Tailwind, primitivas shadcn, MSW | `npm run typecheck`, `npm run lint` |
| Roteamento e URL | `src/router.tsx` e páginas mantêm busca, filtros, ordenação e página nos search params | E2E 1 |
| Estado remoto | Queries, mutations, cache e cancelamento com TanStack Query; Axios como transporte | E2E 1–12 |
| Catálogo e detalhe | Busca/filtros/paginação no mock, vazio, falha, fora de ordem, 404 e edição indisponível | E2E 1, 2 e 12 |
| Conta e sessão | Cadastro, conflito, login, logout, expiração, retorno à rota e digest de senha | E2E 3 |
| Isolamento | Recursos privados por usuário, caches limpos e eventos filtrados por sessão | E2E 3 e 10 |
| Favoritos | REST, atualização otimista e rollback | E2E 4 |
| Carrinho | CRUD REST, persistência visitante/usuário, merge, cupons e precisão ETH | E2E 5 e 9 |
| Cotação | Valores autoritativos, snapshots e bloqueio quando `stale` | E2E 5 e 9 |
| Checkout | Validação, conexão/recusa de carteira e revalidação antes do pedido | E2E 6 e 7 |
| Pedidos | Idempotência, timeout recuperável, confirmado/recusado e recibo imutável | E2E 6, 7 e 10 |
| Tempo real | `socket.io-client`, binding MSW, versões, filtros de sessão e reconciliação REST | E2E 9 e 10 |
| Mocking | Cenários determinísticos, persistência, reset e erros HTTP | E2E 3, 4, 7, 9 e 12 |
| Carregamento | Skeletons com shimmer e movimento reduzido | E2E 12 |
| Acessibilidade | Labels, alertas/status, foco visível e Dialog Radix | E2E 11 e Lighthouse |
| Responsividade | Layouts desktop/mobile e ajustes para tablet | Todos os E2E em 2 perfis |
| Regressão visual | Início, detalhe, carrinho e pagamento em desktop/mobile | `npm run test:e2e:visual` |
| Performance | Build otimizado, lazy routes, vendors, imagens e relatórios versionados | `npm run lighthouse` |
| Documentação | Setup, variáveis, credenciais, falhas, contratos, cache e realtime | README e ARCHITECTURE |
| Deploy | Rewrites de SPA para Vercel e Netlify | `vercel.json`, `netlify.toml` |

## Evidências versionadas

- `package-lock.json`;
- oito baselines em `tests/visual.spec.ts-snapshots`;
- relatórios Playwright HTML;
- relatórios Lighthouse HTML/JSON e `summary.json` em mobile e desktop;
- configurações Playwright e Lighthouse;
- código, assets, fixtures, mocks e documentação.

O deploy público continua sendo uma etapa externa. A URL publicada deve apontar para o mesmo commit validado e manter `VITE_ENABLE_MSW=true`.
