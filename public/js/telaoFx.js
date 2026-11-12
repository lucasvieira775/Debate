// ===== TELÃO CURVO DE LED: material, animação de cores/brilho e moldura de luz =====
// Exports:
//  criarMaterialTelao(tex, repeticoes) → THREE.ShaderMaterial (BackSide, toneMapped:false, fog:true)
//  atualizarTelao(mat, t, dt, { vinheta: progresso 0..1 (-1 = sem vinheta; >1 tolerado = cauda), bloco })
//  criarMolduraLuz(raio, alturaBase, alturaTopo, arcoIni, arcoLen, centro, mat?) → THREE.Group com 2 filetes de LED
//    (y = alturaBase / alturaTopo relativos a `centro`). Se `mat` (do telão) for passado, os filetes são animados
//    junto pelo atualizarTelao(mat…); sem `mat`, qualquer chamada de atualizarTelao os anima.
// Convenção de UV: u = 0..1 ao longo do arco do CylinderGeometry, v = 0 embaixo / 1 em cima. O material NÃO inverte u
//  por padrão (uniform inverterU = 0) porque o estudio.js já faz uv.x = 1 - uv.x na geometria (vista por dentro sem
//  espelhar). Se usar a geometria crua, ponha mat.uniforms.inverterU.value = 1.
// Cor: tex em SRGBColorSpace → o WebGL decodifica para linear no texture2D; o shader trabalha em linear e termina com
//  tonemapping_fragment/colorspace_fragment (só agem ao renderizar direto na tela; com EffectComposer quem converte é o
//  OutputPass). Calibração p/ UnrealBloomPass(strength .16, radius .3, threshold .96): conteúdo branco ≈ .82 linear
//  (não floresce); só varredura, flashes e picos da vinheta passam de ~1 e florescem.
// Uniforms: tempo, brilho, flash, progresso, realce/realce2 (cores do bloco), realceForca, atividade (0 ocioso → 1 vinheta),
//  varredura/varreduraForca (power-up), onda/ondaForca (onda azul ociosa), gradeForca, resLed, modulos, rep, inverterU.
import * as THREE from 'three';

