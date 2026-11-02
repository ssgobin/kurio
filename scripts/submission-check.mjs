import fs from 'node:fs';
import path from 'node:path';

const failures=[];
const ok=[];
const requireFile=(file,label=file)=>{if(fs.existsSync(file)&&fs.statSync(file).size>0)ok.push(label);else failures.push(`${label}: ausente`)};
const findFiles=(root,predicate)=>{const out=[];const walk=dir=>{if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(predicate(p))out.push(p)}};walk(root);return out};

requireFile('package-lock.json','lockfile npm');
requireFile('ARCHITECTURE.md','ARCHITECTURE.md');
requireFile('SUBMISSION_CHECKLIST.md','checklist de submissão');

const snapshots=findFiles('tests',p=>/snapshots/i.test(p)&&/\.(png|jpg|jpeg)$/.test(p));
if(snapshots.length>=8)ok.push(`baselines visuais (${snapshots.length})`);else failures.push(`baselines visuais: encontrados ${snapshots.length}, esperado pelo menos 8 (4 telas × desktop/mobile)`);

for(const profile of ['mobile','desktop']){
  const dir=path.join('reports','lighthouse',profile);
  const html=findFiles(dir,p=>p.endsWith('.html'));
  const json=findFiles(dir,p=>p.endsWith('.json')&&!p.endsWith('summary.json'));
  const summary=path.join(dir,'summary.json');
  if(html.length>=2&&json.length>=6&&fs.existsSync(summary))ok.push(`Lighthouse ${profile}: relatórios + resumo`);
  else failures.push(`Lighthouse ${profile}: gere 3 runs para início/detalhe e mantenha HTML/JSON + summary.json`);
}

console.log('Artefatos encontrados:');for(const item of ok)console.log(`  ✓ ${item}`);
if(failures.length){console.error('\nPendências de submissão:');for(const item of failures)console.error(`  ✗ ${item}`);process.exit(1)}
console.log('\nChecklist automatizado concluído.');
