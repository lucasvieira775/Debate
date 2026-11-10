// Voz entre jogadores (WebRTC, conexão direta navegador a navegador; o servidor só repassa a sinalização).
// Regra do microfone: antes/depois do debate todos falam; durante, só o candidato da vez.
// A conexão é criada mesmo sem microfone (só ouvir); quando o microfone é liberado a faixa entra via replaceTrack, sem renegociar.
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];

export class Voip {
  constructor(socket, { onNivel } = {}) {
    this.socket = socket; this.onNivel = onNivel;
    this.peers = new Map(); this.stream = null; this.eu = null; this.liberado = false; this.mudo = false; this.ativo = false;
    socket.on('rtc', d => this.sinal(d.de, d.dados));
    // autoplay bloqueado: tenta tocar de novo no próximo clique/tecla
    const destravar = () => { this.ctx?.resume?.().catch(() => {}); for (const p of this.peers.values()) p.audio?.paused && p.audio.play().catch(() => {}); };
    addEventListener('pointerdown', destravar); addEventListener('keydown', destravar);
  }
  async iniciar() {
    if (this.stream || this.pedindo) return !!this.stream;
    this.pedindo = true;
    try { this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch { this.stream = null; }
    this.pedindo = false; this.aplicar();
    for (const p of this.peers.values()) this.anexar(p); // conexões já abertas passam a transmitir
    return !!this.stream;
  }
  /** Atualiza quem está na sala (ids humanos) e quem pode falar. */
  atualizar(eu, ids, liberado) {
    this.eu = eu; this.liberado = liberado; this.aplicar();
    for (const id of ids) if (id !== eu && !this.peers.has(id) && eu < id) this.conectar(id); // quem tem o menor id inicia
    for (const id of [...this.peers.keys()]) if (!ids.includes(id)) this.fechar(id);
  }
  setMudo(v) { this.mudo = v; this.aplicar(); }
  /** Volume de RECEPÇÃO das vozes remotas (0..1); não mexe no microfone nem nas conexões. */
  setVolumeRecepcao(v) { this.volRec = v; for (const p of this.peers.values()) if (p.audio) p.audio.volume = v; }
  get transmitindo() { return !!this.stream && this.liberado && !this.mudo; }
  aplicar() { this.stream?.getAudioTracks().forEach(t => { t.enabled = this.liberado && !this.mudo; }); }
  anexar(p) {
    const tr = p.pc.getTransceivers().find(t => t.receiver.track?.kind === 'audio'); if (!tr) return;
    tr.direction = 'sendrecv';
    const faixa = this.stream?.getAudioTracks()[0] || null;
    if (tr.sender.track !== faixa) tr.sender.replaceTrack(faixa).catch(() => {});
  }
  criar(id) {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    pc.onicecandidate = e => e.candidate && this.socket.emit('rtc', { para: id, dados: { ice: e.candidate } });
    pc.ontrack = e => this.ouvir(id, e.streams[0] || new MediaStream([e.track]));
    pc.onconnectionstatechange = () => { if (['failed', 'closed'].includes(pc.connectionState)) this.fechar(id); };
    const p = { pc, audio: null, fila: [] }; this.peers.set(id, p); return p;
  }
  async conectar(id) {
    const p = this.criar(id);
    p.pc.addTransceiver('audio', { direction: 'sendrecv' }); this.anexar(p);
    const oferta = await p.pc.createOffer(); await p.pc.setLocalDescription(oferta);
    this.socket.emit('rtc', { para: id, dados: { sdp: p.pc.localDescription } });
  }
  async sinal(de, d) {
    if (!d) return;
    let p = this.peers.get(de);
    try {
      if (d.sdp) {
        if (d.sdp.type === 'offer') { if (p) this.fechar(de); p = this.criar(de); }
        if (!p) return;
        await p.pc.setRemoteDescription(d.sdp);
        for (const c of p.fila.splice(0)) await p.pc.addIceCandidate(c).catch(() => {});
        if (d.sdp.type === 'offer') { this.anexar(p); const r = await p.pc.createAnswer(); await p.pc.setLocalDescription(r); this.socket.emit('rtc', { para: de, dados: { sdp: p.pc.localDescription } }); }
      } else if (d.ice && p) {
        if (!p.pc.remoteDescription) p.fila.push(d.ice); // chegou antes da oferta/resposta
        else await p.pc.addIceCandidate(d.ice).catch(() => {});
      }
    } catch (e) { console.warn('voip', e); }
  }
  ouvir(id, stream) {
    const p = this.peers.get(id); if (!p || p.audio) return;
    p.audio = new Audio(); p.audio.srcObject = stream; p.audio.autoplay = true; p.audio.volume = this.volRec ?? 1; p.audio.play().catch(() => {});
    // nível da voz recebida -> boca do avatar se mexe
    try {
      const ctx = this.ctx ||= new AudioContext(); ctx.resume?.().catch(() => {}); const an = ctx.createAnalyser(); an.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(an); const buf = new Uint8Array(an.fftSize);
      const loop = () => { if (this.peers.get(id) !== p) return; an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) { const x = (v - 128) / 128; s += x * x; } const n = Math.sqrt(s / buf.length) * 6; if (n > .12) this.onNivel?.(id, Math.min(1, n)); requestAnimationFrame(loop); };
      loop();
    } catch { /* sem análise */ }
  }
  fechar(id) { const p = this.peers.get(id); if (!p) return; try { p.pc.close(); } catch { /* */ } if (p.audio) { p.audio.pause(); p.audio.srcObject = null; } this.peers.delete(id); }
  /** Celular: solta o microfone para o reconhecimento de voz (true) e pega de volta depois (false). */
  async pausar(v) {
    if (v) { if (!this.stream) return; this.pausado = true; this.stream.getTracks().forEach(t => t.stop()); this.stream = null; for (const p of this.peers.values()) this.anexar(p); await new Promise(r => setTimeout(r, 250)); }
    else if (this.pausado) { this.pausado = false; await this.iniciar(); }
  }
  sair() { for (const id of [...this.peers.keys()]) this.fechar(id); this.stream?.getTracks().forEach(t => t.stop()); this.stream = null; }
}
