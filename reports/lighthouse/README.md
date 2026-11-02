# Lighthouse reports

Run `npm run lighthouse` after `npm install` and `npm run build` to generate the HTML/JSON artifacts in `mobile/` and `desktop/`.

The configuration performs **3 runs per URL/profile** for `/` and `/nft/emerald-ape-042`, and LHCI assertions enforce:
- Performance >= 90
- Accessibility >= 95
- Best Practices >= 95
- SEO >= 90

Do not commit fabricated reports. The actual reports should be generated in the submission environment so they describe the machine/browser version used for evaluation.
