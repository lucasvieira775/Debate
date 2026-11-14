// ===== LOGO TV GROBE (marca d'água) =====
// Paródia original: globo estilizado + "Grobe". (x,y) = centro do conjunto, tam = largura aprox.
const FONTE_GROBE = '"Lilita One", "Arial Black", Impact, sans-serif';

export function desenharGrobe(ctx, x, y, tam) {
  const r = tam * 0.27, gy = y - tam * 0.17, ty = y + tam * 0.33;
  ctx.save();
  ctx.globalAlpha *= 0.9;
  // sombra/halo da esfera
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = tam * 0.06; ctx.shadowOffsetY = tam * 0.015;
  const g = ctx.createRadialGradient(x - r * 0.35, gy - r * 0.4, r * 0.1, x, gy, r);
  g.addColorStop(0, '#eaf6ff'); g.addColorStop(0.35, '#8fc4f0'); g.addColorStop(0.75, '#2a6fc4'); g.addColorStop(1, '#0d2f6e');
  ctx.beginPath(); ctx.arc(x, gy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'transparent';
  // aro prateado
  const aro = ctx.createLinearGradient(x, gy - r, x, gy + r);
  aro.addColorStop(0, '#ffffff'); aro.addColorStop(0.5, '#b8c4d4'); aro.addColorStop(1, '#6d7f99');
  ctx.lineWidth = Math.max(1.5, r * 0.09); ctx.strokeStyle = aro; ctx.stroke();
  // grade: meridianos e paralelos
  ctx.save();
  ctx.beginPath(); ctx.arc(x, gy, r * 0.96, 0, Math.PI * 2); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(1, r * 0.045);
  for (const k of [0.35, 0.72]) { ctx.beginPath(); ctx.ellipse(x, gy, r * k, r, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x, gy - r); ctx.lineTo(x, gy + r); ctx.stroke();
  for (const k of [-0.5, 0, 0.5]) {
    const py = gy + k * r, w = Math.sqrt(1 - k * k) * r;
    ctx.beginPath(); ctx.ellipse(x, py, w, r * 0.12 * (1 - Math.abs(k) * 0.4), 0, 0, Math.PI); ctx.stroke();
  }
  ctx.restore();
  // brilho especular
  const b = ctx.createRadialGradient(x - r * 0.38, gy - r * 0.45, 0, x - r * 0.38, gy - r * 0.45, r * 0.55);
  b.addColorStop(0, 'rgba(255,255,255,0.95)'); b.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.ellipse(x - r * 0.35, gy - r * 0.42, r * 0.45, r * 0.3, -0.6, 0, Math.PI * 2); ctx.fillStyle = b; ctx.fill();
  // texto
  ctx.font = `${Math.round(tam * 0.3)}px ${FONTE_GROBE}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = tam * 0.04; ctx.shadowOffsetY = tam * 0.012;
  ctx.lineWidth = Math.max(2, tam * 0.035); ctx.strokeStyle = '#0d2f6e'; ctx.strokeText('Grobe', x, ty);
  ctx.shadowColor = 'transparent';
  const t = ctx.createLinearGradient(x, ty - tam * 0.15, x, ty + tam * 0.15);
  t.addColorStop(0, '#ffffff'); t.addColorStop(1, '#d4dde8');
  ctx.fillStyle = t; ctx.fillText('Grobe', x, ty);
  ctx.restore();
}
