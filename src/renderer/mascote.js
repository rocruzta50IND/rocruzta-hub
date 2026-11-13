'use strict';

// Mascote do Hub: o mago em pixel (mago.js) como presença da IA na tela Início.
// Estudo de origem: iconemascote/abertura-final/app.js. Aqui só entra o comportamento do personagem:
// - sentado na quina superior direita do campo de mensagem, de pernas paradas, piscando e olhando em volta;
// - reage à digitação (escuta), ao "pensando" (resposta sendo gerada) e ao fim da resposta;
// - no chat vira o avatar da última resposta (as anteriores ficam com um pontinho);
// - pode ser arrastado: em superfícies sólidas pousa normalmente, no ar cria a plataforma mágica de pixels;
// - some quando a tela Início não está à vista (outra seção ou app aberto) e volta voando da barra lateral.
// Depende de mago.js e conversa.js (CHAT), carregados antes. abertura.js usa preverFinal() e concluirAbertura().
const Mascote = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const SIT_R = 30; // tamanho sentado no campo de mensagem
  const AV_R = 12; // tamanho como avatar da resposta
  // Superfícies "sólidas" em que ele pode pousar normalmente (o resto do ar ganha uma plataforma mágica).
  const SOLIDOS = '#composer, .sub, #status, .inicio-chat h1, .c-dica, .c-bolha, .c-dest';
  const FRASES_POUSO = ['Aqui está ótimo ✦', 'Firme! Parece sólido.', 'Boa vista daqui!'];
  const FRASES_CUTUCADA = ['Oi! ✦', 'Faz cócegas!', 'Estou aqui!', 'Precisa de algo?', 'Hehe', 'Que tal uma tarefa?'];

  const E = {
    att: null, // alvo atual: { el, R, sit, f }
    aberto: false, // a abertura terminou
    visivel: false,
    estado: 'idle', // idle | listen | think | success | error
    pin: null, // onde o usuário o soltou: { el, f }
    plat: null,
    dormindo: false,
    ultimaAcao: Date.now(),
    cutucadas: [],
    foraDaRolagem: false,
  };
  let W = innerWidth;
  let H = innerHeight;
  const mago = Mago.create({ x: W / 2, y: H * 0.46, R: 28 });

  // Configurações > Mascote: desligado, o mago não existe (sem laços, sem pixels, sem observadores) e a abertura é simples.
  const CHAVE = 'rocruzta-hub:mascote';
  const lerLigado = () => { try { return localStorage.getItem(CHAVE) !== 'off'; } catch { return true; } };
  let ligado = lerLigado();
  document.body.classList.toggle('sem-mascote', !ligado);
  if (!ligado) mago.pausar();

  const centro = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  // Posição do mago sentado sobre o topo do elemento; f (0 a 1) é onde, ao longo da borda, ele está (1 = quina direita).
  function posSentado(el, R = SIT_R, f = 1) {
    const r = el.getBoundingClientRect(), sc = R / 28 * 0.8, k = sc * 120 / 21, hw = 60 * sc + 20, span = r.width - 2 * hw;
    return [span > 8 ? r.left + hw + f * span : r.left + r.width / 2, r.top - 4 * k + 1];
  }
  const posAlvo = (a) => (a.sit ? posSentado(a.el, a.R, a.f) : centro(a.el));
  const ligar = (alvo) => { E.att = alvo ? { el: alvo.el, R: alvo.R, sit: alvo.sit, f: alvo.f } : null; };
  const temTela = (el) => Boolean(el && el.isConnected && el.getClientRects().length);

  // ---- balão de fala ----
  const balao = document.createElement('div');
  balao.className = 'mago-balao';
  balao.setAttribute('aria-hidden', 'true');
  document.body.appendChild(balao);
  let balaoT;
  function dizer(texto, ms = 2200) {
    clearTimeout(balaoT);
    if (!texto) { balao.classList.remove('show'); return; }
    balao.textContent = texto;
    balao.classList.add('show');
    if (ms) balaoT = setTimeout(() => balao.classList.remove('show'), ms);
  }

  // ---- onde ele deve estar agora ----
  const composerVisivel = () => temTela($('#composer'));
  function alvoPadrao() {
    if (!composerVisivel()) return null; // só existe na tela Início
    if (CHAT.msgs.length || CHAT.gerando) {
      const av = $$('.c-linha.ia .c-avatar').pop();
      if (av) return { el: av, R: AV_R, sit: false, f: 1 };
    }
    const p = E.pin;
    if (p && temTela(p.el)) return { el: p.el, R: SIT_R, sit: true, f: p.f };
    return { el: $('#composer'), R: SIT_R, sit: true, f: 1 };
  }

  // ---- plataforma mágica e pouso ----
  function matarPlataforma(explodir = true) {
    const p = E.plat;
    if (!p) return;
    E.plat = null;
    const r = p.getBoundingClientRect();
    if (explodir) mago.burst(r.left + r.width / 2, r.top + 4, 14, { dir: -Math.PI / 2, spread: 3, dist: r.width * 0.45, dur: 600 });
    p.animate([{ opacity: 1, transform: 'scaleX(1)' }, { opacity: 0, transform: 'scaleX(.5) translateY(6px)' }], { duration: 320, easing: 'ease-in' }).onfinish = () => p.remove();
  }
  function criarPlataforma(cx, topo) {
    matarPlataforma(false);
    const p = document.createElement('div');
    p.className = 'mago-plat';
    const w = 170;
    p.style.cssText = `left:${cx - w / 2}px;top:${topo}px;width:${w}px`;
    document.body.appendChild(p);
    E.plat = p;
    setTimeout(() => mago.burst(cx, topo + 4, 18, { dir: -Math.PI / 2, spread: 3, dist: 90, dur: 600 }), 120);
    return p;
  }
  function acharSolido(px, pesY) {
    let melhor = null;
    $$(SOLIDOS).forEach((el) => {
      if (!el.getClientRects().length) return;
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.top < 64 || r.top > H - 10) return;
      const dy = r.top - pesY;
      if (dy < -46 || dy > 90) return;
      if (px < r.left - 20 || px > r.right + 20) return;
      if (!melhor || dy < melhor.dy) melhor = { el, dy, r };
    });
    return melhor;
  }
  function pousarEm(px, py) {
    const sc = SIT_R / 28 * 0.8, k = sc * 120 / 21, pesY = py + 4 * k - 1;
    const hit = acharSolido(px, pesY);
    if (hit) {
      const hw = 60 * sc + 20, span = hit.r.width - 2 * hw;
      const f = span > 8 ? Math.max(0, Math.min(1, (px - hit.r.left - hw) / span)) : 0.5;
      matarPlataforma();
      E.pin = hit.el.id === 'composer' && f > 0.97 ? null : { el: hit.el, f };
      ligar({ el: hit.el, R: SIT_R, sit: true, f });
      dizer(FRASES_POUSO[Math.floor(Math.random() * FRASES_POUSO.length)], 1700);
      return;
    }
    const x = Math.max(90, Math.min(W - 90, px)), topo = Math.max(100, Math.min(H - 60, pesY));
    const p = criarPlataforma(x, topo);
    E.pin = { el: p, f: 0.5 };
    ligar({ el: p, R: SIT_R, sit: true, f: 0.5 });
    dizer('Abracadabra! Plataforma ✦', 1800);
  }

  // ---- estados (escutando, pensando, concluído, erro) ----
  function emocao(nome, ms = 1800) { mago.emotion(nome, ms); }
  function definirEstado(s) {
    E.estado = s;
    clearInterval(E.rip); clearInterval(E.thk);
    mago.mood(null);
    if (s === 'think') {
      E.thk = setInterval(() => mago.burst(...mago.head(), 2, { dir: -Math.PI / 2, spread: 0.9, dist: 40, dur: 800 }), 330);
      mago.mood('think');
    } else if (s === 'listen') {
      mago.mood('speak');
      E.rip = setInterval(() => mago.pulse(), 1500);
    } else if (s === 'success') {
      mago.layout('check');
      setTimeout(() => { if (E.estado === 'success') definirEstado('idle'); }, 1500);
    } else if (s === 'error') {
      mago.layout('cross');
      setTimeout(() => { if (E.estado === 'error') definirEstado('idle'); }, 1800);
    }
  }
  const acordar = () => {
    E.ultimaAcao = Date.now();
    if (E.dormindo) { E.dormindo = false; emocao('surprised', 900); dizer('Hm? ✦', 1200); }
  };

  // ---- entrar, trocar de alvo, sair ----
  // Volta ao Início: ele se materializa já no lugar dele, com pixels convergindo (não voa de lugar nenhum).
  function entrar(alvo) {
    const [x, y] = posAlvo(alvo);
    ligar(alvo);
    E.visivel = true;
    mago.snap(x, y);
    mago.o.R0 = 8;
    mago.o.opacity = 0;
    mago.stiffness(90, 12.5);
    mago.show(true);
    mago.birth();
    mago.burst(x, y, 16, { dist: 60 });
  }
  function trocar(alvo) {
    mago.stiffness(55, 10);
    ligar(alvo);
    setTimeout(() => mago.stiffness(90, 12.5), 1200);
  }
  // Sai do Início: some em pixels, ali mesmo.
  function esconder() {
    E.visivel = false;
    matarPlataforma(false);
    dizer('');
    clearInterval(E.rip); clearInterval(E.thk);
    mago.burst(mago.x, mago.y, 16, { dist: 60 });
    mago.show(false);
    E.att = null;
    E.foraDaRolagem = false;
  }
  function sincronizar() {
    if (!E.aberto) return;
    const alvo = alvoPadrao();
    if (!alvo) { if (E.visivel) esconder(); return; }
    if (!E.visivel) { entrar(alvo); return; }
    if (!E.att || E.att.el !== alvo.el || E.att.sit !== alvo.sit) trocar(alvo);
  }
  let agendado = false;
  function agendarSincronia() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => { agendado = false; sincronizar(); });
  }
  const observadores = [];
  function observar() {
    if (observadores.length) return;
    const a = new MutationObserver(agendarSincronia); a.observe($('#hmain'), { childList: true, subtree: true });
    const b = new MutationObserver(agendarSincronia); b.observe($('#v-hub'), { attributes: true, attributeFilter: ['hidden'] });
    observadores.push(a, b);
  }
  const desobservar = () => observadores.splice(0).forEach((o) => o.disconnect());

  // ---- laço de quadros: segue o alvo, o balão e a plataforma ----
  // Parado, o mago só confere onde o alvo está a cada 4 quadros (ler medidas da tela a cada quadro custa layout).
  let quadro = 0;
  let lacoAtivo = false;
  function laco() {
    if (!lacoAtivo) return;
    const a = E.att;
    const repouso = !mago.o.dragging && Math.hypot(mago.o.vx, mago.o.vy) < 3 && Math.abs(mago.o.R0t - mago.o.R0) < 0.05;
    const pular = repouso && (quadro++ % 4 !== 0);
    if (a && !pular) {
      if (!a.el.isConnected) agendarSincronia();
      else if (a.el.getClientRects().length) {
        const [x, y] = posAlvo(a);
        if (!mago.o.dragging) mago.moveTo(x, y);
        const mult = E.estado === 'listen' ? 1.12 : E.estado === 'think' ? 0.95 : 1;
        mago.setRadius(a.R * mult);
        // avatar de uma resposta que rolou para fora da área do chat: esconde enquanto estiver fora
        const rol = !a.sit && $('#c-rolagem');
        if (rol && E.visivel) {
          const r = a.el.getBoundingClientRect(), q = rol.getBoundingClientRect();
          const fora = !(r.bottom > q.top + 4 && r.top < q.bottom - 4);
          if (fora !== E.foraDaRolagem) { E.foraDaRolagem = fora; mago.show(!fora); }
        } else if (E.foraDaRolagem) { E.foraDaRolagem = false; if (E.visivel) mago.show(true); }
      }
    }
    if (E.plat) E.plat.style.visibility = E.att && E.att.el === E.plat ? 'visible' : 'hidden';
    if (balao.classList.contains('show')) {
      const x = Math.max(110, Math.min(W - 110, mago.x));
      balao.style.left = x + 'px';
      balao.style.top = (mago.y - mago.R * 1.4 - 8) + 'px';
    }
    requestAnimationFrame(laco);
  }
  function iniciarLaco() { if (lacoAtivo) return; lacoAtivo = true; requestAnimationFrame(laco); }
  addEventListener('resize', () => { W = innerWidth; H = innerHeight; });

  // ---- reações ao que o usuário faz ----
  document.addEventListener('input', (e) => {
    if (!E.aberto || !e.target || e.target.id !== 'c-texto') return;
    acordar();
    if (E.visivel && E.att && E.att.sit) {
      mago.burst(...mago.tip(), 3, { dist: 26, dur: 450 });
      mago.act('tap');
      if (e.target.value.length % 7 === 0) mago.cast();
    }
    if (CHAT.gerando) return;
    const tem = e.target.value.trim().length > 0;
    definirEstado(tem ? 'listen' : 'idle');
    if (tem && composerVisivel()) mago.look(...centro($('#composer'))); else mago.look(null);
  });
  document.addEventListener('focusin', (e) => {
    if (E.aberto && e.target && e.target.id === 'c-texto') { acordar(); if (!CHAT.gerando && composerVisivel()) mago.look(...centro($('#composer'))); }
  });
  document.addEventListener('focusout', (e) => {
    if (!E.aberto || !e.target || e.target.id !== 'c-texto') return;
    if (!CHAT.gerando) { mago.look(null); if (!e.target.value.trim()) definirEstado('idle'); }
  });
  document.addEventListener('keydown', acordar, { passive: true });

  // A resposta sendo gerada (CHAT.gerando) é o "pensando"; ao terminar, comemora ou lamenta.
  let geravaAntes = false;
  setInterval(() => {
    if (!E.aberto) return;
    const g = Boolean(CHAT.gerando);
    if (g === geravaAntes) return;
    geravaAntes = g;
    if (!E.visivel) return;
    if (g) { acordar(); mago.look(null); definirEstado('think'); return; }
    const ult = CHAT.msgs[CHAT.msgs.length - 1];
    definirEstado(ult && ult.erro ? 'error' : 'success');
  }, 150);

  // ---- vida de mascote sentado: olha em volta, faz floreios, pisca ----
  (function vida() {
    const calmo = E.aberto && E.visivel && !CHAT.msgs.length && !CHAT.gerando && !E.dormindo && E.att && E.att.sit && !mago.o.dragging
      && !($('#c-texto') && $('#c-texto').value);
    if (calmo && composerVisivel()) {
      const r = Math.random();
      if (r < 0.3) { const [x, y] = centro($('#composer')); mago.look(x + (Math.random() - 0.5) * 500, y + 40); setTimeout(() => mago.look(null), 1400); }
      else if (r < 0.5) mago.cast();
      else if (r < 0.62) mago.emote('wink');
      else if (r < 0.72) { mago.emote('hop'); emocao('happy', 900); }
      else mago.burst(...mago.head(), 4, { dir: -Math.PI / 2, spread: 1.2, dist: 34 });
    }
    setTimeout(vida, 3500 + Math.random() * 4500);
  })();
  // Parado por um tempo, ele cochila.
  setInterval(() => {
    const parado = E.aberto && E.visivel && !CHAT.gerando && !E.dormindo && !($('#c-texto') && $('#c-texto').value) && Date.now() - E.ultimaAcao > 25000;
    if (parado) { E.dormindo = true; mago.emotion('sleepy', 0); dizer('z z z…', 0); }
  }, 1000);
  document.addEventListener('pointermove', () => { if (E.dormindo) { acordar(); dizer(''); } }, { passive: true });

  // ---- interação direta: cutucar, fazer carinho, arrastar ----
  const sobreMago = (x, y) => E.aberto && E.visivel && mago.o.opacity > 0.5 && Math.hypot(x - mago.x, y - mago.y) < mago.R * 1.9;
  let arrasto = null, amostras = [], carinhoT = null, fazendoCarinho = false;
  addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !sobreMago(e.clientX, e.clientY)) return;
    arrasto = { x: e.clientX, y: e.clientY, moveu: false };
    acordar();
  });
  addEventListener('pointermove', (e) => {
    if (arrasto) {
      if (!arrasto.moveu && Math.hypot(e.clientX - arrasto.x, e.clientY - arrasto.y) > 6) {
        arrasto.moveu = true;
        document.body.classList.add('mago-arrastando');
        emocao('surprised', 1500); dizer('Aaah!', 900); mago.look(null);
        E.att = null; E.pin = null; matarPlataforma();
      }
      if (arrasto.moveu) {
        mago.drag(true, e.clientX, e.clientY);
        amostras.push([performance.now(), e.clientX, e.clientY]);
        amostras = amostras.filter((s) => performance.now() - s[0] < 90);
      }
      return;
    }
    const sobre = sobreMago(e.clientX, e.clientY);
    document.body.classList.toggle('mago-sobre', sobre);
    if (sobre && !fazendoCarinho && !CHAT.gerando) {
      fazendoCarinho = true;
      carinhoT = setTimeout(() => { if (fazendoCarinho && !CHAT.gerando) { emocao('happy', 1800); dizer('hehe ♥', 1500); mago.sparkle(6); } }, 900);
    }
    if (!sobre && fazendoCarinho) { fazendoCarinho = false; clearTimeout(carinhoT); }
  });
  addEventListener('pointerup', () => {
    if (!arrasto) return;
    const d = arrasto;
    arrasto = null;
    document.body.classList.remove('mago-arrastando');
    if (d.moveu) {
      amostras = amostras.filter((s) => performance.now() - s[0] < 90);
      let vx = 0, vy = 0;
      if (amostras.length > 1) { const a = amostras[0], b = amostras[amostras.length - 1], dt = (b[0] - a[0]) / 1000 || 0.05; vx = (b[1] - a[1]) / dt; vy = (b[2] - a[2]) / dt; }
      mago.drag(false);
      mago.o.vx = Math.max(-1800, Math.min(1800, vx));
      mago.o.vy = Math.max(-1800, Math.min(1800, vy));
      amostras = [];
      const px = Math.max(60, Math.min(W - 60, mago.x + Math.max(-140, Math.min(140, mago.o.vx * 0.12))));
      const py = Math.max(60, Math.min(H - 40, mago.y + Math.max(-140, Math.min(140, mago.o.vy * 0.12))));
      mago.stiffness(55, 9);
      setTimeout(() => mago.stiffness(90, 12.5), 1400);
      emocao('happy', 1500);
      pousarEm(px, py);
      return;
    }
    const agora = Date.now();
    E.cutucadas = E.cutucadas.filter((t) => agora - t < 4000);
    E.cutucadas.push(agora);
    if (E.cutucadas.length >= 5) { E.cutucadas = []; emocao('dizzy', 2200); mago.emote('spin'); dizer('Tontura…', 2000); mago.sparkle(8); return; }
    mago.emote('poke');
    dizer(FRASES_CUTUCADA[Math.floor(Math.random() * FRASES_CUTUCADA.length)], 1500);
    mago.sparkle(5);
  });

  // ---- gancho da abertura ----
  // Onde o mago vai ficar quando a abertura terminar (null se a tela Início não está à vista).
  function preverFinal() {
    const alvo = alvoPadrao();
    if (!alvo) return null;
    const [x, y] = posAlvo(alvo);
    return { x, y };
  }
  // O mago se materializa já no lugar dele, com pixels convergindo.
  function concluirAbertura() {
    if (!ligado) return;
    E.aberto = true;
    E.ultimaAcao = Date.now();
    const alvo = alvoPadrao();
    if (!alvo) return;
    const [x, y] = posAlvo(alvo);
    ligar(alvo);
    E.visivel = true;
    mago.snap(x, y);
    mago.o.R0 = 8;
    mago.o.opacity = 0;
    mago.stiffness(90, 12.5);
    mago.show(true);
    mago.birth();
    mago.burst(x, y, 20, { dist: 70 });
    mago.emotion('happy', 1800);
    mago.emote('cast');
    const ok = Boolean(CHAT.estado && CHAT.estado.disponivel);
    dizer(ok ? 'Abracadabra! Descreva uma tarefa ou faça uma pergunta ✦' : 'Abracadabra! ✦', 3200);
    const campo = $('#c-texto');
    if (campo && !campo.disabled) campo.focus();
    const comp = $('#composer');
    if (comp) comp.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.01)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'ease-out' });
  }

  // Leitura do estado (usada por tools/verificar-abertura.js).
  const estado = () => ({ aberto: E.aberto, visivel: E.visivel, estado: E.estado, sit: E.att ? E.att.sit : null, alvo: E.att && E.att.el.className || null, plataforma: Boolean(E.plat), dormindo: E.dormindo });

  // Liga ou desliga o mascote na hora (Configurações). Ao ligar, ele se materializa no lugar dele; ao desligar, para tudo.
  function definirLigado(v) {
    v = Boolean(v);
    if (v === ligado) return;
    ligado = v;
    try { if (v) localStorage.removeItem(CHAVE); else localStorage.setItem(CHAVE, 'off'); } catch { /* sem armazenamento: vale só nesta sessão */ }
    document.body.classList.toggle('sem-mascote', !v);
    if (v) {
      mago.retomar(); observar(); iniciarLaco();
      E.aberto = true; E.ultimaAcao = Date.now();
      sincronizar();
      return;
    }
    clearInterval(E.rip); clearInterval(E.thk);
    matarPlataforma(false);
    dizer('');
    mago.look(null);
    mago.pausar();
    desobservar();
    lacoAtivo = false;
    E.aberto = false; E.visivel = false; E.att = null; E.pin = null; E.dormindo = false; E.estado = 'idle';
  }

  if (ligado) { observar(); iniciarLaco(); }

  return { mago, preverFinal, concluirAbertura, dizer, sincronizar, estado, ligado: () => ligado, definirLigado };
})();
