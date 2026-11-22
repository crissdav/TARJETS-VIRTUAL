/* ════════════════════════════════════════════════════════════
   ANIMACIONES — GSAP + ScrollTrigger, pétalos en canvas y confeti.
   Si GSAP no carga (sin internet) o el teléfono pide "reducir
   movimiento", la tarjeta sigue funcionando con animaciones simples.
   ════════════════════════════════════════════════════════════ */
window.BodaFX = (function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const movil = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const modesto = !!((navigator.connection && navigator.connection.saveData) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 3));
  const ok = !!(window.gsap && window.ScrollTrigger) && !reducido;

  if (ok) {
    document.documentElement.classList.add('fx');
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ── Pétalos que caen (canvas) ─────────────────────────── */
  const TONOS = [
    ['#FBEDE8', '#E7B9B2', '#C98C88'],
    ['#FFFCF6', '#EFE3CF', '#D3BF9C'],
    ['#F8E3DE', '#DDA7A0', '#B8726F']
  ];
  function petalos() {
    const cv = $('#petalos');
    if (!cv || reducido) return;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, modesto ? 1 : 2);
    let W = 0, H = 0;
    const medir = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    medir();
    window.addEventListener('resize', medir);

    const N = modesto ? 7 : movil ? 13 : 22;
    const nuevo = inicio => ({
      x: Math.random() * W,
      y: inicio ? Math.random() * H : -20 - Math.random() * 60,
      s: 6 + Math.random() * 8,
      vy: 0.35 + Math.random() * 0.55,
      vx: (Math.random() - 0.5) * 0.3,
      fase: Math.random() * 6.28,
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 0.025,
      giro: Math.random() * 6.28,
      vg: 0.015 + Math.random() * 0.03,
      hoja: Math.random() < 0.22,
      tono: TONOS[Math.floor(Math.random() * TONOS.length)]
    });
    const items = Array.from({ length: N }, () => nuevo(true));

    function dibujar(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(0.35 + Math.abs(Math.cos(p.giro)) * 0.65, 1);   // gira en 3D
      const s = p.s;
      const g = ctx.createLinearGradient(0, -s, 0, s);
      if (p.hoja) {
        g.addColorStop(0, '#B9C9B2');
        g.addColorStop(1, '#6F8566');
      } else {
        g.addColorStop(0, p.tono[0]);
        g.addColorStop(0.55, p.tono[1]);
        g.addColorStop(1, p.tono[2]);
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      if (p.hoja) {
        ctx.moveTo(0, -s * 1.2);
        ctx.quadraticCurveTo(s * 0.7, 0, 0, s * 1.2);
        ctx.quadraticCurveTo(-s * 0.7, 0, 0, -s * 1.2);
      } else {
        ctx.moveTo(0, s);
        ctx.bezierCurveTo(s * 0.95, s * 0.45, s * 0.85, -s * 0.85, s * 0.18, -s * 0.95);
        ctx.quadraticCurveTo(0, -s * 0.7, -s * 0.18, -s * 0.95);
        ctx.bezierCurveTo(-s * 0.85, -s * 0.85, -s * 0.95, s * 0.45, 0, s);
      }
      ctx.fill();
      ctx.restore();
    }

    let t0 = performance.now();
    let activo = true;
    function cuadro(t) {
      if (!activo) return;
      const dt = Math.min(48, t - t0) / 16.7;
      t0 = t;
      ctx.clearRect(0, 0, W, H);
      for (const p of items) {
        p.y += p.vy * dt;
        p.x += (p.vx + Math.sin(t * 0.0008 + p.fase) * 0.5) * dt;
        p.rot += p.vr * dt;
        p.giro += p.vg * dt;
        if (p.y > H + 30 || p.x < -40 || p.x > W + 40) Object.assign(p, nuevo(false));
        dibujar(p);
      }
      requestAnimationFrame(cuadro);
    }
    requestAnimationFrame(cuadro);
    document.addEventListener('visibilitychange', () => {
      activo = !document.hidden;
      if (activo) { t0 = performance.now(); requestAnimationFrame(cuadro); }
    });
  }

  /* ── Estado inicial de la portada (antes de abrir el sobre) ── */
  function prepararPortada() {
    gsap.set('.portada .intro', { opacity: 0, y: 18 });
    gsap.set('.portada .amp', { scale: 0.4 });
    gsap.set('.portada .nombre', { clipPath: 'inset(-20% 100% -20% 0)' });
    gsap.set('.fecha-linea', { scaleX: 0 });
    gsap.set('.portada-flor', { opacity: 0, scale: 0.75, rotate: i => (i ? 10 : -10) });
    // pathLength="1": el trazo se mide en proporción, sin importar cuánto se estire el arco
    gsap.set('.arco-linea', { strokeDasharray: 1, strokeDashoffset: 1 });
  }

  /* Entrada de la portada, al terminar de abrir el sobre. */
  function portada() {
    if (!ok) return;
    const nombres = gsap.utils.toArray('.portada .nombre');
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('.portada-flor', { opacity: 1, scale: 1, rotate: 0, duration: 1.8, stagger: 0.15 }, 0)
      .to('.arco-linea', { strokeDashoffset: 0, duration: 2.2, ease: 'power2.inOut', stagger: 0.25 }, 0.1)
      .to('.portada-foto', { opacity: 1, y: 0, duration: 1.2 }, 0.4)
      .to('.portada .eyebrow', { opacity: 1, y: 0, duration: 0.9 }, 0.6)
      .to(nombres[0] || {}, { clipPath: 'inset(-20% 0% -20% 0)', duration: 1.5, ease: 'power2.inOut' }, 0.9)
      .to('.portada .amp', { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'back.out(2)' }, 2.1)
      .to(nombres[1] || {}, { clipPath: 'inset(-20% 0% -20% 0)', duration: 1.5, ease: 'power2.inOut' }, 2.3)
      .to('.portada-fecha', { opacity: 1, y: 0, duration: 0.9 }, 3.4)
      .to('.fecha-linea', { scaleX: 1, duration: 1, ease: 'power2.out' }, 3.5)
      .to('.portada-ciudad, .portada-invitado, .bajar', { opacity: 1, y: 0, duration: 0.8, stagger: 0.15 }, 3.7);
  }

  /* ── Animaciones al hacer scroll ─────────────────────────── */
  function scroll() {
    ScrollTrigger.batch('.reveal', {
      start: 'top 90%',
      once: true,
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, overwrite: true })
    });

    // Guirnaldas bajo los títulos: crecen desde el centro
    gsap.utils.toArray('.titulo-flor').forEach(g => {
      gsap.from(g, { scale: 0.3, opacity: 0, duration: 1.3, ease: 'back.out(1.6)', scrollTrigger: { trigger: g, start: 'top 92%', once: true } });
    });

    // Línea del itinerario: se dibuja al bajar
    const it = $('#itinerario');
    if (it) {
      const linea = document.createElement('span');
      linea.className = 'it-linea';
      it.prepend(linea);
      gsap.fromTo(linea, { scaleY: 0 }, {
        scaleY: 1, ease: 'none',
        scrollTrigger: { trigger: it, start: 'top 80%', end: 'bottom 65%', scrub: 0.6 }
      });
      ScrollTrigger.batch('.it-ico', {
        start: 'top 88%',
        once: true,
        onEnter: els => gsap.fromTo(els, { scale: 0, rotate: -40 }, { scale: 1, rotate: 0, duration: 0.9, ease: 'back.out(2)', stagger: 0.12 })
      });
    }

    // Colores del dress code
    ScrollTrigger.batch('.dress-colores span', {
      start: 'top 92%',
      once: true,
      onEnter: els => gsap.fromTo(els, { scale: 0, y: 10 }, { scale: 1, y: 0, duration: 0.7, ease: 'back.out(2.5)', stagger: 0.08 })
    });

    // Flores de la portada: se mueven más lento que el texto (parallax)
    if (!modesto) {
      gsap.utils.toArray('[data-parallax]').forEach(n => {
        gsap.to(n, {
          y: Number(n.dataset.parallax) || 0, ease: 'none',
          scrollTrigger: { trigger: '#portada', start: 'top top', end: 'bottom top', scrub: true }
        });
      });
      gsap.to('.pie-flor', {
        rotate: 3, ease: 'none',
        scrollTrigger: { trigger: '.pie', start: 'top bottom', end: 'bottom bottom', scrub: true }
      });
    }
  }

  /* ── Confeti al confirmar ───────────────────────────────── */
  function confeti() {
    if (reducido || typeof window.confetti !== 'function') return;
    const colores = ['#8A9A7B', '#B8975A', '#E8CFC4', '#FFFDF9', '#C9A9A6', '#D9C08F'];
    const base = { colors: colores, ticks: 260, gravity: 0.9, scalar: 1.05, disableForReducedMotion: true };
    confetti(Object.assign({}, base, { particleCount: 70, angle: 60, spread: 70, origin: { x: 0, y: 0.75 } }));
    confetti(Object.assign({}, base, { particleCount: 70, angle: 120, spread: 70, origin: { x: 1, y: 0.75 } }));
    setTimeout(() => confetti(Object.assign({}, base, { particleCount: 50, spread: 100, startVelocity: 35, origin: { x: 0.5, y: 0.6 } })), 350);
  }

  function init() {
    petalos();
    if (!ok) return;
    prepararPortada();
    scroll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return {
    activo: () => ok,
    portada,
    confeti,
    refrescar: () => { if (ok) ScrollTrigger.refresh(); }
  };
})();
