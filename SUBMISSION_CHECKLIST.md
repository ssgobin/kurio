# Checklist de submissão

Use esta lista antes de enviar o desafio. As evidências devem corresponder ao mesmo commit publicado.

## 1. Instalação reproduzível

- [x] `package-lock.json` versionado.
- [x] `.env.example` documentado.
- [x] MSW Worker gerado automaticamente no install/dev/build.

```bash
npm install
npx playwright install chromium
```

## 2. Validação estática e funcional

```bash
npm run validate
```

- [x] TypeScript aprovado.
- [x] ESLint aprovado sem warnings.
- [x] Build de produção aprovado.
- [x] 24 testes E2E aprovados: 12 desktop e 12 mobile.

O Playwright escreve o relatório em `playwright-report/` e mantém traces quando houver falha.

## 3. Regressão visual

```bash
npm run test:e2e:update
npm run test:e2e:visual
```

- [x] Oito baselines versionadas.
- [x] Oito comparações aprovadas.

Não atualize snapshots durante a avaliação; `test:e2e:update` deve ser usado apenas quando a mudança visual for intencional.

## 4. Lighthouse

```bash
npm run lighthouse
```

- [x] Três execuções por página/perfil configuradas.
- [x] Início e detalhe auditados em mobile e desktop.
- [x] HTML, JSON e medianas versionados em `reports/lighthouse/mobile` e `reports/lighthouse/desktop`.
- [x] Resultados abaixo da meta mobile justificados no README e na arquitetura.

## 5. Artefatos do repositório

- [x] Código-fonte, lockfile, assets, fixtures e mocks.
- [x] README com setup, variáveis, credenciais, cenários e comandos.
- [x] Contratos REST, eventos, sessão, carrinho e cache documentados.
- [x] Testes E2E e baselines visuais.
- [x] Relatórios Playwright e Lighthouse.
- [x] Rewrites de SPA para Vercel e Netlify.

Execute a verificação automática:

```bash
npm run submission:check
```

## 6. Publicação

- [ ] Criar o deploy público do commit validado.
- [ ] Configurar `VITE_ENABLE_MSW=true` no provedor.
- [ ] Testar acesso direto e refresh das rotas publicadas.
- [ ] Adicionar a URL pública ao README e à mensagem de entrega.
- [ ] Confirmar que repositório e deploy apontam para a mesma versão.

Configuração esperada:

- comando de build: `npm run build`;
- diretório de saída: `dist`;
- runtime: Node.js 20+.
