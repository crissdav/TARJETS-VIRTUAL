(function () {
  'use strict';

  const autor = document.getElementById('autor');
  const input = document.getElementById('archivos');
  const camara = document.getElementById('camara');
  const btnElegir = document.getElementById('btnElegir');
  const btnTomar = document.getElementById('btnTomar');
  const fill = document.getElementById('fill');
  const status = document.getElementById('status');
  const recentGrid = document.getElementById('recentGrid');
  const toast = document.getElementById('toast');
  const camModal = document.getElementById('camModal');
  const camVideo = document.getElementById('camVideo');
  const camCanvas = document.getElementById('camCanvas');
  const btnCapturar = document.getElementById('btnCapturar');
  const btnCerrarCam = document.getElementById('btnCerrarCam');

  const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  let stream = null;

  let subiendo = false;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  function nombreValido() {
    if (autor.value.trim()) return true;
    showToast('Escribe tu nombre primero 🙏');
    autor.focus();
    return false;
  }

  function bloquear(v) {
    subiendo = v;
    btnElegir.disabled = v;
    btnTomar.disabled = v;
  }

  btnElegir.addEventListener('click', () => {
    if (subiendo || !nombreValido()) return;
    input.click();
  });

  btnTomar.addEventListener('click', () => {
    if (subiendo || !nombreValido()) return;
    if (esMovil || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      camara.click();
      return;
    }
    abrirCamara();
  });

  input.addEventListener('change', () => {
    const files = [...input.files];
    input.value = '';
    if (files.length) subir(files);
  });

  camara.addEventListener('change', () => {
    const files = [...camara.files];
    camara.value = '';
    if (files.length) subir(files);
  });

  async function abrirCamara() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      camVideo.srcObject = stream;
      camModal.hidden = false;
      camVideo.play().catch(() => {});
    } catch (e) {
      cerrarCamara();
      showToast(window.isSecureContext
        ? 'No se pudo abrir la cámara. Revisa los permisos.'
        : 'La cámara del navegador necesita HTTPS. En el celular usa "📸 Tomar foto".');
    }
  }

  function cerrarCamara() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    camVideo.srcObject = null;
    camModal.hidden = true;
  }

  btnCapturar.addEventListener('click', () => {
    if (!stream || !camVideo.videoWidth) return;
    camCanvas.width = camVideo.videoWidth;
    camCanvas.height = camVideo.videoHeight;
    camCanvas.getContext('2d').drawImage(camVideo, 0, 0, camCanvas.width, camCanvas.height);
    camCanvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], 'foto-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      cerrarCamara();
      subir([file]);
    }, 'image/jpeg', 0.9);
  });

  btnCerrarCam.addEventListener('click', cerrarCamara);
  camModal.addEventListener('click', e => { if (e.target === camModal) cerrarCamara(); });

  async function subir(files) {
    const nombre = autor.value.trim() || 'Invitado';
    bloquear(true);
    status.textContent = '';
    fill.style.width = '0%';

    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      status.textContent = files.length > 1
        ? `Subiendo ${i + 1} de ${files.length}…`
        : 'Subiendo tu foto…';
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
        ok++;
      } catch (err) {
        showToast('No se pudo subir: ' + err.message);
      }
      fill.style.width = Math.round(((i + 1) / files.length) * 100) + '%';
    }

    status.textContent = ok
      ? `¡${ok} foto${ok > 1 ? 's' : ''} en el álbum! 🎭`
      : 'No se subió ninguna foto.';
    bloquear(false);
    cargarRecientes();
    setTimeout(() => { fill.style.width = '0%'; }, 1200);
  }

  async function cargarRecientes() {
    try {
      const res = await fetch('/api/recientes');
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
