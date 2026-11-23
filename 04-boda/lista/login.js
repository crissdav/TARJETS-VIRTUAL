(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const CFG = window.BODA_PANEL || {};

  function configurado() {
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CFG.SUPABASE_URL || '') &&
      !/TU-PROYECTO/.test(CFG.SUPABASE_URL) && CFG.SUPABASE_ANON_KEY && !/TU-ANON-KEY/.test(CFG.SUPABASE_ANON_KEY);
  }

  function error(msg) { $('#error').textContent = msg || ''; }

  function mensajeError(err) {
    const t = (err && err.message) || '';
    if (/Invalid login credentials/i.test(t)) return 'Correo o contraseña incorrectos';
    if (/Email not confirmed/i.test(t)) return 'Ese correo aún no está confirmado';
    if (/Failed to fetch/i.test(t)) return 'No hay conexión con Supabase';
    return t || 'No se pudo iniciar sesión';
  }

  /* Solo entra quien tenga app_metadata.panel = 'boda'. */
  function esPanel(session) {
    const meta = session && session.user && session.user.app_metadata;
    return !!meta && meta.panel === 'boda';
  }

  /* Misma regla que el panel: minutos sin usarlo. */
  function inactivo() {
    try {
      const ult = Number(localStorage.getItem('boda-panel-actividad')) || 0;
      return ult > 0 && Date.now() - ult > Math.max(1, Number(CFG.INACTIVIDAD_MIN) || 30) * 60000;
    } catch (e) { return false; }
  }

  async function init() {
    if (CFG.NOVIOS) $('#novios').textContent = CFG.NOVIOS;
    if (/motivo=inactividad/.test(location.search)) {
      error('Tu sesión se cerró por inactividad. Vuelve a ingresar.');
    }
    const form = $('#loginForm');
    const btn = $('#btnEntrar');
    $('#email').focus();

    if (!window.supabase) { error('No se pudo cargar Supabase. Revisa la conexión.'); return; }
    if (!configurado()) { error('Falta configurar config.js con los datos de Supabase.'); return; }

    const db = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

    try {
      const { data } = await db.auth.getSession();
      if (data && esPanel(data.session)) {
        if (inactivo()) {
          await db.auth.signOut();
          error('Tu sesión se cerró por inactividad. Vuelve a ingresar.');
        } else {
          location.href = 'lista.html';
          return;
        }
      }
    } catch (e) { /* sin sesión */ }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      error('');
      btn.disabled = true;
      btn.textContent = 'Verificando…';
      try {
        const { data, error: err } = await db.auth.signInWithPassword({
          email: $('#email').value.trim(),
          password: $('#pass').value
        });
        if (err) {
          error(mensajeError(err));
          $('#pass').select();
        } else if (!esPanel(data.session)) {
          await db.auth.signOut();
          error('Esta cuenta no tiene acceso a la lista de la boda.');
        } else {
          try { localStorage.setItem('boda-panel-actividad', String(Date.now())); } catch (e) { /* sin almacenamiento */ }
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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
