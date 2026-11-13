'use strict';

// Abertura do Hub (estudo de origem: iconemascote/abertura-final/app.js, função opening()).
// O ícone "H com chapéu" aparece no centro e vira o mago num poof; o mago escreve "Rocruzta Hub" com o cajado;
// as letras viram uma faísca, o mago some em pixels e um cometa cruza a tela até a quina do campo de mensagem,
// onde o mago se materializa sentado. A escrita roda enquanto o app carrega: a revelação só espera se a tela
// inicial ainda não estiver pronta (renderer.js chama window.splashPronto() quando ela estiver).
// Depende de mago.js e mascote.js (carregados antes). O véu #splash cobre o app até o final.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const TEXTO = 'Rocruzta Hub';
  const TETO_MS = 12000; // nunca prende o usuário se algo travar
  const veu = $('#splash');

  let resolverPronto;
  const pronta = new Promise((ok) => { resolverPronto = ok; });
  window.splashPronto = () => resolverPronto();
  if (!veu) return;

  // O tema salvo vale já na abertura (a casca só o aplica depois de carregar).
  try { if (localStorage.getItem('rocruzta-hub:tema') === 'light') document.documentElement.dataset.theme = 'light'; } catch { /* sem armazenamento: fica no escuro */ }

  let terminada = false;
  let concluida = false;
  function concluir() {
    if (concluida) return;
    concluida = true;
    Mascote.concluirAbertura();
  }
  function terminar() {
    if (terminada) return;
    terminada = true;
    veu.classList.add('out');
    setTimeout(() => veu.remove(), 1200);
  }

  async function executar() {
    const mago = Mascote.mago;
    const claro = document.documentElement.dataset.theme === 'light';
    const icone = $('#sp-icone');
    icone.src = claro ? 'icone-hub.svg' : 'icone-hub-escuro.svg';
    const escrita = $('#sp-escrita');
    escrita.textContent = '';
    const spans = [...TEXTO].map((c) => {
      const s = document.createElement('span');
      s.className = c === ' ' ? 'sp' : 'ch';
      if (c !== ' ') s.textContent = c;
      escrita.appendChild(s);
      return s;
    });
    const letras = spans.filter((s) => s.classList.contains('ch'));
    for (let i = 0; i < 34; i++) {
      const st = document.createElement('i');
      st.className = 'sp-estrela';
      const sz = 2 + Math.random() * 3;
      st.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${sz}px;height:${sz}px;animation-delay:${Math.random() * 3}s;animation-duration:${1.6 + Math.random() * 2.4}s`;
      veu.appendChild(st);
    }
    const W = innerWidth, H = innerHeight;
    const tb = escrita.getBoundingClientRect(), midY = tb.top + tb.height / 2, BIG = 62;
    const k = BIG / 28 * 0.8 * 120 / 21;
    const wy = midY + tb.height / 2 + 2.5 * k + 30, wx = (lx) => lx - 8 * k;
    let pronto = false;
    pronta.then(() => { pronto = true; });
    setTimeout(() => { pronto = true; }, TETO_MS);

    // 1. entrada rápida do ícone
    const TS = 132, tcx = W / 2, tcy = midY - 6;
    icone.style.width = icone.style.height = TS + 'px';
    icone.style.left = (tcx - TS / 2) + 'px';
    icone.style.top = (tcy - TS / 2) + 'px';
    icone.hidden = false;
    icone.animate([{ opacity: 0, transform: 'scale(.55)', filter: 'blur(6px)' }, { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }], { duration: 380, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' });
    await sleep(640);

    // 2. o ícone vira o mago: poof de pixels e o mago sai de dentro dele
    icone.animate([{ opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(.35)', filter: 'blur(8px)' }], { duration: 300, easing: 'ease-in', fill: 'forwards' });
    mago.snap(tcx, tcy); mago.o.R0 = 8; mago.o.R0t = BIG; mago.o.opacity = 0;
    mago.show(true); mago.stiffness(170, 17); mago.birth(); mago.burst(tcx, tcy, 28, { dist: 100 });
    mago.moveTo(wx(tb.left - 10), wy);
    await sleep(220);

    // 3. escrita veloz: ele corre pela palavra soltando feitiços
    const porLetra = 62;
    mago.stiffness(420, 26);
    for (let i = 0; i < spans.length; i++) {
      const sp = spans[i], r = sp.getBoundingClientRect(), cx = r.left + r.width / 2;
      mago.moveTo(wx(cx), wy);
      if (sp.classList.contains('ch')) {
        if (i % 2 === 0) mago.cast();
        mago.burst(cx, r.top + r.height * 0.6, 6, { dir: -Math.PI / 2, spread: 2.2, dist: 34, dur: 450 });
        sp.animate([{ opacity: 0, transform: 'translateY(.35em) scale(.55)', filter: 'blur(8px) brightness(2)' }, { opacity: 1, transform: 'translateY(-.05em) scale(1.07)', filter: 'blur(0) brightness(1.3)', offset: 0.6 }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 340, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
        await sleep(porLetra);
      } else await sleep(porLetra * 0.6);
    }

    // 4. se o app ainda não está pronto, o mago fica fazendo mágica (brilho nas letras) até estar
    const ex = tb.left + tb.width * 0.5;
    mago.stiffness(160, 20); mago.moveTo(wx(ex) + 30, wy);
    let esperou = false;
    while (!pronto) {
      esperou = true;
      mago.cast(); mago.burst(...mago.tip(), 8, { dist: 44 });
      letras.forEach((c, i) => c.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.5)' }, { filter: 'brightness(1)' }], { duration: 700, delay: i * 40 }));
      await sleep(700);
    }
    if (!esperou) await sleep(120);

    // 5. feitiço final: as letras viram uma faísca na ponta do cajado
    mago.cast(); mago.emote('hop');
    const [tx0, ty0] = mago.tip();
    letras.forEach((c, i) => {
      const r = c.getBoundingClientRect(), dx = tx0 - (r.left + r.width / 2), dy = ty0 - (r.top + r.height / 2);
      c.animate([{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: `translate(${dx}px,${dy}px) scale(.05) rotate(${rnd(-160, 160)}deg)`, filter: 'blur(4px)' }], { duration: 420, delay: i * 26, easing: 'cubic-bezier(.5,0,.8,.5)', fill: 'forwards' });
    });
    const absorve = 26 * letras.length + 420;
    const faisca = document.createElement('i');
    faisca.className = 'mago-cometa';
    faisca.style.left = tx0 + 'px'; faisca.style.top = ty0 + 'px';
    document.body.appendChild(faisca);
    faisca.animate([{ transform: 'translate(-50%,-50%) scale(0)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.8)', opacity: 1 }], { duration: absorve, easing: 'ease-in', fill: 'forwards' });
    await sleep(absorve);

    // 6. o mago some em pixels e a faísca vira um cometa que cruza a tela até a quina do campo
    terminar();
    mago.burst(mago.x, mago.y, 26, { dist: 90 });
    mago.show(false);
    const fim = Mascote.preverFinal();
    if (fim) {
      const sx0 = tx0, sy0 = ty0, cxp = (sx0 + fim.x) / 2, cyp = Math.min(sy0, fim.y) - H * 0.22, DUR = 620, t0 = performance.now();
      await new Promise((res) => {
        (function voar(agora) {
          const t = Math.min(1, (agora - t0) / DUR), e = t * t * (3 - 2 * t), u = 1 - e;
          const x = u * u * sx0 + 2 * u * e * cxp + e * e * fim.x, y = u * u * sy0 + 2 * u * e * cyp + e * e * fim.y;
          faisca.style.left = x + 'px'; faisca.style.top = y + 'px';
          mago.burst(x, y, 2, { dist: 22, dur: 500, size: 3 + 3 * (1 - t) });
          if (t < 1) requestAnimationFrame(voar); else res();
        })(t0);
      });
    }
    faisca.remove();

    // 7. chegada: o mago se materializa sentado na quina, com pixels convergindo
    concluir();
  }

  // A janela nasce escondida e o Chromium só dispara requestAnimationFrame quando ela aparece:
  // a abertura começa nesse primeiro quadro, para ninguém perder o começo da animação.
  requestAnimationFrame(() => {
    executar().catch((erro) => {
      console.error('Falha na abertura', erro);
      terminar();
      Mascote.mago.show(false);
      concluir();
    });
  });
  // Rede de segurança: se a abertura travar por qualquer motivo, o véu sai e o mago vai para o lugar dele.
  setTimeout(() => { if (!concluida) { terminar(); Mascote.mago.show(false); concluir(); } }, TETO_MS + 8000);
})();
