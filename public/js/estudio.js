// Estúdio 3D do debate: palco, púlpitos, telão de LED, plateia, luzes e câmera em primeira pessoa.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Avatar, mat } from './avatar.js';
import { PARTIDO, TEMAS, TEMA, AV_MEDIADORA, ETAPAS } from '/shared/regras.js';
import { desenharSimbolo, escurecer, fmtT, clamp } from './util.js';
import { brasao } from '/shared/niveis.js';

const CENTRO = new THREE.Vector3(0, 0, -3.2);   // mesa da mediadora
const RAIO = 6.4;                                // raio do arco de púlpitos
const ANGULOS = { 1: [0], 2: [-20, 20], 3: [-32, 0, 32], 4: [-45, -15, 15, 45], 5: [-50, -25, 0, 25, 50] };
const DUELO = new THREE.Vector3(0, 0, .6);       // púlpitos do confronto direto (centro do palco)
const DUELO_X = 1.55;                            // distância do centro até cada candidato no confronto
const VEL_ANDAR = 1.5;                           // m/s da caminhada automática
// púlpito do confronto sobre rodinhas: fica estacionado na lateral do palco (A = direita) com a produtora ao lado;
// no bloco 2 ela empurra até o centro e volta; no bloco 3 empurra para o outro lado (B) e estaciona. Tudo dentro do palco
// (raio 9.2), à frente da plateia (1ª fileira a ~10.7 m), fora dos púlpitos dos candidatos e das câmeras de TV.
const PULP_PARK = [new THREE.Vector3(6.7, 0, -1.6), new THREE.Vector3(-6.7, 0, -1.6)]; // [A, B]
const PULP_YAW = [Math.atan2(DUELO.z + 1.6, 6.7), -Math.atan2(DUELO.z + 1.6, 6.7)];   // carro alinhado com a reta até o centro
const PULP_PEGA = 1.72;                                    // do centro do carro até onde a produtora segura (x local)
const PULP_EMPURRA = 6.5, VEL_PROD = 1.3;                  // segundos empurrando / m/s caminhando
/** Ponto (x, z locais) do carro parado em c com rotação yaw → mundo (y 0). */
const noCarro = (c, yaw, x, z) => new THREE.Vector3(c.x + x * Math.cos(yaw) + z * Math.sin(yaw), 0, c.z - x * Math.sin(yaw) + z * Math.cos(yaw));
const doCarro = (c, yaw, p) => { const dx = p.x - c.x, dz = p.z - c.z; return { x: dx * Math.cos(yaw) - dz * Math.sin(yaw), z: dx * Math.sin(yaw) + dz * Math.cos(yaw) }; };
const _v = new THREE.Vector3();
const sm = u => { u = Math.min(1, Math.max(0, u)); return u * u * u * (u * (u * 6 - 15) + 10); }; // smootherstep
/** Velocidade trapezoidal: acelera, anda constante, freia (posição 0..1). */
const trap = (u, a = .2) => { u = Math.min(1, Math.max(0, u)); const v = 1 / (1 - a); return u < a ? v * u * u / (2 * a) : u > 1 - a ? 1 - v * (1 - u) ** 2 / (2 * a) : v * (u - a / 2); };
const FONTE = '"Lilita One", "Arial Black", Impact, sans-serif';
const FONTE_TXT = '"Nunito", "Segoe UI", Arial, sans-serif';
const D2R = Math.PI / 180;

