import express from 'express';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { Salas } from './salas.js';
import { ITEM, ITENS } from '../shared/loja.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
app.use(express.static(path.join(raiz, 'public'), { etag: false, maxAge: 0 }));
app.use('/shared', express.static(path.join(raiz, 'shared'), { etag: false, maxAge: 0 }));
app.use('/vendor/three', express.static(path.join(raiz, 'node_modules', 'three')));
app.use('/audio', express.static(path.join(raiz, 'dados', 'audio'), { maxAge: '7d', immutable: true }));

const http = createServer(app);
const io = new Server(http, { pingInterval: 10000, pingTimeout: 20000 });
const salas = new Salas(io, raiz);
// som dos emotes/danças (ElevenLabs, gerado na 1ª vez e guardado); 404 = navegador usa o som sintetizado
app.get('/api/som/:id', async (req, res) => {
  const it = ITEM[req.params.id]; if (!it?.som) return res.sendStatus(404);
  const arq = await salas.dub.somItem(it.id, it.som, it.seg || 3);
  arq ? res.set('Cache-Control', 'public, max-age=86400').sendFile(arq) : res.sendStatus(404);
});

// ---------- replays das falas nota 10 (dados/replays, fora do git) ----------
// upload: token de uso único dado pelo servidor ao autor da fala; leitura: só .webm e .json (sem uid)
app.post('/api/replay/:token', express.raw({ type: '*/*', limit: '3mb' }), (req, res) => { const r = salas.receberReplay(String(req.params.token), req.body); r.erro ? res.status(400).json(r) : res.json(r); });
app.get('/replays/:arq', (req, res) => {
  const m = /^([a-f0-9]{16})\.(webm|json)$/.exec(req.params.arq); if (!m) return res.sendStatus(404);
  if (m[2] === 'json') { const r = salas.replays.publico(m[1]); return r ? res.json(r) : res.sendStatus(404); }
  const f = salas.replays.arquivoAudio(m[1]); f ? res.type('audio/webm').set('Cache-Control', 'public, max-age=86400').sendFile(f) : res.sendStatus(404);
});

// ---------- servidores ICE do chat de voz (TURN é necessário em 4G/redes de celular) ----------
// .env: CF_TURN_ID + CF_TURN_TOKEN (Cloudflare Realtime TURN, grátis até 1TB/mês) ou TURN_URL + TURN_USER + TURN_PASS
const env = k => { if (process.env[k]) return process.env[k]; try { for (const l of fs.readFileSync(path.join(raiz, '.env'), 'utf8').replace(/^﻿/, '').split(/\r?\n/)) { const i = l.indexOf('='); if (i > 0 && l.slice(0, i).trim() === k) return l.slice(i + 1).trim().replace(/^["']|["']$/g, ''); } } catch { /* */ } return ''; };
const STUN = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
let iceCache = null;
app.get('/api/ice', async (req, res) => {
  if (iceCache && iceCache.ate > Date.now()) return res.json(iceCache.dados);
  let ice = [...STUN];
  const id = env('CF_TURN_ID'), tok = env('CF_TURN_TOKEN');
  if (id && tok) try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${id}/credentials/generate-ice-servers`, { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ttl: 86400 }) });
    const j = await r.json(); if (r.ok && j.iceServers) ice = [...STUN, ...[].concat(j.iceServers)]; else console.error('[voip] Cloudflare TURN:', r.status, JSON.stringify(j).slice(0, 160));
  } catch (e) { console.error('[voip] Cloudflare TURN:', e.message); }
  else if (env('TURN_URL')) ice.push({ urls: env('TURN_URL').split(','), username: env('TURN_USER'), credential: env('TURN_PASS') });
  iceCache = { ate: Date.now() + 3600000, dados: ice };
  res.json(ice);
});

// ---------- painel dos administradores (denúncias e suspensões) ----------
// senha: variável ADMIN_SENHA no .env (ex.: ADMIN_SENHA=minhasenha); sem ela, uma senha é sorteada e mostrada aqui
function senhaAdmin() {
  if (process.env.ADMIN_SENHA) return process.env.ADMIN_SENHA;
  try {
    for (const l of fs.readFileSync(path.join(raiz, '.env'), 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
      const i = l.indexOf('='); if (i > 0 && /admin|senha/i.test(l.slice(0, i))) return l.slice(i + 1).trim();
    }
  } catch { /* sem .env */ }
  return null;
}
const SENHA_ADMIN = senhaAdmin() || crypto.randomBytes(4).toString('hex');
const ehAdmin = req => req.get('x-admin') === SENHA_ADMIN;
app.use(express.json({ limit: '50kb' }));
app.get('/api/admin/denuncias', (req, res) => {
  if (!ehAdmin(req)) return res.status(403).json({ erro: 'senha incorreta' });
  const contas = salas.contas.contas;
  res.json(salas.contas.denuncias.slice(0, 300).map(d => ({ ...d, suspensoAte: contas[d.denunciado?.uid]?.banidoAte || 0, totalDenuncias: salas.contas.denuncias.filter(x => x.denunciado?.uid && x.denunciado.uid === d.denunciado?.uid).length })));
});
app.post('/api/admin/acao', (req, res) => {
  if (!ehAdmin(req)) return res.status(403).json({ erro: 'senha incorreta' });
  const { id, acao, dias } = req.body || {};
  const d = salas.contas.denuncias.find(x => x.id === id); if (!d) return res.status(404).json({ erro: 'denúncia não encontrada' });
  if (acao === 'suspender' && d.denunciado?.uid) {
    const c = salas.contas.conta(d.denunciado.uid, d.denunciado.nome);
    c.banidoAte = Date.now() + Math.max(1, Math.min(365, Number(dias) || 1)) * 86400000; salas.contas.salvar();
    d.status = `suspenso por ${dias} dia(s)`;
  } else if (acao === 'revogar' && d.denunciado?.uid) {
    const c = salas.contas.conta(d.denunciado.uid); c.banidoAte = 0; c.banPerm = false; salas.contas.salvar(); d.status = 'suspensão revogada';
  } else if (acao === 'arquivar') d.status = 'arquivada';
  salas.contas.salvarDen();
  res.json({ ok: true });
});

process.on('uncaughtException', e => console.error('[erro]', e));
process.on('unhandledRejection', e => console.error('[erro]', e));

const PORTA = Number(process.env.PORT) || 3000;
http.listen(PORTA, () => {
  console.log('');
  console.log('  ===============================================');
  console.log('   DEBATE PRESIDENCIAL ONLINE - servidor ligado');
  console.log('  ===============================================');
  console.log(`   Neste computador:  http://localhost:${PORTA}`);
  for (const lista of Object.values(networkInterfaces())) {
    for (const n of lista || []) if (n.family === 'IPv4' && !n.internal) console.log(`   Na rede local:     http://${n.address}:${PORTA}  (microfone pode ser bloqueado; use JOGAR-ONLINE.bat)`);
  }
  console.log(`   Painel dos administradores: http://localhost:${PORTA}/admin.html  (senha: ${process.env.ADMIN_SENHA || senhaAdmin() ? 'a do .env' : SENHA_ADMIN})`);
  console.log('   Deixe esta janela aberta enquanto joga.');
  console.log('');
  // pré-gera (uma vez só) os sons dos emotes/danças, 2 por vez
  (async () => { const f = ITENS.filter(i => i.som); for (let k = 0; k < f.length; k += 2) await Promise.all(f.slice(k, k + 2).map(i => salas.dub.somItem(i.id, i.som, i.seg || 3))); })();
});
