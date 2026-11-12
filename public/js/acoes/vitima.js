// Reação de quem recebe a ação: 'nocaute' (cai, fica zonzo com ZzZ e passarinhos, levanta), 'sujo' (recua e limpa o rosto),
// 'molhado' (susto e tremedeira de frio), 'amor' (sorri encabulado(a), mão no peito, corações)
// + câmera em 3ª pessoa quando o alvo é você e já está em 3ª pessoa (tecla V); em 1ª pessoa, efeito na tela (tela.js). Funciona no púlpito e no púlpito central do 1x1 (ator solto na cena).
import * as THREE from 'three';
import { registrarPose, POSE_Q } from '../avatar.js';
import { efeitoTela } from './tela.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), PI = Math.PI;
const sen = Math.sin, cos = Math.cos, abs = Math.abs, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const suave = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const mix = (a, b, k) => a.map((v, i) => typeof v === 'string' ? (k < .5 ? v : b[i]) : v + ((b[i] ?? v) - v) * k);

// ---------- tempos (s após o impacto) ----------
const QUEDA = .6, ZONZO = 4, LEVANTA = .8;
const DEMO = typeof location !== 'undefined' && location.search.includes('demo='); // parâmetros de teste (vitsim, congela) só com ?demo=
const N_FIM = QUEDA + ZONZO, N_TOTAL = N_FIM + LEVANTA; // 5,4 s
const DUR = { nocaute: N_TOTAL, sujo: 3, molhado: 3, amor: 3 };
const SENTA = .55; // inclinação do tronco sentado no chão (rad, para trás)

// ---------- corpo no nocaute: posição/rotação do avatar.root (no ator) e pernas ----------
// cai para trás girando nos pés (atrás do púlpito há espaço; no 1x1 "atrás" = lado de fora), quica, senta zonzo e levanta.
function corpo(u) {
  if (u < QUEDA) {
    const k = clamp(u / .5, 0, 1), b = PI / 2 * k * k, q = u > .5 ? sen((u - .5) / .1 * PI) * .06 : 0;
    return { b, py: .18 * k * k + q, pz: 0, q: -.35 * sen(k * PI), j: .4 * sen(k * PI) };
  }
  if (u < N_FIM) {
    const k = suave((u - 1.1) / .6), b = PI / 2 + (SENTA - PI / 2) * k + (k >= 1 ? sen((u - 1.7) * 1.3) * .04 : 0);
    return { b, py: .18 - .88 * cos(b), pz: -.88 + .88 * sen(b), q: b - PI / 2, j: 0 };
  }
  const k = suave((u - N_FIM) / LEVANTA), b0 = SENTA, y0 = .18 - .88 * cos(b0), z0 = -.88 + .88 * sen(b0);
  return { b: b0 * (1 - k), py: y0 * (1 - k), pz: z0 * (1 - k), q: (b0 - PI / 2) * (1 - k) - .5 * sen(k * PI), j: 1.1 * sen(k * PI) };
}

