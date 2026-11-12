// Material/efeitos do telão curvo (STUB — será substituído pelo agente de cores/brilho)
import * as THREE from 'three';
/** Material do telão: recebe a CanvasTexture do conteúdo e quantas vezes o tile se repete ao longo do arco. */
export function criarMaterialTelao(tex, repeticoes = 1) {
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(repeticoes, 1);
  return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.BackSide });
}
/** Chamado a cada frame. estado: { vinheta: 0..1 (progresso, ou -1 sem vinheta), bloco } */
export function atualizarTelao(mat, t, dt, estado) {}
