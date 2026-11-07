'use strict';

// Capas geradas por categoria (SVG determinístico a partir do id da notícia). Sem imagens externas.
// Depende de icons.js (ic) e exemplos.js (CATEGORIAS). A cor entra por data-c + aplicarCores().
function rng(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function arte(cat, seed) {
  const r = rng(seed * 7919 + 13);
  let s = '';
  if (cat === 'IA') {
    const xs = [80, 200, 320], ys = [50, 100, 150, 200];
    const pts = xs.map((x) => ys.map((y) => [x + (r() - 0.5) * 18, y + (r() - 0.5) * 14]));
    for (let c = 0; c < 2; c++) pts[c].forEach((a) => pts[c + 1].forEach((b) => { if (r() > 0.45) s += `<path d="M${a[0]} ${a[1]}L${b[0]} ${b[1]}" stroke="currentColor" stroke-opacity=".28" fill="none"/>`; }));
    pts.flat().forEach((p) => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="${r() > 0.6 ? 8 : 5}" fill="currentColor" fill-opacity="${r() > 0.5 ? 0.95 : 0.45}"/>`; });
  } else if (cat === 'Desenvolvimento') {
    for (let i = 0; i < 9; i++) {
      const ind = Math.floor(r() * 3) * 26, w = 40 + r() * 150;
      s += `<rect x="${50 + ind}" y="${34 + i * 21}" width="${w}" height="9" rx="4.5" fill="currentColor" fill-opacity="${0.25 + r() * 0.6}"/><rect x="24" y="${34 + i * 21}" width="10" height="9" rx="4.5" fill="currentColor" fill-opacity=".2"/>`;
    }
  } else if (cat === 'Segurança') {
    for (let x = 0; x < 15; x++) for (let y = 0; y < 8; y++) s += `<circle cx="${28 + x * 25}" cy="${26 + y * 26}" r="1.8" fill="currentColor" fill-opacity=".28"/>`;
    s += '<circle cx="200" cy="120" r="64" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity=".7"/><circle cx="200" cy="120" r="44" fill="none" stroke="currentColor" stroke-opacity=".35"/><circle cx="200" cy="112" r="11" fill="currentColor"/><rect x="195" y="116" width="10" height="26" rx="4" fill="currentColor"/>';
  } else if (cat === 'Infra') {
    for (let i = 0; i < 3; i++) {
      const y = 42 + i * 58;
      s += `<rect x="70" y="${y}" width="260" height="44" rx="9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-opacity=".75"/><circle cx="96" cy="${y + 22}" r="5" fill="currentColor" fill-opacity="${0.5 + r() * 0.5}"/><rect x="116" y="${y + 18}" width="${70 + r() * 100}" height="8" rx="4" fill="currentColor" fill-opacity=".3"/><rect x="290" y="${y + 18}" width="22" height="8" rx="4" fill="currentColor" fill-opacity=".6"/>`;
    }
  } else if (cat === 'Negócios') {
    let pts = '';
    for (let i = 0; i < 10; i++) {
      const h = 30 + i * 12 + r() * 36, x = 34 + i * 35;
      s += `<rect x="${x}" y="${210 - h}" width="22" height="${h}" rx="4" fill="currentColor" fill-opacity="${0.22 + i * 0.07}"/>`;
      pts += `${x + 11},${204 - h - 14} `;
    }
    s += `<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  } else if (cat === 'Design') {
    s += `<circle cx="150" cy="120" r="64" fill="currentColor" fill-opacity=".55"/><circle cx="230" cy="120" r="64" fill="none" stroke="currentColor" stroke-width="2"/><rect x="190" y="70" width="100" height="100" rx="14" transform="rotate(${Math.round(r() * 30 + 8)} 240 120)" fill="currentColor" fill-opacity=".2"/><path d="M60 200h280" stroke="currentColor" stroke-opacity=".3"/>`;
  } else if (cat === 'Marketing') {
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * (i / 15) * 0.5, l = 90 + r() * 150;
      s += `<path d="M40 210L${40 + Math.cos(a) * l} ${210 - Math.sin(a) * l}" stroke="currentColor" stroke-width="${1 + r() * 2.4}" stroke-opacity="${0.25 + r() * 0.6}" stroke-linecap="round"/>`;
    }
    s += '<circle cx="40" cy="210" r="18" fill="currentColor"/>';
  } else {
    for (let i = 0; i < 4; i++) s += `<rect x="${110 + i * 22}" y="${46 + i * 22}" width="150" height="110" rx="14" fill="${i === 3 ? 'currentColor' : 'none'}" fill-opacity="${i === 3 ? 0.5 : 1}" stroke="currentColor" stroke-width="1.8" stroke-opacity="${0.3 + i * 0.2}"/>`;
  }
  return s;
}

const capa = (n) => `<div class="cover" data-c="${CATEGORIAS[n.cat].cor}"><svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${arte(n.cat, n.id)}</svg></div>`;
const etiquetaCat = (cat) => `<span class="cat" data-c="${CATEGORIAS[cat].cor}">${ic(CATEGORIAS[cat].icone)}${cat}</span>`;

if (typeof module !== 'undefined') module.exports = { arte };
