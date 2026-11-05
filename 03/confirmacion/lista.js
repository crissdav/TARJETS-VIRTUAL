(function () {
  'use strict';

  const $ = s => document.querySelector(s);

  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 'ontouchstart' in window;

  let items = [];
  let editando = null;

  /* ── Fondo animado ──────────────────────────────────────── */
  function crearFondo() {
    const cont = $('#bgDecor');
    if (!cont) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const colores = ['rgba(224, 40, 127,', 'rgba(255, 95, 168,', 'rgba(255, 141, 192,'];
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

    for (let i = 0, n = isMobile ? 8 : 12; i < n; i++) {
      const m = document.createElement('div');
      m.className = 'bg-mask';
      m.textContent = '🎭';
      m.style.fontSize = (34 + Math.random() * 46) + 'px';
      m.style.left = Math.random() * 100 + '%';
      m.style.top = Math.random() * 100 + '%';
      m.style.opacity = (0.05 + Math.random() * 0.07).toFixed(2);
      m.style.animationDuration = 12 + Math.random() * 10 + 's';
      m.style.animationDelay = (-Math.random() * 12) + 's';
      cont.appendChild(m);
    }

    for (let i = 0, n = isMobile ? 14 : 22; i < n; i++) {
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

  /* ── Toast ──────────────────────────────────────────────── */
  function showToast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ── Formato ────────────────────────────────────────────── */
  function sinAcentos(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function fechaBonita(iso) {
    if (!iso) return '—';
    const d = new Date(String(iso).replace(' ', 'T'));
    if (isNaN(d)) return String(iso);
    return d.toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function horaRelativa(iso) {
    const d = new Date(String(iso).replace(' ', 'T'));
    if (isNaN(d)) return '';
    const min = Math.floor((Date.now() - d) / 60000);
    if (min < 1) return 'hace un momento';
    if (min < 60) return 'hace ' + min + ' min';
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return 'hace ' + hrs + ' h';
    const dias = Math.floor(hrs / 24);
    return 'hace ' + dias + (dias === 1 ? ' día' : ' días');
  }

  /* ── Datos (Supabase) ───────────────────────────────────── */
  const CFG = window.CONFIRMACION_CFG || {};
  let db = null;
  let ultimoCambio = Date.now();

  function cliente() {
    if (!db) db = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    return db;
  }

  function configurado() {
    return CFG.SUPABASE_URL && !/TU-PROYECTO/.test(CFG.SUPABASE_URL)
      && CFG.SUPABASE_ANON_KEY && !/TU-ANON-KEY/.test(CFG.SUPABASE_ANON_KEY);
  }

  function deFila(r) {
    return {
      id: r.id,
      nombre: r.nombre,
      acompanante: r.acompanante || '',
      fecha: r.fecha,
      confirmadoInvitado: !!r.confirmado_invitado,
      confirmadoAcompanante: !!r.confirmado_acompanante,
      personas: r.acompanante ? 2 : 1
    };
  }

  function aplicarDatos(datos) {
    items = (datos && datos.items) || [];
    pintar();
  }

  async function cargar() {
    const { data, error } = await cliente()
      .from('confirmaciones')
      .select('*')
      .order('id');
    if (error) throw error;
    aplicarDatos({ items: (data || []).map(deFila) });
  }

  /* ── En vivo: sondeo cada 15 s ──────────────────────────── */
  function textoDesde(ms) {
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return 'hace ' + s + ' s';
    const m = Math.floor(s / 60);
    if (m < 60) return 'hace ' + m + ' min';
    return 'hace ' + Math.floor(m / 60) + ' h';
  }

  function marcarEnVivo(ok) {
    const pill = $('#liveStatus');
    if (!pill) return;
    pill.classList.toggle('off', !ok);
    pill.textContent = ok ? 'Actualizado ' + textoDesde(ultimoCambio) : 'Reconectando…';
  }

  function tic() {
    marcarEnVivo(Date.now() - ultimoCambio < 45000);
  }

  async function recargarEnVivo() {
    try {
      await cargar();
      ultimoCambio = Date.now();
      marcarEnVivo(true);
    } catch (e) {
      marcarEnVivo(false);
    }
  }

  function conectarEnVivo() {
    setInterval(tic, 1000);
    setInterval(() => { if (!document.hidden) recargarEnVivo(); }, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) recargarEnVivo(); });
    tic();
  }

  function pintar() {
    const cuerpo = $('#tbody');
    const vacio = $('#empty');
    const tabla = document.querySelector('table');
    const q = sinAcentos($('#buscar').value.trim());
    const orden = $('#orden').value;

    let filtrados = items.filter(f =>
      !q || sinAcentos(f.nombre).includes(q) || sinAcentos(f.acompanante).includes(q)
    );

    if (orden === 'pendientes') filtrados = filtrados.filter(f => confirmadosDe(f) < f.personas);
    if (orden === 'confirmados') filtrados = filtrados.filter(f => confirmadosDe(f) === f.personas);

    filtrados.sort((a, b) => {
      switch (orden) {
        case 'fecha-asc': return a.id - b.id;
        case 'nombre-asc': return a.nombre.localeCompare(b.nombre, 'es');
        case 'nombre-desc': return b.nombre.localeCompare(a.nombre, 'es');
        case 'personas-desc': return b.personas - a.personas || a.nombre.localeCompare(b.nombre, 'es');
        default: return b.id - a.id;
      }
    });

    cuerpo.innerHTML = '';
    filtrados.forEach(f => cuerpo.appendChild(fila(f)));

    const hay = filtrados.length > 0;
    tabla.hidden = !hay;
    vacio.hidden = hay;
    if (!hay) {
      const soloPend = orden === 'pendientes';
      const soloConf = orden === 'confirmados';
      $('#emptyTitle').textContent = items.length
        ? (soloPend ? 'Todo confirmado 🎉' : soloConf ? 'Nadie ha confirmado todavía' : 'Sin coincidencias')
        : 'Aún no hay invitados anotados';
      $('#emptyText').textContent = items.length
        ? (soloPend
            ? 'Todos los que están anotados ya confirmaron su asistencia.'
            : soloConf
              ? 'Marca a alguien con “Confirmar” y aparecerá en esta vista.'
              : 'Ningún invitado coincide con «' + $('#buscar').value.trim() + '».')
        : 'Cuando los invitados confirmen desde la tarjeta, aparecerán aquí.';
    }

    pintarStats(filtrados.length);
  }

  function confirmadosDe(f) {
    return (f.confirmadoInvitado ? 1 : 0) + (f.confirmadoAcompanante ? 1 : 0);
  }

  /* Ícono SVG en línea (los emojis ✎ y 🗑 se ven distintos en cada teléfono). */
  const ICONOS = {
    check: 'M5 12.5l4.5 4.5L19 7.5',
    cruz: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
    lapiz: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
    basura: 'M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6'
  };
  function conIcono(btn, icono, texto) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'ico');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', ICONOS[icono]);
    svg.appendChild(path);
    btn.textContent = '';
    btn.appendChild(svg);
    btn.appendChild(document.createTextNode(texto));
    return btn;
  }

  /* Botón de confirmar / desconfirmar de UNA persona. */
  function botonCheck(nombre, confirmado, alCambiar) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-check' + (confirmado ? ' btn-uncheck' : '');
    conIcono(btn, confirmado ? 'cruz' : 'check', confirmado ? 'Quitar' : 'Confirmar');
    btn.setAttribute('aria-pressed', confirmado ? 'true' : 'false');
    btn.title = confirmado
      ? 'Quitar la marca de confirmada a ' + nombre
      : 'Marcar a ' + nombre + ' como confirmada';
    btn.addEventListener('click', () => alCambiar(!confirmado));
    return btn;
  }

  /* Celda de una persona: nombre, su botón y un pie opcional. */
  function celdaPersona(nombre, confirmado, etiqueta, claseCol, alCambiar, pie) {
    const td = document.createElement('td');
    td.className = claseCol + (confirmado ? ' es-confirmado' : '');
    td.dataset.label = etiqueta;

    const wrap = document.createElement('div');
    wrap.className = 'persona';

    const linea = document.createElement('div');
    linea.className = 'persona-linea';

    const span = document.createElement('span');
    span.className = 'nombre';
    span.textContent = nombre;
    linea.appendChild(span);
    linea.appendChild(botonCheck(nombre, confirmado, alCambiar));
    wrap.appendChild(linea);

    if (pie) {
      const p = document.createElement('span');
      p.className = 'persona-pie';
      p.textContent = pie;
      wrap.appendChild(p);
    }

    td.appendChild(wrap);
    return td;
  }

  function fila(f) {
    const tr = document.createElement('tr');
    tr.dataset.id = f.id;
    const cuantas = confirmadosDe(f);
    if (cuantas === f.personas) tr.classList.add('fila-lista');

    /* # y personas apilados, para no gastar una columna. */
    const tdNum = document.createElement('td');
    tdNum.className = 'col-num';
    tdNum.dataset.label = 'Registro';
    const num = document.createElement('span');
    num.className = 'fila-id';
    num.textContent = '#' + f.id;
    tdNum.appendChild(num);

    const pill = document.createElement('span');
    pill.className = 'pill' + (f.personas > 1 ? ' pill-2' : '');
    const textoPill = f.personas === 1 ? '1 persona' : f.personas + ' personas';
    pill.textContent = textoPill;
    pill.title = textoPill + ' en total';
    tdNum.appendChild(pill);
    tr.appendChild(tdNum);

    tr.appendChild(celdaPersona(
      f.nombre, f.confirmadoInvitado, 'Invitado', 'col-nombre',
      v => cambiarEstado(f, { invitado: v }),
      fechaBonita(f.fecha)
    ));

    if (f.acompanante) {
      tr.appendChild(celdaPersona(
        f.acompanante, f.confirmadoAcompanante, 'Acompañante', 'col-acomp',
        v => cambiarEstado(f, { acompanante: v })
      ));
    } else {
      const tdAcomp = document.createElement('td');
      tdAcomp.className = 'col-acomp col-vacio';
      tdAcomp.dataset.label = 'Acompañante';
      const wrap = document.createElement('div');
      wrap.className = 'persona';
      const span = document.createElement('span');
      span.className = 'none';
      span.textContent = 'sin acompañante';
      wrap.appendChild(span);
      tdAcomp.appendChild(wrap);
      tr.appendChild(tdAcomp);
    }

    /* Resumen de la fila: cuántas de sus personas confirmaron. */
    const tdEstado = document.createElement('td');
    tdEstado.className = 'col-estado';
    tdEstado.dataset.label = 'Confirmado';
    const marca = document.createElement('span');
    marca.className = 'estado-pill' + (cuantas === f.personas ? ' completo' : cuantas ? ' parcial' : '');
    if (cuantas === f.personas) conIcono(marca, 'check', 'Confirmado');
    else if (cuantas) marca.textContent = cuantas + ' de ' + f.personas;
    else marca.textContent = 'Pendiente';
    tdEstado.appendChild(marca);
    tr.appendChild(tdEstado);

    /* Botonera: siempre a la vista, se reparte en varias líneas si no cabe. */
    const tdAcc = document.createElement('td');
    tdAcc.className = 'col-acciones';

    const barra = document.createElement('div');
    barra.className = 'acciones';

    const todoListo = cuantas === f.personas;
    const quienes = f.personas === 1 ? f.nombre : 'ambos';
    const btnTodos = document.createElement('button');
    btnTodos.className = 'btn btn-sm ' + (todoListo ? 'btn-green' : 'btn-gold');
    btnTodos.type = 'button';
    conIcono(btnTodos, todoListo ? 'cruz' : 'check', todoListo ? 'Desconfirmar todos' : 'Confirmar todos');
    btnTodos.title = (todoListo ? 'Quitar la marca de confirmada a ' : 'Marcar como confirmados a ') + quienes;
    btnTodos.addEventListener('click', () => cambiarEstado(f, { invitado: !todoListo, acompanante: !todoListo }));

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn btn-sm';
    btnEdit.type = 'button';
    conIcono(btnEdit, 'lapiz', 'Editar');
    btnEdit.title = 'Corregir los datos de ' + f.nombre;
    btnEdit.addEventListener('click', () => abrirModal(f));

    const btnDel = document.createElement('button');
    btnDel.className = 'btn btn-sm btn-red';
    btnDel.type = 'button';
    conIcono(btnDel, 'basura', 'Eliminar');
    btnDel.title = 'Eliminar el registro de ' + f.nombre;
    btnDel.addEventListener('click', () => eliminar(f));

    barra.appendChild(btnTodos);
    barra.appendChild(btnEdit);
    barra.appendChild(btnDel);
    tdAcc.appendChild(barra);
    tr.appendChild(tdAcc);

    return tr;
  }

  function pintarStats(mostrados) {
    const personas = items.reduce((n, f) => n + f.personas, 0);
    const pares = items.filter(f => f.acompanante).length;
    const confirmados = items.reduce((n, f) => n + confirmadosDe(f), 0);

    $('#statRegistros').textContent = items.length;
    $('#statPersonas').textContent = personas;
    $('#statConfirmados').textContent = confirmados;
    $('#statPares').textContent = pares;
    $('#statConfirmados').title = confirmados + ' de ' + personas + ' personas ya confirmaron';

    const ult = items.length ? items.reduce((a, b) => (a.id > b.id ? a : b)) : null;
    const celda = $('#statUltima');
    celda.textContent = ult ? horaRelativa(ult.fecha) : '—';
    celda.title = ult ? fechaBonita(ult.fecha) : '';

    $('#statRegistros').title = mostrados === items.length
      ? '' : mostrados + ' de ' + items.length + ' visibles';
  }

  /* Marca o desmarca sin borrar el registro. */
  async function cambiarEstado(f, cambios) {
    try {
      const patch = {};
      if ('invitado' in cambios) patch.confirmado_invitado = cambios.invitado;
      if ('acompanante' in cambios) patch.confirmado_acompanante = cambios.acompanante;
      const { error } = await cliente().from('confirmaciones').update(patch).eq('id', f.id);
      if (error) throw error;
      await cargar();
      ultimoCambio = Date.now();
      marcarEnVivo(true);
    } catch (e) {
      showToast(e.message || 'No se pudo actualizar');
    }
  }

  /* ── Escáner del pase ───────────────────────────────────── */
  const ESCANEO_CADA_MS = 150;
  const ESCANEO_LADO_MAX = 640;
  let camara = null;
  let escaneando = false;
  let lienzoQr = null;

  /* Misma comparación que la función anotar de Supabase. */
  function claveNombre(texto) {
    return (texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ').trim().toLowerCase();
  }

  /* El pase es un enlace de WhatsApp con el mensaje ya escrito:
     "Confirmo asistencia - Nombre: X - Acompanante: Y". Los nombres muy
     largos llevan el enlace sin mensaje (ver generarQR en la tarjeta). */
  function leerPase(contenido) {
    let url;
    try { url = new URL(contenido); } catch (e) { return null; }
    if (url.hostname !== 'wa.me') return null;
    const texto = url.searchParams.get('text');
    if (!texto) return { sinNombre: true };
    const m = texto.match(/Nombre:\s*(.+?)(?:\s+-\s+Acompanante:\s*(.*))?$/);
    if (!m) return null;
    return { nombre: m[1].trim(), acompanante: (m[2] || '').trim() };
  }

  function detenerCamara() {
    escaneando = false;
    if (camara) camara.getTracks().forEach(t => t.stop());
    camara = null;
    $('#qrVideo').srcObject = null;
  }

  function buscarQr() {
    if (!escaneando) return;
    const video = $('#qrVideo');
    if (video.readyState >= 2 && video.videoWidth) {
      const escala = Math.min(1, ESCANEO_LADO_MAX / Math.max(video.videoWidth, video.videoHeight));
      const w = Math.round(video.videoWidth * escala);
      const h = Math.round(video.videoHeight * escala);
      lienzoQr = lienzoQr || document.createElement('canvas');
      lienzoQr.width = w;
      lienzoQr.height = h;
      const ctx = lienzoQr.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, w, h);
      const codigo = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
      if (codigo && codigo.data) {
        detenerCamara();
        procesarPase(codigo.data);
        return;
      }
    }
    setTimeout(buscarQr, ESCANEO_CADA_MS);
  }

  async function iniciarEscaneo() {
    $('#qrResultado').hidden = true;
    $('#qrResultado').textContent = '';
    $('#btnQrOtro').hidden = true;
    $('#qrVisor').hidden = false;
    const ayuda = $('#qrAyuda');
    ayuda.hidden = false;
    ayuda.textContent = 'Abriendo la cámara…';

    if (!window.jsQR) {
      ayuda.textContent = 'No se pudo cargar el lector. Revisa la conexión y recarga la página.';
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      ayuda.textContent = 'Este navegador no permite usar la cámara. Busca al invitado por su nombre.';
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      /* Se cerró mientras el navegador pedía permiso. */
      if ($('#modalQr').hidden) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      camara = stream;
      const video = $('#qrVideo');
      video.srcObject = stream;
      await video.play();
      ayuda.textContent = 'Apunta al código QR del invitado.';
      escaneando = true;
      buscarQr();
    } catch (e) {
      detenerCamara();
      ayuda.textContent = e && e.name === 'NotAllowedError'
        ? 'Falta el permiso de la cámara. Actívalo en el navegador y vuelve a intentar.'
        : 'No se pudo abrir la cámara. Busca al invitado por su nombre.';
    }
  }

  function abrirEscaner() {
    $('#modalQr').hidden = false;
    iniciarEscaneo();
  }

  function cerrarEscaner() {
    detenerCamara();
    $('#modalQr').hidden = true;
  }

  function avisoQr(clase, titulo, detalle) {
    const caja = document.createElement('div');
    caja.className = 'qr-aviso ' + clase;
    const fuerte = document.createElement('strong');
    fuerte.textContent = titulo;
    caja.appendChild(fuerte);
    if (detalle) {
      const texto = document.createElement('span');
      texto.textContent = detalle;
      caja.appendChild(texto);
    }
    return caja;
  }

  function personaQr(etiqueta, nombre, confirmado, alCambiar) {
    const fila = document.createElement('div');
    fila.className = 'qr-persona' + (confirmado ? ' es-confirmado' : '');
    const datos = document.createElement('div');
    const rotulo = document.createElement('small');
    rotulo.textContent = etiqueta;
    const texto = document.createElement('b');
    texto.textContent = nombre;
    datos.appendChild(rotulo);
    datos.appendChild(texto);
    fila.appendChild(datos);
    fila.appendChild(botonCheck(nombre, confirmado, alCambiar));
    return fila;
  }

  /* Cambia el estado y vuelve a pintar el resultado con los datos nuevos. */
  async function cambiarDesdeQr(id, pase, cambios) {
    const f = items.find(x => x.id === id);
    if (!f) return;
    await cambiarEstado(f, cambios);
    pintarInvitadoQr(id, pase, false);
  }

  function pintarInvitadoQr(id, pase, recienEscaneado) {
    const caja = $('#qrResultado');
    caja.textContent = '';
    const f = items.find(x => x.id === id);
    if (!f) {
      caja.appendChild(avisoQr('qr-mal', 'Este registro ya no está en la lista'));
      return;
    }

    const completo = confirmadosDe(f) === f.personas;
    if (completo) {
      caja.appendChild(recienEscaneado
        ? avisoQr('qr-alerta', 'Este pase ya estaba confirmado', 'Revisa que no lo estén usando dos veces.')
        : avisoQr('qr-ok', 'Confirmado', 'Ya puede pasar.'));
    }

    caja.appendChild(personaQr('Invitado', f.nombre, f.confirmadoInvitado,
      v => cambiarDesdeQr(id, pase, { invitado: v })));
    if (f.acompanante) {
      caja.appendChild(personaQr('Acompañante', f.acompanante, f.confirmadoAcompanante,
        v => cambiarDesdeQr(id, pase, { acompanante: v })));
    }

    if (pase.acompanante && claveNombre(pase.acompanante) !== claveNombre(f.acompanante)) {
      caja.appendChild(avisoQr('qr-alerta', 'El acompañante no coincide', 'En el pase figura: ' + pase.acompanante));
    }

    if (!completo) {
      const todos = document.createElement('button');
      todos.type = 'button';
      todos.className = 'btn btn-green qr-todos';
      conIcono(todos, 'check', f.personas === 1 ? 'Confirmar' : 'Confirmar a los dos');
      todos.addEventListener('click', () => cambiarDesdeQr(id, pase, { invitado: true, acompanante: true }));
      caja.appendChild(todos);
    }
  }

  async function procesarPase(contenido) {
    $('#qrVisor').hidden = true;
    $('#qrAyuda').hidden = true;
    $('#btnQrOtro').hidden = false;
    const caja = $('#qrResultado');
    caja.hidden = false;
    caja.textContent = 'Buscando en la lista…';

    const pase = leerPase(contenido);
    if (!pase) {
      caja.textContent = '';
      caja.appendChild(avisoQr('qr-mal', 'Este código no es un pase de la fiesta'));
      return;
    }
    if (pase.sinNombre) {
      caja.textContent = '';
      caja.appendChild(avisoQr('qr-alerta', 'Este pase no trae el nombre', 'Pregúntale su nombre y búscalo en la lista.'));
      return;
    }

    /* Con los datos más recientes: pudo anotarse hace un momento. */
    try { await cargar(); } catch (e) { showToast('Sin conexión: se usa la última lista cargada'); }

    const clave = claveNombre(pase.nombre);
    const f = items.find(x => claveNombre(x.nombre) === clave);
    if (!f) {
      caja.textContent = '';
      caja.appendChild(avisoQr('qr-mal', pase.nombre + ' no está en la lista',
        'Puede que no haya confirmado por WhatsApp o que su nombre se haya corregido. Búscalo a mano.'));
      return;
    }
    pintarInvitadoQr(f.id, pase, true);
  }

  /* ── Modal: editar ──────────────────────────────────────── */
  function abrirModal(f) {
    editando = f;
    $('#editNombre').value = f.nombre;
    $('#editAcompanante').value = f.acompanante;
    $('#modal').hidden = false;
    $('#editNombre').focus();
  }

  function cerrarModal() {
    editando = null;
    $('#modal').hidden = true;
    $('#formEditar').reset();
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    if (!editando) return;
    const nombre = $('#editNombre').value.trim();
    const acompanante = $('#editAcompanante').value.trim();
    if (!nombre) {
      showToast('El nombre no puede quedar vacío');
      return;
    }
    const btn = $('#btnGuardar');
    btn.disabled = true;
    try {
      const patch = { nombre, acompanante: acompanante || null };
      if (!acompanante) patch.confirmado_acompanante = false;
      const { error } = await cliente().from('confirmaciones').update(patch).eq('id', editando.id);
      if (error) throw error;
      cerrarModal();
      await cargar();
      ultimoCambio = Date.now();
      marcarEnVivo(true);
      showToast('✦ Datos actualizados');
    } catch (err) {
      showToast(err.message || 'No se pudo guardar');
    }
    btn.disabled = false;
  }

  async function eliminar(f) {
    const quien = f.acompanante ? f.nombre + ' y ' + f.acompanante : f.nombre;
    if (!confirm('¿Eliminar a ' + quien + ' de la lista? No se puede deshacer.')) return;
    try {
      const { error } = await cliente().from('confirmaciones').delete().eq('id', f.id);
      if (error) throw error;
      await cargar();
      ultimoCambio = Date.now();
      marcarEnVivo(true);
      showToast('🗑️ Registro eliminado');
    } catch (e) {
      showToast(e.message || 'No se pudo eliminar');
    }
  }

  /* ── CSV (se arma en el navegador) ──────────────────────── */
  function descargarCsv() {
    if (!items.length) {
      showToast('Aún no hay invitados anotados para descargar');
      return;
    }
    const filas = [[
      '#', 'Invitado', 'Acompañante', 'Personas',
      'Invitado confirmado', 'Acompañante confirmado', 'Fecha de anotación'
    ]];
    items.forEach(f => filas.push([
      f.id, f.nombre, f.acompanante, f.personas,
      f.confirmadoInvitado ? 'sí' : 'no',
      f.confirmadoAcompanante ? 'sí' : 'no',
      f.fecha
    ]));
    const csv = filas
      .map(f => f.map(c => '"' + String(c === null || c === undefined ? '' : c).replace(/"/g, '""') + '"').join(';'))
      .join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'invitados-xv.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ── Exportar en PDF ────────────────────────────────────── */
  const PDF_LIBS = [
    'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
    'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js'
  ];

  /* Se cargan al pulsar el botón: pesan mucho para abrirlas siempre. */
  function cargarScript(src) {
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = () => mal(new Error('No se pudo cargar ' + src));
      document.head.appendChild(s);
    });
  }

  /* La letra del PDF solo tiene caracteres latinos: un emoji en un nombre
     saldría como símbolos raros. */
  function textoPdf(texto) {
    return String(texto || '').replace(/[^ -ÿ]/g, '').replace(/\s+/g, ' ').trim();
  }

  function estadoPdf(f) {
    if (confirmadosDe(f) === f.personas) return 'Confirmado';
    if (f.confirmadoInvitado) return 'Falta acompañante';
    if (f.confirmadoAcompanante) return 'Falta invitado';
    return 'Pendiente';
  }

  function generarPdf() {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    const margen = 14;
    const FUCSIA = [194, 24, 91];
    const OSCURO = [63, 10, 39];
    const VERDE = [20, 107, 57];

    const lista = items.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const personas = lista.reduce((n, f) => n + f.personas, 0);
    const confirmados = lista.reduce((n, f) => n + confirmadosDe(f), 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...FUCSIA);
    doc.text('Lista de Invitados', ancho / 2, 18, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...OSCURO);
    doc.text('XV Años de Grecia Peña · Noche de Máscaras', ancho / 2, 25, { align: 'center' });
    doc.text('Viernes 27 de noviembre de 2026 · 6:30 p.m.', ancho / 2, 30.5, { align: 'center' });
    doc.setDrawColor(...FUCSIA);
    doc.setLineWidth(0.5);
    doc.line(margen, 34.5, ancho - margen, 34.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(
      'Registros: ' + lista.length + '     Personas: ' + personas +
      '     Confirmadas: ' + confirmados + '     Pendientes: ' + (personas - confirmados),
      ancho / 2, 41, { align: 'center' }
    );

    doc.autoTable({
      startY: 46,
      margin: { left: margen, right: margen, bottom: 16 },
      head: [['N.º', 'Invitado', 'Acompañante', 'Personas', 'Estado', 'Anotado']],
      body: lista.map((f, i) => [
        i + 1,
        textoPdf(f.nombre),
        textoPdf(f.acompanante) || '—',
        f.personas,
        estadoPdf(f),
        textoPdf(fechaBonita(f.fecha))
      ]),
      foot: [['', 'Total', '', personas, confirmados + ' de ' + personas, '']],
      showFoot: 'lastPage', rowPageBreak: 'avoid',
      styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 2.2, valign: 'middle', textColor: OSCURO, lineColor: [234, 184, 196], lineWidth: 0.2 },
      headStyles: { fillColor: FUCSIA, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [242, 196, 206], textColor: OSCURO, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 245, 249] },
      columnStyles: {
        0: { cellWidth: 11, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 36, fontSize: 9 },
        5: { cellWidth: 39, fontSize: 8.5 }
      },
      didParseCell(celda) {
        if (celda.section === 'body' && celda.column.index === 4) {
          celda.cell.styles.fontStyle = 'bold';
          celda.cell.styles.textColor = celda.cell.raw === 'Confirmado' ? VERDE : celda.cell.raw === 'Pendiente' ? OSCURO : [138, 83, 0];
        }
      }
    });

    const hoy = new Date();
    const generado = 'Generado el ' + textoPdf(fechaBonita(hoy.toISOString()));
    const paginas = doc.internal.getNumberOfPages();
    for (let p = 1; p <= paginas; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...OSCURO);
      doc.text(generado, margen, alto - 8);
      doc.text('Página ' + p + ' de ' + paginas, ancho - margen, alto - 8, { align: 'right' });
    }

    const pad = n => String(n).padStart(2, '0');
    doc.save('lista-invitados-xv-grecia-' + hoy.getFullYear() + '-' + pad(hoy.getMonth() + 1) + '-' + pad(hoy.getDate()) + '.pdf');
  }

  async function descargarPdf() {
    const btn = $('#btnPdf');
    btn.disabled = true;
    try {
      /* Con los datos más recientes, si hay conexión. */
      try { await cargar(); } catch (e) { showToast('Sin conexión: se usa la última lista cargada'); }
      if (!items.length) {
        showToast('Aún no hay invitados anotados para descargar');
        return;
      }
      for (const src of PDF_LIBS) {
        await cargarScript(src);
      }
      generarPdf();
    } catch (e) {
      showToast('No se pudo crear el PDF. Revisa la conexión e inténtalo otra vez.');
    } finally {
      btn.disabled = false;
    }
  }

  /* ── Init ───────────────────────────────────────────────── */
  async function init() {
    crearFondo();

    $('#buscar').addEventListener('input', pintar);
    $('#orden').addEventListener('change', pintar);

    $('#btnCsv').addEventListener('click', descargarCsv);
    $('#btnPdf').addEventListener('click', descargarPdf);

    $('#btnEscanear').addEventListener('click', abrirEscaner);
    $('#btnQrCerrar').addEventListener('click', cerrarEscaner);
    $('#btnQrOtro').addEventListener('click', iniciarEscaneo);
    $('#modalQr').addEventListener('click', e => {
      if (e.target === $('#modalQr')) cerrarEscaner();
    });
    window.addEventListener('pagehide', detenerCamara);

    $('#btnCancelar').addEventListener('click', cerrarModal);
    $('#modal').addEventListener('click', e => {
      if (e.target === $('#modal')) cerrarModal();
    });
    $('#formEditar').addEventListener('submit', guardarEdicion);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !$('#modal').hidden) cerrarModal();
      if (e.key === 'Escape' && !$('#modalQr').hidden) cerrarEscaner();
    });

    if (!window.supabase) {
      showToast('No se pudo cargar Supabase. Revisa la conexión a internet.');
      return;
    }
    if (!configurado()) {
      showToast('Falta configurar config.js con los datos de tu proyecto Supabase.');
      return;
    }

    const sesion = await cliente().auth.getSession();
    if (!(sesion.data && sesion.data.session)) {
      location.href = 'login.html';
      return;
    }

    cliente().auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') location.href = 'login.html';
    });

    $('#btnSalir').addEventListener('click', async () => {
      try { await cliente().auth.signOut(); } catch (e) { /* igual sale */ }
      location.href = 'login.html';
    });

    await recargarEnVivo();
    conectarEnVivo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
