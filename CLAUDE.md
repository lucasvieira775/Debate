# Debate Presidencial Online

Jogo multiplayer 3D (1ª pessoa) de debate presidencial. Node + Express 5 + Socket.io 4 + Three.js 0.187. ESM (`"type": "module"`), sem build, sem testes, sem git. Código e textos em português.

## Regras para economizar tokens (OBRIGATÓRIO)
- **Nunca ler/listar**: `node_modules/`, `dados/audio/` (centenas de .wav em cache, nomes = hash), `Nova pasta/` (PNGs de referência ~2MB), `package-lock.json`, `*.docx`, `.env` (contém chave Gemini — não exibir).
- **Ignorar** `prototipo-html/` (versão antiga, 89KB) salvo pedido explícito.
- Arquivos grandes — **use Grep + Read com offset/limit**, nunca leitura inteira: `public/js/main.js` (84KB), `server/salas.js` (53KB), `public/js/estudio.js` (50KB), `shared/regras.js` (31KB), `public/js/avatar.js` (28KB), `server/voz.js` (22KB), `public/css/estilo.css` (21KB).
- Seções são marcadas por comentários `// ===== X =====` ou `// ---------- X ----------` — faça Grep pelo nome da seção para achar a linha.
- Não use subagentes/Explore para buscas: o mapa abaixo já basta. Não releia arquivo após Edit.
- Respostas curtas, em português, sem resumo repetindo o que foi feito. Após mudanças visuais: reiniciar o servidor, tirar print (Edge headless) e conferir a imagem antes de responder.
- Edite com Edit (trechos pequenos); não reescreva arquivos inteiros.

## Git / GitHub
- Repo: https://github.com/lucasvieira775/Debate (branch `main`). `dados/audio/` (cache TTS) VAI pro git p/ todos os PCs usarem as mesmas vozes; só `dados/audio/falas/` (falas temporárias) fica fora. Hook Stop (`.claude/autopush.ps1`) faz add/commit/push automático ao fim de cada resposta.
- Ao começar a trabalhar: `git pull`. `.env` não vai pro git — copiar manualmente para o outro PC.

## Rodar
- `npm start` (= `node server/index.js`), porta 3000. `INICIAR.bat` abre local; `JOGAR-ONLINE.bat` cria túnel cloudflared.
- Admin: `/admin.html`, senha via `ADMIN_SENHA` no `.env`.
- Ambiente: Windows / PowerShell 5.1 (sem `&&`).

## Mapa do código
**server/**
- `index.js` — Express (estáticos: `public/`, `/shared`, `/vendor/three`, `/audio`), API admin, Socket.io.
- `salas.js` — `class Sala` (l.62) e `class Salas` (l.694). Sala: jornalista/narração (~74), jogadores (~183), partida `iniciar/irPara/prepararFala` (~272), bots IA (~356), moderação/plateia `banir/plateia/finalizar/escolher` (~434), apuração `finalizarDebate/encerrarPartida` (~544), Xzona (~633), dica (~636), ferramentas do jornalista (~653), emotes (~666), denúncia (~673). Salas: `conectar(socket)` (~730) = todos os handlers de eventos socket. Confronto direto: `escolher` → `this.duelo {a,b,fase:'indo'|'no'|'voltando'}` (caminhada `CAMINHADA_MS`), `proximo()` chama `encerrarDuelo` quando o próximo passo não é do duelo; `elegiveis(p)` aplica o equilíbrio (`alvosValidos` em regras.js).
- `voz.js` — `class Dublagem`: TTS Gemini com cache em `dados/audio` (VERSAO no hash), fallback p/ voz do navegador.
- `narracao.js` — falas fixas da(o) jornalista. `dicas.js` — dicas da assessoria (Gemini + fallback local). `contas.js` — moedas/economia, `dados/contas.json`. `revisao.js` — `revisarFala` (Gemini corrige a fala antes de ir pra fanpage da Xzona; fallback `revisarLocal` em `shared/revisao.js`, sem custo).

**shared/** (usado no server e no navegador via `/shared`)
- `regras.js` — partidos, ideologias, temas dos 27 estados (`TEMA_BASE` l.36), tempos (`SEGUNDOS`), `analisar` (nota da fala), `aplicar`, `apurar` (votação), avatares (`AV`), jornalistas.
- `ia.js` — `gerarFala` dos candidatos IA. `moderacao.js` — `moderar(texto)` (xingamento / ban). `xzona.js` — rede social fictícia. `loja.js` — itens.

**public/**
- `js/main.js` — cliente: microfone (~44), mediadora/narração (~90), rede/socket (~148), ações de sala (~287), telas do menu (~307), personalização (~506), HUD (~570), apuração/resultado (~764), telão (~848), início (~926).
- `js/estudio.js` — cena 3D: cenário (~80), púlpito central/caminhada `setDuelo`/`caminhar` (seção PÚLPITO CENTRAL; cada púlpito tem `ator` = avatar+etiqueta+câmera), púlpitos, câmera (~446), telão (~502), loop (~594).
- `js/avatar.js` — `class Avatar` 3D, poses, `retrato()`. `js/voz.js` — Microfone (Web Speech), TTS navegador, SFX. `js/extras.js` — Xzona, dica, janelas, loja UI. `js/util.js` — perfil/config (localStorage), logos. `js/voip.js`.
- `css/estilo.css`, `css/extras.css`, `index.html`, `admin.html`.

**dados/** — `ranking.json`, `contas.json`, `denuncias.json` (estado persistido; não editar à mão sem pedido).

## Convenções
- Estilo compacto: funções de 1 linha, arrow functions, nomes em português (`jog`, `jorn`, `cand`, `fala`, `passo`).
- Estado do jogo é autoritativo no servidor (`Sala.snapshot()` → evento `estado`); cliente só renderiza.
- Regras compartilhadas vão em `shared/`, nunca duplicar no cliente/servidor.
