/* ════════════════════════════════════════════════════════════
   FLORA — ilustraciones botánicas dibujadas por código (SVG)
   Rosas en capas, eucalipto, hojas de olivo, bayas y el sello
   de lacre. Cada dibujo usa una semilla: siempre sale igual.
   ════════════════════════════════════════════════════════════ */
window.Flora = (function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, padre) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (padre) padre.appendChild(e);
    return e;
  };
  const azar = semilla => () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  const r1 = n => Math.round(n * 10) / 10;

  /* ── Degradados compartidos (una sola vez en la página) ── */
  function instalarDefs() {
    if (document.getElementById('flora-defs')) return;
    const svg = el('svg', { id: 'flora-defs', width: 0, height: 0, 'aria-hidden': 'true' });
    svg.style.position = 'absolute';
    const d = el('defs', {}, svg);
    const lineal = (id, paradas, x2 = 0, y2 = 0, x1 = 0, y1 = 1) => {
      const g = el('linearGradient', { id, x1, y1, x2, y2 }, d);
      paradas.forEach(([o, c, op]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op == null ? 1 : op }, g));
    };
    const radial = (id, paradas, cx = '50%', cy = '50%', r = '50%') => {
      const g = el('radialGradient', { id, cx, cy, r }, d);
      paradas.forEach(([o, c, op]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': op == null ? 1 : op }, g));
    };
    // Pétalos: base oscura → punta clara (rubor)
    lineal('fl-p1', [[0, '#C98C88'], [.55, '#EBC3BC'], [1, '#FBEDE8']]);
    lineal('fl-p2', [[0, '#B8726F'], [.6, '#E2AEA7'], [1, '#F6DDD7']]);
    lineal('fl-p3', [[0, '#9E5A5A'], [.7, '#D29790'], [1, '#EFCAC3']]);
    // Pétalos marfil (rosa blanca)
    lineal('fl-b1', [[0, '#D8C7AE'], [.55, '#F3EADB'], [1, '#FFFCF6']]);
    lineal('fl-b2', [[0, '#C9B596'], [.6, '#EADFCB'], [1, '#FBF6EC']]);
    lineal('fl-b3', [[0, '#B49E7C'], [.7, '#E0D2BA'], [1, '#F6EEDF']]);
    radial('fl-centro', [[0, '#7E3F45'], [.7, '#A9606A'], [1, '#C98C88']]);
    radial('fl-centro-b', [[0, '#9C8461'], [.7, '#C8B28E'], [1, '#E3D5BD']]);
    // Hojas
    lineal('fl-hoja', [[0, '#A9BB98'], [.5, '#86997A'], [1, '#5E7154']], 1, 0, 0, 0);
    lineal('fl-hoja2', [[0, '#97AA8A'], [1, '#4F6346']], 1, 0, 0, 0);
    radial('fl-euca', [[0, '#C9D6CC'], [.6, '#9FB3A7'], [1, '#738C80']], '38%', '35%', '70%');
    radial('fl-baya', [[0, '#E9D7B8'], [.5, '#B8975A'], [1, '#7D6233']], '35%', '30%', '70%');
    radial('fl-sombra', [[0, '#3A2E2A', .28], [1, '#3A2E2A', 0]]);
    // Lacre
    radial('fl-lacre', [[0, '#93A684'], [.55, '#617357'], [1, '#3E4C36']], '36%', '30%', '75%');
    radial('fl-brillo', [[0, '#FFFFFF', .55], [1, '#FFFFFF', 0]]);
    document.body.prepend(svg);
  }

  /* ── Piezas ─────────────────────────────────────────────── */
  function petalo(len, w) {
    return `M0 0 C${r1(w * .55)} ${r1(-len * .08)} ${r1(w * .66)} ${r1(-len * .8)} ${r1(w * .32)} ${r1(-len * .97)}` +
      ` Q0 ${r1(-len * 1.06)} ${r1(-w * .32)} ${r1(-len * .97)}` +
      ` C${r1(-w * .66)} ${r1(-len * .8)} ${r1(-w * .55)} ${r1(-len * .08)} 0 0Z`;
  }

  function rosa(g, cx, cy, r, rnd, blanca) {
    const p = blanca ? 'fl-b' : 'fl-p';
    const borde = blanca ? '#A8916C' : '#9E5A5A';
    const grp = el('g', { transform: `translate(${r1(cx)} ${r1(cy)}) rotate(${r1(rnd() * 360)})` }, g);
    el('circle', { r: r1(r * 1.25), cx: r1(r * .12), cy: r1(r * .18), fill: 'url(#fl-sombra)' }, grp);
    const capas = [
      { n: 6, l: 1, w: .8, g: 1 }, { n: 6, l: .84, w: .7, g: 1, o: 30 }, { n: 5, l: .68, w: .6, g: 2, o: 12 },
      { n: 5, l: .52, w: .5, g: 2, o: 48 }, { n: 4, l: .37, w: .42, g: 3, o: 20 }, { n: 3, l: .25, w: .36, g: 3, o: 70 }
    ];
    capas.forEach(c => {
      for (let i = 0; i < c.n; i++) {
        const ang = (c.o || 0) + i * 360 / c.n + (rnd() - .5) * 16;
        const len = r * c.l * (.9 + rnd() * .18);
        const w = r * c.w;
        const pg = el('g', { transform: `rotate(${r1(ang)})` }, grp);
        el('path', { d: petalo(len, w), fill: `url(#${p}${c.g})`, stroke: borde, 'stroke-opacity': .28, 'stroke-width': .6 }, pg);
        el('path', {
          d: `M${r1(-w * .26)} ${r1(-len * .9)} Q0 ${r1(-len * 1.01)} ${r1(w * .26)} ${r1(-len * .9)}`,
          fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': .55, 'stroke-width': r1(Math.max(.8, r * .03)), 'stroke-linecap': 'round'
        }, pg);
      }
    });
    el('circle', { r: r1(r * .16), fill: `url(#${blanca ? 'fl-centro-b' : 'fl-centro'})` }, grp);
    el('path', {
      d: `M0 ${r1(-r * .1)} a${r1(r * .1)} ${r1(r * .1)} 0 1 1 ${r1(-r * .08)} ${r1(r * .12)} a${r1(r * .06)} ${r1(r * .06)} 0 1 1 ${r1(r * .06)} ${r1(-r * .07)}`,
      fill: 'none', stroke: blanca ? '#8A7350' : '#6E3138', 'stroke-opacity': .55, 'stroke-width': .8
    }, grp);
  }

  function capullo(g, x, y, ang, r, blanca) {
    const grp = el('g', { transform: `translate(${r1(x)} ${r1(y)}) rotate(${r1(ang)})` }, g);
    el('path', { d: `M0 0 Q${r1(r * .2)} ${r1(r * 1.2)} 0 ${r1(r * 2.4)}`, fill: 'none', stroke: '#6E7F63', 'stroke-width': 1.6 }, grp);
    el('path', { d: petalo(r * 1.5, r * 1.3), transform: `translate(0 ${r1(-r * .1)})`, fill: blanca ? 'url(#fl-b2)' : 'url(#fl-p2)', stroke: '#9E5A5A', 'stroke-opacity': .3, 'stroke-width': .6 }, grp);
    el('path', { d: petalo(r * 1.2, r * .9), transform: `translate(${r1(-r * .25)} 0) rotate(-14)`, fill: blanca ? 'url(#fl-b3)' : 'url(#fl-p3)', 'fill-opacity': .9 }, grp);
    el('path', { d: petalo(r * .9, r * .55), transform: `translate(${r1(-r * .3)} ${r1(r * .15)}) rotate(-38)`, fill: 'url(#fl-hoja2)' }, grp);
    el('path', { d: petalo(r * .9, r * .55), transform: `translate(${r1(r * .3)} ${r1(r * .15)}) rotate(38)`, fill: 'url(#fl-hoja2)' }, grp);
  }

  function hoja(g, x, y, ang, len, w, grad) {
    const grp = el('g', { transform: `translate(${r1(x)} ${r1(y)}) rotate(${r1(ang)})` }, g);
    el('path', {
      d: `M0 0 C${r1(w)} ${r1(-len * .22)} ${r1(w * .78)} ${r1(-len * .74)} 0 ${r1(-len)} C${r1(-w * .78)} ${r1(-len * .74)} ${r1(-w)} ${r1(-len * .22)} 0 0Z`,
      fill: `url(#${grad || 'fl-hoja'})`
    }, grp);
    el('path', { d: `M0 0 Q${r1(w * .08)} ${r1(-len * .5)} 0 ${r1(-len * .96)}`, fill: 'none', stroke: '#E9EFE2', 'stroke-opacity': .45, 'stroke-width': .7 }, grp);
  }

  /* Punto y tangente de una curva cuadrática. */
  function curva(a, c, b, t) {
    const u = 1 - t;
    return {
      x: u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
      y: u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
      ang: Math.atan2(2 * u * (c[1] - a[1]) + 2 * t * (b[1] - c[1]), 2 * u * (c[0] - a[0]) + 2 * t * (b[0] - c[0])) * 180 / Math.PI
    };
  }

  function tallo(g, a, c, b, grosor) {
    el('path', { d: `M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`, fill: 'none', stroke: '#6E7F63', 'stroke-width': grosor || 1.8, 'stroke-linecap': 'round' }, g);
  }

  function eucalipto(g, a, c, b, n, tam, rnd) {
    tallo(g, a, c, b, 1.6);
    for (let i = 1; i <= n; i++) {
      const t = i / (n + .6);
      const p = curva(a, c, b, t);
      const s = tam * (1.1 - t * .55) * (.85 + rnd() * .3);
      [-1, 1].forEach(lado => {
        const ang = p.ang + lado * (70 + rnd() * 20);
        const rad = ang * Math.PI / 180;
        const cx = p.x + Math.cos(rad) * s * .9;
        const cy = p.y + Math.sin(rad) * s * .9;
        el('ellipse', { cx: r1(cx), cy: r1(cy), rx: r1(s), ry: r1(s * .86), transform: `rotate(${r1(ang)} ${r1(cx)} ${r1(cy)})`, fill: 'url(#fl-euca)', stroke: '#6F887B', 'stroke-opacity': .35, 'stroke-width': .5 }, g);
      });
    }
  }

  function olivo(g, a, c, b, n, tam, rnd, grad) {
    tallo(g, a, c, b, 1.4);
    for (let i = 1; i <= n; i++) {
      const t = i / (n + .4);
      const p = curva(a, c, b, t);
      const s = tam * (1.05 - t * .4);
      hoja(g, p.x, p.y, p.ang + 90 + (i % 2 ? 1 : -1) * (48 + rnd() * 18), s * 2.4, s * .55, grad || (i % 3 ? 'fl-hoja' : 'fl-hoja2'));
    }
    const fin = curva(a, c, b, 1);
    hoja(g, fin.x, fin.y, fin.ang + 90, tam * 2, tam * .5, 'fl-hoja');
  }

  function bayas(g, x, y, n, rnd, tam) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2;
      const d = rnd() * (tam || 9);
      const bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d;
      el('line', { x1: r1(x), y1: r1(y), x2: r1(bx), y2: r1(by), stroke: '#8C7A55', 'stroke-width': .6 }, g);
      el('circle', { cx: r1(bx), cy: r1(by), r: r1(2 + rnd() * 1.6), fill: 'url(#fl-baya)' }, g);
    }
  }

  function velo(g, x, y, n, rnd, radio) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = rnd() * radio;
      el('circle', { cx: r1(x + Math.cos(a) * d), cy: r1(y + Math.sin(a) * d), r: r1(1.2 + rnd() * 1.4), fill: '#FFFDF8', stroke: '#CBBFA6', 'stroke-width': .4 }, g);
    }
  }

  /* ── Composiciones ──────────────────────────────────────── */
  const COMPOSICIONES = {
    /* Esquina superior izquierda; las demás se obtienen girando. */
    esquina: { vb: '0 0 360 360', dibujar(g, rnd) {
      eucalipto(g, [6, 6], [150, 20], [345, 70], 7, 13, rnd);
      eucalipto(g, [6, 6], [30, 160], [60, 340], 7, 12, rnd);
      olivo(g, [8, 8], [140, 110], [250, 250], 8, 9, rnd);
      olivo(g, [8, 8], [200, 60], [300, 150], 6, 8, rnd, 'fl-hoja2');
      olivo(g, [8, 8], [70, 190], [150, 300], 6, 8, rnd);
      velo(g, 210, 120, 14, rnd, 22);
      bayas(g, 250, 40, 6, rnd);
      bayas(g, 40, 250, 6, rnd);
      hoja(g, 150, 70, 110, 70, 18);
      hoja(g, 70, 150, 160, 70, 18, 'fl-hoja2');
      hoja(g, 130, 150, 135, 60, 16);
      rosa(g, 82, 78, 56, rnd);
      rosa(g, 168, 52, 36, rnd, true);
      rosa(g, 52, 168, 38, rnd, true);
      rosa(g, 140, 135, 26, rnd);
      capullo(g, 225, 82, -62, 9, false);
      capullo(g, 92, 222, -28, 9, true);
    } },
    /* Guirnalda horizontal para separar títulos. */
    guirnalda: { vb: '0 0 300 70', dibujar(g, rnd) {
      olivo(g, [150, 38], [90, 30], [12, 40], 6, 6.5, rnd);
      olivo(g, [150, 38], [210, 30], [288, 40], 6, 6.5, rnd, 'fl-hoja2');
      eucalipto(g, [150, 38], [120, 50], [70, 56], 3, 6, rnd);
      eucalipto(g, [150, 38], [180, 50], [230, 56], 3, 6, rnd);
      bayas(g, 118, 26, 4, rnd, 6);
      bayas(g, 182, 26, 4, rnd, 6);
      rosa(g, 136, 36, 15, rnd, true);
      rosa(g, 164, 36, 15, rnd);
      rosa(g, 150, 30, 11, rnd);
    } },
    /* Ramo hacia arriba, para el pie y el sobre. */
    ramo: { vb: '0 0 300 260', dibujar(g, rnd) {
      eucalipto(g, [150, 250], [70, 150], [20, 40], 6, 11, rnd);
      eucalipto(g, [150, 250], [230, 150], [282, 50], 6, 11, rnd);
      olivo(g, [150, 250], [110, 140], [110, 20], 7, 8, rnd);
      olivo(g, [150, 250], [195, 140], [195, 18], 7, 8, rnd, 'fl-hoja2');
      velo(g, 90, 90, 12, rnd, 20);
      velo(g, 215, 95, 12, rnd, 20);
      bayas(g, 60, 120, 5, rnd);
      bayas(g, 245, 125, 5, rnd);
      hoja(g, 110, 150, -40, 60, 16);
      hoja(g, 190, 150, 40, 60, 16, 'fl-hoja2');
      rosa(g, 150, 120, 44, rnd);
      rosa(g, 102, 148, 32, rnd, true);
      rosa(g, 198, 146, 32, rnd, true);
      rosa(g, 150, 72, 24, rnd, true);
      capullo(g, 70, 70, -30, 8, false);
      capullo(g, 232, 66, 30, 8, true);
    } },
    /* Ramita pequeña (tarjetas, esquinas de la carta). */
    ramita: { vb: '0 0 160 110', dibujar(g, rnd) {
      eucalipto(g, [10, 100], [60, 60], [150, 30], 5, 8, rnd);
      olivo(g, [10, 100], [50, 30], [100, 8], 5, 6, rnd);
      bayas(g, 80, 70, 4, rnd, 7);
      rosa(g, 30, 82, 20, rnd);
      rosa(g, 58, 70, 13, rnd, true);
    } }
  };

  function crear(tipo, semilla) {
    instalarDefs();
    const c = COMPOSICIONES[tipo] || COMPOSICIONES.ramita;
    const svg = el('svg', { viewBox: c.vb, class: 'flora flora-' + tipo, 'aria-hidden': 'true', focusable: 'false' });
    const g = el('g', {}, svg);
    c.dibujar(g, azar(semilla || 7));
    return svg;
  }

  /* Rellena todos los [data-flora="tipo"] de la página. */
  function pintarTodo(raiz) {
    (raiz || document).querySelectorAll('[data-flora]').forEach((n, i) => {
      if (n.firstChild) return;
      n.appendChild(crear(n.dataset.flora, Number(n.dataset.semilla) || (i + 3) * 37));
    });
  }

  /* ── Sello de lacre con relieve ─────────────────────────── */
  function sello(iniciales) {
    instalarDefs();
    const rnd = azar(91);
    const svg = el('svg', { viewBox: '-60 -60 120 120', class: 'lacre', 'aria-hidden': 'true' });
    // Borde irregular de cera derramada
    const pts = [];
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const rr = 50 + (rnd() - .5) * 7 + (i % 5 === 0 ? 4 : 0);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    let d = '';
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      d += (i === 0 ? `M${r1(m[0])} ${r1(m[1])}` : '') + ` Q${r1(q[0])} ${r1(q[1])} ${r1((q[0] + pts[(i + 2) % n][0]) / 2)} ${r1((q[1] + pts[(i + 2) % n][1]) / 2)}`;
    }
    el('ellipse', { cx: 3, cy: 5, rx: 52, ry: 50, fill: '#000', opacity: .22, filter: 'blur(3px)' }, svg);
    el('path', { d: d + 'Z', fill: 'url(#fl-lacre)' }, svg);
    // Hundimiento del sello (anillo con relieve)
    el('circle', { r: 36, fill: 'none', stroke: '#2F3A29', 'stroke-opacity': .45, 'stroke-width': 3, transform: 'translate(1 1.4)' }, svg);
    el('circle', { r: 36, fill: 'none', stroke: '#C7D3B9', 'stroke-opacity': .45, 'stroke-width': 1.6, transform: 'translate(-.8 -1)' }, svg);
    el('circle', { r: 34, fill: '#56684C', 'fill-opacity': .35 }, svg);
    // Ramitas grabadas alrededor
    const grab = el('g', { fill: 'none', stroke: '#2F3A29', 'stroke-opacity': .4, 'stroke-width': 1.1 }, svg);
    [[-1, 1], [1, -1]].forEach(([sx]) => {
      el('path', { d: `M${sx * 6} 26 Q${sx * 24} 20 ${sx * 28} 2`, transform: 'translate(.6 .8)' }, grab);
      for (let k = 0; k < 4; k++) {
        const y = 22 - k * 6;
        el('path', { d: `M${sx * (12 + k * 4)} ${y} q${sx * 5} -2 ${sx * 6} -7`, transform: 'translate(.6 .8)' }, grab);
      }
    });
    // Iniciales en relieve: sombra + luz + cara
    const txt = (dx, dy, color, op) => {
      const t = el('text', {
        x: dx, y: 8 + dy, 'text-anchor': 'middle', 'font-family': "'Great Vibes', cursive", 'font-size': 30,
        fill: color, 'fill-opacity': op
      }, svg);
      t.textContent = iniciales;
    };
    txt(1.1, 1.3, '#26301F', .6);
    txt(-.7, -.8, '#D6E0C9', .55);
    txt(0, 0, '#64775A', 1);
    // Brillo de la cera
    el('ellipse', { cx: -18, cy: -24, rx: 20, ry: 11, transform: 'rotate(-30 -18 -24)', fill: 'url(#fl-brillo)' }, svg);
    return svg;
  }

  return { crear, pintarTodo, sello, instalarDefs };
})();
