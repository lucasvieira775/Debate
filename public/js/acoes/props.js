// Objetos 3D das ações (cadeira de metal de bar, pedaço de pau, tomate, buquê de flores, torta, balde)
// e efeitos (voo do arremesso, respingos, pétalas, chantilly, água). ESQUELETO: feito pelo agente de props.
import * as THREE from 'three';

/** Objeto para a mão. Convenção: origem = ponto da pegada; o comprimento do objeto ao longo de +Y. */
export function criarProp(item) { const g = new THREE.Group(); g.userData.item = item; return g; }
