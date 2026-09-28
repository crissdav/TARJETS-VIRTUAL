(function () {
  'use strict';

  const gallery = document.getElementById('gallery');
  const countEl = document.getElementById('countFotos');
  const toast = document.getElementById('toast');
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbMeta = document.getElementById('lbMeta');
  const lbClose = document.getElementById('lbClose');
  const lbDescargar = document.getElementById('lbDescargar');
  const lbEliminar = document.getElementById('lbEliminar');
  const btnLogout = document.getElementById('btnLogout');
  const btnDescargarTodo = document.getElementById('btnDescargarTodo');
  const statFotos = document.getElementById('statFotos');
  const statInvitados = document.getElementById('statInvitados');
  const statTop = document.getElementById('statTop');

  let fotos = [];
  let porId = new Map();
  let actual = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  function fmtFecha(iso) {
    const d = new Date(String(iso).replace(' ', 'T'));
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
      actual = foto;
      lbImg.src = foto.url;
      lbMeta.innerHTML = '<b>' + escapeHtml(foto.autor) + '</b> · ' + fmtFecha(foto.fecha);
      lightbox.classList.add('show');
    });

    return item;
  }

  function renderStats(lista) {
    if (statFotos) statFotos.textContent = lista.length;

    const conteo = new Map();
    lista.forEach(f => conteo.set(f.autor, (conteo.get(f.autor) || 0) + 1));

    if (statInvitados) statInvitados.textContent = conteo.size;

    if (statTop) {
      let top = '—';
      let max = 0;
      conteo.forEach((n, autor) => {
        if (n > max) { max = n; top = autor; }
      });
      statTop.textContent = top;
      statTop.title = top === '—' ? '' : top + ' · ' + max + ' foto' + (max > 1 ? 's' : '');
    }
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

  function nombreArchivo(foto) {
    const m = /\.([a-z0-9]+)$/i.exec(foto.url);
    return 'XV-Grecia-' + foto.id + (m ? '.' + m[1] : '.jpg');
  }

  function descargar(foto) {
    const a = document.createElement('a');
    a.href = foto.url;
    a.download = nombreArchivo(foto);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function eliminar(foto) {
    if (!confirm('¿Eliminar esta foto del álbum? No se puede deshacer.')) return;
    lbEliminar.disabled = true;
    try {
      const res = await fetch('/api/fotos/' + foto.id, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo eliminar');
      }
      lightbox.classList.remove('show');
      showToast('🗑️ Foto eliminada');
      cargar();
    } catch (e) {
      showToast(e.message);
    }
    lbEliminar.disabled = false;
  }

  function conectarEventos() {
    if (!window.EventSource) return;
    const es = new EventSource('/api/eventos');
    es.addEventListener('fotos', cargar);
  }

  fetch('/api/sesion')
    .then(r => r.json())
    .then(d => { if (!d.ok) location.href = '/album'; })
    .catch(() => { /* sin acceso */ });

  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      location.href = '/login';
    });
  }

  if (btnDescargarTodo) {
    btnDescargarTodo.addEventListener('click', () => {
      if (!fotos.length) { showToast('Aún no hay fotos para descargar'); return; }
      location.href = '/api/descargar';
    });
  }

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
  conectarEventos();
})();
