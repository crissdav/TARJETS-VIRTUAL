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

  /* Nombre de una persona + su botón de confirmar/desconfirmar. */
  /* Botón de confirmar / desconfirmar de UNA persona. */
  function botonCheck(nombre, confirmado, alCambiar) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-check' + (confirmado ? ' btn-uncheck' : '');
    btn.textContent = confirmado ? '✕ Desconfirmar' : '✓ Confirmar';
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
    num.textContent = f.id;
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
      tdAcomp.className = 'col-acomp';
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
    if (cuantas === f.personas) marca.textContent = '✓ ' + f.personas + '/' + f.personas;
    else if (cuantas) marca.textContent = '✓ ' + cuantas + '/' + f.personas;
    else marca.textContent = f.personas === 1 ? '— pendiente' : '— ' + f.personas + ' pendientes';
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
    btnTodos.textContent = todoListo ? '✕ Desconfirmar todos' : '✓ Confirmar todos';
    btnTodos.title = (todoListo ? 'Quitar la marca de confirmada a ' : 'Marcar como confirmados a ') + quienes;
    btnTodos.addEventListener('click', () => cambiarEstado(f, { invitado: !todoListo, acompanante: !todoListo }));

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn btn-sm';
    btnEdit.type = 'button';
    btnEdit.textContent = '✎ Editar';
    btnEdit.title = 'Corregir los datos de ' + f.nombre;
    btnEdit.addEventListener('click', () => abrirModal(f));

    const btnDel = document.createElement('button');
    btnDel.className = 'btn btn-sm btn-red';
    btnDel.type = 'button';
    btnDel.textContent = '🗑 Eliminar';
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

  /* ── Init ───────────────────────────────────────────────── */
  async function init() {
    crearFondo();

    $('#buscar').addEventListener('input', pintar);
    $('#orden').addEventListener('change', pintar);

    $('#btnCsv').addEventListener('click', descargarCsv);

    $('#btnCancelar').addEventListener('click', cerrarModal);
    $('#modal').addEventListener('click', e => {
      if (e.target === $('#modal')) cerrarModal();
    });
    $('#formEditar').addEventListener('submit', guardarEdicion);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !$('#modal').hidden) cerrarModal();
    });

    if (!window.supabase) {
      showToast('No se pudo cargar Supabase. Revisa la conexión a internet.');
      return;
    }
    if (!configurar()) {
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
