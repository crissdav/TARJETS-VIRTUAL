(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const CFG = window.BODA_PANEL || {};
  const TABLA = 'boda_invitados';

  let db = null;
  let items = [];
  let editando = null;        // registro en edición (null = nuevo)
  let ultimaCarga = 0;
  let vista = 'invitados';    // 'invitados' (asisten + sin responder) | 'no' (no asistirán)

  /* ── Utilidades ─────────────────────────────────────────── */
  function el(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined && texto !== null) e.textContent = texto;
    return e;
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 3400);
  }

  const clave = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const soloDigitos = s => String(s || '').replace(/\D/g, '');
  const lugares = n => n === 1 ? '1 lugar' : n + ' lugares';
  const personas = n => n === 1 ? '1 persona' : n + ' personas';
  const acompDe = i => (Array.isArray(i.acompanantes) ? i.acompanantes : []).filter(Boolean);

  function fechaBonita(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function configurado() {
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CFG.SUPABASE_URL || '') &&
      !/TU-PROYECTO/.test(CFG.SUPABASE_URL) && CFG.SUPABASE_ANON_KEY && !/TU-ANON-KEY/.test(CFG.SUPABASE_ANON_KEY);
  }

  function enlace(inv) {
    try {
      if (!CFG.TARJETA_URL || /TU-TARJETA/.test(CFG.TARJETA_URL)) return null;
      const u = new URL(CFG.TARJETA_URL);
      u.searchParams.set('i', inv.codigo);
      return u.toString();
    } catch (e) { return null; }
  }

  /* Iconos SVG en línea (constantes). */
  const ICONOS = {
    wa: 'M4 20l1.3-4A8 8 0 1 1 8 18.7zM9 9.5c0 3 2.5 5.5 5.5 5.5l1.3-1.3-2-1-1 .8a4 4 0 0 1-2.3-2.3l.8-1-1-2z',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    lapiz: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
    basura: 'M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6',
    menos: 'M6 12h12',
    mas: 'M12 6v12M6 12h12',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    volver: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3'
  };
  function boton(clase, icono, texto, titulo, alClic) {
    const b = el('button', 'btn ' + clase);
    b.type = 'button';
    if (icono) {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('class', 'ico');
      svg.setAttribute('aria-hidden', 'true');
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', ICONOS[icono]);
      svg.appendChild(p);
      b.appendChild(svg);
    }
    if (texto) b.appendChild(document.createTextNode(texto));
    if (titulo) { b.title = titulo; b.setAttribute('aria-label', titulo); }
    b.addEventListener('click', alClic);
    return b;
  }

  /* ── Datos ──────────────────────────────────────────────── */
  async function cargar() {
    const { data, error } = await db.from(TABLA).select('*').order('id');
    if (error) throw error;
    items = data || [];
    ultimaCarga = Date.now();
    pintar();
  }

  async function recargar() {
    try {
      await cargar();
      marcarVivo(true);
    } catch (e) {
      marcarVivo(false);
    }
  }

  function marcarVivo(ok) {
    const v = $('#vivo');
    if (!ok) { v.textContent = 'Reconectando…'; v.classList.add('off'); return; }
    v.classList.remove('off');
    const s = Math.round((Date.now() - ultimaCarga) / 1000);
    v.textContent = 'En vivo · ' + (s < 60 ? 'hace ' + s + ' s' : 'hace ' + Math.floor(s / 60) + ' min');
  }

  async function actualizar(id, cambios, aviso) {
    const { error } = await db.from(TABLA).update(cambios).eq('id', id);
    if (error) { toast(error.message || 'No se pudo guardar'); return false; }
    await recargar();
    if (aviso) toast(aviso);
    return true;
  }

  /* ── Pintar ─────────────────────────────────────────────── */
  function pintarStats() {
    const asisten = items.filter(i => i.estado === 'asiste');
    $('#sInvitaciones').textContent = items.length;
    $('#sPases').textContent = items.reduce((n, i) => n + i.pases, 0);
    $('#sAsisten').textContent = asisten.reduce((n, i) => n + i.asistentes, 0);
    $('#sNoAsisten').textContent = items.filter(i => i.estado === 'no_asiste').reduce((n, i) => n + i.pases, 0);
    $('#sPendientes').textContent = items.filter(i => i.estado === 'pendiente').reduce((n, i) => n + i.pases, 0);
    $('#sIngresaron').textContent = items.reduce((n, i) => n + i.ingresaron, 0);
    $('#sAsisten').parentNode.title = asisten.length + ' invitaciones confirmadas';
  }

  function filtrados() {
    const q = clave($('#buscar').value);
    const f = $('#filtro').value;
    const o = $('#orden').value;
    let lista = items.filter(i => (vista === 'no') === (i.estado === 'no_asiste'));
    lista = lista.filter(i => !q ||
      clave(i.nombre).includes(q) || acompDe(i).some(a => clave(a).includes(q)) ||
      soloDigitos(i.telefono).includes(soloDigitos(q) || '§') || clave(i.mensaje).includes(q));
    if (vista === 'invitados') {
      if (['pendiente', 'asiste'].includes(f)) lista = lista.filter(i => i.estado === f);
      if (f === 'tarjeta') lista = lista.filter(i => i.origen === 'tarjeta');
      if (f === 'sin-enviar') lista = lista.filter(i => !soloDigitos(i.telefono));
      if (f === 'ingresaron') lista = lista.filter(i => i.ingresaron > 0);
    }
    const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
    lista.sort((a, b) => {
      if (o === 'reciente') return (b.respondido || '').localeCompare(a.respondido || '') || porNombre(a, b);
      if (o === 'creado') return a.id - b.id;
      if (o === 'pases') return b.pases - a.pases || porNombre(a, b);
      return porNombre(a, b);
    });
    return lista;
  }

  function pintar() {
    pintarStats();
    const lista = filtrados();
    const enVista = items.filter(i => (vista === 'no') === (i.estado === 'no_asiste')).length;
    $('#nInvitados').textContent = items.filter(i => i.estado !== 'no_asiste').length;
    $('#nNo').textContent = items.filter(i => i.estado === 'no_asiste').length;
    const cont = $('#lista');
    cont.textContent = '';
    lista.forEach(i => cont.appendChild(tarjeta(i)));

    $('#contador').textContent = enVista && lista.length !== enVista ? 'Mostrando ' + lista.length + ' de ' + enVista : '';
    const vacio = !lista.length;
    $('#vacio').hidden = !vacio;
    if (vacio) {
      if (enVista) {
        $('#vacioTitulo').textContent = 'Sin coincidencias';
        $('#vacioTexto').textContent = 'Ningún invitado coincide con la búsqueda o el filtro.';
      } else if (vista === 'no') {
        $('#vacioTitulo').textContent = 'Nadie ha dicho que no';
        $('#vacioTexto').textContent = 'Quienes marquen «No podré asistir» en la tarjeta aparecerán aquí.';
      } else {
        $('#vacioTitulo').textContent = 'Aún no hay invitados';
        $('#vacioTexto').textContent = 'Agrega a tus invitados uno por uno o pega la lista completa.';
      }
    }
  }

  function pillEstado(i) {
    if (i.estado === 'asiste') return el('span', 'pill pill-ok', 'Asistirán ' + i.asistentes + ' de ' + i.pases);
    if (i.estado === 'no_asiste') return el('span', 'pill pill-no', 'No asistirán');
    return el('span', 'pill pill-pend', 'Sin responder');
  }

  function tarjeta(i) {
    const art = el('article', 'inv inv-' + i.estado);

    const cab = el('div', 'inv-cab');
    const izq = el('div');
    izq.appendChild(el('h3', 'inv-nombre', i.nombre));
    const meta = [lugares(i.pases)];
    if (i.telefono) meta.push('☎ ' + i.telefono);
    if (i.origen === 'tarjeta') meta.push('se anotó desde la tarjeta');
    if (i.respondido) meta.push('respondió ' + fechaBonita(i.respondido));
    izq.appendChild(el('p', 'inv-meta', meta.join(' · ')));
    cab.appendChild(izq);
    cab.appendChild(pillEstado(i));
    art.appendChild(cab);

    const acomp = acompDe(i);
    if (acomp.length) {
      const pa = el('p', 'inv-acomp');
      pa.appendChild(el('b', '', 'Acompañantes: '));
      pa.appendChild(document.createTextNode(acomp.join(', ')));
      art.appendChild(pa);
    }

    if (i.mensaje) art.appendChild(el('p', 'inv-msg', '“' + i.mensaje + '”'));

    if (i.estado === 'no_asiste') {
      const acc = el('div', 'inv-acciones inv-acciones-no');
      acc.appendChild(boton('btn-sm btn-borde', 'volver', 'Volver a la lista', 'Pasar a ' + i.nombre + ' a la lista de invitados como «sin responder»', () => volverALista(i)));
      acc.appendChild(boton('btn-sm btn-borde', 'lapiz', 'Editar', 'Editar a ' + i.nombre, () => abrirEditar(i)));
      acc.appendChild(boton('btn-sm btn-rojo', 'basura', 'Eliminar', 'Eliminar a ' + i.nombre, () => eliminar(i)));
      art.appendChild(acc);
      return art;
    }

    if (i.estado === 'asiste' || i.ingresaron > 0) {
      const ing = el('div', 'inv-ingreso');
      ing.appendChild(el('span', '', 'Ingreso'));
      const tope = Math.max(i.asistentes, i.pases);
      const menos = boton('btn-icono', 'menos', '', 'Restar un ingreso', () => actualizar(i.id, { ingresaron: Math.max(0, i.ingresaron - 1) }));
      menos.disabled = i.ingresaron <= 0;
      const mas = boton('btn-icono', 'mas', '', 'Sumar un ingreso', () => actualizar(i.id, { ingresaron: Math.min(tope, i.ingresaron + 1) }));
      mas.disabled = i.ingresaron >= tope;
      ing.appendChild(menos);
      ing.appendChild(el('b', i.ingresaron >= i.asistentes && i.asistentes ? 'completo' : '', i.ingresaron + ' / ' + (i.asistentes || i.pases)));
      ing.appendChild(mas);
      art.appendChild(ing);
    }

    /* Antes de que responda: enviarle la invitación (línea discreta). */
    if (i.estado === 'pendiente') {
      const inv = el('div', 'inv-invitar');
      inv.appendChild(el('span', '', 'Invitación:'));
      inv.appendChild(boton('btn-texto btn-texto-wa', 'wa', 'Enviar por WhatsApp', 'Enviar la invitación a ' + i.nombre + ' por WhatsApp', () => enviarWhatsapp(i)));
      inv.appendChild(boton('btn-texto', 'link', 'Copiar enlace', 'Copiar el enlace personal de ' + i.nombre, () => copiarEnlace(i)));
      art.appendChild(inv);
    }

    const acc = el('div', 'inv-acciones');
    acc.appendChild(botonConfirmar(i));
    acc.appendChild(boton('btn-sm btn-editar', 'lapiz', 'Editar', 'Editar a ' + i.nombre, () => abrirEditar(i)));
    acc.appendChild(boton('btn-sm btn-rojo', 'basura', 'Eliminar', 'Eliminar a ' + i.nombre, () => eliminar(i)));
    art.appendChild(acc);
    return art;
  }

  /* Confirmar: sin responder → confirma su asistencia;
     asistirá → registra su ingreso; ya ingresó → permite deshacerlo. */
  function botonConfirmar(i) {
    const esperados = i.asistentes || i.pases;
    if (i.estado === 'pendiente') {
      return boton('btn-sm btn-confirmar', 'check', 'Confirmar asistencia',
        'Marcar que ' + i.nombre + ' asistirá (' + personas(i.pases) + ')',
        () => confirmarAsistencia(i));
    }
    if (i.ingresaron >= esperados) {
      return boton('btn-sm btn-confirmado', 'check', 'Ingresó',
        'Ya ingresaron (' + i.ingresaron + ' de ' + esperados + '). Toca para deshacer.',
        () => {
          if (confirm('¿Quitar el ingreso registrado de «' + i.nombre + '»?')) {
            actualizar(i.id, { ingresaron: 0 }, 'Ingreso de ' + i.nombre + ' quitado');
          }
        });
    }
    return boton('btn-sm btn-confirmar', 'check', 'Confirmar ingreso',
      'Registrar que ingresaron ' + personas(esperados) + ' de ' + i.nombre,
      () => actualizar(i.id, { ingresaron: esperados }, i.nombre + ': ingreso confirmado'));
  }

  function confirmarAsistencia(i) {
    if (!confirm('¿Confirmar que «' + i.nombre + '» asistirá con ' + personas(i.pases) + '?')) return;
    actualizar(i.id, { estado: 'asiste', asistentes: i.pases, respondido: new Date().toISOString() },
      i.nombre + ': asistencia confirmada');
  }

  /* ── Enviar / copiar ────────────────────────────────────── */
  function textoInvitacion(i, url) {
    return (CFG.MENSAJE || '{enlace}')
      .replace(/\{nombre\}/g, i.nombre)
      .replace(/\{pases\}/g, lugares(i.pases))
      .replace(/\{enlace\}/g, url);
  }

  function enviarWhatsapp(i) {
    const url = enlace(i);
    if (!url) { toast('Falta poner TARJETA_URL en config.js'); return; }
    const tel = soloDigitos(i.telefono);
    const wa = 'https://wa.me/' + tel + '?text=' + encodeURIComponent(textoInvitacion(i, url));
    window.open(wa, '_blank', 'noopener');
  }

  function copiarEnlace(i) {
    const url = enlace(i);
    if (!url) { toast('Falta poner TARJETA_URL en config.js'); return; }
    const ok = () => toast('Enlace de ' + i.nombre + ' copiado');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(ok, () => prompt('Copia el enlace:', url));
    } else {
      prompt('Copia el enlace:', url);
    }
  }

  /* ── Modales ────────────────────────────────────────────── */
  function abrir(id) { $(id).hidden = false; }
  function cerrar(modal) {
    modal.hidden = true;
    if (modal.id === 'mQr') detenerCamara();
  }

  function abrirEditar(i) {
    editando = i || null;
    $('#mEditarTitulo').textContent = i ? 'Editar invitado' : 'Agregar invitado';
    $('#eNombre').value = i ? i.nombre : '';
    $('#ePases').value = i ? i.pases : 1;
    $('#eTelefono').value = i ? (i.telefono || '') : '';
    $('#eEstado').value = i ? i.estado : 'pendiente';
    $('#eAsistentes').value = i ? i.asistentes : 0;
    $('#eAcomp').value = i ? acompDe(i).join('\n') : '';
    $('#eRespuesta').hidden = !i;
    abrir('#mEditar');
    $('#eNombre').focus();
  }

  async function guardarEditar(e) {
    e.preventDefault();
    const nombre = $('#eNombre').value.trim().replace(/\s+/g, ' ');
    const pases = Math.min(30, Math.max(1, parseInt($('#ePases').value, 10) || 1));
    const telefono = $('#eTelefono').value.trim() || null;
    const acompanantes = $('#eAcomp').value.split(/\r?\n/).map(x => x.trim().replace(/\s+/g, ' ').slice(0, 80)).filter(Boolean);
    if (!nombre) { toast('Escribe el nombre'); return; }

    if (!editando && items.some(x => clave(x.nombre) === clave(nombre)) &&
        !confirm('Ya hay un invitado llamado «' + nombre + '». ¿Agregarlo de todos modos?')) return;

    const btn = $('#btnGuardar');
    btn.disabled = true;
    let ok;
    if (editando) {
      const estado = $('#eEstado').value;
      let asistentes = Math.max(0, parseInt($('#eAsistentes').value, 10) || 0);
      if (estado === 'asiste') asistentes = Math.min(pases, Math.max(1, asistentes || pases));
      else asistentes = 0;
      const cambios = { nombre, pases, telefono, estado, asistentes,
        acompanantes: estado === 'asiste' ? acompanantes.slice(0, Math.max(0, asistentes - 1)) : [] };
      if (estado !== editando.estado) cambios.respondido = estado === 'pendiente' ? null : new Date().toISOString();
      ok = await actualizar(editando.id, cambios, 'Cambios guardados');
    } else {
      const { error } = await db.from(TABLA).insert({ nombre, pases, telefono, acompanantes: acompanantes.slice(0, pases - 1) });
      ok = !error;
      if (error) toast(error.message || 'No se pudo agregar');
      else { await recargar(); toast(nombre + ' agregado'); }
    }
    btn.disabled = false;
    if (ok) cerrar($('#mEditar'));
  }

  async function volverALista(i) {
    if (!confirm('¿Pasar a «' + i.nombre + '» a la lista de invitados como «sin responder»?')) return;
    await actualizar(i.id, { estado: 'pendiente', asistentes: 0, acompanantes: [], respondido: null }, i.nombre + ' volvió a la lista');
  }

  function cambiarVista(v) {
    vista = v;
    document.querySelectorAll('.pestana').forEach(b => {
      const activa = b.dataset.vista === v;
      b.classList.toggle('activa', activa);
      b.setAttribute('aria-selected', activa ? 'true' : 'false');
    });
    $('#filtro').hidden = v === 'no';
    $('#vistaNota').textContent = v === 'no'
      ? 'Quienes respondieron «No podré asistir». No cuentan en la lista de asistentes; si cambian de opinión, usa «Volver a la lista».'
      : 'Lista para confirmar a los asistentes: quienes ya respondieron que sí y quienes aún no responden.';
    pintar();
  }

  async function eliminar(i) {
    if (!confirm('¿Eliminar a «' + i.nombre + '» de la lista? Su enlace dejará de funcionar.')) return;
    const { error } = await db.from(TABLA).delete().eq('id', i.id);
    if (error) { toast(error.message || 'No se pudo eliminar'); return; }
    await recargar();
    toast(i.nombre + ' eliminado');
  }

  /* ── Pegar lista ────────────────────────────────────────── */
  function leerLista(texto) {
    const existentes = new Set(items.map(i => clave(i.nombre)));
    const vistos = new Set();
    const nuevos = [];
    let repetidos = 0;
    texto.split(/\r?\n/).forEach(linea => {
      if (!linea.trim()) return;
      let partes = linea.split(/\t|;/).map(s => s.trim());
      if (partes.length === 1) {
        const m = linea.match(/^(.*?),\s*(\d{1,2})\s*(?:,\s*([+\d\s-]{6,}))?\s*$/);
        if (m) partes = [m[1], m[2], m[3] || ''];
      }
      const nombre = (partes[0] || '').replace(/\s+/g, ' ').slice(0, 80);
      if (!nombre) return;
      const k = clave(nombre);
      if (existentes.has(k) || vistos.has(k)) { repetidos++; return; }
      vistos.add(k);
      const pases = Math.min(30, Math.max(1, parseInt(partes[1], 10) || 1));
      const telefono = (partes[2] || '').trim() || null;
      nuevos.push({ nombre, pases, telefono });
    });
    return { nuevos, repetidos };
  }

  function vistaImportar() {
    const { nuevos, repetidos } = leerLista($('#iTexto').value);
    const pases = nuevos.reduce((n, x) => n + x.pases, 0);
    $('#iVista').textContent = nuevos.length
      ? nuevos.length + ' invitados nuevos · ' + pases + ' pases' + (repetidos ? ' · ' + repetidos + ' repetidos (se omiten)' : '')
      : (repetidos ? 'Todos ya están en la lista.' : '');
  }

  async function importar(e) {
    e.preventDefault();
    const { nuevos } = leerLista($('#iTexto').value);
    if (!nuevos.length) { toast('No hay invitados nuevos para agregar'); return; }
    const btn = $('#btnImportarOk');
    btn.disabled = true;
    const { error } = await db.from(TABLA).insert(nuevos);
    btn.disabled = false;
    if (error) { toast(error.message || 'No se pudo agregar la lista'); return; }
    $('#iTexto').value = '';
    $('#iVista').textContent = '';
    cerrar($('#mImportar'));
    await recargar();
    toast(nuevos.length + ' invitados agregados');
  }

  /* ── Escáner del pase ───────────────────────────────────── */
  let camara = null;
  let escaneando = false;
  let lienzo = null;

  function codigoDe(contenido) {
    try {
      const u = new URL(contenido);
      const c = u.searchParams.get('i');
      if (c) return c.toLowerCase().replace(/[^a-z0-9]/g, '');
    } catch (e) { /* no es URL */ }
    const t = String(contenido || '').trim().toLowerCase();
    return /^[a-z0-9]{6,20}$/.test(t) ? t : null;
  }

  function detenerCamara() {
    escaneando = false;
    if (camara) camara.getTracks().forEach(t => t.stop());
    camara = null;
    $('#video').srcObject = null;
  }

  function buscarQr() {
    if (!escaneando) return;
    const v = $('#video');
    if (v.readyState >= 2 && v.videoWidth) {
      const k = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
      const w = Math.round(v.videoWidth * k);
      const h = Math.round(v.videoHeight * k);
      lienzo = lienzo || document.createElement('canvas');
      lienzo.width = w;
      lienzo.height = h;
      const ctx = lienzo.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(v, 0, 0, w, h);
      const r = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
      if (r && r.data) {
        detenerCamara();
        if (navigator.vibrate) navigator.vibrate(80);
        procesarPase(r.data);
        return;
      }
    }
    setTimeout(buscarQr, 150);
  }

  async function iniciarEscaneo() {
    const res = $('#qrResultado');
    res.hidden = true;
    res.textContent = '';
    $('#btnQrOtro').hidden = true;
    $('#visor').hidden = false;
    const ayuda = $('#qrAyuda');
    ayuda.hidden = false;
    ayuda.textContent = 'Abriendo la cámara…';

    if (!window.jsQR) { ayuda.textContent = 'No se pudo cargar el lector. Recarga la página.'; return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      ayuda.textContent = 'Este navegador no permite usar la cámara. Busca al invitado por su nombre.';
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if ($('#mQr').hidden) { stream.getTracks().forEach(t => t.stop()); return; }
      camara = stream;
      const v = $('#video');
      v.srcObject = stream;
      await v.play();
      ayuda.textContent = 'Apunta al código QR del pase.';
      escaneando = true;
      buscarQr();
    } catch (e) {
      detenerCamara();
      ayuda.textContent = e && e.name === 'NotAllowedError'
        ? 'Falta el permiso de la cámara. Actívalo en el navegador y vuelve a intentar.'
        : 'No se pudo abrir la cámara. Busca al invitado por su nombre.';
    }
  }

  function aviso(clase, titulo, detalle) {
    const c = el('div', 'aviso ' + clase);
    c.appendChild(el('strong', '', titulo));
    if (detalle) c.appendChild(el('span', '', detalle));
    return c;
  }

  async function procesarPase(contenido) {
    $('#visor').hidden = true;
    $('#qrAyuda').hidden = true;
    $('#btnQrOtro').hidden = false;
    const res = $('#qrResultado');
    res.hidden = false;
    res.textContent = 'Buscando en la lista…';

    const codigo = codigoDe(contenido);
    if (!codigo) { res.textContent = ''; res.appendChild(aviso('mal', 'Este código no es un pase de la boda')); return; }
    try { await cargar(); } catch (e) { toast('Sin conexión: se usa la última lista cargada'); }
    pintarPase(codigo, true);
  }

  function pintarPase(codigo, recien) {
    const res = $('#qrResultado');
    res.textContent = '';
    const i = items.find(x => x.codigo === codigo);
    if (!i) { res.appendChild(aviso('mal', 'Pase no encontrado', 'Puede que lo hayan eliminado de la lista.')); return; }

    const esperados = i.estado === 'asiste' ? i.asistentes : i.pases;
    const ficha = el('div', 'qr-ficha');
    ficha.appendChild(el('h3', '', i.nombre));
    ficha.appendChild(pillEstado(i));
    ficha.appendChild(el('p', 'qr-cifra', 'Ingresaron ' + i.ingresaron + ' de ' + esperados));
    if (acompDe(i).length) ficha.appendChild(el('p', 'qr-acomp', 'Con: ' + acompDe(i).join(', ')));
    res.appendChild(ficha);

    if (i.estado !== 'asiste') {
      res.appendChild(aviso('alerta', i.estado === 'no_asiste' ? 'Dijo que no asistiría' : 'No confirmó su asistencia',
        'Tiene ' + lugares(i.pases) + ' en la invitación.'));
    } else if (i.ingresaron >= esperados && recien) {
      res.appendChild(aviso('alerta', 'Este pase ya se usó por completo', 'Revisa que no lo estén usando dos veces.'));
    } else if (i.ingresaron >= esperados) {
      res.appendChild(aviso('ok', 'Ingreso registrado', 'Ya pueden pasar.'));
    }

    const faltan = Math.max(0, esperados - i.ingresaron);
    if (faltan > 0) {
      const b = boton('btn-verde', 'check', faltan === 1 ? 'Registrar ingreso (1)' : 'Registrar ingreso de ' + faltan, '', async () => {
        const cambios = { ingresaron: esperados };
        if (i.estado !== 'asiste') Object.assign(cambios, { estado: 'asiste', asistentes: i.pases, respondido: new Date().toISOString() });
        if (await actualizar(i.id, cambios)) pintarPase(codigo, false);
      });
      b.classList.add('btn-ancho');
      res.appendChild(b);
    }
    if (i.ingresaron > 0) {
      const ajustar = el('div', 'inv-ingreso');
      ajustar.appendChild(el('span', '', 'Ajustar'));
      ajustar.appendChild(boton('btn-icono', 'menos', '', 'Restar uno', async () => {
        if (await actualizar(i.id, { ingresaron: i.ingresaron - 1 })) pintarPase(codigo, false);
      }));
      ajustar.appendChild(el('b', '', String(i.ingresaron)));
      const mas = boton('btn-icono', 'mas', '', 'Sumar uno', async () => {
        if (await actualizar(i.id, { ingresaron: i.ingresaron + 1 })) pintarPase(codigo, false);
      });
      mas.disabled = i.ingresaron >= Math.max(i.pases, i.asistentes);
      ajustar.appendChild(mas);
      res.appendChild(ajustar);
    }
  }

  /* ── CSV ────────────────────────────────────────────────── */
  const textoEstado = i => i.estado === 'asiste' ? 'Asistirá' : i.estado === 'no_asiste' ? 'No asistirá' : 'Sin responder';

  function descargar(blob, nombre) {
    const a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function hoy() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function descargarCsv() {
    if (!items.length) { toast('Aún no hay invitados'); return; }
    const filas = [['Invitado', 'Acompañantes', 'Pases', 'Respuesta', 'Asistirán', 'Ingresaron', 'Teléfono', 'Mensaje', 'Origen', 'Respondió', 'Enlace']];
    items.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).forEach(i => filas.push([
      i.nombre, acompDe(i).join(', '), i.pases, textoEstado(i), i.asistentes, i.ingresaron, i.telefono || '', i.mensaje || '',
      i.origen === 'tarjeta' ? 'Tarjeta' : 'Lista', fechaBonita(i.respondido), enlace(i) || ''
    ]));
    const csv = filas.map(f => f.map(c => '"' + String(c === null || c === undefined ? '' : c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    descargar(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), 'invitados-boda-' + hoy() + '.csv');
  }

  /* ── PDF ────────────────────────────────────────────────── */
  const PDF_LIBS = [
    'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
    'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js'
  ];
  function cargarScript(src) {
    return new Promise((ok, mal) => {
      if (document.querySelector('script[src="' + src + '"]')) { ok(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = () => mal(new Error(src));
      document.head.appendChild(s);
    });
  }
  /* La letra del PDF solo tiene caracteres latinos. */
  const textoPdf = t => String(t || '').replace(/[^\x20-\xFF]/g, '').replace(/\s+/g, ' ').trim();

  async function descargarPdf() {
    const btn = $('#btnPdf');
    btn.disabled = true;
    try {
      try { await cargar(); } catch (e) { toast('Sin conexión: se usa la última lista cargada'); }
      if (!items.length) { toast('Aún no hay invitados'); return; }
      for (const s of PDF_LIBS) await cargarScript(s);

      const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const VERDE = [95, 111, 82], OSC = [47, 62, 52], ORO = [184, 151, 90];
      const orden = items.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
      const lista = orden.filter(i => i.estado !== 'no_asiste');
      const noVan = orden.filter(i => i.estado === 'no_asiste');
      const conAcomp = i => textoPdf(i.nombre) + (acompDe(i).length ? '\nCon: ' + textoPdf(acompDe(i).join(', ')) : '');
      const tot = k => lista.reduce((n, i) => n + i[k], 0);
      const asisten = lista.filter(i => i.estado === 'asiste').reduce((n, i) => n + i.asistentes, 0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(...OSC);
      doc.text('Lista de invitados', W / 2, 18, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(textoPdf('Boda de ' + (CFG.NOVIOS || '') + (CFG.FECHA_TEXTO ? ' · ' + CFG.FECHA_TEXTO : '')), W / 2, 25, { align: 'center' });
      doc.setDrawColor(...ORO);
      doc.setLineWidth(0.5);
      doc.line(14, 29, W - 14, 29);
      doc.setFontSize(10);
      doc.text('Invitaciones: ' + lista.length + '    Pases: ' + tot('pases') + '    Asistirán: ' + asisten +
        '    Ingresaron: ' + tot('ingresaron') + '    No asistirán: ' + noVan.length, W / 2, 35, { align: 'center' });

      doc.autoTable({
        startY: 40,
        margin: { left: 14, right: 14, bottom: 16 },
        head: [['N.º', 'Invitado', 'Pases', 'Respuesta', 'Asistirán', 'Ingreso', 'Mesa']],
        body: lista.map((i, n) => [n + 1, conAcomp(i), i.pases, textoEstado(i), i.estado === 'asiste' ? i.asistentes : '—', i.ingresaron || '', '']),
        foot: [['', 'Total', tot('pases'), '', asisten, tot('ingresaron'), '']],
        showFoot: 'lastPage',
        rowPageBreak: 'avoid',
        styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 2.2, textColor: OSC, lineColor: [217, 192, 143], lineWidth: 0.2, valign: 'middle' },
        headStyles: { fillColor: VERDE, textColor: 255 },
        footStyles: { fillColor: [232, 220, 200], textColor: OSC, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 247, 240] },
        columnStyles: { 0: { cellWidth: 11, halign: 'center' }, 2: { cellWidth: 16, halign: 'center' }, 3: { cellWidth: 30 },
          4: { cellWidth: 20, halign: 'center' }, 5: { cellWidth: 18, halign: 'center' }, 6: { cellWidth: 18 } },
        didParseCell(c) {
          if (c.section === 'body' && c.column.index === 3) {
            c.cell.styles.fontStyle = 'bold';
            c.cell.styles.textColor = c.cell.raw === 'Asistirá' ? [20, 107, 57] : c.cell.raw === 'No asistirá' ? [160, 60, 50] : [138, 100, 30];
          }
        }
      });

      if (noVan.length) {
        let y = doc.lastAutoTable.finalY + 14;
        if (y > H - 40) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...OSC);
        doc.text('No asistirán (' + noVan.length + ')', 14, y);
        doc.autoTable({
          startY: y + 4,
          margin: { left: 14, right: 14, bottom: 16 },
          head: [['N.º', 'Invitado', 'Pases', 'Mensaje']],
          body: noVan.map((i, n) => [n + 1, textoPdf(i.nombre), i.pases, textoPdf(i.mensaje) || '—']),
          rowPageBreak: 'avoid',
          styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 2.2, textColor: OSC, lineColor: [217, 192, 143], lineWidth: 0.2, valign: 'middle' },
          headStyles: { fillColor: [160, 60, 50], textColor: 255 },
          alternateRowStyles: { fillColor: [250, 247, 240] },
          columnStyles: { 0: { cellWidth: 11, halign: 'center' }, 1: { cellWidth: 60 }, 2: { cellWidth: 16, halign: 'center' } }
        });
      }

      const pags = doc.internal.getNumberOfPages();
      for (let p = 1; p <= pags; p++) {
        doc.setPage(p);
        doc.setFontSize(8.5);
        doc.setTextColor(...OSC);
        doc.text('Generado el ' + textoPdf(new Date().toLocaleString('es-PE')), 14, H - 8);
        doc.text('Página ' + p + ' de ' + pags, W - 14, H - 8, { align: 'right' });
      }
      doc.save('lista-invitados-boda-' + hoy() + '.pdf');
    } catch (e) {
      toast('No se pudo crear el PDF. Revisa la conexión.');
    } finally {
      btn.disabled = false;
    }
  }

  /* ── Inicio ─────────────────────────────────────────────── */
  async function init() {
    if (CFG.NOVIOS) $('#novios').textContent = CFG.NOVIOS;
    if (CFG.FECHA_TEXTO) $('#fecha').textContent = CFG.FECHA_TEXTO;

    $('#buscar').addEventListener('input', pintar);
    $('#filtro').addEventListener('change', pintar);
    $('#orden').addEventListener('change', pintar);
    $('#btnAgregar').addEventListener('click', () => abrirEditar(null));
    document.querySelectorAll('.pestana').forEach(b => b.addEventListener('click', () => cambiarVista(b.dataset.vista)));
    $('#fEditar').addEventListener('submit', guardarEditar);
    $('#eEstado').addEventListener('change', () => {
      const p = parseInt($('#ePases').value, 10) || 1;
      $('#eAsistentes').value = $('#eEstado').value === 'asiste' ? p : 0;
    });
    $('#btnImportar').addEventListener('click', () => { abrir('#mImportar'); $('#iTexto').focus(); });
    $('#iTexto').addEventListener('input', vistaImportar);
    $('#fImportar').addEventListener('submit', importar);
    $('#btnEscanear').addEventListener('click', () => { abrir('#mQr'); iniciarEscaneo(); });
    $('#btnQrOtro').addEventListener('click', iniciarEscaneo);
    $('#btnCsv').addEventListener('click', descargarCsv);
    $('#btnPdf').addEventListener('click', descargarPdf);

    document.querySelectorAll('.modal').forEach(m => {
      m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-cerrar')) cerrar(m); });
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') document.querySelectorAll('.modal:not([hidden])').forEach(cerrar);
    });
    window.addEventListener('pagehide', detenerCamara);

    if (!window.supabase) { toast('No se pudo cargar Supabase. Revisa la conexión.'); return; }
    if (!configurado()) { toast('Falta configurar config.js con los datos de Supabase.'); return; }
    db = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

    const { data } = await db.auth.getSession();
    const meta = data && data.session && data.session.user.app_metadata;
    if (!meta || meta.panel !== 'boda') { location.href = 'login.html'; return; }

    db.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') location.href = 'login.html'; });
    $('#btnSalir').addEventListener('click', async () => {
      try { await db.auth.signOut(); } catch (e) { /* igual sale */ }
      location.href = 'login.html';
    });

    await recargar();
    setInterval(() => { if (!document.hidden && $('#mEditar').hidden) recargar(); }, 15000);
    setInterval(() => { if (ultimaCarga) marcarVivo(Date.now() - ultimaCarga < 45000); }, 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) recargar(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
