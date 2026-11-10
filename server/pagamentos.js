// Compra de moedas com dinheiro real: PIX via Mercado Pago. Pedidos guardados em dados/pedidos.json.
// Configuração no .env: MERCADOPAGO_TOKEN=APP_USR-... (Access Token de produção, ou TEST-... para testes).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PACOTES_MOEDAS } from '../shared/loja.js';

const API = 'https://api.mercadopago.com/v1/payments';
function lerToken(raiz) {
  const env = process.env.MERCADOPAGO_TOKEN || process.env.MP_ACCESS_TOKEN; if (env) return env.trim();
  try {
    for (const l of fs.readFileSync(path.join(raiz, '.env'), 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
      const i = l.indexOf('='); if (i > 0 && /mercado|^\s*mp_/i.test(l.slice(0, i))) return l.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* sem .env */ }
  return null;
}

export class Pagamentos {
  constructor(raiz, contas) {
    this.contas = contas; this.token = lerToken(raiz);
    this.arq = path.join(raiz, 'dados', 'pedidos.json');
    try { this.pedidos = JSON.parse(fs.readFileSync(this.arq, 'utf8')); } catch { this.pedidos = {}; }
  }
  get ativo() { return !!this.token; }
  salvar() { try { fs.writeFileSync(this.arq, JSON.stringify(this.pedidos, null, 1)); } catch (e) { console.error('pedidos:', e.message); } }
  async mp(url, op = {}) {
    const r = await fetch(url, { ...op, headers: { Authorization: 'Bearer ' + this.token, 'Content-Type': 'application/json', ...op.headers } });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || 'HTTP ' + r.status); return j;
  }
  async criarPix(c, pacoteId, email) {
    const p = PACOTES_MOEDAS.find(x => x.id === pacoteId);
    if (!c || !p) return { erro: 'Pacote inválido.' };
    if (!this.ativo) return { erro: 'Pagamentos ainda não estão disponíveis neste servidor.' };
    if (typeof email !== 'string' || !/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(email)) return { erro: 'Informe um e-mail válido.' };
    const ref = crypto.randomUUID();
    try {
      const r = await this.mp(API, { method: 'POST', headers: { 'X-Idempotency-Key': ref }, body: JSON.stringify({
        transaction_amount: p.reais, description: `Debate Presidencial - ${p.nome} (${p.moedas + p.bonus} moedas)`,
        payment_method_id: 'pix', payer: { email }, external_reference: ref,
        date_of_expiration: new Date(Date.now() + 30 * 60000).toISOString().replace('Z', '-00:00'),
      }) });
      const td = r.point_of_interaction?.transaction_data || {};
      this.pedidos[r.id] = { id: r.id, ref, uid: c.uid, pacote: p.id, moedas: p.moedas + p.bonus, reais: p.reais, status: r.status, criadoEm: Date.now() }; this.salvar();
      return { id: r.id, qr: td.qr_code, qrImg: td.qr_code_base64, link: td.ticket_url, reais: p.reais, moedas: p.moedas + p.bonus };
    } catch (e) { console.error('pix:', e.message); return { erro: 'Não foi possível gerar o PIX agora. Tente de novo.' }; }
  }
  // consulta o Mercado Pago e credita as moedas uma única vez quando aprovado
  async status(c, id) {
    const ped = this.pedidos[id]; if (!c || !ped || ped.uid !== c.uid) return { erro: 'Pedido não encontrado.' };
    if (!ped.creditado && this.ativo) {
      try { ped.status = (await this.mp(`${API}/${id}`)).status; } catch (e) { return { status: ped.status }; }
      if (ped.status === 'approved' && !ped.creditado) {
        ped.creditado = Date.now(); this.contas.creditar(c, ped.moedas, `Compra: ${ped.moedas} moedas (R$ ${ped.reais.toFixed(2)})`);
      }
      this.salvar();
    }
    return { status: ped.status, creditado: !!ped.creditado, moedas: ped.moedas };
  }
  // pedidos pendentes das últimas 24h (jogador fechou a janela antes de confirmar)
  async pendentes(c) {
    if (!c || !this.ativo) return 0; let n = 0;
    for (const p of Object.values(this.pedidos)) if (p.uid === c.uid && !p.creditado && p.status === 'pending' && Date.now() - p.criadoEm < 86400000) { if ((await this.status(c, String(p.id))).creditado) n += p.moedas; }
    return n;
  }
}
