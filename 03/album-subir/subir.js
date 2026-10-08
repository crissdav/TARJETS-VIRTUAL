(function () {
  'use strict';

  const CFG = window.ALBUM_CFG || {};
  const BUCKET = 'fotos';
  const MAX_BYTES = 25 * 1024 * 1024;
  const TIPOS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const autor = document.getElementById('autor');
  const input = document.getElementById('archivos');
  const camara = document.getElementById('camara');
  const btnElegir = document.getElementById('btnElegir');
  const btnTomar = document.getElementById('btnTomar');
  const fill = document.getElementById('fill');
  const status = document.getElementById('status');
  const toast = document.getElementById('toast');
  const camModal = document.getElementById('camModal');
  const camVideo = document.getElementById('camVideo');
  const camCanvas = document.getElementById('camCanvas');
  const btnCapturar = document.getElementById('btnCapturar');
  const btnCerrarCam = document.getElementById('btnCerrarCam');

  const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  let stream = null;
  let subiendo = false;
  let db = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  function configurado() {
    return CFG.SUPABASE_URL && !/TU-PROYECTO/.test(CFG.SUPABASE_URL)
      && CFG.SUPABASE_ANON_KEY && !/TU-ANON-KEY/.test(CFG.SUPABASE_ANON_KEY);
  }

  function crearFondo() {
    const cont = document.getElementById('bgDecor');
    if (!cont) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const colores = ['rgba(212, 175, 55,', 'rgba(196, 30, 58,', 'rgba(255, 215, 0,'];
    for (let i = 0, n = esMovil ? 4 : 6; i < n; i++) {
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

    for (let i = 0, n = esMovil ? 7 : 10; i < n; i++) {
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

    for (let i = 0, n = esMovil ? 14 : 20; i < n; i++) {
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

  function archivoValido(file) {
    if (!TIPOS.includes(file.type)) return 'Formato no permitido: ' + (file.name || file.type);
    if (file.size > MAX_BYTES) return 'Muy pesada (máx. 25 MB): ' + (file.name || 'la foto');
    return null;
  }

  function extension(file) {
    const m = /\.([a-z0-9]+)$/i.exec(file.name || '');
    if (m) return m[1].toLowerCase();
    return file.type === 'image/png' ? 'png'
      : file.type === 'image/gif' ? 'gif'
      : file.type === 'image/webp' ? 'webp'
      : 'jpg';
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
    if (!db) { showToast('Falta configurar Supabase en config.js'); return; }

    const nombre = autor.value.trim();
    bloquear(true);
    status.textContent = '';
    fill.style.width = '0%';

    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      status.textContent = files.length > 1
        ? `Subiendo ${i + 1} de ${files.length}…`
        : 'Subiendo tu foto…';

      const error = archivoValido(file);
      if (error) {
        showToast(error);
        fill.style.width = Math.round(((i + 1) / files.length) * 100) + '%';
        continue;
      }

      const path = Date.now() + '-' + Math.random().toString(36).slice(2, 10) + '.' + extension(file);
      try {
        const { error: upErr } = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type });
        if (upErr) throw new Error(upErr.message);

        const { error: insErr } = await db.from('fotos').insert({ archivo: path, autor: nombre });
        if (insErr) {
          await db.storage.from(BUCKET).remove([path]).catch(() => {});
          throw new Error(insErr.message);
        }
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
    setTimeout(() => { fill.style.width = '0%'; }, 1200);
  }

  function init() {
    crearFondo();

    if (!window.supabase) {
      status.textContent = 'No se pudo cargar Supabase. Revisa la conexión a internet.';
      btnElegir.disabled = btnTomar.disabled = true;
      return;
    }
    if (!configurado()) {
      status.textContent = 'Falta configurar config.js con los datos de tu proyecto Supabase.';
      btnElegir.disabled = btnTomar.disabled = true;
      return;
    }
    db = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