// ---------- poses (registradas no avatar.js) ----------
const Q = POSE_Q, REP = Q.rep;
registrarPose('vitNocaute', u => {
  const c = corpo(u), pe = [c.q, c.j, .06];
  if (u < QUEDA) { const k = clamp(u / .5, 0, 1), br = [-1.4 - k * .8, .9, -.35, 0, 0, 'aberta'];
    return { esq: br, dir: br, pernaE: [c.q - .25 * sen(k * PI), c.j + .3, .06], pernaD: pe, cabeca: .35 * k, olhosFechados: k > .6, boca: .6 }; }
  if (u < N_FIM) {
    const v = u - QUEDA, gira = v * 5.5, apoio = suave((u - 1.1) / .6);
    const br = mix([-.2, .55, -.1, 0, 0, 'aberta'], [.42, .3, -.12, 0, 0, 'aberta'], apoio); // deitado: braços abertos; sentado: apoiado atrás
    return { esq: br, dir: br, pernaE: pe, pernaD: [c.q, .08, .1], cabeca: .12 + sen(gira) * .24, cabecaZ: cos(gira) * .24, inclina: cos(gira) * .05 * apoio, olhosFechados: true, boca: .14 };
  }
  const k = suave((u - N_FIM) / LEVANTA), br = mix([.42, .3, -.12, 0, 0, 'aberta'], REP, k);
  return { esq: br, dir: br, pernaE: pe, pernaD: pe, cabeca: .12 * (1 - k), cabecaZ: sen(k * PI * 2) * .1 };
});
registrarPose('vitSujo', u => {
  const r = u < .12 ? u / .12 : Math.max(0, 1 - (u - .12) / .45); // tranco para trás
  const nojo = suave((u - .25) / .3) * (1 - suave((u - 2.7) / .3));
  const limpa = u > .55 && u < 2.35, v = u - .55, lk = suave((u - .5) / .25) * (1 - suave((u - 2.3) / .25)); // lk: cabeça baixa enquanto limpa
  const susto = [-1.05, .55, -1.35, 0, 0, 'aberta', .2];
  const dir = u < .55 ? mix(REP, susto, suave(u / .2))
    : limpa ? [-1.4, -.58 + sen(v * 9) * .1, -1.23 + sen(v * 9 + 1) * .12, -.08, .99 + sen(v * 9) * .3, 'cobre', .97] // esfrega o rosto
    : u < 2.75 ? [-.75, .7, -.9, 0, sen(u * 32) * .7, 'aberta', .1] : REP; // sacode a mão
  return { esq: u < .55 ? mix(REP, susto, suave(u / .2)) : REP, dir, cabeca: -.5 * r + (.18 + .2 * lk) * nojo, cabecaZ: (-.2 + .32 * lk) * nojo + sen(v * 10) * .05 * lk, giro: -.12 * (1 - lk) * nojo, pulo: .03 * r, olhosFechados: nojo > .3, boca: nojo > .3 && !limpa ? .18 : 0 };
});
registrarPose('vitMolhado', u => {
  const s = u < .45 ? sen(u / .45 * PI) : 0, f = suave((u - .35) / .25) * (1 - suave((u - 2.75) / .25)), tr = f * (.6 + .4 * sen(u * 3));
  const susto = [-1.3, 1.05, -.3, 0, 0, 'aberta'];
  const esq = u < .4 ? susto : mix(Q.cruzaE, [Q.cruzaE[0], Q.cruzaE[1] + sen(u * 47) * .05, Q.cruzaE[2] - .15, Q.cruzaE[3], 0, 'punho', .2], f);
  const dir = u < .4 ? susto : mix(Q.cruzaD, [Q.cruzaD[0], Q.cruzaD[1] + sen(u * 43) * .05, Q.cruzaD[2] - .15, Q.cruzaD[3], 0, 'punho', .2], f);
  return { esq, dir, pulo: .1 * s + abs(sen(u * 52)) * .012 * tr, cabeca: -.25 * s + .2 * f + sen(u * 45) * .035 * tr, cabecaZ: sen(u * 38) * .06 * tr, inclina: sen(u * 50) * .03 * tr, giro: sen(u * 41) * .04 * tr,
    pernaE: [-.08 * f, .2 * f, -.06 * f], pernaD: [-.08 * f, .2 * f, -.06 * f], boca: u < .5 ? .75 * s + .1 : .1 + abs(sen(u * 34)) * .12 * tr, olhosFechados: u > .5 && sen(u * 4) > .3 };
});
registrarPose('vitAmor', u => {
  const k = suave(u / .35) * (1 - suave((u - 2.7) / .3));
  return { dir: mix(REP, [-.62, .12, -1.98, -1.2, .35, 'aberta', .2], k), esq: mix(REP, [-.75, .2, -.45, -.3, -.8, 'relax'], k), // mão no peito
    cabeca: .16 * k, cabecaZ: (.22 + sen(u * 2.6) * .06) * k, giro: sen(u * 2.2) * .14 * k, inclina: sen(u * 2.6) * .04 * k, olhosFechados: u > .5 && u < 2.2 };
}, 1);
const POSE = { nocaute: 'vitNocaute', sujo: 'vitSujo', molhado: 'vitMolhado', amor: 'vitAmor' };

