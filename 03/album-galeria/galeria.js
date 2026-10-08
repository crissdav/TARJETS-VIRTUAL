(function () {
  'use strict';

  const CFG = window.ALBUM_CFG || {};
  const BUCKET = 'fotos';
  const URL_VIDA = 7 * 24 * 60 * 60;

  const gallery = document.getElementById('gallery');
  const loading = document.getElementById('loading');
  const countEl = document.getElementById('countFotos');
  const toast = document.getElementById('toast');
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbMeta = document.getElementById('lbMeta');
  const lbClose = document.getElementById('lbClose');
  const lbDescargar = document.getElementById('lbDescargar');
  const lbEliminar = document.getElementById('lbEliminar');
  const btnLogout = document.getElementById('btnLogout');
  const statFotos = document.getElementById('statFotos');
  const statInvitados = document.getElementById('statInvitados');
  const bgDecor = document.getElementById('bgDecor');

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 'ontouchstart' in window;

  let db = null;
  let fotos = [];
  let porId = new Map();
  let actual = null;
  const urls = new Map();
  let recargando = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  function salir() {
    location.href = 'login.html';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtFecha(iso) {
    const d = new Date(String(iso).replace(' ', 'T'));
    if (isNaN(d)) return iso;
    return d.toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function crearFondo() {
    if (!bgDecor) return;
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
      bgDecor.appendChild(blob);
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
      bgDecor.appendChild(m);
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
      bgDecor.appendChild(p);
    }
  }

  /* URLs firmadas: se reutilizan por id entre recargas.
     Si una foto no tiene archivo, se salta en vez de romper la galería. */
  async function firmar(lista) {
    const faltantes = lista.filter(f => !urls.has(f.id) && !f.rota);
    for (let i = 0; i < faltantes.length; i += 20) {
      const lote = faltantes.slice(i, i + 20);
      await Promise.all(lote.map(async f => {
        try {
          const { data, error } = await db.storage.from(BUCKET).createSignedUrl(f.archivo, URL_VIDA);
          if (error) throw error;
          urls.set(f.id, data.signedUrl);
        } catch (e) {
          f.rota = true;
        }
      }));
    }
    const conUrl = [];
    lista.forEach(f => {
      const u = urls.get(f.id);
      if (u) { f.url = u; conUrl.push(f); }
    });
    return conUrl;
  }

  function renderItem(foto) {
    const item = document.createElement('div');
    item.className = 'ph-item';
    item.dataset.id = foto.id;

    const img = document.createElement('img');
    img.src = foto.url;
    img.alt = 'Foto de ' + escapeHtml(foto.autor);
    img.loading = 'lazy';

    const meta = document.createElement('div');
    meta.className = 'ph-meta';
    meta.innerHTML = '<b>' + escapeHtml(foto.autor) + '</b> · ' + fmtFecha(foto.fecha);

    item.appendChild(img);
    item.appendChild(meta);

    item.addEventListener('click', () => {
      actual = foto;
      lbImg.src = foto.url;
      lbMeta.innerHTML = '<b>' + escapeHtml(foto.autor) + '</b> · ' + fmtFecha(foto.fecha);
      lightbox.classList.add('show');
    });

    return item;
  }

  function renderStats(lista) {
    if (statFotos) statFotos.textContent = lista.length;
    const autores = new Set(lista.map(f => f.autor));
    if (statInvitados) statInvitados.textContent = autores.size;
  }

  function sync(lista) {
    const nuevosIds = new Set(lista.map(f => f.id));
    [...porId.keys()].forEach(id => {
      if (!nuevosIds.has(id)) {
        const el = gallery.querySelector('[data-id="' + id + '"]');
        if (el) el.remove();
        porId.delete(id);
      }
    });

    lista.forEach(foto => {
      if (!porId.has(foto.id)) {
        const item = renderItem(foto);
        gallery.appendChild(item);
        porId.set(foto.id, item);
      }
    });

    if (fotos.length && lista.length > fotos.length) {
      showToast(lista.length - fotos.length === 1
        ? '📸 Llegó una nueva foto al álbum'
        : '📸 Se sumaron ' + (lista.length - fotos.length) + ' fotos nuevas');
    }
    fotos = lista;
    countEl.textContent = lista.length;
    renderStats(lista);

    const empty = document.querySelector('.empty-state');
    if (!lista.length) {
      if (!empty) {
        const div = document.createElement('div');
        div.className = 'empty-state';
        div.innerHTML = '<h2>El álbum está comenzando…</h2><p>Cuando los invitados escaneen el QR y suban fotos, aparecerán aquí en tiempo real.</p>';
        gallery.appendChild(div);
      }
    } else if (empty) {
      empty.remove();
    }
  }

  async function cargar() {
    try {
      const { data, error } = await db.from('fotos').select('*').order('fecha', { ascending: true });
      if (error) {
        if (/JWT|PGRST301|401/i.test(error.message + ' ' + (error.code || ''))) {
          salir();
          return;
        }
        throw error;
      }
      const conUrl = await firmar(data);
      if (loading) loading.style.display = 'none';
      sync(conUrl);
    } catch (e) {
      if (loading) loading.textContent = 'No se pudo cargar el álbum. Revisa la conexión.';
      showToast('No se pudo cargar: ' + e.message);
    }
  }

  function recargar() {
    if (recargando) return;
    recargando = setTimeout(() => { recargando = null; cargar(); }, 1500);
  }

  async function descargar(foto) {
    try {
      const res = await fetch(foto.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'XV-Grecia-' + foto.id + '.jpg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      window.open(foto.url, '_blank');
    }
  }

  async function eliminar(foto) {
    if (!confirm('¿Eliminar esta foto del álbum? No se puede deshacer.')) return;
    lbEliminar.disabled = true;
    try {
      await db.storage.from(BUCKET).remove([foto.archivo]).catch(() => {});

      const { error: delErr } = await db.from('fotos').delete().eq('id', foto.id);
      if (delErr) throw new Error(delErr.message);

      urls.delete(foto.id);
      lightbox.classList.remove('show');
      showToast('🗑️ Foto eliminada');
      cargar();
    } catch (e) {
      showToast('No se pudo eliminar: ' + e.message);
    }
    lbEliminar.disabled = false;
  }

  function conectarRealtime() {
    if (!db.channel) return;
    db.channel('album-fotos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fotos' }, recargar)
      .subscribe();
  }

  async function init() {
    crearFondo();

    if (!window.supabase || !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) {
      if (loading) loading.textContent = 'Falta configurar config.js con los datos de Supabase.';
      return;
    }

    db = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

    const { data } = await db.auth.getSession();
    if (!data || !data.session) { salir(); return; }

    db.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') salir();
    });

    btnLogout.addEventListener('click', async () => {
      await db.auth.signOut();
      salir();
    });

    lbClose.addEventListener('click', () => lightbox.classList.remove('show'));
    lightbox.addEventListener('click', e => {
      if (e.target === lightbox) lightbox.classList.remove('show');
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') lightbox.classList.remove('show');
    });
    lbDescargar.addEventListener('click', () => { if (actual) descargar(actual); });
    lbEliminar.addEventListener('click', () => { if (actual) eliminar(actual); });

    cargar();
    conectarRealtime();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
