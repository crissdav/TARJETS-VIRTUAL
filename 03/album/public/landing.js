(function () {
  'use strict';

  const gallery = document.getElementById('gallery');
  const countEl = document.getElementById('countFotos');
  const toast = document.getElementById('toast');
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbMeta = document.getElementById('lbMeta');
  const lbClose = document.getElementById('lbClose');
  const btnLogout = document.getElementById('btnLogout');

  let fotos = [];
  let porId = new Map();

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  function fmtFecha(iso) {
    const d = new Date(iso.replace(' ', 'T'));
    if (isNaN(d)) return iso;
    return d.toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
      lbImg.src = foto.url;
      lbMeta.innerHTML = '<b>' + escapeHtml(foto.autor) + '</b> · ' + fmtFecha(foto.fecha);
      lightbox.classList.add('show');
    });

    return item;
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
        gallery.prepend(item);
        porId.set(foto.id, item);
      }
    });

    if (lista.length > fotos.length) {
      showToast(lista.length - fotos.length === 1
        ? '📸 Llegó una nueva foto al álbum'
        : '📸 Se sumaron ' + (lista.length - fotos.length) + ' fotos nuevas');
    }
    fotos = lista;
    countEl.textContent = lista.length;

    if (!lista.length) {
      if (!document.querySelector('.empty-state')) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = '<h2>El álbum está comenzando…</h2><p>Cuando los invitados escaneen el QR y suban fotos, aparecerán aquí en tiempo real.</p>';
        gallery.appendChild(empty);
      }
    } else {
      const empty = document.querySelector('.empty-state');
      if (empty) empty.remove();
    }
  }

  async function cargar() {
    try {
      const res = await fetch('/api/fotos');
      if (res.status === 401) {
        location.href = '/album';
        return;
      }
      const lista = await res.json();
      sync(lista);
    } catch (e) {
      /* servidor no disponible */
    }
  }

  /* Guarda: si no hay sesión, el servidor muestra el login. Verificamos igualmente. */
  fetch('/api/sesion')
    .then(r => r.json())
    .then(d => {
      if (!d.ok) location.href = '/album';
    })
    .catch(() => { /* sin acceso */ });

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      location.href = '/login';
    });
  }

  lbClose.addEventListener('click', () => lightbox.classList.remove('show'));
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) lightbox.classList.remove('show');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') lightbox.classList.remove('show');
  });

  cargar();
  setInterval(cargar, 4000);
})();