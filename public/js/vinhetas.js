// Vinhetas de TV dos blocos no telão curvo (STUB — será substituído pelo agente de vídeos)
export const VINHETA_S = 5;
export const TITULOS = { 1: 'Temas Diversos', 2: 'Debate frente a frente', 3: 'Considerações finais' };
/** Desenha o quadro da vinheta do `bloco` no instante `t` (s, 0..VINHETA_S+0.6) num tile W×H (opaco). */
export function desenharVinheta(ctx, W, H, bloco, t) {
  ctx.fillStyle = '#0a2a8a'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.font = `bold ${H * .35}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = Math.min(1, t); ctx.fillText('BLOCO ' + bloco, W / 2, H * .4); ctx.font = `bold ${H * .12}px sans-serif`; ctx.fillText(TITULOS[bloco], W / 2, H * .75); ctx.globalAlpha = 1;
}
/** Quadro ambiente (loop) quando não há vinheta. */
export function desenharOcioso(ctx, W, H, t) {
  ctx.fillStyle = '#071a5c'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(96,165,250,.6)'; ctx.fillRect((t * 200) % W, 0, 40, H);
}
/** Toca os SFX sincronizados; `offsetS` = quanto da vinheta já passou (pula eventos passados). */
export function tocarSomVinheta(bloco, offsetS = 0) {}