function rb(w, h, d, r = .05) { return new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001)); }
function canvasTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { c, ctx: c.getContext('2d'), tex };
}
function quebrar(ctx, texto, maxW) {
  const pal = String(texto || '').split(/\s+/); const linhas = []; let l = '';
  for (const p of pal) { const t = l ? l + ' ' + p : p; if (ctx.measureText(t).width > maxW && l) { linhas.push(l); l = p; } else l = t; }
  if (l) linhas.push(l); return linhas;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
// ---------- BRASÕES (cache de Image; redesenha quem esperava quando carrega) ----------
const BRASOES = {};
function imgBrasao(n, aoCarregar) {
  if (!(n >= 1 && n <= 8)) return null;
  let b = BRASOES[n];
  if (!b) { b = BRASOES[n] = { img: new Image(), ok: false, fila: [] }; b.img.onload = () => { b.ok = true; b.fila.splice(0).forEach(f => f()); }; b.img.src = brasao(n); }
  if (b.ok) return b.img;
  if (aoCarregar) b.fila.push(aoCarregar); return null;
}
/** Etiqueta 512x128: [brasão] nome / sigla·número, bloco centralizado; fonte encolhe para caber (sem deformar). */
function desenharEtiqueta(et, j, p) {
  const { ctx, tex } = et, W = 512, H = 128, PAD = 26, ICO = 92, GAP = 14;
  et.j = j; et.p = p; // o callback do brasão redesenha com o estado mais recente (nível pode mudar antes da imagem carregar)
  const img = imgBrasao(j.nivel, () => { if (et.j === j) desenharEtiqueta(et, j, p); });
  ctx.clearRect(0, 0, W, H); rr(ctx, 4, 4, W - 8, H - 8, 30); ctx.fillStyle = p.cor; ctx.fill();
  const nome = j.nome.slice(0, 16), sigla = `${p.sigla} · ${p.numero}`, livre = W - 2 * PAD - (img ? ICO + GAP : 0);
  let tam = 58; ctx.font = `${tam}px ${FONTE}`;
  while (tam > 30 && ctx.measureText(nome).width > livre) { tam -= 2; ctx.font = `${tam}px ${FONTE}`; }
  const wNome = ctx.measureText(nome).width; ctx.font = `bold 30px ${FONTE_TXT}`;
  const wTxt = Math.min(livre, Math.max(wNome, ctx.measureText(sigla).width));
  const x0 = (W - (img ? ICO + GAP : 0) - wTxt) / 2, cx = x0 + (img ? ICO + GAP : 0) + wTxt / 2;
  if (img) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 6; ctx.drawImage(img, x0, (H - ICO) / 2, ICO, ICO); ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${tam}px ${FONTE}`; ctx.fillText(nome, cx, 52, livre);
  ctx.font = `bold 30px ${FONTE_TXT}`; ctx.fillText(sigla, cx, 100, livre);
  tex.needsUpdate = true;
}

export class Estudio {
  constructor(canvas, cfg = {}) {
    this.canvas = canvas; this.cfg = { qualidade: 'alta', sens: 1, nomes: true, ...cfg };
    this.podios = new Map(); this.jogadores = []; this.meuId = null;
    this.modo = 'menu'; this.olhar = { y: 0, p: 0 }; this.olharSuave = { y: 0, p: 0 };
    this.falante = null; this.selecionaveis = null; this.efeitos = []; this.excitacao = 0;
    this.onPick = null; this.onOlhar = null; this.ledDados = { modo: 'titulo' };
    this.ultimoFrame = performance.now(); this.t = 0;

    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = .82;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color('#070a1c'); s.fog = new THREE.Fog('#070a1c', 26, 60);
    const pm = new THREE.PMREMGenerator(r); s.environment = pm.fromScene(new RoomEnvironment(), .04).texture; s.environmentIntensity = .35;
    this.camera = new THREE.PerspectiveCamera(60, 1, .05, 120);
    this.rig = new THREE.Group(); this.rig.rotation.order = 'YXZ'; this.camFP = new THREE.Group(); this.camFP.rotation.y = Math.PI; this.rig.add(this.camFP);

    this.construirPalco(); this.construirTelao(); this.construirPlateia(); this.construirLuzes(); this.construirMediadora(); this.construirDuelo(); this.construirConfete();
    this.vitrine = null;

    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(s, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .16, .3, .96);
    this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    this.setQualidade(this.cfg.qualidade);

    this.instalarControles();
    addEventListener('resize', () => this.resize()); this.resize();
    this.desenharLED();
    r.setAnimationLoop(() => this.frame());
  }

  setQualidade(q) {
    this.cfg.qualidade = q; const alta = q === 'alta';
    this.renderer.shadowMap.enabled = alta; this.bloom.enabled = alta;
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    this.resize();
  }
  /** Resolução fixa ('1920x1080'…) renderiza exatamente esses pixels; 'auto' segue a janela. */
  setResolucao(res) { this.cfg.resolucao = res; this.resize(); }
  resize() {
    const fixa = this.cfg.resolucao && this.cfg.resolucao !== 'auto', alta = this.cfg.qualidade === 'alta';
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    const pr = fixa ? +this.cfg.resolucao.split('x')[0] / w : Math.min(devicePixelRatio, alta ? 1.5 : 1); // fixa: exatamente os pixels escolhidos
    this.renderer.setPixelRatio(pr); this.composer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false); this.composer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  // ===================== CENÁRIO =====================
  construirPalco() {
    const s = this.scene;
    const chao = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: '#0a0e26', roughness: .7 }));
    chao.rotation.x = -Math.PI / 2; chao.position.y = -.25; chao.receiveShadow = true; s.add(chao);
    // palco circular brilhante
    const palco = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 9.4, .25, 96), new THREE.MeshStandardMaterial({ color: '#1b2470', roughness: .18, metalness: .35 }));
    palco.position.y = -.125; palco.receiveShadow = true; s.add(palco);
    // desenho do piso (anéis e linhas)
    const { c, ctx, tex } = canvasTex(1024, 1024);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = 'rgba(120,160,255,.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(512 + Math.cos(a) * 140, 512 + Math.sin(a) * 140); ctx.lineTo(512 + Math.cos(a) * 505, 512 + Math.sin(a) * 505); ctx.stroke(); }
    for (const rr2 of [140, 260, 380, 505]) { ctx.beginPath(); ctx.arc(512, 512, rr2, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(250,204,21,.6)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(512, 512, 455, 0, 7); ctx.stroke();
    const piso = new THREE.Mesh(new THREE.CircleGeometry(9.2, 96), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    piso.rotation.x = -Math.PI / 2; piso.position.y = .004; s.add(piso);
    // anéis de neon
    const neon = (raio, cor, y = .02, tubo = .045) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(raio, tubo, 8, 160), new THREE.MeshBasicMaterial({ color: cor }));
      t.rotation.x = Math.PI / 2; t.position.y = y; s.add(t); return t;
    };
    neon(9.32, '#3b82f6', -.02, .06); neon(9.42, '#22d3ee', -.18, .04);
    const anelMed = neon(1.9, '#facc15', .015, .03); anelMed.position.set(CENTRO.x, .015, CENTRO.z);
    // parede de fundo curva com faixas de luz
    const parede = new THREE.Mesh(new THREE.CylinderGeometry(17, 17, 13, 64, 1, true, 110 * D2R, 140 * D2R),
      new THREE.MeshStandardMaterial({ color: '#0b1550', roughness: .8, side: THREE.BackSide }));
    parede.position.set(0, 6.25, -1); s.add(parede);
    for (let i = -6; i <= 6; i++) {
      const a = Math.PI + i * 10.5 * D2R;
      const f = new THREE.Mesh(new THREE.BoxGeometry(.12, 11, .12), new THREE.MeshBasicMaterial({ color: i % 2 ? '#1d4ed8' : '#38bdf8' }));
      f.position.set(Math.sin(a) * 16.8, 6, -1 + Math.cos(a) * 16.8); s.add(f);
    }
    // pilares laterais do telão
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(rb(1.4, 9, 1.4, .1), new THREE.MeshStandardMaterial({ color: '#1e2a78', roughness: .4, metalness: .3 }));
      p.position.set(sx * 9.6, 4.25, -9.5); s.add(p);
      const fx = new THREE.Mesh(new THREE.BoxGeometry(.08, 8.6, .08), new THREE.MeshBasicMaterial({ color: '#60a5fa' }));
      fx.position.set(sx * 9.6 - sx * .72, 4.25, -8.79); s.add(fx);
      for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.CircleGeometry(.22, 20), new THREE.MeshBasicMaterial({ color: '#fff4d6' })); b.position.set(sx * 9.6, 1.6 + k * 1.5, -8.79); s.add(b); }
    }
    // treliça com refletores
    const metal = new THREE.MeshStandardMaterial({ color: '#2a3045', roughness: .5, metalness: .7 });
    const trel = new THREE.Mesh(new THREE.TorusGeometry(8.5, .12, 8, 96), metal); trel.rotation.x = Math.PI / 2; trel.position.set(0, 9.5, -1.5); s.add(trel);
    const trel2 = trel.clone(); trel2.position.y = 9.1; s.add(trel2);
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2;
      const x = Math.sin(a) * 8.5, z = -1.5 + Math.cos(a) * 8.5;
      const ref = new THREE.Group(); ref.position.set(x, 8.75, z); ref.lookAt(0, 0, -1.5); s.add(ref);
      const corpo = new THREE.Mesh(new THREE.CylinderGeometry(.22, .28, .5, 14), metal); corpo.rotation.x = Math.PI / 2; ref.add(corpo);
      const lente = new THREE.Mesh(new THREE.CircleGeometry(.2, 16), new THREE.MeshBasicMaterial({ color: i % 3 ? '#fff6dc' : '#7dd3fc' })); lente.position.z = .26; ref.add(lente);
    }
    // câmeras de TV decorativas
    this.camerasTV = [[-8.2, -5.8, .9], [8.2, -5.8, -.9]].map(([x, z, ry], i) => this.cameraTV(x, z, ry, i));
  }
  // ---------- câmeras de estúdio (pedestal com rodízios) + cinegrafistas ----------
  /** Materiais/geometrias/texturas compartilhados pelas câmeras de TV (criados uma vez). */
  kitCamera() {
    if (this.kitCam) return this.kitCam;
    const tex = (w, h, fn) => { const t = canvasTex(w, h); fn(t.ctx, w, h); t.tex.needsUpdate = true; return t.tex; };
    const logo = tex(256, 96, (c, w, h) => {
      c.fillStyle = '#0d1230'; c.fillRect(0, 0, w, h); c.fillStyle = '#facc15'; c.fillRect(0, h - 16, w, 8); c.fillStyle = '#22c55e'; c.fillRect(0, h - 8, w, 8);
      c.fillStyle = '#fff'; c.font = `46px ${FONTE}`; c.textBaseline = 'middle'; c.fillText('DEBATE', 14, 40); c.fillStyle = '#3b82f6'; c.fillText('TV', 190, 40);
    });
    const visor = tex(128, 96, (c, w, h) => { // imagem "ao vivo" no monitor do visor: palco, 3 silhuetas e REC
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1d3a9a'); gr.addColorStop(1, '#0b1550'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#c9cfe3'; for (const x of [22, 64, 106]) { c.fillRect(x - 10, 62, 20, 22); c.beginPath(); c.arc(x, 48, 8, 0, 7); c.fill(); }
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = '#ef4444'; c.beginPath(); c.arc(16, 16, 4, 0, 7); c.fill();
    });
    const geo = {
      pe: new THREE.BoxGeometry(.09, .07, .5), garfo: new THREE.BoxGeometry(.06, .09, .07), roda: new THREE.CylinderGeometry(.055, .055, .04, 14).rotateZ(Math.PI / 2),
      saia: new THREE.CylinderGeometry(.22, .3, .22, 20), faixa: new THREE.CylinderGeometry(.302, .302, .035, 20, 1, true),
      col: new THREE.CylinderGeometry(.1, .1, .8, 16), col2: new THREE.CylinderGeometry(.066, .066, .5, 12),
      volante: new THREE.TorusGeometry(.3, .022, 8, 32).rotateX(Math.PI / 2), raio: new THREE.BoxGeometry(.6, .018, .018),
      cabeca: rb(.26, .1, .28, .03), corpo: rb(.3, .34, .56, .05), lente: rb(.24, .26, .42, .04), anel: new THREE.BoxGeometry(.25, .27, .035),
      capuz: new THREE.CylinderGeometry(.25, .18, .2, 4, 1, true).rotateY(Math.PI / 4).rotateX(Math.PI / 2), vidro: new THREE.CircleGeometry(.1, 20),
      visor: rb(.27, .2, .2, .03), visorCapuz: new THREE.CylinderGeometry(.17, .155, .1, 4, 1, true).rotateY(Math.PI / 4).rotateX(-Math.PI / 2), tela: new THREE.PlaneGeometry(.21, .15),
      logo: new THREE.PlaneGeometry(.36, .135), tally: new THREE.BoxGeometry(.07, .035, .03), tallyV: new THREE.SphereGeometry(.025, 10, 8), punho: new THREE.CylinderGeometry(.028, .028, .15, 10),
    };
    const M = {
      preto: mat('#17191f', { r: .45, m: .4 }), cinza: mat('#3a4152', { r: .45, m: .6 }), cromo: mat('#b9c2d0', { r: .25, m: .85 }), borracha: mat('#0b0c10', { r: .9 }),
      vidro: new THREE.MeshStandardMaterial({ color: '#0a1838', roughness: .05, metalness: .9, envMapIntensity: 2 }),
      capuz: new THREE.MeshStandardMaterial({ color: '#17191f', roughness: .6, metalness: .3, side: THREE.DoubleSide }),
      amarelo: new THREE.MeshBasicMaterial({ color: '#facc15' }), logo: new THREE.MeshStandardMaterial({ map: logo, roughness: .5 }),
      tela: new THREE.MeshBasicMaterial({ map: visor, toneMapped: false, color: '#cfcfcf' }),
    };
    return this.kitCam = { geo, M };
  }
  /** Câmera de estúdio em pedestal (pan/tilt animados) com o(a) cinegrafista nas alças. Devolve as referências para o loop. */
  cameraTV(x, z, ry, i) {
    const { geo: G, M } = this.kitCamera();
    const add = (geo, m, px, py, pz, pai) => { const me = new THREE.Mesh(geo, m); me.position.set(px, py, pz); pai.add(me); return me; };
    const g = new THREE.Group(); g.position.set(x, -.25, z); g.rotation.y = ry; this.scene.add(g); // fora do palco: no piso do estúdio
    // pedestal: 3 pés com rodízios (um para a frente, dois para trás, abrindo espaço para quem opera), saia, coluna e volante
    for (let k = 0; k < 3; k++) {
      const p = new THREE.Group(); p.rotation.y = k * Math.PI * 2 / 3; g.add(p);
      add(G.pe, M.cinza, 0, .14, .32, p); add(G.garfo, M.preto, 0, .1, .56, p); add(G.roda, M.borracha, 0, .055, .58, p);
    }
    add(G.saia, M.preto, 0, .21, 0, g); add(G.faixa, M.amarelo, 0, .13, 0, g);
    add(G.col, M.cinza, 0, .72, 0, g); add(G.col2, M.cromo, 0, 1.3, 0, g);
    add(G.volante, M.borracha, 0, 1.0, 0, g);
    for (const a of [0, Math.PI / 3, -Math.PI / 3]) add(G.raio, M.cinza, 0, 1.0, 0, g).rotation.y = a;
    // cabo saindo da cabeça, descendo pela coluna e arrastando no chão
    const cabo = new THREE.CatmullRomCurve3([[0, 1.5, -.12], [.11, 1.2, -.12], [.13, .5, -.14], [.16, .1, -.3], [.3, .03, -.9], [.9 * (i ? -1 : 1), .03, -1.7], [1.1 * (i ? -1 : 1), .03, -2.8]].map(p => new THREE.Vector3(...p)));
    add(new THREE.TubeGeometry(cabo, 40, .018, 6), M.borracha, 0, 0, 0, g);
    // cabeça pan/tilt: pan gira em y; tilt inclina o corpo da câmera
    const pan = new THREE.Group(); pan.position.y = 1.5; g.add(pan);
    add(G.cabeca, M.cinza, 0, 0, 0, pan);
    const tilt = new THREE.Group(); tilt.position.y = .06; pan.add(tilt);
    add(G.corpo, M.preto, 0, .2, -.04, tilt);
    for (const s of [-1, 1]) add(G.logo, M.logo, s * .152, .2, -.06, tilt).rotation.y = s * Math.PI / 2;
    add(G.lente, M.cinza, 0, .19, .42, tilt); add(G.anel, M.amarelo, 0, .19, .28, tilt);
    add(G.capuz, M.capuz, 0, .19, .73, tilt); add(G.vidro, M.vidro, 0, .19, .635, tilt);
    // visor (monitor traseiro) com para-sol e imagem ao vivo
    add(G.visor, M.preto, 0, .47, -.14, tilt); add(G.visorCapuz, M.capuz, 0, .47, -.29, tilt);
    add(G.tela, M.tela, 0, .47, -.241, tilt).rotation.y = Math.PI;
    // tally (vermelha quando esta câmera está no ar): na frente da lente e em cima do visor
    const tallyMat = new THREE.MeshBasicMaterial({ color: '#ff1a1a', toneMapped: false });
    add(G.tally, tallyMat, 0, .33, .55, tilt); add(G.tallyV, tallyMat, 0, .59, -.12, tilt);
    // alças de pan: da cabeça para trás e para fora, até as mãos do(a) cinegrafista
    for (const s of [-1, 1]) {
      const a = new THREE.Vector3(s * .12, .02, -.12), b = new THREE.Vector3(s * .58, -.32, -.41), d = b.clone().sub(a);
      const bar = add(new THREE.CylinderGeometry(.016, .016, d.length(), 8), M.cromo, 0, 0, 0, pan); bar.position.copy(a).lerp(b, .5); bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      const pu = add(G.punho, M.borracha, 0, 0, 0, pan); pu.position.copy(b); pu.quaternion.copy(bar.quaternion);
    }
    // cinegrafista (equipe técnica: roupa escura, fone com microfone), em pé atrás, girando junto com a cabeça da câmera
    const op = new Avatar([
      { genero: 'masculino', pele: '#e0ac69', cabelo: 'curto', corCabelo: '#2b1d14', barba: 'cavanhaque', oculos: 'nenhum', chapeu: 'nenhum', roupa: 'polo', corRoupa: '#15161b', corCamisa: '#0d0e12', corGravata: '#000000', brinco: false, broche: false, corpo: 'medio', expressao: 'serio' },
      { genero: 'feminino', pele: '#8d5524', cabelo: 'cacheado', corCabelo: '#1a0f0a', barba: 'nenhuma', oculos: 'nenhum', chapeu: 'nenhum', roupa: 'polo', corRoupa: '#15161b', corCamisa: '#0d0e12', corGravata: '#000000', brinco: true, broche: false, corpo: 'medio', expressao: 'serio' },
    ][i % 2]);
    op.root.position.set(0, -1.5, -.78); pan.add(op.root); this.fone(op.cabeca);
    const marinho = mat('#1e2444', { r: .7 }); op.pernas.forEach(pv => pv.traverse(o => { if (o.isMesh && o.material.color.getHexString() !== '141414') o.material = marinho; }));
    return { g, pan, tilt, tallyMat, op, yaw: 0, pitch: 0, fase: i * 2.1 };
  }
  /** Fone de ouvido da equipe técnica (arco, conchas e microfone até a boca) na cabeça H de um Avatar. */
  fone(H) {
    const preto = mat('#1c1f26', { r: .45, m: .3 }), prata = mat('#a7b0bf', { r: .3, m: .7 }), amarelo = mat('#facc15', { r: .5 });
    const add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); H.add(me); return me; };
    const arco = add(new THREE.TorusGeometry(.33, .028, 8, 28, Math.PI), preto, 0, .33, 0); arco.scale.y = 1.2;
    for (const s of [-1, 1]) {
      add(new THREE.CylinderGeometry(.1, .1, .075, 20), preto, s * .32, .3, 0).rotation.z = Math.PI / 2;
      add(new THREE.CylinderGeometry(.075, .075, .08, 20), prata, s * .33, .3, 0).rotation.z = Math.PI / 2;
    }
    add(new THREE.CircleGeometry(.04, 3), amarelo, .375, .3, 0).rotation.y = Math.PI / 2;
    const a = new THREE.Vector3(.34, .24, .05), b = new THREE.Vector3(.13, .13, .26);
    const h = add(new THREE.CylinderGeometry(.012, .012, a.distanceTo(b), 8), preto, 0, 0, 0); h.position.copy(a).lerp(b, .5); h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    add(new THREE.SphereGeometry(.03, 12, 8), preto, .12, .13, .27);
  }
  /** Loop: câmeras fazem pan/tilt suave acompanhando quem fala (ou passeiam devagar); cinegrafistas respiram e seguram as alças. */
  animarCameras(dt, t) {
    const k = 1 - Math.exp(-dt * 1.4), alvo = _v;
    const fal = this.falante && this.podios.get(this.falante);
    if (this.duelo) alvo.set(DUELO.x, 1.5, DUELO.z); else if (fal) fal.ator.getWorldPosition(alvo).setY(1.6); else alvo.set(0, 1.5, -1);
    for (const c of this.camerasTV || []) {
      const p = c.g.position, dx = alvo.x - p.x, dz = alvo.z - p.z;
      const ocioso = fal || this.duelo ? 0 : Math.sin(t * .23 + c.fase) * .22;
      let yaw = Math.atan2(dx, dz) - c.g.rotation.y + ocioso; yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      c.yaw += (clamp(yaw, -.6, .6) + Math.sin(t * .7 + c.fase) * .012 - c.yaw) * k;
      c.pitch += (-Math.atan2(alvo.y - 1.36, Math.hypot(dx, dz)) + Math.sin(t * .5 + c.fase) * .01 - c.pitch) * k;
      c.pan.rotation.y = c.yaw; c.tilt.rotation.x = c.pitch;
      // tally acesa quando a câmera do "ar" (direção de TV) está ao lado desta
      const noAr = this.modo !== 'fp' && Math.hypot(this.camera.position.x - p.x, this.camera.position.z - p.z) < 4;
      c.tallyMat.color.setHex(noAr ? 0xff1a1a : 0x3a0606); // setHex: sem parse de string a cada frame
      const op = c.op; op.setOlhar(Math.sin(t * .31 + c.fase) * .05, -.05); op.update(dt, t);
      op.torso.rotation.x = .1 + Math.sin(t * 1.9 + c.fase) * .008; // debruçado no visor, respirando
      for (const b of op.bracos) { const s = b.userData.lado; b.rotation.set(-.35, s * .25, s * .32); b.userData.cot.rotation.x = -1.05; } // mãos nas alças
    }
  }
  construirTelao() {
    const s = this.scene;
    this.led = canvasTex(2048, 768);
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), new THREE.MeshBasicMaterial({ map: this.led.tex, toneMapped: false, color: '#c4c4c4' }));
    tela.position.set(0, 4.6, -10.4); s.add(tela); this.telaMesh = tela;
    const moldura = new THREE.Mesh(rb(16.5, 6.5, .3, .12), new THREE.MeshStandardMaterial({ color: '#141a3d', roughness: .4, metalness: .5 }));
    moldura.position.set(0, 4.6, -10.6); s.add(moldura);
    const base = new THREE.Mesh(new THREE.BoxGeometry(16.6, .08, .1), new THREE.MeshBasicMaterial({ color: '#facc15' })); base.position.set(0, 1.33, -10.4); s.add(base);
    // telas laterais
    this.lat = canvasTex(1024, 576);
    for (const sx of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(sx * 11.3, 3.4, -6.2); g.rotation.y = -sx * .75; s.add(g);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.25), new THREE.MeshBasicMaterial({ map: this.lat.tex, toneMapped: false, color: '#c4c4c4' })); g.add(m);
      const mo = new THREE.Mesh(rb(4.25, 2.5, .2, .08), new THREE.MeshStandardMaterial({ color: '#141a3d', roughness: .4, metalness: .5 })); mo.position.z = -.12; g.add(mo);
      const pe = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 2.3, 8), new THREE.MeshStandardMaterial({ color: '#2a3045', metalness: .7, roughness: .4 })); pe.position.y = -2.3; g.add(pe);
    }
  }
  construirPlateia() {
    const s = this.scene; const Ca = new THREE.Vector3(0, 0, -1.5);
    const ini = -125 * D2R, fim = 125 * D2R;
    const fileiras = 5, pessoas = [];
    const degrau = new THREE.MeshStandardMaterial({ color: '#241a5c', roughness: .7 });
    const frenteMat = new THREE.MeshStandardMaterial({ color: '#1a1245', roughness: .8, side: THREE.DoubleSide });
    for (let k = fileiras - 1; k >= 0; k--) {
      const r = 11.4 + k * 1.1, h = .45 * (k + 1) + .25, topo = .45 * (k + 1);
      // degrau: tampo em anel + parede frontal (+ parede de trás na última fileira)
      const tampo = new THREE.Mesh(new THREE.RingGeometry(r - .55, r + .55, 96, 1, ini - Math.PI / 2, fim - ini), degrau);
      tampo.rotation.x = -Math.PI / 2; tampo.position.set(Ca.x, topo, Ca.z); tampo.receiveShadow = true; s.add(tampo);
      const frente = new THREE.Mesh(new THREE.CylinderGeometry(r - .55, r - .55, h, 96, 1, true, ini, fim - ini), frenteMat);
      frente.position.set(Ca.x, topo - h / 2, Ca.z); s.add(frente);
      if (k === fileiras - 1) { const fundo = new THREE.Mesh(new THREE.CylinderGeometry(r + .55, r + .55, h + 3, 96, 1, true, ini, fim - ini), frenteMat); fundo.position.set(Ca.x, topo + 1.25 - h / 2, Ca.z); s.add(fundo); }
      const borda = new THREE.Mesh(new THREE.RingGeometry(r - .58, r - .52, 96, 1, ini - Math.PI / 2, fim - ini), new THREE.MeshBasicMaterial({ color: k % 2 ? '#7c3aed' : '#2563eb', side: THREE.DoubleSide }));
      borda.rotation.x = -Math.PI / 2; borda.position.set(Ca.x, topo + .012, Ca.z); s.add(borda);
      const passo = .72 / r;
      for (let a = ini + passo; a < fim - passo / 2; a += passo) {
        const graus = a / D2R; if (Math.abs(((graus + 200) % 50) - 25) < 2.2) continue; // corredores
        pessoas.push({ x: Ca.x + Math.sin(a) * r, z: Ca.z + Math.cos(a) * r, y: .45 * (k + 1), ry: a + Math.PI, fase: Math.random() * 10, f: .8 + Math.random() * .8 });
      }
    }
    this.pessoas = pessoas; const n = pessoas.length;
    const roupas = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#14b8a6', '#e5e7eb', '#334155', '#ec4899', '#1e3a8a', '#065f46'];
    const peles = ['#f6d3b3', '#eab68c', '#d19a6a', '#a8714a', '#7a4b2c', '#4f2f1c'];
    const cabelos = ['#151515', '#3b2416', '#6a4423', '#a0522d', '#d9b26f', '#8a8a8a'];
    const calcas = ['#1e293b', '#1e3a8a', '#374151', '#3f2a1d', '#111827', '#475569', '#78716c'];
    const sort = a => a[Math.random() * a.length | 0];
    pessoas.forEach(p => { p.roupa = sort(roupas); p.pele = sort(peles); p.calca = sort(calcas); p.bm = .55 + Math.random() * .45; });
    // cor por instância: fn(p) → cor; rep = instâncias por pessoa (braços/pernas)
    const mk = (geo, fn, rep = 1) => {
      const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: .75 }), n * rep);
      const c = new THREE.Color(); for (let i = 0; i < n * rep; i++) im.setColorAt(i, c.set(fn(pessoas[i / rep | 0])));
      im.castShadow = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); s.add(im); return im;
    };
    this.plCorpo = mk(rb(.46, .55, .32, .1), p => p.roupa); this.plCabeca = mk(rb(.34, .36, .32, .1), p => p.pele); this.plCabelo = mk(rb(.36, .12, .34, .05), () => sort(cabelos));
    // braços (pivô no ombro) + mãos na ponta; pernas: coxa e canela (pivô no topo), 2 por perna
    const pivo = (g, dy) => g.translate(0, dy, 0);
    this.plBraco = mk(pivo(new THREE.BoxGeometry(.13, .44, .13), -.22), p => p.roupa, 2);
    this.plMao = mk(pivo(new THREE.BoxGeometry(.11, .11, .11), -.48), p => p.pele, 2);
    this.plPerna = mk(pivo(new THREE.BoxGeometry(.17, .52, .17), -.26), p => p.calca, 4);
    this.empe = 0; this.levantarAte = 0; this.mBase = new THREE.Matrix4(); this.mLoc = new THREE.Matrix4(); this.eul = new THREE.Euler(0, 0, 0, 'ZXY');
    // rosto: olhos (branco + pupila) e boca na face +z da cabeça (frente = palco)
    const mkR = (geo, cor, qt, em) => { const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: cor, roughness: .6, emissive: em || '#000', emissiveIntensity: em ? .25 : 0 }), qt); im.castShadow = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); s.add(im); return im; };
    this.plOlho = mkR(new THREE.BoxGeometry(.085, .09, .02), '#f4f4f4', n * 2, '#ffffff'); this.plPupila = mkR(new THREE.BoxGeometry(.05, .065, .02), '#111111', n * 2);
    this.plBoca = mkR(new THREE.BoxGeometry(.13, .08, .02), '#3a0f12', n);
    pessoas.forEach(p => { p.pisca = 2.5 + Math.random() * 4; p.fb = .7 + Math.random() * .7; });
    this.mCab = new THREE.Matrix4(); this.mOff = new THREE.Matrix4(); this.mOut = new THREE.Matrix4(); this.grito = 0; this.gritoAte = 0;
    this.dummy = new THREE.Object3D();
    this.atualizarPlateia(0);
  }
  /** Plateia: sentada por padrão; com grito/vaia/agitação ergue e sacode os braços sentada; em `festejarPlateia` levanta e pula. */
  atualizarPlateia(t, dt = .016) {
    const d = this.dummy, ex = this.excitacao, mC = this.mCab, mO = this.mOff, mR = this.mOut, mB = this.mBase, mL = this.mLoc, eu = this.eul;
    if (this.grito && performance.now() > this.gritoAte) { this.grito *= .93; if (this.grito < .02) this.grito = 0; }
    const g = Math.max(ex, this.grito);
    const alvo = performance.now() < this.levantarAte ? 1 : 0; this.empe += (alvo - this.empe) * Math.min(1, dt * 3.5);
    const parte = (im, j, sx, sy, x, y, z) => { mO.makeScale(sx, sy, 1).setPosition(x, y, z); im.setMatrixAt(j, mR.multiplyMatrices(mC, mO)); };
    const seg = (ims, j, x, y, z, rx, rz) => { eu.set(rx, 0, rz); mL.makeRotationFromEuler(eu).setPosition(x, y, z); mR.multiplyMatrices(mB, mL); ims.forEach(im => im.setMatrixAt(j, mR)); };
    this.pessoas.forEach((p, i) => {
      const up = Math.max(0, Math.min(1, this.empe * 1.25 - (p.fase % 1) * .25)); // cada um levanta num tempo
      const sentado = Math.sin(t * p.f * 1.7 + p.fase) * .012 + g * (1 - up) * Math.abs(Math.sin(t * 6 * p.f + p.fase)) * .04;
      const pulo = sentado + up * Math.abs(Math.sin(t * 7 * p.f + p.fase)) * (.12 + .14 * Math.max(ex, .5));
      // quadril: sentado no degrau (y+.07, z+.08) → em pé no degrau da frente (y+.59, z+.6)
      const hy = .07 + up * .52, hz = .08 + up * .52, th = -Math.PI / 2 * (1 - up), kz = hz - .52 * Math.sin(th), ky = hy - .52 * Math.cos(th);
      mB.makeRotationY(p.ry).setPosition(p.x, p.y + pulo, p.z);
      for (let k = 0; k < 2; k++) {
        const x = k ? .11 : -.11, j = i * 4 + k * 2;
        seg([this.plPerna], j, x, hy, hz, th, 0); seg([this.plPerna], j + 1, x, ky, kz, 0, 0);
        // braços: repouso no colo; erguidos e sacudindo com grito/agitação (sentado) ou de pé
        const br = Math.max(up, g * p.bm), lado = k ? 1 : -1, osc = Math.sin(t * 9 * p.f + p.fase + k * 1.3);
        seg([this.plBraco, this.plMao], i * 2 + k, lado * .3, hy + .47, hz, -.6 - br * (2.25 + osc * .35), lado * (.08 - br * (.4 + osc * .12)));
      }
      mL.makeTranslation(0, hy + .26, hz); this.plCorpo.setMatrixAt(i, mR.multiplyMatrices(mB, mL));
      eu.set(Math.sin(t * .4 + p.fase) * .05, Math.sin(t * .3 + p.fase) * .25, 0, 'XYZ'); mL.makeRotationFromEuler(eu).setPosition(0, hy + .72, hz); eu.order = 'ZXY';
      mC.multiplyMatrices(mB, mL); this.plCabeca.setMatrixAt(i, mC);
      mO.makeTranslation(0, .19, 0); this.plCabelo.setMatrixAt(i, mR.multiplyMatrices(mC, mO));
      // piscar (~120ms por ciclo) e boca: traço fechado em repouso, abre/mexe com a excitação/grito
      const sy = (t + p.fase) % p.pisca < .12 ? .1 : 1;
      const ab = g > 0 ? g * (.55 + .45 * Math.abs(Math.sin(t * 13 * p.fb + p.fase))) : 0;
      for (let k = 0; k < 2; k++) { const x = (k ? .075 : -.075), j = i * 2 + k; parte(this.plOlho, j, 1, sy, x, .045, .162); parte(this.plPupila, j, 1, sy, x, .04, .17); }
      parte(this.plBoca, i, 1 - ab * .3, .3 + ab * 1.1, 0, -.075 - ab * .02, .165);
    });
    this.plCorpo.instanceMatrix.needsUpdate = this.plCabeca.instanceMatrix.needsUpdate = this.plCabelo.instanceMatrix.needsUpdate = true;
    this.plOlho.instanceMatrix.needsUpdate = this.plPupila.instanceMatrix.needsUpdate = this.plBoca.instanceMatrix.needsUpdate = true;
    this.plBraco.instanceMatrix.needsUpdate = this.plMao.instanceMatrix.needsUpdate = this.plPerna.instanceMatrix.needsUpdate = true;
  }
  construirLuzes() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#9fb4ff', '#24104a', .55));
    const key = this.key = new THREE.DirectionalLight('#fff4e6', .9); key.position.set(3, 12, 8); key.target.position.set(0, 0, -2);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 40 }); key.shadow.bias = -.0005;
    s.add(key, key.target);
    const ledLuz = new THREE.PointLight('#3b6bff', 14, 22, 1.6); ledLuz.position.set(0, 4, -8); s.add(ledLuz);
    const roxa = new THREE.PointLight('#a855f7', 12, 26, 1.6); roxa.position.set(-10, 6, 6); s.add(roxa);
    const roxa2 = roxa.clone(); roxa2.position.set(10, 6, 6); s.add(roxa2);
    this.spotMed = this.criarSpot(new THREE.Vector3(CENTRO.x, 0, CENTRO.z - .3), '#fff1d6');
  }
  criarSpot(alvo, cor) {
    const sp = new THREE.SpotLight(cor, 11, 16, .32, .55, 1.3);
    sp.position.set(alvo.x * 1.05, 8.6, alvo.z + 1.2); sp.target.position.copy(alvo).setY(1.2);
    this.scene.add(sp, sp.target);
    // refletor físico de onde a luz sai: haste descendo do teto, garfo e corpo apontado para o alvo; a lente brilha conforme a intensidade
    const K = this.kitSpot ||= { metal: mat('#23283a', { r: .45, m: .7 }), haste: new THREE.CylinderGeometry(.025, .025, 1, 6).translate(0, .5, 0), garfo: new THREE.BoxGeometry(.5, .05, .05),
      braco: new THREE.BoxGeometry(.04, .3, .05), corpo: new THREE.CylinderGeometry(.17, .21, .42, 14).rotateX(Math.PI / 2), aba: new THREE.CylinderGeometry(.24, .18, .14, 4, 1, true).rotateY(Math.PI / 4).rotateX(Math.PI / 2), lente: new THREE.CircleGeometry(.16, 18),
      aberta: new THREE.MeshStandardMaterial({ color: '#23283a', roughness: .5, metalness: .6, side: THREE.DoubleSide }) };
    const f = new THREE.Group(); f.position.copy(sp.position); f.rotation.y = Math.atan2(sp.target.position.x - sp.position.x, sp.target.position.z - sp.position.z); this.scene.add(f);
    const haste = new THREE.Mesh(K.haste, K.metal); haste.position.y = .3; haste.scale.y = 3; f.add(haste);
    const garfo = new THREE.Mesh(K.garfo, K.metal); garfo.position.y = .3; f.add(garfo);
    for (const s of [-1, 1]) { const b = new THREE.Mesh(K.braco, K.metal); b.position.set(s * .23, .15, 0); f.add(b); }
    const cab = new THREE.Group(); f.add(cab); cab.lookAt(sp.target.position); // Object3D.lookAt: +z aponta para o alvo
    cab.add(new THREE.Mesh(K.corpo, K.metal)); const aba = new THREE.Mesh(K.aba, K.aberta); aba.position.z = .27; cab.add(aba);
    const lente = new THREE.Mesh(K.lente, new THREE.MeshBasicMaterial({ color: cor, toneMapped: false })); lente.position.z = .215; cab.add(lente);
    sp.userData = { corpo: f, lente, cor }; this.brilhoSpot(sp);
    return sp;
  }
  /** Brilho da lente do refletor acompanha a intensidade real do SpotLight. */
  brilhoSpot(sp) { sp.userData.lente.material.color.set(sp.userData.cor).multiplyScalar(.15 + Math.min(1.3, sp.intensity / 22)); }
  construirMediadora() {
    const s = this.scene;
    const mesa = new THREE.Group(); mesa.position.copy(CENTRO); s.add(mesa);
    const corpo = new THREE.Mesh(rb(2.4, 1.0, .75, .12), new THREE.MeshStandardMaterial({ color: '#a4abc2', roughness: .4, metalness: .2 }));
    corpo.position.set(0, .5, .35); corpo.castShadow = corpo.receiveShadow = true; mesa.add(corpo);
    const tampo = new THREE.Mesh(rb(2.6, .06, .95, .03), new THREE.MeshStandardMaterial({ color: '#9fc3ff', roughness: .05, metalness: .1, transparent: true, opacity: .55 }));
    tampo.position.set(0, 1.03, .35); mesa.add(tampo);
    const faixa = new THREE.Mesh(new THREE.BoxGeometry(2.3, .06, .02), new THREE.MeshBasicMaterial({ color: '#facc15' })); faixa.position.set(0, .82, .73); mesa.add(faixa);
    const { ctx, tex } = canvasTex(1024, 256);
    const g = ctx.createLinearGradient(0, 0, 1024, 0); g.addColorStop(0, '#1238a8'); g.addColorStop(1, '#3b0f8a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#fff'; ctx.font = `110px ${FONTE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('MEDIAÇÃO', 512, 120);
    ctx.fillStyle = '#facc15'; ctx.fillRect(312, 200, 400, 14);
    this.mesaTex = { ctx, tex };
    const plaq = new THREE.Mesh(new THREE.PlaneGeometry(2.1, .52), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: '#c4c4c4' }));
    plaq.position.set(0, .48, .735); mesa.add(plaq);
    this.mediadora = new Avatar(AV_MEDIADORA); this.mediadora.root.position.set(0, 0, -.25); mesa.add(this.mediadora.root);
    this.mesaGrupo = mesa;
  }
  construirConfete() {
    const n = 500; const cores = ['#facc15', '#22c55e', '#3b82f6', '#ffffff', '#ef4444', '#a855f7'];
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(.09, .14), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), n);
    const c = new THREE.Color(); for (let i = 0; i < n; i++) im.setColorAt(i, c.set(cores[i % cores.length]));
    im.visible = false; im.frustumCulled = false; this.scene.add(im);
    this.confete = { im, ativo: false, ps: Array.from({ length: n }, () => ({ x: 0, y: -10, z: 0, vy: 0, rx: 0, ry: 0, vr: 0 })) };
  }

  /** Troca o(a) jornalista atrás da mesa (sorteado a cada partida). */
  setMediador(av) {
    const ant = this.mediadora; this.mesaGrupo.remove(ant.root);
    this.mediadora = new Avatar(av); this.mediadora.root.position.copy(ant.root.position); this.mesaGrupo.add(this.mediadora.root);  }
  // ===================== PÚLPITO CENTRAL (CONFRONTO DIRETO) =====================
  construirDuelo() {
    const s = this.scene;
    // dois púlpitos, um de frente para o outro (eixo x); só aparece durante o confronto
    // g = marcação fixa no chão (acende quando o púlpito chega); carro = os dois púlpitos sobre rodinhas, empurrados pela produção
    const g = new THREE.Group(); g.position.copy(DUELO); g.visible = false; s.add(g);
    const carro = new THREE.Group(); carro.position.copy(DUELO); carro.visible = false; s.add(carro);
    const branco = new THREE.MeshStandardMaterial({ color: '#a4abc2', roughness: .4, metalness: .15 });
    const matChao = [];
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 2, .08, 64), new THREE.MeshStandardMaterial({ color: '#c9cfe3', roughness: .3, metalness: .3, transparent: true }));
    base.position.y = .04; base.receiveShadow = true; g.add(base); matChao.push(base.material);
    const anel = (r, cor, y, tubo) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, tubo, 8, 96), new THREE.MeshBasicMaterial({ color: cor, transparent: true })); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); matChao.push(t.material); };
    anel(2, '#facc15', .06, .035); anel(2.15, '#22d3ee', .015, .03);
    // painel frontal: faixas verde e amarela nas pontas, placa central
    const fr = canvasTex(512, 384), c = fr.ctx;
    const gr = c.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, '#c4b5fd'); gr.addColorStop(1, '#7c6fd6'); c.fillStyle = gr; c.fillRect(0, 0, 512, 384);
    for (const sx of [1, -1]) {
      c.save(); if (sx < 0) { c.translate(512, 0); c.scale(-1, 1); }
      [['#16a34a', 10], ['#facc15', 60]].forEach(([cor, x]) => { c.beginPath(); c.moveTo(x, 384); c.lineTo(x + 50, 0); c.lineTo(x + 85, 0); c.lineTo(x + 35, 384); c.closePath(); c.fillStyle = cor; c.fill(); });
      c.restore();
    }
    rr(c, 150, 40, 212, 300, 30); c.fillStyle = '#1e1b4b'; c.fill(); c.lineWidth = 8; c.strokeStyle = '#a5b4fc'; c.stroke();
    c.fillStyle = '#facc15'; c.font = `30px ${FONTE}`; c.textAlign = 'center'; c.fillText('CONFRONTO', 256, 310);
    fr.tex.needsUpdate = true;
    const frMat = new THREE.MeshStandardMaterial({ map: fr.tex, roughness: .35 });
    // tela (cronômetro / nota de quem fala): na frente e em cima de cada púlpito
    const tl = canvasTex(512, 256);
    const telaMat = new THREE.MeshBasicMaterial({ map: tl.tex, toneMapped: false, color: '#d0d0d0' });
    const preto = new THREE.MeshStandardMaterial({ color: '#111318', roughness: .4, metalness: .6 });
    const rodas = [];
    for (const sx of [-1, 1]) {
      // cada púlpito: frente (local +z) virada para o adversário; o candidato fica atrás (local -z)
      const h = new THREE.Group(); h.position.set(sx * (DUELO_X - .66), 0, 0); h.rotation.y = -sx * Math.PI / 2; carro.add(h);
      // rodinhas (giram conforme o carro anda)
      for (const [rx, rz] of [[-.4, -.22], [.4, -.22], [-.4, .22], [.4, .22]]) {
        const r = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .03, 14), preto); r.rotation.z = Math.PI / 2; r.position.set(rx, .045, rz); h.add(r); rodas.push({ r, s: sx });
        const marca = new THREE.Mesh(new THREE.BoxGeometry(.02, .06, .032), branco); r.add(marca); // deixa o giro visível
        const sup = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .05), preto); sup.position.set(rx, .095, rz); h.add(sup);
      }
      const corpo = new THREE.Mesh(rb(1.0, 1.02, .6, .1), branco); corpo.position.set(0, .6, 0); h.add(corpo);
      const tampa = new THREE.Mesh(rb(1.15, .1, .78, .04), branco); tampa.position.set(0, 1.15, -.02); tampa.rotation.x = -.08; h.add(tampa);
      const faixa = new THREE.Mesh(new THREE.BoxGeometry(1.08, .035, .7), new THREE.MeshBasicMaterial({ color: '#facc15' })); faixa.position.set(0, 1.085, -.02); h.add(faixa);
      [corpo, tampa].forEach(m => { m.castShadow = m.receiveShadow = true; });
      const frente = new THREE.Mesh(new THREE.PlaneGeometry(.92, .9), frMat); frente.position.set(0, .6, .302); h.add(frente);
      const telaF = new THREE.Mesh(new THREE.PlaneGeometry(.36, .18), telaMat); telaF.position.set(0, .72, .305); h.add(telaF);
      const t = new THREE.Mesh(new THREE.PlaneGeometry(.42, .21), telaMat);
      t.rotation.set(.55 - Math.PI / 2, Math.PI, 0, 'YXZ'); t.position.set(0, 1.275, .1); h.add(t);
      const mold = new THREE.Mesh(new THREE.PlaneGeometry(.47, .26), new THREE.MeshBasicMaterial({ color: '#0a0a0a' }));
      mold.rotation.copy(t.rotation); mold.position.set(0, 1.275 - Math.cos(.55) * .004, .1 + Math.sin(.55) * .004); h.add(mold);
      const pe = new THREE.Mesh(new RoundedBoxGeometry(.4, .04, .12, 2, .015), new THREE.MeshStandardMaterial({ color: '#1f2433', roughness: .4, metalness: .4 })); pe.position.set(0, 1.215, .17); h.add(pe);
      // microfone apontado para quem está ali
      const b0 = new THREE.Vector3(.38, 1.21, .2), b1 = new THREE.Vector3(.26, 1.55, .08);
      const haste = new THREE.Mesh(new THREE.CylinderGeometry(.011, .013, b0.distanceTo(b1), 8), preto);
      haste.position.copy(b0).lerp(b1, .5); haste.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b1.clone().sub(b0).normalize()); h.add(haste);
      const cab = new THREE.Mesh(new THREE.SphereGeometry(.05, 14, 10), new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: .95 })); cab.position.copy(b1).add(new THREE.Vector3(0, .02, 0)); h.add(cab);
    }
    // chassi: duas longarinas baixas unindo as metades (vão livre no meio para a lâmpada do piso), travessas e rodízios centrais
    for (const z of [-.3, .3]) {
      const lg = new THREE.Mesh(new THREE.BoxGeometry(2.1, .06, .07), preto); lg.position.set(0, .13, z); lg.castShadow = true; carro.add(lg);
      const wg = new THREE.Group(); wg.position.set(0, 0, z); wg.rotation.y = Math.PI / 2; carro.add(wg); // eixo da roda ao longo de z (igual às metades)
      const r = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .03, 14), preto); r.rotation.z = Math.PI / 2; r.position.y = .045; wg.add(r); rodas.push({ r, s: -1 });
      r.add(new THREE.Mesh(new THREE.BoxGeometry(.02, .06, .032), branco));
      const sup = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, .05), preto); sup.position.set(0, .095, z); carro.add(sup);
    }
    for (const x of [-.45, .45]) { const tv = new THREE.Mesh(new THREE.BoxGeometry(.06, .05, .66), preto); tv.position.set(x, .13, 0); carro.add(tv); }
    // lâmpada (ideia) no centro da base
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.09, 16, 12), new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true })); lamp.position.set(0, .2, 0); g.add(lamp); matChao.push(lamp.material);
    this.dueloObj = { grupo: g, carro, rodas, matChao, tela: tl, telaKey: '' };
    this.construirProducao();
    this.desenharTelaPodio(this.dueloObj, { titulo: 'Confronto direto', texto: 'DUELO' });
    this.spotDuelo = this.criarSpot(DUELO.clone(), '#fff3dd'); this.spotDuelo.intensity = 0; this.brilhoSpot(this.spotDuelo);
    this.duelo = null; this.dueloKey = '';
  }
  /** Lugar de cada lado do púlpito central: lado -1 = esquerda (x < 0), 1 = direita. Virados um para o outro. */
  lugarDuelo(lado) { return { pos: new THREE.Vector3(DUELO.x + lado * DUELO_X, 0, DUELO.z), yaw: -lado * Math.PI / 2 }; }
  visDuelo() {
    const o = this.dueloObj; if (!o) return; const vis = this.modo !== 'vitrine';
    o.carro.visible = vis; o.grupo.visible = vis && this.pulp.chao > .01; // carro e produtora ficam sempre no estúdio
    this.producao.root.visible = vis;
  }
  // ---------- produção: a(o) assistente empurra o púlpito do confronto para dentro (bloco 2) e para fora (bloco 3) ----------
  construirProducao() {
    const av = this.producao = new Avatar({ genero: 'feminino', pele: '#c68a5e', cabelo: 'cacheado', corCabelo: '#4a2614', barba: 'nenhuma', oculos: 'nenhum', chapeu: 'nenhum',
      roupa: 'blazer', corRoupa: '#17181d', corCamisa: '#0d0e12', corGravata: '#000000', brinco: true, broche: false, corpo: 'medio', expressao: 'simpatico' });
    av.empurra = 0; av.cruza = 1;
    const T = av.torso, H = av.cabeca, fr = .195;
    const preto = mat('#1c1f26', { r: .45, m: .3 }), prata = mat('#a7b0bf', { r: .3, m: .7 }), amarelo = mat('#facc15', { r: .5 });
    const add = (geo, m, x, y, z, pai) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); pai.add(me); return me; };
    const barra = (a, b, r, m, pai) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8), m); me.position.copy(a).lerp(b, .5); me.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); pai.add(me); return me; };
    this.fone(H); // headset: arco sobre a cabeça, conchas nas orelhas e microfone até a boca
    // crachá no cordão amarelo
    const pescoco = [new THREE.Vector3(-.075, .76, fr + .02), new THREE.Vector3(.075, .76, fr + .02)], cracha = new THREE.Vector3(0, .43, fr + .025);
    pescoco.forEach(p => barra(p, cracha, .012, amarelo, T));
    const tex = (w, h, fn) => { const t = canvasTex(w, h); fn(t.ctx, w, h); t.tex.needsUpdate = true; return new THREE.MeshBasicMaterial({ map: t.tex }); };
    add(new THREE.PlaneGeometry(.11, .13), tex(88, 104, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#2563eb'; c.fillRect(0, 0, w, 12); c.lineWidth = 4; c.strokeStyle = '#2563eb'; c.strokeRect(2, 2, w - 4, h - 4);
      c.fillStyle = '#0f172a'; rr(c, 18, 40, 36, 30, 6); c.fill(); c.beginPath(); c.moveTo(54, 55); c.lineTo(72, 43); c.lineTo(72, 67); c.closePath(); c.fill();
    }), 0, .36, fr + .03, T);
    // emblema PRODUÇÃO JORNAL no peito
    add(new THREE.PlaneGeometry(.15, .095), tex(150, 95, (c, w, h) => {
      c.fillStyle = '#0b0b0e'; c.fillRect(0, 0, w, h); c.lineWidth = 6; c.strokeStyle = '#facc15'; c.strokeRect(5, 5, w - 10, h - 10);
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = `bold 26px ${FONTE_TXT}`; c.fillText('PRODUÇÃO', w / 2, 43); c.fillText('JORNAL', w / 2, 74);
    }), .2, .58, fr + .012, T);
    // rádio comunicador na cintura
    add(new THREE.BoxGeometry(.075, .13, .045), preto, .2, .1, fr + .03, T);
    barra(new THREE.Vector3(.18, .16, fr + .03), new THREE.Vector3(.18, .27, fr + .03), .008, preto, T);
    for (const y of [.07, .09]) add(new THREE.BoxGeometry(.045, .008, .005), amarelo, .2, y, fr + .054, T);
    // calça azul-marinho e tênis brancos
    const sapato = mat('#141414', { r: .35 }), marinho = mat('#1e2444', { r: .7 }), tenis = mat('#eef1f6', { r: .5 });
    av.pernas.forEach(pv => pv.traverse(o => { if (o.isMesh) o.material = o.material === sapato ? tenis : marinho; }));
    this.scene.add(av.root);
    this.pulp = { fase: 'fora', t: 0, chao: 0, quer: false, lado: 0, s: 1, etapa: 0 }; // lado: 0 = A (x > 0), 1 = B
    this.fimPulpito('fora'); // começa estacionado no lado A, produtora parada ao lado
  }
  /** Bloco 2: o púlpito do confronto deve estar no palco; bloco 3: sai. instantaneo = sem animação (entrou no meio). */
  /** depois (só com instantaneo): true = já passou do confronto (estaciona em B), false = antes (A), undefined = mantém o lado. */
  setPulpito(quer, instantaneo, depois) {
    const P = this.pulp;
    if (instantaneo) { P.quer = quer; if (!quer && depois !== undefined) P.lado = depois ? 1 : 0; this.fimPulpito(quer ? 'dentro' : 'fora'); return; }
    if (quer === P.quer) return; P.quer = quer;
    const { carro } = this.dueloObj, c = carro.position;
    // entrando: volta depois para o lado de onde o carro saiu; saindo: leva para o lado oposto ao que veio
    P.lado = quer ? (c.x >= 0 ? 0 : 1) : 1 - P.lado;
    P.alvo = quer ? DUELO.clone() : PULP_PARK[P.lado].clone(); P.yawAlvo = quer ? 0 : PULP_YAW[P.lado];
    P.s = c.x - P.alvo.x >= 0 ? 1 : -1; // 1 = segura no +x local e empurra para -x
    P.som?.parar(); P.som = null; P.fase = quer ? 'entrando' : 'saindo'; P.trav = 0; P.etapa = 0;
    this.etapaPulpito(); this.visDuelo();
  }
  /** Ponto de descanso da produtora no lado l: na ponta de fora do carro estacionado (= onde ela pega para empurrar ao centro). */
  descanso(l) { return noCarro(PULP_PARK[l], PULP_YAW[l], (l ? -1 : 1) * PULP_PEGA, 0); }
  /** Caminho a pé até o ponto xl (x local) ao lado do carro, contornando-o pelo fundo (z local -) se precisar trocar de lado. */
  rotaAte(de, xl) {
    const { carro } = this.dueloObj, c = carro.position, y = carro.rotation.y, l = doCarro(c, y, de), pts = [de.clone().setY(0)];
    if (Math.sign(l.x) !== Math.sign(xl) && Math.abs(l.z) < 1) pts.push(noCarro(c, y, Math.sign(l.x || 1) * PULP_PEGA, -1.05), noCarro(c, y, Math.sign(xl) * PULP_PEGA, -1.05));
    pts.push(noCarro(c, y, xl, 0)); return pts;
  }
  /** Monta a etapa atual: 0 anda até o carro, 1 pega, 2 empurra, 3 solta, 4 anda até o descanso. */
  etapaPulpito() {
    const P = this.pulp, { carro } = this.dueloObj, R = this.producao.root, entra = P.fase === 'entrando';
    const anda = (pts, yawFim) => { let L = 0; for (let i = 1; i < pts.length; i++) L += pts[i].distanceTo(pts[i - 1]); return { tipo: 'anda', pts, L, yawFim, dur: L < .05 ? 0 : Math.max(.8, L / VEL_PROD) }; };
    const praCentro = p => Math.atan2(DUELO.x - p.x, DUELO.z - p.z);
    P.t = 0;
    if (P.etapa === 0) P.e = anda(this.rotaAte(R.position, P.s * PULP_PEGA), carro.rotation.y - P.s * Math.PI / 2);
    else if (P.etapa === 1 || P.etapa === 3) P.e = { tipo: P.etapa === 1 ? 'pega' : 'solta', dur: .6 };
    else if (P.etapa === 2) P.e = { tipo: 'empurra', ini: carro.position.clone().setY(0), yaw0: carro.rotation.y, dur: PULP_EMPURRA * clamp(carro.position.distanceTo(P.alvo) / 7, .3, 1.3) };
    else { const fim = this.descanso(P.lado); P.e = anda(entra ? [R.position.clone().setY(0), fim] : this.rotaAte(R.position, -P.s * PULP_PEGA), praCentro(fim)); }
  }
  /** Produtora parada (sem andar/empurrar) em pos, virada para o centro do palco. */
  pararProducao(pos) { const av = this.producao, R = av.root; R.position.copy(pos).setY(0); R.rotation.y = Math.atan2(DUELO.x - pos.x, DUELO.z - pos.z); av.andar = 0; av.empurra = 0; }
  fimPulpito(fase) {
    const P = this.pulp, { carro } = this.dueloObj, dentro = fase === 'dentro';
    P.som?.parar(); P.som = null; P.fase = fase; P.trav = 0; P.e = null;
    carro.position.copy(dentro ? DUELO : PULP_PARK[P.lado]).setY(0); carro.rotation.y = dentro ? 0 : PULP_YAW[P.lado];
    this.pararProducao(this.descanso(P.lado)); this.chaoDuelo(dentro ? 1 : 0); this.visDuelo();
  }
  chaoDuelo(k) { this.pulp.chao = k; this.dueloObj.matChao.forEach(m => { m.opacity = k; }); this.dueloObj.grupo.visible = this.modo !== 'vitrine' && k > .01; }
  /** Som posicional: volume pela distância até a câmera e pan pelo lado da tela. */
  somEm(pos, base = 1) {
    const cam = this.camera; cam.updateMatrixWorld(); const l = cam.worldToLocal(pos.clone());
    const d = l.length(); return { vol: base * clamp(2.2 / (1 + d * .45), 0, 1), pan: clamp(l.x / Math.max(1, d) * 1.4, -.85, .85) };
  }
  /** Linha do tempo da produção: anda até o carro → pega → empurra (centro ou estacionamento) → solta → anda até o descanso. */
  animarPulpito(dt) {
    const P = this.pulp; if (P.fase !== 'entrando' && P.fase !== 'saindo') return;
    const { carro, rodas } = this.dueloObj, av = this.producao, R = av.root, E = P.e, entra = P.fase === 'entrando';
    P.t += dt; const u = E.dur ? Math.min(1, P.t / E.dur) : 1;
    const pega = () => ({ pos: noCarro(carro.position, carro.rotation.y, P.s * PULP_PEGA, 0), yaw: carro.rotation.y - P.s * Math.PI / 2 });
    const virar = (alvo, k) => { let dy = alvo - R.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); R.rotation.y += dy * (1 - Math.exp(-dt * k)); };
    if (E.tipo === 'anda') { // caminhada pela rota (trecho a trecho), virando para yawFim no fim
      let d = trap(u) * E.L, i = 1; while (i < E.pts.length - 1 && d > E.pts[i].distanceTo(E.pts[i - 1])) { d -= E.pts[i].distanceTo(E.pts[i - 1]); i++; }
      const a = E.pts[i - 1], b = E.pts[i], sl = a.distanceTo(b); if (sl > 1e-4) R.position.lerpVectors(a, b, Math.min(1, d / sl)); else R.position.copy(b);
      virar(u > .88 || sl < 1e-4 ? E.yawFim : Math.atan2(b.x - a.x, b.z - a.z), 5); av.andar = u < .97 ? clamp(Math.min(u, 1 - u) * 8, .35, 1) : 0; av.empurra = 0;
    } else if (E.tipo === 'pega') { av.andar = 0; av.empurra = 1; const p = pega(); R.position.lerp(p.pos, 1 - Math.exp(-dt * 8)); virar(p.yaw, 8); }
    else if (E.tipo === 'solta') { av.andar = 0; av.empurra = 0; }
    else { // empurrando
      const posAntes = carro.position.clone();
      carro.position.lerpVectors(E.ini, P.alvo, trap(u));
      carro.rotation.y = E.yaw0 + (P.yawAlvo - E.yaw0) * (entra ? sm((u - .55) / .45) : sm(u / .45));
      const p = pega(); R.position.copy(p.pos); R.rotation.y = p.yaw; av.empurra = 1;
      const vel = carro.position.distanceTo(posAntes) / Math.max(dt, 1e-3); av.andar = Math.sqrt(clamp(vel / 2.3, 0, 1));
      rodas.forEach(({ r, s }) => { r.rotation.x += s * P.s * vel * dt / .045; }); // cada metade do carro está espelhada: sentido por lado e pelo sentido do empurrão
      if (!P.trav) { P.trav = 1; this.onSom?.('trava', this.somEm(carro.position, .9)); }
      if (P.trav === 1 && !P.som) P.som = this.onSom?.('rodinhas') || null; // tenta de novo se o áudio ainda estava suspenso
      const se = this.somEm(carro.position); P.som?.set(clamp(vel / 2.2, 0, 1), se.vol, se.pan);
      if (entra) this.chaoDuelo(sm((u - .7) / .3)); else this.chaoDuelo(1 - sm(u / .3));
      if (u >= 1) { P.trav = 2; P.som?.parar(); P.som = null; this.onSom?.('trava', this.somEm(carro.position, .9)); }
    }
    if (u >= 1) { if (++P.etapa > 4) { this.fimPulpito(entra ? 'dentro' : 'fora'); return; } this.etapaPulpito(); }
    carro.position.y = 0; R.position.y = 0; // todo o trajeto fica dentro do palco (raio 9.2): nada desce para o piso
  }
  /** Estado do confronto vindo do servidor: { a, b, fase: 'indo' | 'no' | 'voltando' } ou null. */
  setDuelo(d) {
    const k = d ? d.fase + d.a + d.b : ''; if (k === this.dueloKey) return; this.dueloKey = k;
    this.duelo = d || null;
    // (se o carro já chegou e só a produtora está indo embora, deixa ela terminar de sair)
    if (d && this.pulp.fase !== 'dentro' && !(this.pulp.fase === 'entrando' && this.pulp.trav === 2)) { this.pulp.quer = true; this.fimPulpito('dentro'); } // pularam a introdução: o púlpito já precisa estar lá
    this.aplicarDuelo(false); this.visDuelo();
    if (!d || d.fase !== 'no') this.desenharTelaPodio(this.dueloObj, { titulo: 'Confronto direto', texto: 'DUELO' });
  }
  aplicarDuelo(instantaneo) {
    const d = this.duelo;
    const ids = d && d.fase !== 'voltando' ? [d.a, d.b].filter(id => this.podios.has(id)) : [];
    // quem está mais à esquerda no palco fica com o lado esquerdo (assim os dois não se cruzam)
    const xs = ids.map(id => this.podios.get(id).grupo.position.x);
    const ladoDe = k => ids.length < 2 || xs[k] < xs[1 - k] || (xs[k] === xs[1 - k] && k === 0) ? -1 : 1;
    for (const p of this.podios.values()) {
      const k = ids.indexOf(p.id);
      const quer = k >= 0 ? 'duelo' : 'podio';
      if (k >= 0) p.lado = ladoDe(k);
      if (p.lugar === quer && !p.caminho) { if (instantaneo) this.colocarAtor(p, quer); continue; }
      if (p.caminho?.destino === quer && !instantaneo) continue; // já está a caminho
      if (instantaneo || (d && d.fase === 'no' && quer === 'duelo')) { this.colocarAtor(p, quer); continue; } // entrou no meio: já aparece no lugar
      this.caminhar(p, quer);
    }
    this.spotDuelo.intensity = d?.fase === 'no' ? 18 : d ? 8 : 0;
    this.brilhoSpot(this.spotDuelo);
  }
  /** Onde fica o ator (no mundo) no púlpito dele e no púlpito central. */
  casaAtor(p) { p.grupo.updateMatrixWorld(); return { pos: p.grupo.localToWorld(new THREE.Vector3(0, 0, -.62)), yaw: p.grupo.rotation.y }; }
  colocarAtor(p, lugar) {
    p.caminho = null; p.avatar.andar = 0; p.lugar = lugar;
    if (lugar === 'podio') { p.grupo.add(p.ator); p.ator.position.set(0, 0, -.62); p.ator.rotation.set(0, 0, 0); return; }
    const l = this.lugarDuelo(p.lado); this.scene.add(p.ator); p.ator.position.copy(l.pos); p.ator.rotation.set(0, l.yaw, 0);
  }
  /** Caminhada automática: sai pela lateral do púlpito, contorna pela frente e chega por trás do púlpito central (ou o inverso). */
  caminhar(p, destino) {
    const g = p.grupo; g.updateMatrixWorld();
    const casa = this.casaAtor(p), l = this.lugarDuelo(p.lado);
    const sd = Math.sign(g.worldToLocal(DUELO.clone()).x) || 1;
    const w1 = g.localToWorld(new THREE.Vector3(sd * .85, 0, -.62)), w2 = g.localToWorld(new THREE.Vector3(sd * .85, 0, .75));
    const w3 = l.pos.clone().add(new THREE.Vector3(0, 0, .95));
    let pts = [casa.pos, w1, w2, w3, l.pos], yawFim = l.yaw;
    if (destino === 'podio') { pts = pts.reverse(); yawFim = casa.yaw; }
    // começa de onde o ator está agora (se a caminhada anterior foi interrompida)
    this.scene.attach(p.ator); pts[0] = p.ator.position.clone().setY(0);
    // attach recalcula a rotação em ordem XYZ (yaw > 90° vira (π, π−yaw, π)): normaliza para só yaw, senão o giro inverte
    p.ator.rotation.set(0, new THREE.Euler().setFromQuaternion(p.ator.quaternion, 'YXZ').y, 0);
    // interrompida no meio: volta pela mesma curva, de trás para frente (sem ir até o fim antes de dar meia-volta)
    const ant = p.caminho;
    if (ant && ant.curva.getPointAt(0).distanceTo(destino === 'podio' ? casa.pos : l.pos) < .1) {
      const e0 = trap(Math.min(1, ant.t / ant.dur), .22); pts = [1, .66, .33, 0].map(k => ant.curva.getPointAt(e0 * k));
    }
    // curva suave pelos pontos (sem quinas): a câmera em 1ª pessoa faz as curvas sem trancos
    const ptsOk = pts.filter((q, i) => i === 0 || q.distanceTo(pts[i - 1]) > .05);
    if (ptsOk.length < 2) { this.colocarAtor(p, destino); return; } // quase não saiu do lugar: só volta
    const curva = new THREE.CatmullRomCurve3(ptsOk, false, 'centripetal');
    const tot = curva.getLength();
    const dur = clamp(tot / VEL_ANDAR, 1.5, 5); // o servidor espera 5,5 s: todos chegam a tempo
    p.caminho = { curva, tot, dur, t: 0, yawFim, destino, yaw0: p.ator.rotation.y };
    p.lugar = 'andando';
    if (p.id === this.meuId) { this.olhar.y = 0; this.olhar.p = -.05; this.suaveAte = this.t + 1.2; }
  }
  andarAtores(dt) {
    for (const p of this.podios.values()) {
      const c = p.caminho; if (!c) continue;
      c.t += dt; const u = Math.min(1, c.t / c.dur);
      const e = trap(u, .22); // acelera, anda e freia suave
      c.curva.getPointAt(e, p.ator.position);
      // olha um pouco à frente na curva (antecipa as curvas); no início e no fim, o giro entra/sai com calma
      const tg = c.curva.getTangentAt(Math.min(1, e + .04), _v);
      const rumo = Math.atan2(tg.x, tg.z), fim = sm((u - .8) / .2);
      let dr = c.yawFim - rumo; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      let d0 = rumo - c.yaw0; d0 = Math.atan2(Math.sin(d0), Math.cos(d0));
      const alvo = c.yaw0 + d0 * sm(u / .2) + dr * fim;
      let dy = alvo - p.ator.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      p.ator.rotation.y += dy * (1 - Math.exp(-dt * (p.id === this.meuId ? 4.5 : 7)));
      p.avatar.andar = u < .97 ? clamp(Math.min(u, 1 - u) * 8, .35, 1) : 0;
      if (u >= 1 && Math.abs(dy) < .01) {
        this.colocarAtor(p, c.destino);
        if (p.id === this.meuId) { this.olhar.y = 0; this.olhar.p = c.destino === 'duelo' ? -.08 : -.05; this.suaveAte = this.t + 1.2; }
      }
    }
  }
  /** Som de passos: um passo cada vez que a perna de apoio troca (fase da caminhada cruza meia-volta). */
  passos(av, pos, eu, tenis = false) {
    // o calcanhar toca o chão em π/2 + kπ (pernas no extremo); -.45 compensa a suavização das pernas dos outros avatares
    const n = Math.floor((av.faseAndar - (eu ? 0 : .45)) / Math.PI + .5);
    if (av._passoN === undefined) { av._passoN = n; return; }
    if (n === av._passoN) return; av._passoN = n;
    if (av.andar < .2 || !this.onSom) return;
    if (eu) this.onSom('passo', { vol: .6, pan: Math.sign(Math.sin(av.faseAndar)) * .12 });
    else this.onSom('passo', { ...this.somEm(pos.clone().setY(.1), .8), tenis });
  }
  /** Você está sendo levado(a) automaticamente: a câmera não responde ao mouse. */
  andandoEu() { return !!this.podios.get(this.meuId)?.caminho; }
  // ===================== PÚLPITOS E JOGADORES =====================
  posicaoSlot(i, n) {
    const a = ANGULOS[n][i] * D2R;
    return { pos: new THREE.Vector3(CENTRO.x + Math.sin(a) * RAIO, 0, CENTRO.z + Math.cos(a) * RAIO), rot: a + Math.PI };
  }
  setJogadores(lista, meuId) {
    this.meuId = meuId;
    const ordenada = lista.slice().sort((a, b) => a.slot - b.slot);
    const n = Math.max(1, Math.min(5, ordenada.length));
    const chave = ordenada.map(j => j.id + JSON.stringify(j.avatar) + j.partido + j.nome + !!j.bot).join('|') + n + meuId;
    if (chave === this.chaveJog) { this.atualizarNiveis(lista); this.atualizarConexoes(lista); return; }
    this.chaveJog = chave;
    for (const p of this.podios.values()) { this.scene.remove(p.grupo, p.ator, p.spot, p.spot.target, p.spot.userData.corpo); }
    this.podios.clear();
    ordenada.forEach((j, i) => this.podios.set(j.id, this.criarPodio(j, i, n)));
    this.jogadores = ordenada;
    this.aplicarDuelo(true);
    this.atualizarConexoes(lista);
    this.aplicarFalante();
    this.setModo(this.modo);
  }
  atualizarNiveis(lista) { for (const j of lista) { const p = this.podios.get(j.id); if (p && p.et && (j.nivel || 0) !== p.nivel) { p.nivel = j.nivel || 0; desenharEtiqueta(p.et, j, p.partido); } } }
  atualizarConexoes(lista) {
    for (const j of lista) {
      const p = this.podios.get(j.id); if (!p) continue;
      const presente = (j.conectado || j.id === this.meuId) && !j.banido; // banido: o púlpito fica vazio
      p.avatar.root.visible = presente; p.etiqueta.visible = presente && this.cfg.nomes && j.id !== this.meuId;
      p.faixaLuz.visible = !j.banido;
    }
  }
  /** Balão de grito saindo da plateia. */
  gritoPlateia(texto) {
    const p = this.pessoas[Math.random() * this.pessoas.length | 0]; if (!p) return;
    const { ctx, tex } = canvasTex(512, 160);
    ctx.font = `bold 64px ${FONTE}`; const w = Math.min(500, ctx.measureText(texto).width + 60);
    rr(ctx, (512 - w) / 2, 10, w, 110, 40); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#1a1052'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(236, 118); ctx.lineTo(256, 152); ctx.lineTo(276, 118); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.fillStyle = '#1a1052'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(texto, 256, 68);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const base = new THREE.Vector3(p.x, p.y + 1.5, p.z); sp.position.copy(base); sp.scale.set(2.4, .75, 1); this.scene.add(sp);
    this.efeitos.push({ sp, t0: this.t, base });
  }
  criarPodio(j, i, n) {
    const { pos, rot } = this.posicaoSlot(i, n);
    const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = rot; this.scene.add(g);
    const p = PARTIDO[j.partido] || PARTIDO.PUN;
    const branco = new THREE.MeshStandardMaterial({ color: '#a4abc2', roughness: .4, metalness: .15 });
    const base = new THREE.Mesh(rb(1.1, .1, .78, .04), new THREE.MeshStandardMaterial({ color: '#c9cfe3', roughness: .3, metalness: .3 })); base.position.y = .05; g.add(base);
    const corpo = new THREE.Mesh(rb(.95, 1.02, .58, .08), branco); corpo.position.set(0, .6, 0); g.add(corpo);
    const tampa = new THREE.Mesh(rb(1.08, .1, .72, .04), branco); tampa.position.set(0, 1.15, -.02); tampa.rotation.x = -.08; g.add(tampa);
    const faixaLuz = new THREE.Mesh(new THREE.BoxGeometry(1.0, .035, .66), new THREE.MeshBasicMaterial({ color: p.cor }));
    faixaLuz.position.set(0, 1.085, -.02); g.add(faixaLuz);
    [base, corpo, tampa].forEach(m => { m.castShadow = m.receiveShadow = true; });
    // painel frontal
    const fr = canvasTex(512, 576); this.desenharFrente(fr.ctx, j, p); fr.tex.needsUpdate = true;
    const frente = new THREE.Mesh(new THREE.PlaneGeometry(.86, .97), new THREE.MeshStandardMaterial({ map: fr.tex, roughness: .35 }));
    frente.position.set(0, .6, .292); g.add(frente);
    // tela de cima (virada para o candidato)
    const tl = canvasTex(512, 256);
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(.42, .21), new THREE.MeshBasicMaterial({ map: tl.tex, toneMapped: false, color: '#c4c4c4' }));
    // (para quem está no púlpito, +x fica à esquerda e -x à direita)
    tela.rotation.set(.55 - Math.PI / 2, Math.PI, 0, 'YXZ'); tela.position.set(0, 1.275, .1); g.add(tela);
    const molduraTela = new THREE.Mesh(new THREE.PlaneGeometry(.47, .26), new THREE.MeshBasicMaterial({ color: '#0a0a0a' }));
    molduraTela.rotation.copy(tela.rotation); molduraTela.position.set(0, 1.275 - Math.cos(.55) * .004, .1 + Math.sin(.55) * .004); g.add(molduraTela);
    const peTela = new THREE.Mesh(new RoundedBoxGeometry(.4, .04, .12, 2, .015), new THREE.MeshStandardMaterial({ color: '#1f2433', roughness: .4, metalness: .4 }));
    peTela.position.set(0, 1.215, .17); g.add(peTela);
    // microfone (à esquerda de quem fala, apontado para o centro)
    const preto = new THREE.MeshStandardMaterial({ color: '#111318', roughness: .4, metalness: .6 });
    const baseMic = new THREE.Vector3(.36, 1.21, .22), pontaMic = new THREE.Vector3(.25, 1.55, .11);
    const haste = new THREE.Mesh(new THREE.CylinderGeometry(.011, .013, baseMic.distanceTo(pontaMic), 8), preto);
    haste.position.copy(baseMic).lerp(pontaMic, .5); haste.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pontaMic.clone().sub(baseMic).normalize()); g.add(haste);
    const cabMic = new THREE.Mesh(new THREE.SphereGeometry(.05, 14, 10), new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: .95 })); cabMic.position.set(.24, 1.57, .1); g.add(cabMic);
    const anelMic = new THREE.Mesh(new THREE.TorusGeometry(.04, .008, 6, 16), new THREE.MeshBasicMaterial({ color: '#22d3ee' })); anelMic.position.set(.36, 1.205, .22); anelMic.rotation.x = Math.PI / 2; g.add(anelMic);
    // copo d'água (à direita)
    const copo = new THREE.Mesh(new THREE.CylinderGeometry(.04, .035, .13, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#dff3ff', transparent: true, opacity: .35, roughness: .05, side: THREE.DoubleSide }));
    copo.position.set(-.38, 1.27, .12); g.add(copo);
    const agua = new THREE.Mesh(new THREE.CylinderGeometry(.036, .033, .08, 14), new THREE.MeshStandardMaterial({ color: '#7cc8ff', transparent: true, opacity: .5 })); agua.position.set(-.38, 1.245, .12); g.add(agua);
    // papel e caneta (à esquerda, perto do corpo)
    const papel = new THREE.Mesh(new THREE.PlaneGeometry(.2, .27), new THREE.MeshStandardMaterial({ color: '#d6d9e0', roughness: .9 })); papel.rotation.x = -Math.PI / 2 - .08; papel.position.set(.3, 1.212, -.12); papel.rotation.z = -.12; g.add(papel);
    const caneta = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .16, 6), new THREE.MeshStandardMaterial({ color: '#facc15' })); caneta.rotation.set(Math.PI / 2, 0, -.5); caneta.position.set(.2, 1.225, -.1); g.add(caneta);
    // botões (só funcionam no seu púlpito): vermelho = microfone, verde = confirmar
    const botao = (cor, x, acao) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(.055, .06, .035, 20), new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: .5, roughness: .3 }));
      b.position.set(x, 1.215, -.17); b.rotation.x = -.08; b.userData.acao = acao; g.add(b); return b;
    };
    const bMic = botao('#ef4444', -.2, 'mic'), bOk = botao('#22c55e', -.36, 'confirmar');
    // avatar
    // ator = avatar + etiqueta (+ câmera, se for você). Fica atrás do púlpito; no confronto direto ele caminha até o púlpito central
    const ator = new THREE.Group(); ator.position.set(0, 0, -.62); g.add(ator);
    const av = new Avatar(j.avatar); ator.add(av.root);
    av.gesticula = true;
    // etiqueta com nome
    const et = canvasTex(512, 128);
    desenharEtiqueta(et, j, p);
    const etiqueta = new THREE.Sprite(new THREE.SpriteMaterial({ map: et.tex, depthTest: true, transparent: true }));
    etiqueta.scale.set(1.1, .275, 1); etiqueta.position.set(0, 2.75, 0); ator.add(etiqueta);
    etiqueta.visible = this.cfg.nomes && j.id !== this.meuId;
    // luz
    const sp = this.criarSpot(pos.clone(), '#fff3dd');
    g.traverse(o => { o.userData.pid ??= j.id; });
    const podio = { id: j.id, bot: !!j.bot, grupo: g, ator, avatar: av, tela: tl, faixaLuz, bMic, bOk, spot: sp, etiqueta, et, nivel: j.nivel || 0, partido: p, anelMic, telaKey: '', idx: i, n, caminho: null, lugar: 'podio' };
    if (j.id === this.meuId) av.ocultarCabeca(true);
    this.desenharTelaPodio(podio, { titulo: j.nome, texto: p.sigla + ' ' + p.numero, num: p.numero });
    return podio;
  }
  desenharFrente(ctx, j, p) {
    const W = 512, H = 576;
    ctx.fillStyle = '#eef1fa'; ctx.fillRect(0, 0, W, H);
    // faixa diagonal com as cores do partido
    ctx.save(); ctx.beginPath(); ctx.moveTo(250, H); ctx.lineTo(370, 0); ctx.lineTo(450, 0); ctx.lineTo(330, H); ctx.closePath(); ctx.fillStyle = p.cor; ctx.fill();
    ctx.beginPath(); ctx.moveTo(330, H); ctx.lineTo(450, 0); ctx.lineTo(512, 0); ctx.lineTo(512, 60); ctx.lineTo(400, H); ctx.closePath(); ctx.fillStyle = p.cor2; ctx.fill(); ctx.restore();
    // logo
    rr(ctx, 40, 40, 150, 150, 30); ctx.fillStyle = p.cor; ctx.fill();
    desenharSimbolo(ctx, p.simbolo, 115, 115, 50, '#fff');
    ctx.fillStyle = '#0f1b4d'; ctx.font = `150px ${FONTE}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(p.numero, 40, 360);
    ctx.font = `48px ${FONTE}`; ctx.fillText(p.sigla, 210, 140);
    ctx.font = `bold 40px ${FONTE_TXT}`; ctx.fillStyle = '#1e293b';
    quebrar(ctx, j.nome.toUpperCase(), 280).slice(0, 2).forEach((l, k) => ctx.fillText(l, 40, 440 + k * 46));
    ctx.fillStyle = p.cor; ctx.fillRect(40, 520, 200, 12);
  }
  desenharTelaPodio(pd, { titulo = '', texto = '', cor = '#0b1640', alerta = false, destaque = false, num = '' } = {}) {
    const key = titulo + '|' + texto + cor + alerta + destaque + num; if (pd.telaKey === key) return; pd.telaKey = key;
    const { ctx, tex } = pd.tela;
    const g = ctx.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, alerta ? '#7f1d1d' : cor); g.addColorStop(1, '#050a1f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = destaque ? '#facc15' : '#3b5bdb'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, 502, 246);
    const tit = titulo.toUpperCase().slice(0, 22);
    if (!num) { ctx.textAlign = 'center'; ctx.fillStyle = '#c7d2fe'; ctx.font = `bold 40px ${FONTE_TXT}`; ctx.fillText(tit, 256, 70); }
    else { // nome + número do candidato (selo amarelo) lado a lado, centralizados
      let fs = 40; ctx.font = `bold ${fs}px ${FONTE_TXT}`; const nw = () => ctx.measureText(num).width + 20;
      while (fs > 22 && ctx.measureText(tit).width + nw() + 14 > 470) { fs -= 2; ctx.font = `bold ${fs}px ${FONTE_TXT}`; }
      const wt = ctx.measureText(tit).width, wn = nw(), x0 = 256 - (wt + 14 + wn) / 2;
      ctx.textAlign = 'left'; ctx.fillStyle = '#c7d2fe'; ctx.fillText(tit, x0, 70);
      rr(ctx, x0 + wt + 14, 70 - fs * .85, wn, fs * 1.05, 8); ctx.fillStyle = '#facc15'; ctx.fill();
      ctx.fillStyle = '#0b1640'; ctx.fillText(num, x0 + wt + 24, 70); ctx.textAlign = 'center';
    }
    ctx.fillStyle = alerta ? '#fecaca' : '#ffffff'; ctx.font = `${texto.length > 7 ? 66 : 100}px ${FONTE}`; ctx.fillText(texto, 256, 180);
    tex.needsUpdate = true;
  }
  telaPodio(id, dados) {
    const pd = this.podios.get(id); if (pd) this.desenharTelaPodio(pd, dados);
    const d = this.duelo; // no confronto, a tela do púlpito central mostra o cronômetro de quem está com a palavra
    if (d?.fase === 'no' && id === this.falante && (id === d.a || id === d.b)) this.desenharTelaPodio(this.dueloObj, dados);
  }

  setFalante(id) { this.falante = id; this.aplicarFalante(); }
  aplicarFalante() {
    for (const p of this.podios.values()) {
      const ativo = p.id === this.falante;
      p.spot.intensity = this.falante ? (ativo ? 32 : 5) : 10;
      this.brilhoSpot(p.spot);
      p.anelMic.material.color.set(ativo ? '#ef4444' : '#22d3ee');
      p.avatar.gesticula = ativo;
    }
    this.spotMed.intensity = this.falante ? 5 : 10;
    this.brilhoSpot(this.spotMed);
  }
  setFalaNivel(id, v) { const p = this.podios.get(id); if (p) p.avatar.setFala(v); }
  setOlharJogador(id, y, p) {
    const pd = this.podios.get(id); if (pd && id !== this.meuId) pd.avatar.setOlhar(y, p);
  }
  mediadoraFalando(v) { this.medFalando = v; }
  setSelecionaveis(ids) { this.selecionaveis = ids ? new Set(ids) : null; }
  festa(id, danca) { for (const p of this.podios.values()) p.avatar.festa = p.id === id ? (danca || 'festa') : false; }
  /** Emote/dança/provocação da loja: animação no avatar + balão com emoji e frase. */
  emote(id, it) {
    const av = this.podios.get(id)?.avatar; if (!av || !it) return;
    av.animar(it.anim, it.tipo === 'danca' ? 4.5 : 2.8);
    const alvo = this.podios.get(id).ator;
    const { ctx, tex } = canvasTex(512, 200);
    rr(ctx, 6, 6, 500, 150, 50); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#1a1052'; ctx.stroke();
    ctx.textBaseline = 'middle'; ctx.font = '96px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign = it.frase ? 'left' : 'center';
    ctx.fillText(it.emoji, it.frase ? 30 : 256, 84);
    if (it.frase) { ctx.fillStyle = '#1a1052'; ctx.font = `44px ${FONTE}`; ctx.fillText(it.frase.slice(0, 18), 150, 84); }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const base = new THREE.Vector3(0, 2.75, 0); alvo.localToWorld(base);
    sp.position.copy(base); sp.scale.set(1.5, .59, 1); this.scene.add(sp);
    this.efeitos.push({ sp, t0: this.t, base, dur: 2.8 });
  }
  /** Candidato consultando a assessoria: folheia as anotações no púlpito. */
  /** Vencedor dançando sozinho no centro do palco (visível só no modo 'vencedor'); cfg null remove. */
  setCampeao(cfg, anim) {
    const k = cfg ? JSON.stringify([cfg, anim]) : ''; if (this.campeaoKey === k) return; this.campeaoKey = k;
    if (this.campeao) { this.scene.remove(this.campeao.root); this.campeao = null; }
    if (!cfg) return;
    const c = this.campeao = new Avatar(cfg); c.posePe = true; c.festa = anim || 'festa';
    c.root.position.set(CENTRO.x, 0, CENTRO.z + 2.2); c.root.visible = this.modo === 'vencedor'; this.scene.add(c.root);
  }
  // ===================== REVELAÇÃO DO VENCEDOR =====================
  // Fases: 'close' (jornalista aponta o telão) → 'telao' (telão mostra o campeão AO VIVO, filmado por uma 2ª câmera
  // num render target) → 'transicao' (push-in até o telão encher a tela; o corte cai no mesmo enquadramento do modo 'vencedor').
  /** Começa a revelação. cfg = { nome, partido }; o campeão (setCampeao) já deve existir. */
  revelar(cfg = {}) {
    this.fimRevelacao();
    const rt = new THREE.WebGLRenderTarget(1280, 480, { samples: 4, type: THREE.HalfFloatType }); // linear/HDR: o tone mapping sai no telão
    const camRT = new THREE.PerspectiveCamera(42, 16 / 6, .05, 120); // mesma lente do modo 'vencedor' (corte casado)
    const faixa = canvasTex(2048, 768); this.desenharFaixaRevelacao(faixa.ctx, cfg); faixa.tex.needsUpdate = true;
    const sobre = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), new THREE.MeshBasicMaterial({ map: faixa.tex, transparent: true, toneMapped: false, depthWrite: false }));
    sobre.position.set(0, 4.6, -10.38); sobre.visible = false; this.scene.add(sobre);
    this.revelacao = { fase: 'close', t0: performance.now() / 1000, rt, camRT, faixa, sobre, cfg, camIni: null };
    this.mediadora.animar('apontarTelao', 6.5);
    this.setModo('revelacao');
  }
  /** Troca a fase da revelação ('close' | 'telao' | 'transicao'). */
  faseRevelacao(fase) {
    const R = this.revelacao; if (!R) return;
    R.fase = fase; R.t0 = performance.now() / 1000; R.camIni = { pos: this.camera.position.clone() }; // relógio real: casa com os timers do main.js mesmo com FPS baixo
    const ao = fase === 'telao' || fase === 'transicao', m = this.telaMesh.material;
    m.map = ao ? R.rt.texture : this.led.tex; m.color.set(ao ? '#ffffff' : '#c4c4c4'); m.toneMapped = ao; m.needsUpdate = true;
    R.sobre.visible = ao; R.sobre.material.opacity = 1;
  }
  /** Encerra a revelação: devolve o telão ao LED e libera render target/texturas. Pode ser chamada a qualquer momento. */
  fimRevelacao() {
    const R = this.revelacao; if (!R) return; this.revelacao = null;
    const m = this.telaMesh.material; m.map = this.led.tex; m.color.set('#c4c4c4'); m.toneMapped = false; m.needsUpdate = true;
    this.scene.remove(R.sobre); R.sobre.geometry.dispose(); R.sobre.material.dispose(); R.faixa.tex.dispose(); R.rt.dispose();
    if (this.mediadora.anim?.nome === 'apontarTelao') this.mediadora.anim = null;
    if (this.campeao) this.campeao.root.visible = this.modo === 'vencedor';
  }
  /** Tarja do telão durante a transmissão ao vivo: AO VIVO + nome e partido do novo presidente. */
  desenharFaixaRevelacao(ctx, cfg) {
    const W = 2048, H = 768, p = PARTIDO[cfg.partido] || PARTIDO.PUN; ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillStyle = '#dc2626'; rr(ctx, 50, 40, 250, 80, 18); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `54px ${FONTE}`; ctx.fillText('AO VIVO', 175, 82);
    const g = ctx.createLinearGradient(0, H - 230, 0, H); g.addColorStop(0, 'rgba(5,12,40,0)'); g.addColorStop(.35, 'rgba(5,12,40,.82)'); g.addColorStop(1, 'rgba(5,12,40,.95)');
    ctx.fillStyle = g; ctx.fillRect(0, H - 230, W, 230);
    ctx.fillStyle = '#facc15'; rr(ctx, 120, H - 205, 760, 62, 14); ctx.fill(); ctx.fillStyle = '#0b1f6b'; ctx.font = `46px ${FONTE}`; ctx.fillText('NOVO PRESIDENTE DO BRASIL', 500, H - 172);
    ctx.fillStyle = p.cor; rr(ctx, 120, H - 130, 110, 100, 20); ctx.fill(); desenharSimbolo(ctx, p.simbolo, 175, H - 80, 36, '#fff');
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = `96px ${FONTE}`; ctx.fillText(String(cfg.nome || '').toUpperCase().slice(0, 22), 255, H - 76);
    ctx.textAlign = 'right'; ctx.fillStyle = '#facc15'; ctx.font = `64px ${FONTE}`; ctx.fillText(`${p.sigla} ${p.numero}`, W - 120, H - 76);
  }
  /** Câmera da revelação (chamada no loop). */
  camRevelacao(R, t) {
    const u = performance.now() / 1000 - R.t0, cam = this.camera, pos = _v, alvo = R.alvo ||= new THREE.Vector3();
    if (R.fase === 'close') { // close na(o) jornalista virada para o telão, de perfil 3/4, com o telão ao fundo
      const k = sm(u / 3.5); pos.set(-2.25 + k * .35, 1.95 - k * .05, -2.0 - k * .25); alvo.set(.15, 2.05, -4.1);
    } else if (R.fase === 'telao') { // plano do telão, por cima das cabeças, aproximando devagar
      const k = sm(u / 3); pos.set(0, 3.5 + k * .2, 2.0 - k * .9); alvo.set(0, 4.45, -10.4);
    } else { // push-in: até a altura do telão encher a tela (fov 42 → distância 3 / tan 21° ≈ 7.8)
      const k = sm(u / 2), a = R.camIni?.pos || pos; pos.set(a.x * (1 - k), a.y + (4.6 - a.y) * k, a.z + (-10.4 + 7.7 - a.z) * k); alvo.set(0, 4.45 + .15 * k, -10.4);
      R.sobre.material.opacity = 1 - sm(u / .9);
    }
    cam.position.copy(pos); cam.lookAt(alvo);
  }
  /** Filma o campeão para o telão (mesmo enquadramento do modo 'vencedor'). */
  renderRevelacao(R, t) {
    const c = this.campeao; if (!c || (R.fase !== 'telao' && R.fase !== 'transicao')) return;
    const p = c.root.position, m = Math.sin(t * .35), m2 = this.telaMesh.material;
    R.camRT.position.set(p.x + m * .7, 1.5, p.z + 3.4); R.camRT.lookAt(p.x, 1.1, p.z);
    c.root.visible = true; m2.map = this.led.tex; R.sobre.visible = false; // sem loop de realimentação: o telão ao fundo mostra o LED
    this.renderer.setRenderTarget(R.rt); this.renderer.render(this.scene, R.camRT); this.renderer.setRenderTarget(null);
    c.root.visible = false; m2.map = R.rt.texture; R.sobre.visible = true;
  }
  testarNaVitrine(it) { this.vitrine?.animar(it.anim, it.tipo === 'danca' ? 5 : 3); }
  pararVitrine() { if (this.vitrine) this.vitrine.anim = null; }
  /** X na tela (px) dos pés do avatar da vitrine, para alinhar botões embaixo dele. */
  xVitrine() { const v = new THREE.Vector3(); if (!this.vitrine) return innerWidth / 2; this.vitrine.root.getWorldPosition(v).project(this.camera); const r = this.canvas.getBoundingClientRect(); return r.left + (v.x + 1) / 2 * r.width; }
  folhear(id) { this.podios.get(id)?.avatar.animar('folhear', id === this.meuId && this.lendo ? 9999 : 3.4); }
  /** Lendo a anotação da assessoria: a câmera desce suave até o papel do púlpito e o avatar fica folheando até guardar. */
  lerDica(on) {
    if (!!on === !!this.lendo) return; this.lendo = !!on;
    // não trava o olhar: só muda o alvo (o mouse/setas continuam valendo) e usa a acomodação lenta já existente (suaveAte)
    if (this.modo === 'fp' && !this.andandoEu()) {
      const o = this.olhar;
      if (on) { this.olharAntesDica = { ...o }; o.y = .3; o.p = -.8; }
      else if (this.olharAntesDica) { const a = this.olharAntesDica; if (Math.abs(o.y - .3) < .2) o.y = a.y; o.p = a.p; this.olharAntesDica = null; }
      this.suaveAte = this.t + 1.4;
    }
    const av = this.podios.get(this.meuId)?.avatar; if (!av) return;
    if (on) av.animar('folhear', 9999); else if (av.anim?.nome === 'folhear') av.anim = null;
  }
  confetes(v) { const c = this.confete; c.ativo = v; c.im.visible = v; if (v) c.ps.forEach(p => this.resetConfete(p, true)); }
  resetConfete(p, espalhar) { p.x = (Math.random() - .5) * 16; p.z = -3 + (Math.random() - .5) * 14; p.y = espalhar ? Math.random() * 10 : 9 + Math.random() * 2; p.vy = .8 + Math.random() * 1.2; p.rx = Math.random() * 6; p.ry = Math.random() * 6; p.vr = 2 + Math.random() * 4; }
  agitarPlateia(intens = 1, ms = 2500) { this.excitacao = Math.max(this.excitacao, intens); this.excitacaoAte = performance.now() + ms; }
  // plateia se levanta e pula (fim de fala, vitória, abertura)
  festejarPlateia(ms = 3000, intens = 1) { this.levantarAte = Math.max(this.levantarAte, performance.now() + ms); this.agitarPlateia(intens, ms); }
  // plateia grita (bocas abertas/mexendo) sem necessariamente pular
  gritarPlateia(intens = 1, ms = 2000) { this.grito = Math.max(this.grito || 0, intens); this.gritoAte = performance.now() + ms; }
  reacao(id, emoji) {
    const pd = this.podios.get(id); if (!pd) return;
    const { ctx, tex } = canvasTex(128, 128); ctx.font = '96px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(emoji, 64, 70);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const base = new THREE.Vector3(0, 2.6, 0); pd.ator.localToWorld(base);
    sp.position.copy(base); sp.scale.setScalar(.55); this.scene.add(sp);
    this.efeitos.push({ sp, t0: this.t, base });
  }

  // ===================== CÂMERA =====================
  setModo(modo) {
    this.modo = modo; this.camTVok = false;
    if (modo === 'fp') {
      const pd = this.podios.get(this.meuId);
      if (pd) { pd.ator.add(this.rig); this.rig.position.set(0, 2.0, -.16); this.camFP.add(this.camera); this.camera.position.set(0, 0, 0); this.camera.rotation.set(0, 0, 0); this.camera.fov = 68; this.camera.updateProjectionMatrix(); }
    } else {
      this.scene.add(this.camera); this.camera.fov = modo === 'vitrine' || modo === 'vencedor' || modo === 'revelacao' ? 42 : 55; this.camera.updateProjectionMatrix();
    }
    this.podios.get(this.meuId)?.avatar.ocultarCabeca(modo === 'fp'); // fora da 1ª pessoa o seu avatar aparece inteiro
    if (this.vitrine) this.vitrine.root.visible = modo === 'vitrine';
    if (this.campeao) this.campeao.root.visible = modo === 'vencedor';
    for (const p of this.podios.values()) p.grupo.visible = p.ator.visible = modo !== 'vitrine';
    this.visDuelo();
  }
  setVitrine(cfgAv) {
    const k = JSON.stringify(cfgAv);
    if (this.vitrineKey === k) return; this.vitrineKey = k;
    const rot = this.vitrine ? this.vitrine.root.rotation.y : -.35;
    if (this.vitrine) this.scene.remove(this.vitrine.root);
    this.vitrine = new Avatar(cfgAv); this.vitrine.root.position.set(0, 0, -.6); this.vitrine.root.rotation.y = rot;
    this.vitrine.root.visible = this.modo === 'vitrine'; this.scene.add(this.vitrine.root);
    this.vitrine.bracos.forEach(b => { b.rotation.x = -.15; });
    this.vitrine.posePe = true;
  }
  instalarControles() {
    // olhar livre: segurar o botão esquerdo (ou arrastar o dedo) sobre a cena e mover; vitrine gira arrastando.
    const cv = this.canvas; let arrastando = false, moveu = 0, lx = 0, ly = 0;
    cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button !== 0) return; arrastando = true; moveu = 0; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      if (!arrastando) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moveu += Math.abs(dx) + Math.abs(dy);
      const k = .0042 * this.cfg.sens;
      if (this.modo === 'fp' && !this.andandoEu()) { this.olhar.y = clamp(this.olhar.y - dx * k, -1.9, 1.9); this.olhar.p = clamp(this.olhar.p - dy * k, -.85, .7); }
      else if (this.modo === 'vitrine' && this.vitrine) this.vitrine.root.rotation.y += dx * .01;
    });
    cv.addEventListener('pointercancel', () => { arrastando = false; }); addEventListener('blur', () => { arrastando = false; });
    cv.addEventListener('pointerup', e => { if (!arrastando) return; arrastando = false; if (moveu < 6) this.pick(e.clientX, e.clientY); });
    addEventListener('keydown', e => {
      if (this.modo !== 'fp' || this.andandoEu() || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
      const k = .12; if (e.key === 'ArrowLeft') this.olhar.y += k; if (e.key === 'ArrowRight') this.olhar.y -= k;
      if (e.key === 'ArrowUp') this.olhar.p = Math.min(.7, this.olhar.p + k); if (e.key === 'ArrowDown') this.olhar.p = Math.max(-.85, this.olhar.p - k);
    });
    this.ray = new THREE.Raycaster();
  }
  pick(x, y) {
    if (!this.onPick) return;
    const b = this.canvas.getBoundingClientRect(); // considera a resolução escolhida (tela escalada/centralizada)
    this.ray.setFromCamera(new THREE.Vector2((x - b.left) / b.width * 2 - 1, -((y - b.top) / b.height) * 2 + 1), this.camera);
    const alvos = []; for (const p of this.podios.values()) alvos.push(p.grupo);
    const hit = this.ray.intersectObjects(alvos, true)[0]; if (!hit) return;
    let o = hit.object; while (o && !o.userData.acao && o.parent && !o.userData.raizPodio) { if (o.userData.acao) break; o = o.parent; }
    this.onPick({ pid: hit.object.userData.pid, acao: hit.object.userData.acao });
  }
  olharPara(alvo) { // vira a câmera para um ponto do mundo (ex.: mediadora)
    const pd = this.podios.get(this.meuId); if (!pd) return;
    const local = pd.ator.worldToLocal(alvo.clone()); local.sub(this.rig.position);
    this.olhar.y = Math.atan2(local.x, local.z); this.olhar.p = Math.atan2(local.y, Math.hypot(local.x, local.z));
  }

  // ===================== TELÃO =====================
  setLED(d) { this.ledDados = d; this.desenharLED(); }
  fundoLED(ctx, W, H, t = 0) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1747c9'); g.addColorStop(1, '#0a1f6b'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.07)'; for (let x = 12; x < W; x += 26) for (let y = 12; y < H; y += 26) { ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
    // faixas verde e amarela
    ctx.save(); ctx.globalAlpha = .95;
    ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.moveTo(0, H * .55); ctx.quadraticCurveTo(W * .2, H * .6, W * .32, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(0, H * .7); ctx.quadraticCurveTo(W * .15, H * .74, W * .22, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#16a34a'; ctx.beginPath(); ctx.moveTo(W, H * .55); ctx.quadraticCurveTo(W * .8, H * .6, W * .68, H); ctx.lineTo(W, H); ctx.fill();
    ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(W, H * .7); ctx.quadraticCurveTo(W * .85, H * .74, W * .78, H); ctx.lineTo(W, H); ctx.fill();
    ctx.restore();
    // silhueta de Brasília
    ctx.fillStyle = 'rgba(200,220,255,.28)'; const bx = W / 2, by = H - 40;
    ctx.fillRect(bx - 34, by - 230, 26, 230); ctx.fillRect(bx + 8, by - 230, 26, 230); ctx.fillRect(bx - 380, by - 30, 760, 30);
    ctx.beginPath(); ctx.arc(bx - 190, by - 30, 90, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx + 90, by - 120); ctx.quadraticCurveTo(bx + 190, by - 10, bx + 290, by - 120); ctx.lineTo(bx + 250, by - 30); ctx.lineTo(bx + 130, by - 30); ctx.fill();
  }
  titulo(ctx, x, y, esc2 = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(esc2, esc2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `150px ${FONTE}`; ctx.lineWidth = 18; ctx.strokeStyle = '#0b1f6b'; ctx.strokeText('DEBATE', 0, -70); ctx.fillStyle = '#f1f5ff'; ctx.fillText('DEBATE', 0, -70);
    ctx.rotate(-.04); rr(ctx, -360, 10, 720, 130, 24); ctx.fillStyle = '#facc15'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#a16207'; ctx.stroke();
    ctx.font = `105px ${FONTE}`; ctx.fillStyle = '#0b1f6b'; ctx.fillText('PRESIDENCIAL', 0, 80); ctx.restore();
  }
  desenharLED() {
    const { ctx, tex } = this.led, W = 2048, H = 768, d = this.ledDados || { modo: 'titulo' };
    this.fundoLED(ctx, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const faixaTopo = (txt) => { this.titulo(ctx, 300, 120, .42); ctx.fillStyle = 'rgba(5,12,40,.55)'; rr(ctx, 600, 40, 1400, 110, 26); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `70px ${FONTE}`; ctx.fillText(txt, 1300, 97); };
    const cartaoTema = (t, rotulo, girando) => {
      ctx.fillStyle = 'rgba(5,12,40,.72)'; rr(ctx, 220, 220, 1608, 380, 40); ctx.fill();
      ctx.lineWidth = 8; ctx.strokeStyle = girando ? '#facc15' : '#60a5fa'; ctx.stroke();
      rr(ctx, 280, 290, 240, 240, 36); ctx.fillStyle = '#facc15'; ctx.fill();
      ctx.fillStyle = '#0b1f6b'; ctx.font = `150px ${FONTE}`; ctx.fillText(t.uf, 400, 415);
      ctx.textAlign = 'left'; ctx.fillStyle = '#93c5fd'; ctx.font = `bold 52px ${FONTE_TXT}`; ctx.fillText((rotulo + ' · ' + t.estado).toUpperCase(), 580, 300);
      ctx.fillStyle = '#fff'; ctx.font = `92px ${FONTE}`; quebrar(ctx, t.titulo, 1180).slice(0, 2).forEach((l, i) => ctx.fillText(l, 580, 400 + i * 100));
      ctx.textAlign = 'center';
    };
    switch (d.modo) {
      case 'titulo': this.titulo(ctx, W / 2, H / 2 - 40, 1.25); ctx.fillStyle = '#e0e7ff'; ctx.font = `bold 54px ${FONTE_TXT}`; ctx.fillText(d.sub || 'ELEIÇÕES 2026', W / 2, H - 120); break;
      case 'tema': faixaTopo(d.cabecalho || ''); cartaoTema(TEMA[d.tema], 'Tema', false); break;
      case 'roleta': faixaTopo('SORTEANDO O TEMA…'); cartaoTema(TEMAS[Math.random() * TEMAS.length | 0], 'Sorteio', true); break;
      case 'texto': faixaTopo(d.cabecalho || ''); ctx.fillStyle = 'rgba(5,12,40,.72)'; rr(ctx, 220, 220, 1608, 400, 40); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `76px ${FONTE}`; quebrar(ctx, d.texto, 1480).slice(0, 4).forEach((l, i, a) => ctx.fillText(l, W / 2, 420 - (a.length - 1) * 45 + i * 90)); break;
      case 'fala': {
        const p = PARTIDO[d.partido] || PARTIDO.PUN;
        ctx.fillStyle = p.cor; rr(ctx, 60, 40, 1500, 130, 30); ctx.fill();
        desenharSimbolo(ctx, p.simbolo, 135, 105, 42, '#fff');
        ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = `86px ${FONTE}`; ctx.fillText(d.nome.toUpperCase(), 200, 110);
        ctx.font = `bold 44px ${FONTE_TXT}`; ctx.textAlign = 'right'; ctx.fillText(`${p.sigla} ${p.numero}`, 1530, 108);
        ctx.textAlign = 'center';
        rr(ctx, 1600, 40, 390, 130, 30); ctx.fillStyle = d.alerta ? '#b91c1c' : '#0b1640'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `100px ${FONTE}`; ctx.fillText(d.tempo || '', 1795, 112);
        if (d.rotulo) { ctx.fillStyle = '#facc15'; ctx.font = `bold 46px ${FONTE_TXT}`; ctx.fillText(d.rotulo.toUpperCase(), W / 2, 230); }
        ctx.fillStyle = 'rgba(5,12,40,.75)'; rr(ctx, 120, 280, 1808, 400, 36); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `64px ${FONTE_TXT}`; ctx.font = `bold 64px ${FONTE_TXT}`;
        const linhas = quebrar(ctx, d.texto || '…', 1700); linhas.slice(-4).forEach((l, i) => ctx.fillText(l, W / 2, 360 + i * 84));
        break;
      }
      case 'poll': case 'resultado': {
        faixaTopo(d.titulo || 'PESQUISA');
        const lista = d.lista || []; const max = Math.max(...lista.map(x => x.pct), 1);
        const h = Math.min(100, 470 / Math.max(1, lista.length));
        lista.forEach((x, i) => {
          const y = 210 + i * (h + 14), p = PARTIDO[x.partido] || PARTIDO.PUN;
          ctx.fillStyle = 'rgba(5,12,40,.7)'; rr(ctx, 160, y, 1730, h, 20); ctx.fill();
          ctx.fillStyle = p.cor; rr(ctx, 600, y + 10, Math.max(10, (x.pct / max) * 1000), h - 20, 14); ctx.fill();
          ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = `${h * .55}px ${FONTE}`; ctx.fillText(x.nome.slice(0, 14).toUpperCase(), 190, y + h / 2 + 3);
          ctx.textAlign = 'right'; ctx.fillText(x.pct.toFixed(1).replace('.', ',') + '%', 1860, y + h / 2 + 3);
          if (x.eleito) { ctx.fillStyle = '#22c55e'; rr(ctx, 1500, y + 14, 200, h - 28, 12); ctx.fill(); ctx.fillStyle = '#04210f'; ctx.textAlign = 'center'; ctx.font = `${h * .38}px ${FONTE}`; ctx.fillText(x.eleito === true ? 'ELEITO' : x.eleito, 1600, y + h / 2 + 2); }
          ctx.textAlign = 'center';
        });
        if (d.rodape) { ctx.fillStyle = '#c7d2fe'; ctx.font = `bold 40px ${FONTE_TXT}`; ctx.fillText(d.rodape, W / 2, H - 45); }
        break;
      }
    }
    tex.needsUpdate = true;
    this.desenharLateral();
  }
  desenharLateral() {
    const { ctx, tex } = this.lat, W = 1024, H = 576, d = this.ledDados || {};
    this.fundoLED(ctx, W, H);
    ctx.fillStyle = '#dc2626'; rr(ctx, 30, 30, 210, 66, 14); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `44px ${FONTE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('AO VIVO', 135, 65);
    if (d.modo === 'fala') {
      const p = PARTIDO[d.partido] || PARTIDO.PUN;
      ctx.fillStyle = p.cor; rr(ctx, 60, 180, 904, 150, 28); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `80px ${FONTE}`; ctx.fillText(d.nome.toUpperCase().slice(0, 16), 512, 258);
      ctx.fillStyle = d.alerta ? '#fecaca' : '#fff'; ctx.font = `120px ${FONTE}`; ctx.fillText(d.tempo || '', 512, 430);
    } else this.titulo(ctx, 512, 300, .62);
    tex.needsUpdate = true;
  }

  // ===================== LOOP =====================
  frame() {
    const agoraMs = performance.now(); const dt = Math.min(.05, (agoraMs - this.ultimoFrame) / 1000); this.ultimoFrame = agoraMs; this.t += dt; const t = this.t;
    if (this.excitacaoAte && performance.now() > this.excitacaoAte) { this.excitacao *= .95; if (this.excitacao < .02) { this.excitacao = 0; this.excitacaoAte = 0; } }
    this.atualizarPlateia(t, dt);
    // avatares
    this.andarAtores(dt); this.animarPulpito(dt); this.animarCameras(dt, t);
    const prod = this.producao;
    if (prod.root.visible) { const m = this.pulp.fase === 'saindo' || prod.empurra; prod.setOlhar(m ? 0 : Math.sin(t * .7) * .3, prod.empurra ? -.1 : .02); prod.update(dt, t); this.passos(prod, prod.root.position, false, true); }
    for (const p of this.podios.values()) {
      if (p.caminho || p.avatar.andar) this.passos(p.avatar, p.ator.getWorldPosition(new THREE.Vector3()), p.id === this.meuId && this.modo === 'fp');
      if (p.id === this.meuId) { p.avatar.setOlhar(this.olharSuave.y, this.olharSuave.p); }
      else if (p.bot) { // candidatos da IA olham para quem está falando (ou para a mediadora)
        const alvo = this.falante && this.falante !== p.id && this.podios.get(this.falante);
        const w = alvo ? alvo.ator.localToWorld(new THREE.Vector3(0, 2, 0)) : new THREE.Vector3(CENTRO.x, 2, CENTRO.z - .25);
        const l = p.ator.worldToLocal(w).sub(new THREE.Vector3(0, 2, 0));
        p.avatar.setOlhar(Math.atan2(l.x, l.z) + Math.sin(t * .4 + p.avatar.ocioso) * .08, Math.atan2(l.y, Math.hypot(l.x, l.z)));
      }
      p.avatar.update(dt, t);
      if (this.selecionaveis) { const sel = this.selecionaveis.has(p.id); p.faixaLuz.material.color.set(sel ? (Math.sin(t * 6) > 0 ? '#facc15' : '#ffffff') : p.partido.cor); }
      else p.faixaLuz.material.color.set(p.partido.cor);
    }
    // mediadora olha para quem fala
    const med = this.mediadora; let alvoY = 0;
    if (this.falante && this.podios.get(this.falante)) {
      const wp = new THREE.Vector3(); this.podios.get(this.falante).ator.getWorldPosition(wp);
      alvoY = Math.atan2(wp.x - CENTRO.x, wp.z - CENTRO.z);
    } else alvoY = Math.sin(t * .25) * .6;
    const Rv = this.revelacao, medVira = Rv && Rv.fase !== 'transicao'; // revelação: vira 3/4 para o telão, rosto para a câmera
    med.root.rotation.y += ((medVira ? -2.5 : alvoY * .5) - med.root.rotation.y) * (1 - Math.exp(-dt * (medVira ? 4 : 2)));
    med.setOlhar(medVira ? .95 : alvoY * .5, medVira ? .12 : .05);
    if (this.medFalando) med.setFala(.55 + Math.random() * .45);
    med.gesticula = !!this.medFalando; med.update(dt, t);
    if (this.vitrine && this.vitrine.root.visible) { this.vitrine.setOlhar(Math.sin(t * .6) * .25, .05); this.vitrine.update(dt, t); if (!this.vitrine.anim) this.vitrine.bracos.forEach(b => { b.rotation.x = -.12 + Math.sin(t * 1.5 + b.userData.lado) * .04; }); }
    if (this.campeao && (this.campeao.root.visible || Rv)) { this.campeao.setOlhar(Math.sin(t * .5) * .2, .05); this.campeao.update(dt, t); }
    // efeitos (emojis)
    this.efeitos = this.efeitos.filter(e => { const k = (t - e.t0) / (e.dur || 1.8); if (k >= 1) { this.scene.remove(e.sp); return false; } e.sp.position.set(e.base.x, e.base.y + k * 1.1, e.base.z); e.sp.material.opacity = 1 - k * k; return true; });
    // confete
    if (this.confete.ativo) {
      const c = this.confete, d = this.dummy;
      c.ps.forEach((p, i) => { p.y -= p.vy * dt; p.rx += p.vr * dt; p.ry += p.vr * dt * .7; if (p.y < 0) this.resetConfete(p); d.position.set(p.x + Math.sin(t + i) * .2, p.y, p.z); d.rotation.set(p.rx, p.ry, 0); d.scale.setScalar(1); d.updateMatrix(); c.im.setMatrixAt(i, d.matrix); });
      c.im.instanceMatrix.needsUpdate = true;
    }
    // câmera
    // enquanto você é levado(a) ao púlpito (e logo ao chegar), o olhar se acomoda devagar, sem tranco
    const kc = 1 - Math.exp(-dt * (this.andandoEu() || this.suaveAte > t ? 3.2 : 14));
    this.olharSuave.y += (this.olhar.y - this.olharSuave.y) * kc; this.olharSuave.p += (this.olhar.p - this.olharSuave.p) * kc;
    const eu = this.podios.get(this.meuId);
    if (this.modo === 'fp' && eu) {
      this.rig.rotation.y = this.olharSuave.y; this.rig.rotation.x = -this.olharSuave.p;
      // balanço leve da cabeça ao caminhar (sobe/desce a cada passo e inclina de lado)
      const an = eu.avatar.andar, ph = eu.avatar.faseAndar;
      this.bob = (this.bob || 0) + ((an ? 1 : 0) - (this.bob || 0)) * (1 - Math.exp(-dt * 4));
      this.rig.position.y = 2.0 + (Math.abs(Math.cos(ph)) - .6) * .03 * this.bob; this.rig.rotation.z = Math.sin(ph) * .008 * this.bob;
      const agora = performance.now();
      if (this.onOlhar && agora - (this.ultOlhar || 0) > 100 && (Math.abs(this.olhar.y - (this.olharEnv?.y ?? 9)) > .01 || Math.abs(this.olhar.p - (this.olharEnv?.p ?? 9)) > .01)) {
        this.ultOlhar = agora; this.olharEnv = { ...this.olhar }; this.onOlhar(this.olhar.y, this.olhar.p);
      }
    } else if (this.modo === 'vitrine') {
      this.camera.position.set(-.25, 1.75, 3.6); this.camera.lookAt(.75, 1.45, -.6);
    } else if (this.modo === 'revelacao' && Rv) { this.camRevelacao(Rv, t); this.renderRevelacao(Rv, t);
    } else if (this.modo === 'vencedor' && this.campeao) { // câmera de frente para o vencedor, balançando devagar
      const p = this.campeao.root.position, m = Math.sin(t * .35);
      this.camera.position.set(p.x + m * .7, 1.5, p.z + 3.4); this.camera.lookAt(p.x, 1.1, p.z);
    } else {
      // "direção de TV": três câmeras filmando os candidatos de frente; no confronto e com o púlpito em movimento,
      // a câmera acompanha a ação. As trocas de plano viram movimentos suaves de grua (sem cortes secos).
      const plano = Math.floor(t / 12) % 3, m = Math.sin(t * .2), P = this.pulp, C = this.camTV ||= { pos: new THREE.Vector3(-6.2, 2.9, -5.4), alvo: new THREE.Vector3(1.4, 1.5, 2) };
      const pos = C.posQ ||= new THREE.Vector3(), alvo = C.alvoQ ||= new THREE.Vector3();
      // (sempre deslocada para o lado, para a cabeça do(a) jornalista não tapar o centro)
      if (((P.fase === 'entrando' && P.trav !== 2) || P.fase === 'saindo') && !this.duelo) { const c = this.dueloObj.carro.position, cx = clamp(c.x, -6, 6); pos.set(2.4 + cx * .45, 5.2, -6.4); alvo.set(cx * .85, 1.0, clamp(c.z, -1.5, .6)); }
      else if (this.duelo) { pos.set(3.2 + m * .3, 2.3, -2.6); alvo.set(0, 1.25, DUELO.z); } // pelo lado da mesa: jornalista fora do quadro
      else if (plano === 0) { pos.set(-6.2 + m * .6, 2.9, -5.4); alvo.set(1.4, 1.5, 2); }
      else if (plano === 1) { pos.set(6.2 - m * .6, 2.9, -5.4); alvo.set(-1.4, 1.5, 2); }
      else { pos.set(m * 2, 7.6, -9.8); alvo.set(0, .6, 1.2); }
      // salto grande = corte seco (gramática de TV); ajustes curtos = movimento suave
      if (!this.camTVok || C.pos.distanceToSquared(pos) > 25) { C.pos.copy(pos); C.alvo.copy(alvo); this.camTVok = true; }
      const kt = 1 - Math.exp(-dt * 1.6); C.pos.lerp(pos, kt); C.alvo.lerp(alvo, 1 - Math.exp(-dt * 2.4));
      this.camera.position.copy(C.pos); this.camera.lookAt(C.alvo);
    }
    if (this.cfg.qualidade === 'alta') this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }
}
