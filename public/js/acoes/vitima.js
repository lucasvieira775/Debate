// Reação de quem recebe a ação (queda + zonzo com ZzZ e passarinhos, rosto sujo, molhado, corações)
// e a câmera em 3ª pessoa quando o alvo é você. ESQUELETO: feito pelo agente da vítima.
export class Vitima {
  /** est = Estudio, p = púlpito do alvo ({ id, ator, avatar, grupo, lugar… }), it = ITEM da ação, d = evento. */
  constructor(est, p, it, d) { this.est = est; this.p = p; this.it = it; this.d = d; this.bateu = false; this.t = 0; }
  /** Chamado pela coreografia no instante do golpe/acerto. */
  impacto() { this.bateu = true; this.t = 0; }
  /** false = terminou (a coreografia chama limpar). */
  update(dt) { if (this.bateu) this.t += dt; return !this.bateu || this.t < 2; }
  /** Você é o alvo: posiciona est.camera em 3ª pessoa e devolve true. */
  camera() { return false; }
  limpar() {}
}