const CORES = { // [topo, base] do realce por bloco (0 = ocioso)
  0: ['#3b82f6', '#22d3ee'], 1: ['#22c55e', '#facc15'], 2: ['#ef4444', '#3b82f6'], 3: ['#ef4444', '#f5b301'],
};
const corBloco = b => (CORES[b] || CORES[0]).map(c => new THREE.Color(c));
const ALVO = {}; // cores-alvo por bloco (cache: nada alocado por frame)
const sat = x => Math.min(1, Math.max(0, x));
const suave = (a, b, x) => { const k = sat((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const pulso = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
const soltas = new Set(); // molduras sem telão associado

const NUCLEO_V = /* glsl */`
varying vec2 vUv; varying vec3 vPosW; varying vec3 vNorW;
#include <fog_pars_vertex>
void main() {
  vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vPosW = w.xyz; vNorW = normalize(mat3(modelMatrix) * normal);
  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const COMUM_F = /* glsl */`
uniform float tempo, brilho, flash, progresso, atividade, realceForca, varredura, varreduraForca, onda, ondaForca, inverterU;
uniform vec3 realce, realce2;
varying vec2 vUv; varying vec3 vPosW; varying vec3 vNorW;
#include <fog_pars_fragment>
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float arcoU() { return inverterU > .5 ? 1. - vUv.x : vUv.x; }
// distância circular (a onda dá a volta no arco)
float dCirc(float a, float b) { return abs(fract(a - b + .5) - .5); }
`;

const TELAO_F = COMUM_F + /* glsl */`
uniform sampler2D mapa; uniform float rep, gradeForca, unico; uniform vec2 resLed, modulos;
void main() {
  float ua = arcoU(), v = vUv.y;
  // unico = 1: UM só quadro do vídeo no centro do arco (proporção certa); o resto do arco estende as bordas dele, desfocado e mais escuro (sem cópias)
  float x = ua * rep - (rep - 1.) * .5 * unico, xc = mix(x, clamp(x, .002, .998), unico), fora = abs(x - xc);
  vec3 c = texture2D(mapa, vec2(xc, v), min(fora * 8., 6.)).rgb * mix(1., .5, smoothstep(0., 1.2, fora)); // já linear (sRGB decodificado pelo hardware)
  c *= .82; // branco do conteúdo ≈ .82 → abaixo do threshold do bloom
  // painéis/módulos: leve variação de brilho e de tom por gabinete
  vec2 md = floor(vec2(ua, v) * modulos); float hm = hash(md);
  c *= 1. + (hm - .5) * .07; c.b *= 1. + (hash(md + 7.3) - .5) * .03;
  // grade de LED com subpixels RGB — some com a distância (fwidth) para não gerar moiré
  vec2 px = vec2(ua, v) * resLed, f = fract(px), fw = fwidth(px);
  float perto = 1. - smoothstep(.18, .5, max(fw.x, fw.y));
  vec3 sub = 1. + .38 * cos(6.2832 * (f.x - vec3(1., 3., 5.) / 6.));
  float gap = smoothstep(0., .14, f.y) * smoothstep(1., .86, f.y) * smoothstep(0., .06, f.x) * smoothstep(1., .94, f.x);
  c *= mix(vec3(1.), sub * (.35 + .75 * gap), gradeForca * perto);
  // scanline fina (só de perto) + faixa de varredura de refresh bem sutil
  c *= 1. - .06 * perto * (.5 + .5 * cos(6.2832 * px.y));
  c *= 1. - .035 * exp(-pow((fract(v - tempo * .11) - .5) * 9., 2.));
  // vinheta: escurece bordas superior/inferior e as pontas do arco
  float bordaV = smoothstep(0., .16, v) * smoothstep(1., .84, v);
  c *= mix(.62, 1., bordaV) * mix(.7, 1., smoothstep(0., .015, ua) * smoothstep(1., .985, ua));
  // onda de luz azul percorrendo o arco (ocioso)
  float w = exp(-pow(dCirc(ua, onda) * 9., 2.));
  c = c * (1. + .22 * w * ondaForca) + vec3(.012, .04, .14) * w * ondaForca;
  // brilho geral + realce do bloco em glow nas bordas
  c *= brilho;
  float eT = 1. - smoothstep(0., .09, 1. - v), eB = 1. - smoothstep(0., .09, v);
  c += (realce * eT + realce2 * eB) * realceForca * .32;
  // power-up: à frente da linha a tela ainda está "desligada"; a linha é bem quente (floresce)
  float d = ua - varredura;
  c *= mix(1., mix(.12, 1., smoothstep(.015, -.015, d)), varreduraForca);
  vec3 corLinha = mix(vec3(.75, .85, 1.), .5 * (realce + realce2), .35);
  c += corLinha * varreduraForca * (2.6 * exp(-d * d * 9000.) + .15 * exp(min(d, 0.) * 14.) * step(d, 0.) * exp(-d * d * 60.));
  // flash: clareia o conteúdo + véu de cor (picos passam do threshold)
  c += (c * 1.2 + .14 * mix(realce2, realce, v)) * flash;
  // sheen especular fraco do vidro/policarbonato, depende do ângulo de visão
  vec3 V = normalize(cameraPosition - vPosW), N = faceforward(vNorW, -V, vNorW), R = reflect(-V, N);
  float fres = pow(1. - abs(dot(N, V)), 4.);
  float spec = pow(max(dot(R, normalize(vec3(0., .75, .66))), 0.), 28.);
  c += vec3(.55, .65, 1.) * (fres * .035 + spec * .03) * (.6 + .4 * sin(ua * 30. + v * 4.));
  c += vec3(.002, .003, .008); // nível de preto do LED (não é preto absoluto)
  gl_FragColor = vec4(c, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

const FILETE_F = COMUM_F + /* glsl */`
uniform float comprimento, lado; // comprimento do arco em metros; lado: 0 = base, 1 = topo
void main() {
  float ua = arcoU();
  vec3 cor = mix(realce2, realce, lado);
  // pontos de LED a cada 3 cm (média quando longe)
  float x = ua * comprimento / .03, fw = fwidth(x);
  float ponto = mix(.25 + .75 * smoothstep(.45, .15, abs(fract(x) - .5)), .62, smoothstep(.3, .8, fw));
  float base = .38 * brilho;
  float ond = exp(-pow(dCirc(ua, onda) * 9., 2.)) * ondaForca * .45;
  float caca = atividade * .45 * pow(.5 + .5 * sin(6.2832 * (ua * 14. - tempo * 1.6) + lado * 3.14), 6.);
  float d = ua - varredura;
  float linha = varreduraForca * (3. * exp(-d * d * 4000.) - .25 * step(.0, d)); // apagado à frente da varredura
  vec3 c = cor * (base + caca + realceForca * .25) * ponto + vec3(.15, .3, 1.) * ond * ponto;
  c += mix(vec3(1.), cor, .4) * max(linha, 0.) + (cor + .3) * flash * 1.2;
  c *= 1. + min(linha, 0.) * 3.;
  gl_FragColor = vec4(max(c, 0.), 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

const unifComuns = () => ({
  tempo: { value: 0 }, brilho: { value: 1 }, flash: { value: 0 }, progresso: { value: -1 }, atividade: { value: 0 },
  realce: { value: new THREE.Color(CORES[0][0]) }, realce2: { value: new THREE.Color(CORES[0][1]) }, realceForca: { value: .12 },
  varredura: { value: 0 }, varreduraForca: { value: 0 }, onda: { value: 0 }, ondaForca: { value: 1 }, inverterU: { value: 0 },
});

/** Material do telão: recebe a CanvasTexture do conteúdo e quantos tiles cabem no arco (proporção). Com uniform unico=1 (padrão) mostra um só quadro no centro. */
export function criarMaterialTelao(tex, repeticoes = 1) {
  tex.wrapS = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.max(tex.anisotropy, 8);
  const iw = tex.image?.width || 2048, ih = tex.image?.height || 576;
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, unifComuns(), {
      rep: { value: repeticoes }, gradeForca: { value: 1 }, unico: { value: 1 }, // unico 0 = tile repetido ao longo do arco
      resLed: { value: new THREE.Vector2(iw * repeticoes, ih) },   // 1 LED por pixel do canvas
      modulos: { value: new THREE.Vector2(Math.round(iw * repeticoes / 128), Math.max(1, Math.round(ih / 128))) }, // gabinetes 128×128 px
    }]),
    vertexShader: NUCLEO_V, fragmentShader: TELAO_F, side: THREE.BackSide, fog: true, toneMapped: false,
  });
  mat.uniforms.mapa = { value: tex }; // fora do merge: o merge clonaria a textura
  mat.userData = { vAnt: -1, t0: -99, tFim: -99, ativ: 0, cor: corBloco(0), molduras: [] };
  return mat;
}

/** Chamado a cada frame. estado: { vinheta: 0..1 (progresso, ou -1 sem vinheta), bloco } */
export function atualizarTelao(mat, t, dt, estado = {}) {
  const u = mat.uniforms, d = mat.userData, p = estado.vinheta ?? -1, em = p >= 0;
  if (em && d.vAnt < 0) d.t0 = t; // vinheta começou → power-up
  if (!em && d.vAnt >= 0) d.tFim = t;
  d.vAnt = p;
  const k = 1 - Math.exp(-Math.min(dt, .1) * 3.5);
  // atividade: sobe rápido na entrada, desce suave no fim (cauda além de 1 também conta)
  const alvo = em ? 1 - .6 * suave(.9, 1.15, p) : 0; d.ativ += (alvo - d.ativ) * (em ? 1 - Math.exp(-Math.min(dt, .1) * 8) : k * .6);
  const a = d.ativ, s = t - d.t0;
  // power-up: varredura de luz ao longo do arco em ~.6 s + flash curto
  const vf = s >= 0 && s < 1 ? 1 - suave(.6, .85, s) : 0;
  const pico = em ? pulso(p, .16, .025) * .7 + pulso(p, .36, .02) : 0; // entrada das faixas / impacto do número
  u.varredura.value = suave(0, .62, s) * 1.04 - .02; u.varreduraForca.value = vf;
  u.flash.value = (s >= 0 && s < 1 ? .55 * pulso(s, .08, .07) : 0) + pico * .55;
  // ocioso: respiração lenta + onda azul que percorre o arco
  const resp = .93 + .05 * Math.sin(t * .55) + .02 * Math.sin(t * 1.37);
  u.brilho.value = resp * (1 - a) + 1.04 * a + pico * .22;
  u.onda.value = (t * .045) % 1; u.ondaForca.value = 1 - .75 * a;
  // cor de realce do bloco (interpolada) — volta ao azul no ocioso
  const [c1, c2] = ALVO[em || a > .05 ? estado.bloco : 0] ||= corBloco(em || a > .05 ? estado.bloco : 0), kc = em ? 1 - Math.exp(-Math.min(dt, .1) * 6) : k;
  d.cor[0].lerp(c1, kc); d.cor[1].lerp(c2, kc); u.realce.value.copy(d.cor[0]); u.realce2.value.copy(d.cor[1]);
  u.realceForca.value = .12 + .55 * a + .45 * pico;
  u.tempo.value = t; u.progresso.value = p; u.atividade.value = a;
  for (const m of [...d.molduras, ...soltas]) for (const n in m.uniforms) if (n in unifComuns.chave) {
    const x = u[n].value; if (x.isColor) m.uniforms[n].value.copy(x); else m.uniforms[n].value = x;
  }
}
unifComuns.chave = Object.fromEntries(Object.keys(unifComuns()).filter(n => n !== 'inverterU').map(n => [n, 1]));

/** Filetes de LED (topo e base) acompanhando o arco. Ângulos em radianos, como no CylinderGeometry. */
export function criarMolduraLuz(raio, alturaBase, alturaTopo, arcoIni, arcoLen, centro = new THREE.Vector3(), mat = null) {
  const g = new THREE.Group(); g.position.copy(centro);
  for (const [y, lado] of [[alturaBase, 0], [alturaTopo, 1]]) {
    const geo = new THREE.CylinderGeometry(raio, raio, .05, 160, 1, true, arcoIni, arcoLen);
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); // mesma convenção do telão
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, unifComuns(), { comprimento: { value: raio * arcoLen }, lado: { value: lado } }]),
      vertexShader: NUCLEO_V, fragmentShader: FILETE_F, side: THREE.DoubleSide, fog: true, toneMapped: false,
    });
    if (mat) mat.userData.molduras.push(m); else soltas.add(m);
    const f = new THREE.Mesh(geo, m); f.position.y = y; g.add(f);
  }
  return g;
}
