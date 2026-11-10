// Cadastro do jogador: nome do candidato (até 2 nomes, só letras) e @ da Xzona (letras e números). Validado no cliente e no servidor.
import { nomeImproprio } from './moderacao.js';
import { norm } from './regras.js';

export const CADASTRO = { idadeMin: 10, idadeMax: 100, precoNome: 2500, precoUser: 2000 };

/** "  lucas   bozonaro " -> "Lucas Bozonaro" */
export const formatarNome = s => String(s || '').trim().replace(/\s+/g, ' ').split(' ').map(p => p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1).toLocaleLowerCase('pt-BR')).join(' ');
export const formatarUser = s => String(s || '').trim().replace(/^@/, '').toLowerCase();
/** chave para comparar nomes iguais (sem acento/maiúscula) */
export const chaveNome = s => norm(s).replace(/[^a-z0-9]/g, '');

/** Retorna mensagem de erro ou null. */
export function validarNome(nome) {
  const n = formatarNome(nome);
  if (!n) return 'Digite o nome do candidato.';
  const partes = n.split(' ');
  if (partes.length > 2) return 'Use no máximo dois nomes (nome e sobrenome).';
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ ]+$/.test(n)) return 'O nome só pode ter letras: sem números ou caracteres especiais.';
  if (partes.some(p => p.length < 2 || p.length > 14)) return 'Cada nome deve ter de 2 a 14 letras.';
  if (/(.)\1\1/i.test(norm(n))) return 'Nome inválido (letras repetidas demais).';
  if (nomeImproprio(n)) return 'Esse nome não é permitido.';
  return null;
}
export function validarUser(user) {
  const u = formatarUser(user);
  if (!u) return 'Digite o seu @ da Xzona.';
  if (!/^[a-z0-9]+$/.test(u)) return 'O @ só pode ter letras e números (sem acentos, espaços ou caracteres especiais).';
  if (!/^[a-z]/.test(u)) return 'O @ deve começar com uma letra.';
  if (u.length < 3 || u.length > 15) return 'O @ deve ter de 3 a 15 caracteres.';
  if (nomeImproprio(u)) return 'Esse @ não é permitido.';
  return null;
}
export function validarIdade(idade) {
  const i = Number(idade);
  if (!Number.isInteger(i) || i < CADASTRO.idadeMin || i > CADASTRO.idadeMax) return `Informe uma idade válida (${CADASTRO.idadeMin} a ${CADASTRO.idadeMax}).`;
  return null;
}
