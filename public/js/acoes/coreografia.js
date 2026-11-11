// Ações da loja (cadeirada, paulada, torta, balde, tomate, flores): o "maestro" da cena 3D.
// Recebe o evento do servidor, cuida do atacante (objeto na mão, caminhada até o alvo, golpe, volta ao lugar)
// e chama props.js (objetos/efeitos) e vitima.js (reação do alvo + câmera em 3ª pessoa).
// ESQUELETO: a coreografia completa é feita pelo agente de animação.
import { ITEM } from '/shared/loja.js';
import { Vitima } from './vitima.js';

export class Acoes {
  constructor(est) { this.est = est; this.lista = []; }
  /** d = { n, id: atacante, alvo, item } */
  iniciar(d) {
    const est = this.est, it = ITEM[d.item], atk = est.podios.get(d.id), alvo = est.podios.get(d.alvo);
    if (!it || !atk || !alvo || this.ocupado(d.id) || this.ocupado(d.alvo)) return;
    const vit = new Vitima(est, alvo, it, d);
    const a = { d, it, atk, alvo, vit, t: 0, bateu: false };
    this.lista.push(a);
  }
  update(dt, t) {
    this.lista = this.lista.filter(a => {
      a.t += dt;
      if (!a.bateu && a.t > 1) { a.bateu = true; a.vit.impacto(); this.est.onAcao?.('impacto', a.d); }
      const viva = a.vit.update(dt, t);
      if (!viva) { a.vit.limpar(); return false; }
      return true;
    });
  }
  /** true = a câmera foi posicionada aqui (você é o alvo: 3ª pessoa). */
  camera(dt, t) { return this.lista.some(a => a.vit.camera(dt, t)); }
  ocupado(id) { return this.lista.some(a => a.atk.id === id || a.alvo.id === id); }
  /** Você está sendo levado(a) pela ação (caminhando com o objeto): o mouse não gira a câmera. */
  andando(id) { return false; }
  limpar() { for (const a of this.lista) a.vit.limpar(); this.lista = []; }
}
