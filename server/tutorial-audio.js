// Narração do tutorial (shared/tutorial.js) → dados/audio/tutorial/<id>.wav, pela mesma dublagem do jogo (Gemini TTS, chave do .env).
//   node server/tutorial-audio.js            gera só os passos sem .wav e grava o `ms` real de todos no roteiro
//   node server/tutorial-audio.js id1 id2    regera esses passos (ex.: mudou a fala)
// Também apaga os .wav de passos que não existem mais. Pode rodar com o servidor no ar.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Dublagem, wav } from './voz.js';
import { TUTORIAL, TUTORIAL_VOZ, TUTORIAL_DIR } from '../shared/tutorial.js';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), pasta = path.join(raiz, 'dados', 'audio', 'tutorial'), roteiro = path.join(raiz, 'shared', 'tutorial.js');
const arq = id => path.join(pasta, id + '.wav'), forcar = new Set(process.argv.slice(2));
const ms = f => { const h = fs.readFileSync(f); return Math.round(h.readUInt32LE(40) / (h.readUInt32LE(24) * 2 / 1000)); };
fs.mkdirSync(pasta, { recursive: true });
const dub = new Dublagem(raiz, { limparFalas: false }), faltam = [];
for (const b of TUTORIAL) {
  if (fs.existsSync(arq(b.id)) && !forcar.has(b.id)) continue;
  // a conferência da dublagem não pega frase repetida (as palavras batem): take lento demais (< ~1,7 palavra/s) é refeito, até 4x
  let r = null; const maxMs = b.fala.split(/\s+/).length / 1.7 * 1000 + 1200;
  for (let k = 0; k < 4 && dub.ativa; k++) { r = await dub.pedir(b.fala, TUTORIAL_VOZ, TUTORIAL_DIR); if (!r || r.pcm.length / (r.taxa * 2 / 1000) <= maxMs) break; console.log(`  ${b.id}: take longo demais (frase repetida?), refazendo`); r = null; }
  if (!r) { faltam.push(b.id); console.log(`✗ ${b.id}: não gerou (sem chave ou cota esgotada)`); continue; }
  fs.writeFileSync(arq(b.id), wav(r.pcm, r.taxa)); console.log(`✓ ${b.id}: ${ms(arq(b.id))} ms`);
}
for (const f of fs.readdirSync(pasta)) if (f.endsWith('.wav') && !TUTORIAL.some(b => b.id + '.wav' === f)) { fs.rmSync(path.join(pasta, f)); console.log(`- ${f} apagado (passo não existe mais)`); }
// ms real de cada passo no roteiro (passo sem áudio fica sem ms: o cliente estima a duração e usa a voz do navegador)
let txt = fs.readFileSync(roteiro, 'utf8'), total = 0;
for (const b of TUTORIAL) {
  const d = fs.existsSync(arq(b.id)) ? ms(arq(b.id)) : 0; total += d || 5000;
  txt = txt.replace(new RegExp(`(\\{ id: '${b.id}',)( ms: \\d+,)?`), (_, a) => a + (d ? ` ms: ${d},` : ''));
}
fs.writeFileSync(roteiro, txt);
console.log(`Duração total ≈ ${(total / 1000 + TUTORIAL.length * .25).toFixed(1)} s (${TUTORIAL.length} passos)` + (faltam.length ? ` · FALTAM: ${faltam.join(' ')}` : ' · todos os áudios prontos'));
process.exit(faltam.length ? 1 : 0);
