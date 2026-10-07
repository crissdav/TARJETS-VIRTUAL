(function () {
  'use strict';

  const $ = s => document.querySelector(s);

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 'ontouchstart' in window;
  const CFG = window.CONFIRMACION_CFG || {};

  function crearFondo() {
    const cont = $('#bgDecor');
    if (!cont) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const colores = ['rgba(212, 175, 55,', 'rgba(196, 30, 58,', 'rgba(255, 215, 0,'];
    for (let i = 0, n = isMobile ? 4 : 6; i < n; i++) {
      const blob = document.createElement('div');
      blob.className = 'glow-blob';
      const size = 24 + Math.random() * 18;
      blob.style.width = size + 'vmin';
      blob.style.height = size + 'vmin';
      blob.style.left = Math.random() * 100 + '%';
      blob.style.top = Math.random() * 100 + '%';
      const c = colores[Math.floor(Math.random() * colores.length)];
      blob.style.background = 'radial-gradient(circle, ' + c + (0.10 + Math.random() * 0.08).toFixed(2) + ') 0%, transparent 70%)';
      blob.style.animationDuration = 14 + Math.random() * 10 + 's';
      blob.style.animationDelay = (-Math.random() * 12) + 's';
      cont.appendChild(blob);
    }

    for (let i = 0, n = isMobile ? 7 : 10; i < n; i++) {
      const m = document.createElement('div');
      m.className = 'bg-mask';
      m.textContent = '🎭';
      m.style.fontSize = (34 + Math.random() * 46) + 'px';
      m.style.left = Math.random() * 100 + '%';
      m.style.top = Math.random() * 100 + '%';
      m.style.opacity = (0.05 + Math.random() * 0.07).toFixed(2);
      m.style.animationDuration = 12 + Math.random() * 10 + 's';
      m.style.animationDelay = (-Math.random() * 14) + 's';
      cont.appendChild(m);
    }

    for (let i = 0, n = isMobile ? 14 : 20; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'rise-particle';
      const size = 2 + Math.random() * 3;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDuration = 8 + Math.random() * 9 + 's';
      p.style.animationDelay = (-Math.random() * 16) + 's';
      cont.appendChild(p);
    }
  }

  function error(msg) {
    const e = $('#error');
    if (e) e.textContent = msg || '';
  }

  function configurado() {
    return CFG.SUPABASE_URL && !/TU-PROYECTO/.test(CFG.SUPABASE_URL)
      && CFG.SUPABASE_ANON_KEY && !/TU-ANON-KEY/.test(CFG.SUPABASE_ANON_KEY);
  }

  function mensajeError(err) {
    const texto = (err && err.message) || '';
    if (/Invalid login credentials/i.test(texto)) return 'Correo o contraseña incorrectos';
    if (/Email not confirmed/i.test(texto)) return 'Ese correo aún no está confirmado';
    if (/Failed to fetch/i.test(texto)) return 'No hay conexión con Supabase';
    return texto || 'No se pudo iniciar sesión';
  }

  function init() {
    crearFondo();

    const form = $('#loginForm');
    const email = $('#email');
    const pass = $('#pass');
    const btn = $('#btnEntrar');

    if (CFG.ADMIN_EMAIL && !email.value) email.value = CFG.ADMIN_EMAIL;
    pass.focus();

    if (!window.supabase) {
      error('No se pudo cargar Supabase. Revisa la conexión a internet.');
      return;
    }
    if (!configurar()) {
      error('Falta configurar config.js con los datos de tu proyecto Supabase.');
      return;
    }

    const db = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

    /* Ya hay sesión abierta: entrar directo. */
    db.auth.getSession().then(({ data }) => {
      if (data && data.session) location.href = 'lista.html';
    }).catch(() => { /* sin sesión: se queda en el formulario */ });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      error('');
      btn.disabled = true;
      btn.textContent = 'Verificando…';
      try {
        const { error: err } = await db.auth.signInWithPassword({
          email: email.value.trim(),
          password: pass.value
        });
        if (err) {
          error(mensajeError(err));
          pass.select();
        } else {
          location.href = 'lista.html';
          return;
        }
      } catch (err) {
        error('No hay conexión con el servidor');
      }
      btn.disabled = false;
      btn.textContent = 'Entrar';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
