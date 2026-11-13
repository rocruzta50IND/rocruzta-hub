/* Mago pixelado da Rocruzta (mascote do Hub). Vem do estudo iconemascote/abertura-final/wiz.js.
   Desenha o personagem em SVG e cuida da física da mola (posição, inclinação, tamanho) e dos efeitos de pixels.
   O comportamento (onde senta, reações, arrastar) fica em mascote.js; a abertura, em abertura.js. */
const Mago = (() => {
  const SVG = "<svg class=\"clawd\" viewBox=\"0 0 21 12\" shape-rendering=\"crispEdges\">\n  <defs>\n    <linearGradient id=\"gBody\" gradientUnits=\"userSpaceOnUse\" x1=\"3\" y1=\"5\" x2=\"13\" y2=\"12\"><stop offset=\"0\" stop-color=\"#6cb8ff\"/><stop offset=\".45\" stop-color=\"#2f6df0\"/><stop offset=\"1\" stop-color=\"#0b2260\"/></linearGradient>\n    <linearGradient id=\"gHat\" gradientUnits=\"userSpaceOnUse\" x1=\"4\" y1=\"0\" x2=\"13\" y2=\"5\"><stop offset=\"0\" stop-color=\"#3b82f6\"/><stop offset=\".5\" stop-color=\"#1d4ed8\"/><stop offset=\"1\" stop-color=\"#0b2260\"/></linearGradient>\n  </defs>\n  <g fill=\"#0f2f8f\"><rect class=\"leg l1\" x=\"5\" y=\"10\" width=\"1\" height=\"2\"/><rect class=\"leg l2\" x=\"7\" y=\"10\" width=\"1\" height=\"2\"/><rect class=\"leg l1\" x=\"9\" y=\"10\" width=\"1\" height=\"2\"/><rect class=\"leg l2\" x=\"11\" y=\"10\" width=\"1\" height=\"2\"/></g>\n  <g class=\"torso\">\n    <g class=\"prop prop-book\"><rect x=\"0\" y=\"6\" width=\"3\" height=\"3\" fill=\"#4338ca\"/><rect x=\"1\" y=\"7\" width=\"1\" height=\"1\" fill=\"#fde68a\"/><rect x=\"0\" y=\"8\" width=\"3\" height=\"1\" fill=\"#312e81\"/></g>\n    <g class=\"prop prop-mail\"><rect x=\"0\" y=\"6\" width=\"3\" height=\"2\" fill=\"#ffffff\"/><rect x=\"0\" y=\"6\" width=\"3\" height=\"1\" fill=\"#cbd5e1\"/><rect x=\"1\" y=\"7\" width=\"1\" height=\"1\" fill=\"#93c5fd\"/></g>\n    <rect class=\"arm-l\" x=\"2\" y=\"7\" width=\"2\" height=\"2\" fill=\"#3f7df5\"/>\n    <rect x=\"4\" y=\"5\" width=\"9\" height=\"5\" fill=\"url(#gBody)\"/>\n    <rect x=\"4\" y=\"5\" width=\"9\" height=\"1\" fill=\"#a5d4ff\"/>\n    <rect x=\"12\" y=\"6\" width=\"1\" height=\"4\" fill=\"#0b2260\" opacity=\".3\"/>\n    <rect class=\"beard\" x=\"6\" y=\"8\" width=\"5\" height=\"2\" fill=\"#e0f2fe\"/>\n    <g class=\"look\"><g class=\"eyes\">\n      <g class=\"e e-normal\"><rect x=\"6\" y=\"6\" width=\"1\" height=\"2\" fill=\"#071a4d\"/><rect x=\"10\" y=\"6\" width=\"1\" height=\"2\" fill=\"#071a4d\"/><rect x=\"6\" y=\"6\" width=\"1\" height=\"1\" fill=\"#7dd3fc\"/><rect x=\"10\" y=\"6\" width=\"1\" height=\"1\" fill=\"#7dd3fc\"/></g>\n      <g class=\"e e-happy\" fill=\"#071a4d\"><rect x=\"5\" y=\"7\" width=\"1\" height=\"1\"/><rect x=\"6\" y=\"6\" width=\"1\" height=\"1\"/><rect x=\"7\" y=\"7\" width=\"1\" height=\"1\"/><rect x=\"9\" y=\"7\" width=\"1\" height=\"1\"/><rect x=\"10\" y=\"6\" width=\"1\" height=\"1\"/><rect x=\"11\" y=\"7\" width=\"1\" height=\"1\"/></g>\n      <g class=\"e e-surprised\"><rect x=\"6\" y=\"6\" width=\"2\" height=\"2\" fill=\"#071a4d\"/><rect x=\"10\" y=\"6\" width=\"2\" height=\"2\" fill=\"#071a4d\"/><rect x=\"6\" y=\"6\" width=\"1\" height=\"1\" fill=\"#7dd3fc\"/><rect x=\"10\" y=\"6\" width=\"1\" height=\"1\" fill=\"#7dd3fc\"/></g>\n      <g class=\"e e-worried\"><rect x=\"6\" y=\"6\" width=\"1\" height=\"2\" fill=\"#071a4d\"/><rect x=\"10\" y=\"6\" width=\"1\" height=\"2\" fill=\"#071a4d\"/><rect x=\"6\" y=\"6\" width=\"1\" height=\"1\" fill=\"#7dd3fc\"/><rect x=\"10\" y=\"6\" width=\"1\" height=\"1\" fill=\"#7dd3fc\"/><rect x=\"7\" y=\"5\" width=\"1\" height=\"1\" fill=\"#071a4d\"/><rect x=\"9\" y=\"5\" width=\"1\" height=\"1\" fill=\"#071a4d\"/><rect class=\"tear\" x=\"5\" y=\"8\" width=\"1\" height=\"1\" fill=\"#7dd3fc\"/></g>\n      <g class=\"e e-wink\"><rect x=\"6\" y=\"6\" width=\"1\" height=\"2\" fill=\"#071a4d\"/><rect x=\"6\" y=\"6\" width=\"1\" height=\"1\" fill=\"#7dd3fc\"/><rect x=\"10\" y=\"7\" width=\"2\" height=\"1\" fill=\"#071a4d\"/></g>\n      <g class=\"e e-sleepy\" fill=\"#071a4d\"><rect x=\"6\" y=\"7\" width=\"2\" height=\"1\"/><rect x=\"10\" y=\"7\" width=\"2\" height=\"1\"/></g>\n      <g class=\"e e-dizzy\" fill=\"#071a4d\"><g class=\"spin1\"><rect x=\"6\" y=\"6\" width=\"1\" height=\"1\"/><rect x=\"7\" y=\"7\" width=\"1\" height=\"1\"/></g><g class=\"spin2\"><rect x=\"10\" y=\"7\" width=\"1\" height=\"1\"/><rect x=\"11\" y=\"6\" width=\"1\" height=\"1\"/></g></g>\n      <g class=\"e e-love\" fill=\"#fb7185\"><rect x=\"5\" y=\"6\" width=\"1\" height=\"1\"/><rect x=\"7\" y=\"6\" width=\"1\" height=\"1\"/><rect x=\"5\" y=\"7\" width=\"3\" height=\"1\"/><rect x=\"6\" y=\"8\" width=\"1\" height=\"1\"/><rect x=\"9\" y=\"6\" width=\"1\" height=\"1\"/><rect x=\"11\" y=\"6\" width=\"1\" height=\"1\"/><rect x=\"9\" y=\"7\" width=\"3\" height=\"1\"/><rect x=\"10\" y=\"8\" width=\"1\" height=\"1\"/></g>\n    </g></g>\n    <g class=\"blush\" fill=\"#fb9ac0\"><rect x=\"5\" y=\"8\" width=\"1\" height=\"1\"/><rect x=\"11\" y=\"8\" width=\"1\" height=\"1\"/></g>\n    <g class=\"shades\" fill=\"#020617\"><rect x=\"5\" y=\"6\" width=\"3\" height=\"2\"/><rect x=\"9\" y=\"6\" width=\"3\" height=\"2\"/><rect x=\"8\" y=\"6\" width=\"1\" height=\"1\"/><rect x=\"5\" y=\"6\" width=\"1\" height=\"1\" fill=\"#3b82f6\" opacity=\".7\"/><rect x=\"9\" y=\"6\" width=\"1\" height=\"1\" fill=\"#3b82f6\" opacity=\".7\"/></g>\n    <g class=\"wave\">\n      <rect x=\"13\" y=\"7\" width=\"2\" height=\"2\" fill=\"#2b63e6\"/>\n      <g class=\"wand\">\n        <g fill=\"#93bdff\"><rect x=\"15\" y=\"6\" width=\"1\" height=\"1\"/><rect x=\"16\" y=\"5\" width=\"1\" height=\"1\"/><rect x=\"17\" y=\"4\" width=\"1\" height=\"1\"/></g>\n        <g class=\"tip\" fill=\"#7dd3fc\"><rect x=\"18\" y=\"3\" width=\"1\" height=\"1\"/><rect x=\"17\" y=\"3\" width=\"1\" height=\"1\" opacity=\".5\"/><rect x=\"19\" y=\"3\" width=\"1\" height=\"1\" opacity=\".5\"/><rect x=\"18\" y=\"2\" width=\"1\" height=\"1\" opacity=\".5\"/><rect x=\"18\" y=\"4\" width=\"1\" height=\"1\" opacity=\".5\"/></g>\n      </g>\n      <g class=\"prop-lens\"><g fill=\"#fcd34d\"><rect x=\"16\" y=\"6\" width=\"1\" height=\"1\"/><rect x=\"15\" y=\"7\" width=\"1\" height=\"1\"/></g><g fill=\"#bfe6ff\"><rect x=\"17\" y=\"4\" width=\"1\" height=\"1\"/><rect x=\"16\" y=\"5\" width=\"1\" height=\"1\"/><rect x=\"18\" y=\"5\" width=\"1\" height=\"1\"/><rect x=\"17\" y=\"6\" width=\"1\" height=\"1\"/></g><rect x=\"17\" y=\"5\" width=\"1\" height=\"1\" fill=\"#38bdf8\" opacity=\".6\"/></g>\n    </g>\n    <g class=\"hat\">\n      <g fill=\"url(#gHat)\"><rect x=\"8\" y=\"0\" width=\"1\" height=\"1\"/><rect x=\"7\" y=\"1\" width=\"3\" height=\"1\"/><rect x=\"6\" y=\"2\" width=\"5\" height=\"1\"/><rect x=\"5\" y=\"3\" width=\"7\" height=\"1\"/><rect x=\"3\" y=\"4\" width=\"11\" height=\"1\"/></g>\n      <rect x=\"5\" y=\"3\" width=\"7\" height=\"1\" fill=\"#6cb8ff\"/>\n      <rect class=\"star s1\" x=\"8\" y=\"1\" width=\"1\" height=\"1\" fill=\"#fde68a\"/><rect class=\"star s2\" x=\"7\" y=\"2\" width=\"1\" height=\"1\" fill=\"#fde68a\"/>\n    </g>\n  </g>\n  <g fill=\"#7dd3fc\"><rect class=\"spark p1\" x=\"2\" y=\"1\" width=\"1\" height=\"1\"/><rect class=\"spark p2\" x=\"15\" y=\"2\" width=\"1\" height=\"1\"/><rect class=\"spark p3\" x=\"19\" y=\"6\" width=\"1\" height=\"1\"/><rect class=\"spark p4\" x=\"3\" y=\"9\" width=\"1\" height=\"1\"/></g>\n</svg>";
  const EMO = { happy: 'happy', wide: 'surprised', surprised: 'surprised', sleepy: 'sleepy', dizzy: 'dizzy', worried: 'worried', love: 'love', wink: 'wink' };
  const COLS = ['#7dd3fc', '#fde68a', '#ffffff', '#93bdff', '#6cb8ff'];
  function create(opts) {
    const el = document.createElement('div'); el.id = 'mago'; el.dataset.emo = 'normal'; el.dataset.prop = '';
    el.innerHTML = '<div class="lean"><div class="jumper">' + SVG + '</div></div>'; document.body.appendChild(el);
    const lean = el.firstChild, jumper = lean.firstChild;
    const O = { x: opts.x, y: opts.y, tx: opts.x, ty: opts.y, vx: 0, vy: 0, k: 90, c: 12.5, R0: opts.R || 28, R0t: opts.R || 28, opacity: 0, opT: 0, dragging: false, t: 0, pm: 0, flip: 1 };
    let emoT = 0;
    const sc = () => O.R0 / 28 * .8;
    const tip = () => { const s = sc() * 120 / 21; return [O.x + 8 * s, O.y - 2.5 * s]; };
    const head = () => { const s = sc() * 120 / 21; return [O.x - 2 * s, O.y - 5 * s]; };
    function burst(x, y, n = 10, o = {}) {
      for (let i = 0; i < n; i++) {
        const p = document.createElement('i'); p.className = 'mago-px'; const sz = o.size || (3 + Math.random() * 4);
        p.style.cssText = `left:${x - sz / 2}px;top:${y - sz / 2}px;width:${sz}px;height:${sz}px;background:${COLS[i % COLS.length]};box-shadow:0 0 6px ${COLS[0]}`; document.body.appendChild(p);
        const a = o.dir != null ? o.dir + (Math.random() - .5) * (o.spread || 1.4) : Math.random() * 6.283, d = (o.dist || 40) * (.4 + Math.random() * .9);
        p.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + (o.fall || 0)}px) scale(.2)`, opacity: 0 }], { duration: (o.dur || 650) + Math.random() * 350, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => p.remove();
      }
    }
    const act = (n) => { jumper.className = 'jumper'; void jumper.offsetWidth; jumper.classList.add('a-' + n); };
    const cast = () => { el.classList.remove('cast'); void el.offsetWidth; el.classList.add('cast'); setTimeout(() => el.classList.remove('cast'), 950); };
    function emotion(name, ms) {
      clearTimeout(emoT); const e = EMO[name] || 'normal'; el.dataset.emo = e; el.classList.toggle('sleep', name === 'sleepy');
      if (name === 'love') burst(...head(), 8, { dist: 50 });
      if (name && ms) emoT = setTimeout(() => { el.dataset.emo = 'normal'; }, ms);
    }
    function emote(n) {
      if (n === 'hop') { O.vy -= 520; act('jump'); }
      else if (n === 'cast') { cast(); burst(...tip(), 18, { dist: 60 }); }
      else if (n === 'shake') act('no');
      else if (n === 'nod') act('tap');
      else if (n === 'spin') act('shake');
      else if (n === 'wink') { emotion('wink', 700); burst(...head(), 5); }
      else if (n === 'poke') { emotion('surprised', 600); act('shake'); }
    }
    function layout(n) { el.classList.toggle('think', n === 'orbit'); if (n === 'check') { emotion('happy', 1400); act('jump'); burst(...head(), 12, { dist: 55 }); } if (n === 'cross') { emotion('worried', 1600); act('no'); } }
    function mood(n) { el.classList.toggle('think', n === 'think'); el.classList.toggle('talk', n === 'speak'); }
    function look(x, y) { if (x == null) { el.style.setProperty('--lx', '0px'); el.style.setProperty('--ly', '0px'); return; } const dx = x - O.x, dy = y - O.y, d = Math.hypot(dx, dy) || 1, m = Math.min(1, d / 220); el.style.setProperty('--lx', (dx / d * m * .45).toFixed(2) + 'px'); el.style.setProperty('--ly', (dy / d * m * .3).toFixed(2) + 'px'); }
    let last = performance.now(), last_tilt = null, last_tr = null, last_op = null; // só escreve no DOM quando algo mudou (parado, o laço quase não custa)
    let pausado = false; // desligado nas configurações: o laço de quadros para de vez (zero custo)
    function loop(now) {
      if (pausado) return;
      const dt = Math.min(.04, (now - last) / 1000); last = now; O.t += dt;
      if (!O.dragging) { O.vx += (O.k * (O.tx - O.x) - O.c * O.vx) * dt; O.vy += (O.k * (O.ty - O.y) - O.c * O.vy) * dt; O.x += O.vx * dt; O.y += O.vy * dt; }
      O.R0 += (O.R0t - O.R0) * (1 - Math.exp(-dt * 7)); O.opacity += (O.opT - O.opacity) * (1 - Math.exp(-dt * 9));
      const tilt = Math.round(Math.max(-10, Math.min(10, O.vx / 60)) * 10) / 10; if (tilt !== last_tilt) { last_tilt = tilt; lean.style.setProperty('--tilt', tilt + 'deg'); }
      const s = sc() * (1 + O.pm * .12); O.pm *= Math.exp(-dt * 6);
      const tr = `translate(${(O.x - 60).toFixed(1)}px,${(O.y - 34.5).toFixed(1)}px) scale(${(s * O.flip).toFixed(3)},${s.toFixed(3)})`; if (tr !== last_tr) { last_tr = tr; el.style.transform = tr; }
      const op = Math.round(Math.min(1, O.opacity) * 100) / 100; if (op !== last_op) { last_op = op; el.style.opacity = op; el.style.display = op === 0 && !O.opT ? 'none' : ''; } // some de vez (display none) quando escondido: para as animações e a pintura
      requestAnimationFrame(loop);
    }
    loop(last);
    return {
      o: O, el, burst, tip, head, act, cast, layout, mood, emotion, emote, look,
      get x() { return O.x; }, get y() { return O.y; }, get R() { return O.R0; },
      moveTo(x, y) { O.tx = x; O.ty = y; }, snap(x, y) { O.x = O.tx = x; O.y = O.ty = y; O.vx = O.vy = 0; },
      pulse() { O.pm = 1; burst(...tip(), 5, { dist: 30 }); }, sparkle(n) { burst(...head(), n || 6, { dist: 50 }); }, birth() { O.pm = 1; burst(O.x, O.y, 22, { dist: 80 }); },
      setRadius(R) { O.R0t = R; }, show(v) { O.opT = v ? 1 : 0; }, impulse(dx, dy) { O.vx += dx; O.vy += dy; }, resize() { }, setTrail() { }, eyes() { }, palette() { },
      pausar() { pausado = true; el.style.display = 'none'; last_op = null; }, retomar() { if (!pausado) return; pausado = false; last = performance.now(); last_op = last_tr = last_tilt = null; el.style.display = ''; requestAnimationFrame(loop); },
      stiffness(k, c) { O.k = k; O.c = c; }, drag(on, x, y) { if (on) { O.dragging = true; O.x = x; O.y = y; O.vx = O.vy = 0; } else O.dragging = false; },
    };
  }
  return { create };
})();
