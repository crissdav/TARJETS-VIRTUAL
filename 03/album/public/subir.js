(function () {
  'use strict';

  const autor = document.getElementById('autor');
  const input = document.getElementById('archivos');
  const dropzone = document.getElementById('dropzone');
  const chips = document.getElementById('chips');
  const btn = document.getElementById('btnSubir');
  const fill = document.getElementById('fill');
  const status = document.getElementById('status');
  const recentGrid = document.getElementById('recentGrid');
  const toast = document.getElementById('toast');

  let seleccionados = [];

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  function chipHTML(name) {
    const el = document.createElement('span');
    el.className = 'chip';
    el.textContent = name;
    return el;
  }

  dropzone.addEventListener('click', () => input.click());

  ['dragover', 'drop'].forEach(ev => {
    dropzone.addEventListener(ev, e => {
      e.preventDefault();
      dropzone.classList.toggle('hover', ev === 'dragover');
    });
  });

  dropzone.addEventListener('drop', e => {
    if (e.dataTransfer && e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      seleccionados = [...input.files];
      pintarChips();
    }
  });

  input.addEventListener('change', () => {
    seleccionados = [...input.files];
    pintarChips();
  });

  function pintarChips() {
    chips.innerHTML = '';
    seleccionados.forEach(f => chips.appendChild(chipHTML(f.name)));
  }

  btn.addEventListener('click', async () => {
    const nombre = autor.value.trim() || 'Invitado';
    if (!seleccionados.length) {
      showToast('Elige al menos una foto 📷');
      return;
    }

    btn.disabled = true;
    status.textContent = '';
    fill.style.width = '0%';

    const ok = [];
    for (let i = 0; i < seleccionados.length; i++) {
      const file = seleccionados[i];
      status.textContent = `Subiendo ${i + 1} de ${seleccionados.length}…`;
      try {
        const res = await fetch('/api/subir', {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'image/jpeg',
            'X-Nombre': nombre
          },
          body: file
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error');
        ok.push(data);
      } catch (err) {
        showToast('No se pudo subir ' + file.name + ': ' + err.message);
      }
      fill.style.width = Math.round(((i + 1) / seleccionados.length) * 100) + '%';
    }

    status.textContent = ok.length
      ? `¡${ok.length} foto${ok.length > 1 ? 's' : ''} sumada${ok.length > 1 ? 's' : ''} al álbum! 🎭`
      : 'No se subió ninguna foto.';

    btn.disabled = false;
    input.value = '';
    seleccionados = [];
    pintarChips();
    cargarRecientes();
  });

  async function cargarRecientes() {
    try {
      const res = await fetch('/api/fotos');
      const fotos = await res.json();
      recentGrid.innerHTML = '';
      fotos.slice(0, 30).forEach(f => {
        const img = document.createElement('img');
        img.src = f.url;
        img.alt = 'Foto de ' + f.autor;
        img.loading = 'lazy';
        recentGrid.appendChild(img);
      });
    } catch (e) {
      /* sin cambios */
    }
  }

  cargarRecientes();
})();