// ---------- texturas (canvas) ----------
const texs = {};
function tex(nome, desenha) {
  if (texs[nome]) return texs[nome];
  const c = document.createElement('canvas'); c.width = c.height = 128; desenha(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return texs[nome] = t;
}
const texZ = () => tex('z', g => { g.font = '900 112px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 14; g.lineJoin = 'round'; g.strokeStyle = '#1e3a8a'; g.strokeText('Z', 64, 68); g.fillStyle = '#ffffff'; g.fillText('Z', 64, 68); });
const texEspiral = () => tex('esp', g => {
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 60, 0, PI * 2); g.fill();
  g.strokeStyle = '#151515'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath();
  for (let a = 0; a < PI * 7; a += .1) { const r = 3 + a * 2.6; g.lineTo(64 + cos(a) * r, 64 + sen(a) * r); } g.stroke();
});
const texCoracao = () => tex('cor', g => {
  g.fillStyle = '#ff2d55'; g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.moveTo(64, 112);
  g.bezierCurveTo(10, 72, 8, 30, 38, 22); g.bezierCurveTo(54, 18, 62, 30, 64, 40); g.bezierCurveTo(66, 30, 74, 18, 90, 22); g.bezierCurveTo(120, 30, 118, 72, 64, 112); g.fill(); g.stroke();
});
const texRubor = () => tex('rub', g => { const r = g.createRadialGradient(64, 64, 4, 64, 64, 60); r.addColorStop(0, 'rgba(255,90,120,.85)'); r.addColorStop(1, 'rgba(255,90,120,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });

// ---------- passarinho amarelo (3D simples) ----------
function passarinho() {
  const g = new THREE.Group(), am = new THREE.MeshStandardMaterial({ color: '#ffd60a', roughness: .6 }), la = new THREE.MeshStandardMaterial({ color: '#ff8c1a', roughness: .5 }), pr = new THREE.MeshBasicMaterial({ color: '#111' });
  const corpoM = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 10), am); corpoM.scale.set(1, .9, 1.3); g.add(corpoM);
  const cab = new THREE.Mesh(new THREE.SphereGeometry(.04, 12, 10), am); cab.position.set(0, .05, .055); g.add(cab);
  const bico = new THREE.Mesh(new THREE.ConeGeometry(.014, .04, 8), la); bico.rotation.x = PI / 2; bico.position.set(0, .045, .1); g.add(bico);
  for (const s of [-1, 1]) { const o = new THREE.Mesh(new THREE.SphereGeometry(.008, 6, 6), pr); o.position.set(s * .022, .062, .085); g.add(o); }
  const cauda = new THREE.Mesh(new THREE.ConeGeometry(.025, .06, 6), am); cauda.rotation.x = -PI / 2 - .4; cauda.position.set(0, .01, -.08); g.add(cauda);
  g.userData.asas = [-1, 1].map(s => { const piv = new THREE.Group(); piv.position.set(s * .045, .02, 0); g.add(piv);
    const a = new THREE.Mesh(new THREE.BoxGeometry(.08, .008, .05), am); a.position.x = s * .04; piv.add(a); piv.userData.s = s; return piv; });
  return g;
}
const descartar = o => o.traverse(m => { m.geometry?.dispose(); m.material?.dispose(); });

export class Vitima {
  /** est = Estudio, p = púlpito do alvo ({ id, ator, avatar, grupo, lugar… }), it = ITEM da ação, d = evento. */
  constructor(est, p, it, d) {
    Object.assign(this, { est, p, it, d, bateu: false, t: 0, vida: 0, sons: new Set(), parts: [] });
    this.tipo = DUR[it.reacao] ? it.reacao : 'sujo'; this.dur = DUR[this.tipo];
    const av = p.avatar, r = av.root;
    this.raiz = { pos: r.position.clone(), rot: r.rotation.clone() };
    av.setOlhar = () => {}; // o estudio fica chamando setOlhar todo quadro: durante a ação quem manda no olhar é a vítima
    this.minha = p.id === est.meuId;
    this.side = 1; this.treme = 0;
  }
  olhar(y, p) { const av = this.p.avatar; Object.getPrototypeOf(av).setOlhar.call(av, y, p); }
  atk() { return this.est.podios.get(this.d.id); }
  som(nome, o = {}) { if (this.sons.has(nome)) return; this.sons.add(nome); this.est.onSom?.(nome, { ...this.est.somEm(this.p.ator.getWorldPosition(V()).setY(1)), ...o }); }

  /** Chamado pela coreografia no instante do golpe/acerto. */
  impacto() {
    if (this.bateu) return;
    this.bateu = true; this.t = 0; this.treme = 1;
    const av = this.p.avatar; av.animar(POSE[this.tipo], this.dur); this.olhar(this.tipo === 'sujo' ? av.olhar.y * .5 : 0, 0); // sujo: o rosto fica meio virado para quem jogou
    if (this.tipo === 'nocaute') this.olhosEspiral();
    if (this.tipo === 'amor') this.rubor();
    if (this.minha) try { efeitoTela(this.it.id); } catch (e) { console.warn(e); } // você é o alvo (1ª ou 3ª pessoa): efeito na tela
  }

  /** false = terminou (a coreografia chama limpar). */
  update(dt, t) {
    this.vida += dt; const av = this.p.avatar, est = this.est;
    if (this.sim === undefined && (this.sim = (DEMO && Number(new URLSearchParams(location.search).get('vitsim'))) || 0)) { // teste: ?vitsim=s pula direto para s segundos após o impacto
      this.impacto(); const n = Math.round(this.sim * 30);
      for (let i = 0; i < n; i++) { this.update(1 / 30, est.t + i / 30); av.update(1 / 30, est.t + i / 30); if (this.minha && est.modo === 'fp') this.camera(1 / 30, est.t + i / 30); }
      if (av.anim) av.anim.ini = est.t - this.sim;
      this.simFeito = true;
    }
    if (this.vida > 25) return false; // segurança: o impacto nunca veio
    if (!this.bateu) { // vira a cabeça para quem vem bater
      const a = this.atk();
      if (a) { const w = a.ator.localToWorld(V(0, 1.9, 0)), l = this.p.ator.worldToLocal(w).sub(V(0, 2, 0)); this.olhar(Math.atan2(l.x, l.z) * .8, Math.atan2(l.y, Math.hypot(l.x, l.z))); }
      return true;
    }
    if (this.simFeito && DEMO && location.search.includes('congela')) { av.animar(POSE[this.tipo], this.dur); av.anim.ini = t - this.t; return true; } // teste: congela no instante pedido
    this.t += dt; const u = this.t;
    if (av.anim?.nome !== POSE[this.tipo] && u < this.dur - .1) { av.animar(POSE[this.tipo], this.dur); av.anim.ini = t - u; } // um emote no meio não interrompe a reação
    if (this.tipo === 'nocaute') this.nocaute(u, dt, t);
    if (this.tipo === 'amor' && u > .3 && u < 2.5) this.emitir(dt, .2, () => this.coracao());
    this.parts = this.parts.filter(o => o.update(dt) || (this.est.scene.remove(o.obj), o.obj.material?.dispose(), false));
    if (this.rubores) for (const m of this.rubores) m.material.opacity = .9 * suave(u / .4) * (1 - suave((u - 2.6) / .4));
    if (u < this.dur) return true;
    if (this.raizFeita !== true) this.restaurarRaiz();
    // a câmera em 3ª pessoa ainda volta suave para a 1ª pessoa antes de acabar
    return this.minha && est.modo === 'fp' && this.camMovida && !this.camFim && u < this.dur + 2;
  }
  nocaute(u, dt, t) {
    const r = this.p.avatar.root, c = u < N_TOTAL ? corpo(u) : { b: 0, py: 0, pz: 0 };
    r.position.set(this.raiz.pos.x, this.raiz.pos.y + c.py, this.raiz.pos.z + c.pz); r.rotation.set(-c.b, 0, 0);
    if (u > .45) this.som('queda');
    if (u > .7) this.som('zonzo', { dur: N_FIM - .7 });
    if (u > N_FIM) this.som('levanta');
    const cab = this.p.avatar.cabeca.getWorldPosition(V()), zz = u > .8 && u < N_FIM - .8; // o último Z some antes de terminar de levantar
    // ZzZzZZ subindo e sumindo
    if (zz) this.emitir(dt, .38, () => this.zzz(cab));
    // passarinhos girando sobre a cabeça
    const vis = clamp(Math.min((u - .7) / .3, (N_FIM + .2 - u) / .3), 0, 1);
    if (vis > 0 && !this.aves) { this.aves = new THREE.Group(); for (let i = 0; i < 4; i++) this.aves.add(passarinho()); this.est.scene.add(this.aves); }
    if (this.aves) {
      this.aves.visible = vis > 0; this.aves.position.copy(cab).add(V(0, .92, 0));
      this.aves.children.forEach((b, i) => {
        const a = t * 3.2 + i * PI / 2; b.position.set(cos(a) * .36, sen(t * 6 + i * 1.7) * .05, sen(a) * .36); b.rotation.set(0, -a, 0); b.scale.setScalar(vis);
        for (const w of b.userData.asas) w.rotation.z = w.userData.s * sen(t * 28 + i) * .8;
      });
    }
    if (this.espirais) for (const [i, m] of this.espirais.entries()) { m.visible = u > QUEDA * .8 && u < N_FIM + .1; m.rotation.z = (i ? -1 : 1) * t * 7; }
  }
  emitir(dt, cada, fn) { if ((this.prox = (this.prox ?? 0) - dt) <= 0) { this.prox = cada; fn(); } }
  /** sprite que sobe, balança e some */
  particula(textura, pos, tam, vel, vida, balanco) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: textura, transparent: true, depthWrite: false }));
    sp.position.copy(pos); sp.scale.setScalar(.01); this.est.scene.add(sp);
    let v = 0; const f = Math.random() * 6, x0 = pos.x, z0 = pos.z;
    this.parts.push({ obj: sp, update: dt => { v += dt; const k = v / vida; if (k >= 1) return false;
      sp.position.y += vel * dt; sp.position.x = x0 + sen(v * 3 + f) * balanco; sp.position.z = z0 + cos(v * 2.4 + f) * balanco * .5;
      sp.scale.setScalar(tam * Math.min(1, k * 5)); sp.material.opacity = 1 - k * k; sp.material.rotation = sen(v * 4 + f) * .25; return true; } });
  }
  zzz(cab) { this.n = (this.n || 0) + 1; this.particula(texZ(), cab.clone().add(V(.12, .5, 0)), [.14, .22, .3, .18][this.n % 4], .38, 1.7, .14); }
  coracao() { const c = this.p.avatar.cabeca.getWorldPosition(V()).add(V((Math.random() - .5) * .5, .55 + Math.random() * .2, (Math.random() - .5) * .3)); this.particula(texCoracao(), c, .12 + Math.random() * .1, .45, 1.4, .08); }
  /** olhos em espiral (girando) por cima dos olhos fechados */
  olhosEspiral() {
    const av = this.p.avatar, H = av.olhos.parent, mt = new THREE.MeshBasicMaterial({ map: texEspiral(), transparent: true });
    this.espirais = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.CircleGeometry(.062, 24), mt); m.position.set(av.olhos.position.x + s * .1, av.olhos.position.y, av.olhos.position.z + .028); m.visible = false; H.add(m); return m; });
  }
  /** bochechas coradas (encabulado) */
  rubor() {
    const av = this.p.avatar, H = av.olhos.parent;
    this.rubores = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.13, .09), new THREE.MeshBasicMaterial({ map: texRubor(), transparent: true, depthWrite: false, opacity: 0 })); m.position.set(s * .15, .22, .253); H.add(m); return m; });
  }
  restaurarRaiz() { const r = this.p.avatar.root; r.position.copy(this.raiz.pos); r.rotation.copy(this.raiz.rot); this.raizFeita = true; }

  // ---------- câmera em 3ª pessoa (você é o alvo) ----------
  /** Você é o alvo: posiciona est.camera em 3ª pessoa e devolve true. */
  camera(dt, t) {
    const est = this.est, cam = est.camera;
    if (!this.minha || this.camFim || (!this.camMovida && !est.terceira)) return false; // em 1ª pessoa a câmera fica no olho (efeito na tela: tela.js)
    const A = this.p.ator; A.updateMatrixWorld();
    const eu = A.localToWorld(V()), fwd = V(0, 0, 1).transformDirection(A.matrixWorld).setY(0).normalize(), dir = V(0, 1, 0).cross(fwd).normalize();
    const atk = this.atk(), atkCab = atk ? atk.ator.localToWorld(V(0, 1.7, 0)) : eu.clone().addScaledVector(fwd, 3);
    if (!this.camMovida) { // sai da 1ª pessoa a partir de onde a câmera está
      this.camMovida = true; cam.updateMatrixWorld();
      this.cp = cam.getWorldPosition(V()); this.cl = this.cp.clone().add(cam.getWorldDirection(V()).multiplyScalar(3));
      this.side = atkCab.clone().sub(eu).dot(dir) > 0 ? -1 : 1; // fica do lado oposto a quem vem bater
    }
    if (cam.parent !== est.scene) est.scene.attach(cam);
    this.p.avatar.ocultarCabeca(this.cp.distanceTo(A.localToWorld(V(0, 2, .1))) < .8); // só mostra a cabeça quando a câmera já saiu dela
    let pos, alvo, k = this.bateu ? 3.2 : 4.5;
    const u = this.bateu ? this.t : -1, cab = this.p.avatar.cabeca.getWorldPosition(V());
    if (this.bateu && u >= this.dur) { // volta para a 1ª pessoa
      pos = A.localToWorld(V(0, 2, .1)); alvo = A.localToWorld(V(0, 1.85, 3)); k = 5;
      if (this.cp.distanceTo(pos) < .05) { this.camFim = true; est.setModo('fp'); return false; }
      if (this.cp.distanceTo(pos) < .8) this.p.avatar.ocultarCabeca(true);
    } else if (this.bateu && this.tipo === 'nocaute') { // acompanha o corpo no chão, de cima e de lado
      pos = eu.clone().addScaledVector(dir, this.side * 2.1).addScaledVector(fwd, -.5).add(V(0, 2.5, 0));
      alvo = cab.clone().add(V(0, .15, 0)); k = u < 1 ? 5 : 3;
    } else if (this.bateu) { // 3/4 de frente para ver a cara da reação
      pos = eu.clone().addScaledVector(dir, this.side * 1.7).addScaledVector(fwd, 1.5).add(V(0, 2.25, 0));
      alvo = cab.clone().add(V(0, .2, 0)); k = 2.6;
    } else { // atrás e acima: você e quem vem bater
      pos = eu.clone().addScaledVector(fwd, -2.4).addScaledVector(dir, this.side * 1).add(V(0, 2.75, 0));
      const base = eu.clone().add(V(0, 1.5, 0)).addScaledVector(fwd, .6), off = atkCab.clone().sub(base);
      alvo = base.add(off.multiplyScalar(Math.min(.45, 2.2 / Math.max(.01, off.length()))));
    }
    const kk = 1 - Math.exp(-dt * k); this.cp.lerp(pos, kk); this.cl.lerp(alvo, kk);
    this.treme = Math.max(0, this.treme - dt * 2.2);
    const tr = this.treme * this.treme * .14;
    cam.position.copy(this.cp).add(V(sen(t * 71) * tr, sen(t * 83 + 1) * tr, cos(t * 67) * tr));
    if (cam.fov !== 60) { cam.fov = 60; cam.updateProjectionMatrix(); }
    cam.lookAt(this.cl);
    return true;
  }

  /** Deixa o avatar em pé, no lugar, sem objetos sobrando (pode ser chamado a qualquer momento). */
  limpar() {
    const av = this.p.avatar, est = this.est;
    this.restaurarRaiz();
    delete av.setOlhar;
    if (Object.values(POSE).includes(av.anim?.nome)) av.anim = null;
    for (const o of this.parts) { est.scene.remove(o.obj); o.obj.material?.dispose(); } this.parts = [];
    if (this.aves) { est.scene.remove(this.aves); descartar(this.aves); this.aves = null; }
    for (const m of [...(this.espirais || []), ...(this.rubores || [])]) { m.parent?.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.espirais = this.rubores = null;
    if (this.minha) {
      if (this.camMovida && !this.camFim && est.modo === 'fp') est.setModo('fp'); // devolve a câmera ao rig da 1ª pessoa
      av.ocultarCabeca(est.cabecaOculta());
      if (est.lendo) av.animar('folhear', 9999); // estava lendo a pergunta: volta a folhear
    }
    this.camFim = true;
  }
}
