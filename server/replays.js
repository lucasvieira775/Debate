// ===== REPLAYS DAS FALAS NOTA 10 =====
// Reconstrução 3D no navegador: dados (linha do tempo da boca + legenda) + voz real gravada (.webm). Nada disso vai pro git (dados/replays/).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const REPLAY = { maxBytes: 2.5 * 1024 * 1024, porConta: 10, dias: 90, tokenMs: 10 * 60000, maxPontos: 2400, maxSeg: 240 };
const hex = n => crypto.randomBytes(n).toString('hex');
const ID_OK = /^[a-f0-9]{16}$/;
export const idValido = id => ID_OK.test(String(id || ''));

export class Replays {
  constructor(raiz) {
    this.dir = path.join(raiz, 'dados', 'replays'); fs.mkdirSync(this.dir, { recursive: true });
    this.tokens = new Map(); // token → { meta, ate }
    this.limpar(); setInterval(() => this.limpar(), 12 * 3600000).unref();
  }
  /** Servidor pede o replay de uma fala nota 10: token de uso único, ligado à conta e à fala. */
  pedir(meta) { const tk = hex(16); this.tokens.set(tk, { meta, ate: Date.now() + REPLAY.tokenMs }); for (const [k, v] of this.tokens) if (v.ate < Date.now()) this.tokens.delete(k); return tk; }
  /** Corpo: [u32 LE tamanho do JSON][JSON {linha, textos, dur}][áudio webm]. Retorna { id, meta } ou { erro }. */
  receber(token, buf) {
    const tk = this.tokens.get(token); this.tokens.delete(token); // uso único (mesmo se falhar)
    if (!tk || tk.ate < Date.now()) return { erro: 'token inválido' };
    if (!Buffer.isBuffer(buf) || buf.length < 8 || buf.length > REPLAY.maxBytes) return { erro: 'tamanho inválido' };
    const n = buf.readUInt32LE(0); if (n > 200000 || 4 + n >= buf.length) return { erro: 'formato inválido' };
    let dados; try { dados = JSON.parse(buf.subarray(4, 4 + n).toString('utf8')); } catch { return { erro: 'json inválido' }; }
    if (!dados || typeof dados !== 'object') return { erro: 'json inválido' };
    const audio = buf.subarray(4 + n); if (audio.length < 4 || audio.readUInt32BE(0) !== 0x1A45DFA3) return { erro: 'áudio não é webm' };
    const m = tk.meta, num = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0)), bruto = Math.max(1, (m.textoBruto || '').length);
    const linha = (Array.isArray(dados.linha) ? dados.linha : []).slice(0, REPLAY.maxPontos).map(p => [Math.round(num(p?.t, 0, REPLAY.maxSeg * 1000)), Math.round(num(p?.n, 0, 1) * 100) / 100]);
    // legenda: só o RITMO vem do cliente (fração do texto já dita em cada instante); o texto mostrado é o do servidor
    const legenda = (Array.isArray(dados.textos) ? dados.textos : []).slice(0, 600).map(x => [Math.round(num(x?.t, 0, REPLAY.maxSeg * 1000)), Math.round(num(String(x?.texto || '').length / bruto, 0, 1) * 1000) / 1000]);
    const id = hex(8), { textoBruto, ...pub } = m;
    const meta = { ...pub, id, data: Date.now(), dur: Math.round(num(dados.dur, 0, REPLAY.maxSeg * 1000)), linha, legenda };
    fs.writeFileSync(path.join(this.dir, id + '.webm'), audio);
    this.gravarMeta(meta); this.limparConta(m.uid);
    return { id, meta };
  }
  gravarMeta(meta) { try { fs.writeFileSync(path.join(this.dir, meta.id + '.json'), JSON.stringify(meta)); } catch (e) { console.error('[replay]', e.message); } }
  lerMeta(id) { try { return idValido(id) ? JSON.parse(fs.readFileSync(path.join(this.dir, id + '.json'), 'utf8')) : null; } catch { return null; } }
  /** Texto refinado (Gemini) chega depois: atualiza a legenda do replay. */
  atualizarTexto(id, texto) { const m = this.lerMeta(id); if (m) { m.texto = texto; this.gravarMeta(m); } }
  /** Versão pública (sem uid). */
  publico(id) { const m = this.lerMeta(id); if (!m) return null; const { uid, ...r } = m; return r; }
  arquivoAudio(id) { const f = idValido(id) && path.join(this.dir, id + '.webm'); return f && fs.existsSync(f) ? f : null; }
  apagar(id) { for (const ext of ['.webm', '.json']) try { fs.unlinkSync(path.join(this.dir, id + ext)); } catch { /* já foi */ } }
  todos() { try { return fs.readdirSync(this.dir).filter(f => f.endsWith('.json')).map(f => this.lerMeta(f.slice(0, -5))).filter(Boolean); } catch { return []; } }
  /** Máx. REPLAY.porConta por conta (apaga os mais antigos). */
  limparConta(uid) { this.todos().filter(m => m.uid === uid).sort((a, b) => b.data - a.data).slice(REPLAY.porConta).forEach(m => this.apagar(m.id)); }
  /** Apaga os com mais de REPLAY.dias e áudios órfãos. */
  limpar() {
    const lim = Date.now() - REPLAY.dias * 86400000, vivos = new Set();
    for (const m of this.todos()) m.data < lim ? this.apagar(m.id) : vivos.add(m.id);
    try { for (const f of fs.readdirSync(this.dir)) if (f.endsWith('.webm') && !vivos.has(f.slice(0, -5)) && Date.now() - fs.statSync(path.join(this.dir, f)).mtimeMs > 3600000) fs.unlinkSync(path.join(this.dir, f)); } catch { /* */ }
  }
}
