(function () {
  'use strict';

  const D = window.BODA || {};
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FECHA = new Date(D.FECHA);
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const pad = n => String(n).padStart(2, '0');
  const mayus = s => s.charAt(0).toUpperCase() + s.slice(1);

  function horaBonita(d) {
    let h = d.getHours();
    const m = d.getMinutes();
    const suf = h < 12 ? 'a. m.' : 'p. m.';
    h = h % 12 || 12;
    return h + ':' + pad(m) + ' ' + suf;
  }

  /* ── Iconos (constantes, seguros para innerHTML) ── */
  const ICONOS = {
    anillos: '<circle cx="9" cy="14.5" r="5"/><circle cx="15" cy="14.5" r="5"/><path d="M10.5 5.5L12 3l1.5 2.5L12 7z"/>',
    copas: '<path d="M5 3h5l-.4 5.2a2.1 2.1 0 0 1-4.2 0zM14 3h5l-.4 5.2a2.1 2.1 0 0 1-4.2 0zM7.5 10.5V19M16.5 10.5V19M5 20.5h5M14 20.5h5"/>',
    cena: '<circle cx="12.5" cy="13" r="6.5"/><circle cx="12.5" cy="13" r="3.4"/><path d="M3 4v4.5a1.5 1.5 0 0 0 3 0V4M4.5 9v11M21.5 4c-2 1.5-2 6 0 7.5V20"/>',
    baile: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    pastel: '<path d="M4 20.5h16M5 20.5v-7h14v7M7.5 13.5v-4h9v4M12 9.5V6.5M12 3.5c-1 1-1 2 0 3 1-1 1-2 0-3zM5 16.5c2 1.3 3.5 1.3 5 0s3-1.3 5 0 3 1.3 4 0"/>',
    luna: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    camara: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
    musica: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    iglesia: '<path d="M12 2v4M10 4h4M6 21V11l6-5 6 5v10M3 21h18M10 21v-4a2 2 0 0 1 4 0v4M4 21v-6h2M20 21v-6h-2"/>'
  };
  function svgIcono(nombre) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONOS[nombre] || ICONOS.baile) + '</svg>';
  }
  function el(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  /* ── Rellenar textos ── */
  function rellenar() {
    const valores = Object.assign({}, D, {
      FECHA_CORTA: pad(FECHA.getDate()) + '.' + pad(FECHA.getMonth() + 1) + '.' + FECHA.getFullYear(),
      FECHA_PUNTOS: pad(FECHA.getDate()) + ' · ' + pad(FECHA.getMonth() + 1) + ' · ' + FECHA.getFullYear(),
      FECHA_LARGA: mayus(DIAS[FECHA.getDay()]) + ' ' + FECHA.getDate() + ' de ' + MESES[FECHA.getMonth()] +
        ' de ' + FECHA.getFullYear() + ' · ' + horaBonita(FECHA)
    });
    $$('[data-b]').forEach(n => {
      const v = valores[n.dataset.b];
      if (typeof v === 'string' && v.trim()) n.textContent = v;
      else n.hidden = true;
    });
    document.title = D.NOVIA + ' & ' + D.NOVIO + ' · Nuestra Boda';
    $('#selloIniciales').textContent = (D.NOVIA || ' ').charAt(0) + (D.NOVIO || ' ').charAt(0);
  }

  /* ── Pétalos ── */
  function crearPetalos() {
    if (reducido) return;
    const cont = $('#petalos');
    const n = isMobile ? 10 : 18;
    for (let i = 0; i < n; i++) {
      const p = el('span', 'petalo' + (i % 3 === 0 ? ' hoja' : ''));
      const s = 0.6 + Math.random() * 0.8;
      p.style.left = Math.random() * 100 + '%';
      p.style.transform = 'scale(' + s + ')';
      p.style.width = 12 * s + 'px';
      p.style.height = 16 * s + 'px';
      p.style.animationDuration = 12 + Math.random() * 14 + 's';
      p.style.animationDelay = -Math.random() * 20 + 's';
      cont.appendChild(p);
    }
  }

  /* ── Cuenta regresiva ── */
  function cuenta() {
    const diff = FECHA - Date.now();
    if (isNaN(diff)) return;
    if (diff <= 0) {
      $('#cuenta').hidden = true;
      $('#cuentaFin').hidden = false;
      return true;
    }
    const s = Math.floor(diff / 1000);
    $('#cDias').textContent = Math.floor(s / 86400);
    $('#cHoras').textContent = pad(Math.floor(s / 3600) % 24);
    $('#cMin').textContent = pad(Math.floor(s / 60) % 60);
    $('#cSeg').textContent = pad(s % 60);
  }
  function iniciarCuenta() {
    if (cuenta()) return;
    const t = setInterval(() => { if (cuenta()) clearInterval(t); }, 1000);
  }

  /* ── Calendario (semana de lunes a domingo) ── */
  function calendario() {
    if (isNaN(FECHA)) return;
    const y = FECHA.getFullYear();
    const m = FECHA.getMonth();
    $('#calMes').textContent = MESES[m] + ' ' + y;
    const grid = $('#calGrid');
    ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach(d => grid.appendChild(el('span', 'dia-sem', d)));
    const vacios = (new Date(y, m, 1).getDay() + 6) % 7;
    for (let i = 0; i < vacios; i++) grid.appendChild(el('span'));
    const total = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= total; d++) {
      grid.appendChild(el('span', d === FECHA.getDate() ? 'marcado' : '', String(d)));
    }

    const utc = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const fin = new Date(FECHA.getTime() + 10 * 3600 * 1000);
    const lugar = [D.CEREMONIA && D.CEREMONIA.LUGAR, D.CEREMONIA && D.CEREMONIA.DIRECCION].filter(Boolean).join(', ');
    $('#btnAgendar').href = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent('Boda de ' + D.NOVIA + ' & ' + D.NOVIO) +
      '&dates=' + utc(FECHA) + '/' + utc(fin) +
      '&location=' + encodeURIComponent(lugar) +
      '&details=' + encodeURIComponent(location.origin + location.pathname);
  }

  /* ── Padres y padrinos ── */
  function padres() {
    let alguno = false;
    [['#padresNovia', D.PADRES_NOVIA], ['#padresNovio', D.PADRES_NOVIO], ['#padrinos', D.PADRINOS]].forEach(([sel, lista]) => {
      const caja = $(sel);
      const nombres = (lista || []).filter(x => x && x.trim());
      if (!nombres.length) { caja.hidden = true; return; }
      alguno = true;
      nombres.forEach(n => caja.appendChild(el('p', '', n)));
    });
    if (!alguno) $('#secPadres').hidden = true;
  }

  /* ── Lugares ── */
  function lugares() {
    const cont = $('#lugares');
    [[D.CEREMONIA, 'iglesia'], [D.RECEPCION, 'copas']].forEach(([l, ico]) => {
      if (!l || !l.LUGAR) return;
      const t = el('article', 'tarjeta lugar reveal');
      const i = el('div', 'lugar-ico');
      i.innerHTML = svgIcono(ico);
      t.appendChild(i);
      t.appendChild(el('h3', '', l.TITULO || ''));
      t.appendChild(el('p', 'lugar-nombre', l.LUGAR));
      if (l.HORA) t.appendChild(el('p', 'lugar-hora', l.HORA));
      if (l.DIRECCION) t.appendChild(el('p', 'lugar-dir', l.DIRECCION));
      if (l.MAPA) {
        const a = el('a', 'btn btn-borde', 'Cómo llegar');
        a.href = l.MAPA;
        a.target = '_blank';
        a.rel = 'noopener';
        t.appendChild(a);
      }
      cont.appendChild(t);
    });
    if (cont.childElementCount === 1) cont.style.gridTemplateColumns = '1fr';
  }

  /* ── Itinerario ── */
  function itinerario() {
    const ol = $('#itinerario');
    (D.ITINERARIO || []).forEach(it => {
      const li = el('li', 'reveal');
      const ico = el('div', 'it-ico');
      ico.innerHTML = svgIcono(it.icono);
      const txt = el('div');
      txt.appendChild(el('p', 'it-hora', it.hora || ''));
      txt.appendChild(el('p', 'it-titulo', it.titulo || ''));
      if (it.texto) txt.appendChild(el('p', 'it-texto', it.texto));
      li.appendChild(ico);
      li.appendChild(txt);
      ol.appendChild(li);
    });
    if (!ol.childElementCount) ol.closest('.seccion').hidden = true;
  }

  /* ── Dress code ── */
  function dress() {
    const cont = $('#dressColores');
    (D.DRESS_COLORES || []).forEach(c => {
      const s = el('span');
      s.style.background = c;
      s.title = c;
      cont.appendChild(s);
    });
  }

  /* ── Regalos ── */
  function regalos() {
    const lista = D.REGALOS || [];
    if (!lista.length) { $('#secRegalos').hidden = true; return; }
    const cont = $('#regalos');
    lista.forEach(r => {
      const t = el('article', 'tarjeta regalo reveal');
      t.appendChild(el('h3', '', r.titulo || ''));
      if (r.texto) t.appendChild(el('p', '', r.texto));
      if (r.copiar) {
        const b = el('button', 'btn btn-borde', 'Copiar');
        b.type = 'button';
        b.addEventListener('click', () => copiar(r.copiar));
        t.appendChild(b);
      }
      cont.appendChild(t);
    });
  }

  function copiar(texto) {
    const ok = () => toast('Copiado ✓');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto).then(ok, () => copiarViejo(texto, ok));
    } else copiarViejo(texto, ok);
  }
  function copiarViejo(texto, ok) {
    const ta = el('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); ok(); } catch (e) { toast(texto); }
    ta.remove();
  }

  /* ── Toast ── */
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ── Aparición al hacer scroll ── */
  function reveal() {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window)) { items.forEach(i => i.classList.add('visible')); return; }
    const io = new IntersectionObserver(entradas => {
      entradas.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    items.forEach(i => io.observe(i));
  }

  /* ── Música ── */
  const audio = $('#audio');
  const btnMusica = $('#btnMusica');
  function musica(on) {
    if (!D.MUSICA) return;
    if (on) audio.play().then(() => marcarMusica(true)).catch(() => marcarMusica(false));
    else { audio.pause(); marcarMusica(false); }
  }
  function marcarMusica(sonando) {
    btnMusica.classList.toggle('sonando', sonando);
    btnMusica.setAttribute('aria-label', sonando ? 'Pausar música' : 'Reproducir música');
  }
  function iniciarMusica() {
    if (!D.MUSICA) return;
    audio.src = D.MUSICA;
    btnMusica.hidden = false;
    btnMusica.addEventListener('click', () => musica(audio.paused));
  }

  /* ── Sobre ── */
  function abrirSobre() {
    const caja = $('#sobreCaja');
    if (caja.classList.contains('abierto')) return;
    caja.classList.add('abierto');
    musica(true);
    setTimeout(() => {
      $('#sobre').classList.add('fuera');
      document.body.classList.remove('cerrado');
      window.scrollTo(0, 0);
      $$('.portada .reveal').forEach(n => n.classList.add('visible'));
    }, reducido ? 0 : 1700);
  }

  /* ════════ CONFIRMACIÓN ════════ */
  const supabaseOk = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(D.SUPABASE_URL || '') &&
    !/^TU-ANON-KEY/.test(D.SUPABASE_ANON_KEY || '') && !/TU-PROYECTO/.test(D.SUPABASE_URL || '');
  const codigoUrl = (new URLSearchParams(location.search).get('i') || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const GUARDADO = 'boda-respuesta';
  let invitacion = null;   // { codigo, nombre, pases, estado, asistentes, mensaje }

  async function rpc(fn, body) {
    const r = await fetch(D.SUPABASE_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: D.SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + D.SUPABASE_ANON_KEY
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  function leerGuardado() {
    try { return JSON.parse(localStorage.getItem(GUARDADO) || 'null'); } catch (e) { return null; }
  }
  function guardar(r) {
    try { localStorage.setItem(GUARDADO, JSON.stringify(r)); } catch (e) { /* sin almacenamiento */ }
  }

  function maxPersonas() {
    return invitacion ? Math.max(1, invitacion.pases) : Math.max(1, D.MAX_PERSONAS_SIN_INVITACION || 1);
  }

  function llenarPersonas(elegido) {
    const sel = $('#rPersonas');
    sel.innerHTML = '';
    for (let i = 1; i <= maxPersonas(); i++) {
      const o = el('option', '', i === 1 ? '1 persona' : i + ' personas');
      o.value = i;
      sel.appendChild(o);
    }
    sel.value = String(Math.min(elegido || 1, maxPersonas()));
    $('#campoPersonas').hidden = maxPersonas() === 1 || asisteElegido() === false;
  }

  /* Un campo por cada acompañante (personas − 1). Conserva lo ya escrito. */
  function pintarAcomp(valores) {
    const cont = $('#listaAcomp');
    const previos = valores || [...cont.querySelectorAll('input')].map(i => i.value);
    const cuantos = asisteElegido() ? Math.max(0, (Number($('#rPersonas').value) || 1) - 1) : 0;
    cont.textContent = '';
    for (let k = 0; k < cuantos; k++) {
      const fila = el('div', 'acomp-fila');
      fila.appendChild(el('span', '', String(k + 2)));
      const inp = el('input');
      inp.type = 'text';
      inp.maxLength = 80;
      inp.placeholder = 'Nombre y apellido del acompañante';
      inp.setAttribute('aria-label', 'Acompañante ' + (k + 1));
      inp.value = previos[k] || '';
      inp.addEventListener('input', () => inp.classList.remove('error'));
      fila.appendChild(inp);
      cont.appendChild(fila);
    }
    $('#campoAcomp').hidden = cuantos === 0;
  }

  function actualizarCampos() {
    $('#campoPersonas').hidden = maxPersonas() === 1 || !asisteElegido();
    pintarAcomp();
  }

  function asisteElegido() {
    const r = document.querySelector('input[name="asiste"]:checked');
    return !r || r.value === 'si';
  }

  function mostrarFormulario(previo) {
    $('#rsvpCargando').hidden = true;
    $('#rsvpListo').hidden = true;
    $('#rsvpForm').hidden = false;
    $('#campoNombre').hidden = !!invitacion;
    if (previo) {
      if (!invitacion && previo.nombre) $('#rNombre').value = previo.nombre;
      document.querySelector('input[name="asiste"][value="' + (previo.asiste === false ? 'no' : 'si') + '"]').checked = true;
      $('#rMensaje').value = previo.mensaje || '';
    }
    $('#listaAcomp').textContent = '';
    llenarPersonas(previo && previo.personas);
    pintarAcomp((previo && previo.acompanantes) || []);
  }

  function mensajeWhatsapp(r) {
    let m = '💍 *Confirmación — Boda de ' + D.NOVIA + ' & ' + D.NOVIO + '*\n\n' +
      '👤 *Nombre:* ' + r.nombre + '\n';
    m += r.asiste
      ? '✅ *Asistiré* · ' + r.personas + (r.personas === 1 ? ' persona' : ' personas') + '\n'
      : '❌ *No podré asistir*\n';
    if (r.asiste && r.acompanantes && r.acompanantes.length) m += '👥 *Acompañantes:* ' + r.acompanantes.join(', ') + '\n';
    if (r.mensaje) m += '\n💬 ' + r.mensaje + '\n';
    return 'https://wa.me/' + D.WHATSAPP + '?text=' + encodeURIComponent(m);
  }

  /* r = { nombre, asiste, personas, mensaje, codigo, guardado } */
  function mostrarListo(r) {
    $('#rsvpCargando').hidden = true;
    $('#rsvpForm').hidden = true;
    $('#rsvpListo').hidden = false;

    $('#listoTitulo').textContent = r.asiste ? '¡Gracias por confirmar!' : 'Te vamos a extrañar';
    $('#listoTexto').textContent = !r.guardado
      ? 'Envíanos tu respuesta por WhatsApp para dejarla anotada.'
      : r.asiste
        ? 'Tu asistencia quedó registrada. ¡Nos vemos en la boda!'
        : 'Gracias por avisarnos. Recibimos tu respuesta con cariño.';

    const acomp = r.asiste && r.acompanantes && r.acompanantes.length ? r.acompanantes : null;
    $('#listoAcomp').hidden = !acomp;
    $('#listoAcomp').textContent = acomp ? 'Te acompañan: ' + acomp.join(', ') : '';

    const wa = $('#btnWhatsapp');
    wa.href = mensajeWhatsapp(r);
    wa.className = r.guardado ? 'btn btn-borde' : 'btn';

    if (r.asiste && r.codigo) pintarPase(r);
    else $('#pase').hidden = true;
  }

  async function enviar(e) {
    e.preventDefault();
    const nombre = invitacion ? invitacion.nombre : $('#rNombre').value.trim().replace(/\s+/g, ' ');
    if (!nombre) {
      $('#campoNombre').classList.add('error');
      $('#rNombre').focus();
      toast('Escribe tu nombre, por favor');
      return;
    }
    $('#campoNombre').classList.remove('error');
    const asiste = asisteElegido();
    const camposAcomp = asiste ? [...$('#listaAcomp').querySelectorAll('input')] : [];
    const vacio = camposAcomp.find(i => !i.value.trim());
    if (vacio) {
      camposAcomp.forEach(i => i.classList.toggle('error', !i.value.trim()));
      vacio.focus();
      toast('Escribe el nombre de cada acompañante');
      return;
    }
    const r = {
      nombre,
      asiste,
      personas: asiste ? Number($('#rPersonas').value) || 1 : 0,
      acompanantes: camposAcomp.map(i => i.value.trim().replace(/\s+/g, ' ')),
      mensaje: $('#rMensaje').value.trim(),
      codigo: invitacion ? invitacion.codigo : null,
      guardado: false
    };

    const btn = $('#btnEnviar');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    if (supabaseOk) {
      try {
        if (invitacion) {
          const filas = await rpc('boda_responder', {
            p_codigo: invitacion.codigo, p_asiste: asiste, p_asistentes: r.personas, p_mensaje: r.mensaje,
            p_acompanantes: r.acompanantes
          });
          if (!filas || !filas.length) throw new Error('sin invitación');
          Object.assign(invitacion, filas[0]);
          r.personas = asiste ? invitacion.asistentes : 0;
          r.acompanantes = invitacion.acompanantes || r.acompanantes;
        } else {
          r.codigo = await rpc('boda_registrar', {
            p_nombre: nombre, p_asiste: asiste, p_asistentes: r.personas, p_mensaje: r.mensaje,
            p_acompanantes: r.acompanantes
          });
        }
        r.guardado = true;
      } catch (err) {
        toast('No pudimos guardar tu respuesta. Envíala por WhatsApp.');
      }
    }
    btn.disabled = false;
    btn.textContent = 'Enviar confirmación';
    if (!invitacion) guardar(r);
    mostrarListo(r);
    $('#rsvp').scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
  }

  function saludar(inv) {
    $('#rsvpInvitacion').hidden = false;
    $('#rsvpNombre').textContent = inv.nombre;
    const pases = $('#rsvpPases');
    pases.textContent = '';
    pases.append('Hemos reservado ', el('b', '', inv.pases === 1 ? '1 lugar' : inv.pases + ' lugares'), ' en tu honor.');
    $('#sobreNombre').textContent = inv.nombre;
    $('#sobrePara').hidden = false;
    const p = $('#portadaInvitado');
    p.textContent = '';
    p.append('Con cariño para ', el('b', '', inv.nombre));
    p.hidden = false;
  }

  function modoAbierto() {
    const previo = leerGuardado();
    if (previo && previo.nombre) { mostrarListo(previo); return; }
    if (D.RSVP_ABIERTO === false) {
      $('#rsvpCargando').hidden = true;
      $('#rsvpCerrado').hidden = false;
      const a = el('a', 'btn btn-borde', 'Escribir por WhatsApp');
      a.href = 'https://wa.me/' + D.WHATSAPP;
      a.target = '_blank';
      a.rel = 'noopener';
      a.style.marginTop = '14px';
      $('#rsvpCerrado').appendChild(a);
      return;
    }
    mostrarFormulario();
  }

  async function iniciarRsvp() {
    $('#rsvpForm').addEventListener('submit', enviar);
    $$('input[name="asiste"]').forEach(r => r.addEventListener('change', actualizarCampos));
    $('#rPersonas').addEventListener('change', () => pintarAcomp());
    $('#btnCambiar').addEventListener('click', () => {
      const previo = invitacion
        ? { asiste: invitacion.estado !== 'no_asiste', personas: invitacion.asistentes, mensaje: invitacion.mensaje, acompanantes: invitacion.acompanantes }
        : leerGuardado();
      mostrarFormulario(previo);
    });

    if (!codigoUrl || !supabaseOk) { modoAbierto(); return; }

    try {
      const filas = await rpc('boda_invitacion', { p_codigo: codigoUrl });
      if (!filas || !filas.length) {
        toast('No encontramos tu invitación. Revisa el enlace.');
        modoAbierto();
        return;
      }
      invitacion = Object.assign({ codigo: codigoUrl }, filas[0]);
    } catch (e) {
      toast('Sin conexión: puedes confirmar por WhatsApp.');
      modoAbierto();
      return;
    }

    saludar(invitacion);
    if (invitacion.estado === 'pendiente') {
      mostrarFormulario();
    } else {
      const asiste = invitacion.estado === 'asiste';
      mostrarListo({
        nombre: invitacion.nombre, asiste, personas: asiste ? invitacion.asistentes : 0,
        mensaje: invitacion.mensaje, acompanantes: invitacion.acompanantes || [], codigo: invitacion.codigo, guardado: true
      });
    }
  }

  /* ── Pase QR ── */
  function nombreArchivo(t) {
    return 'pase-boda-' + ((t || 'invitado').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).toLowerCase() || 'invitado') + '.png';
  }

  function esIOS() {
    return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function pintarPase(r) {
    if (typeof qrcode === 'undefined') { $('#pase').hidden = true; return; }
    const url = location.origin + location.pathname + '?i=' + r.codigo;
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();

    /* Pase: QR arriba, nombre y personas abajo; el alto se ajusta al QR. */
    const canvas = $('#paseCanvas');
    const W = 600, pad = 60;
    const n = qr.getModuleCount();
    const celda = Math.floor((W - pad * 2) / n);
    const H = pad + celda * n + 150;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#B8975A';
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, W - 28, H - 28);
    const x0 = Math.round((W - celda * n) / 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x0 - 16, pad - 16, celda * n + 32, celda * n + 32);
    ctx.fillStyle = '#2F3E34';
    for (let f = 0; f < n; f++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(f, c)) ctx.fillRect(x0 + c * celda, pad + f * celda, celda, celda);
      }
    }
    const yTxt = pad + celda * n + 60;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2F3E34';
    ctx.font = '600 34px Georgia, serif';
    ctx.fillText(recortar(ctx, r.nombre, W - 80), W / 2, yTxt);
    ctx.fillStyle = '#5F6F52';
    ctx.font = '24px Georgia, serif';
    ctx.fillText((r.personas === 1 ? '1 persona' : r.personas + ' personas') + ' · ' + D.NOVIA + ' & ' + D.NOVIO, W / 2, yTxt + 42);

    const dataUrl = canvas.toDataURL('image/png');
    $('#paseImg').src = dataUrl;
    $('#pase').hidden = false;

    const archivo = nombreArchivo(r.nombre);
    const ios = esIOS();
    const btn = $('#btnPase');
    btn.textContent = ios ? 'Guardar pase' : 'Descargar pase';
    $('#paseIos').hidden = true;
    btn.onclick = () => {
      canvas.toBlob(blob => {
        let file = null;
        try { file = new File([blob], archivo, { type: 'image/png' }); } catch (e) { /* sin File */ }
        if (ios) {
          if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], title: 'Pase de entrada' }).catch(() => { $('#paseIos').hidden = false; });
          } else {
            $('#paseIos').hidden = false;
          }
          return;
        }
        const u = URL.createObjectURL(blob || new Blob());
        const a = el('a');
        a.href = blob ? u : dataUrl;
        a.download = archivo;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 4000);
        toast('Pase descargado ✓');
      }, 'image/png');
    };
  }

  function recortar(ctx, texto, max) {
    if (ctx.measureText(texto).width <= max) return texto;
    while (texto.length > 1 && ctx.measureText(texto + '…').width > max) texto = texto.slice(0, -1);
    return texto + '…';
  }

  /* ── Inicio ── */
  function init() {
    rellenar();
    crearPetalos();
    iniciarCuenta();
    calendario();
    padres();
    lugares();
    itinerario();
    dress();
    regalos();
    iniciarMusica();
    reveal();
    iniciarRsvp();

    $('#sello').addEventListener('click', abrirSobre);
    let y0 = null;
    $('#sobre').addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true });
    $('#sobre').addEventListener('touchend', e => {
      if (y0 !== null && y0 - e.changedTouches[0].clientY > 60) abrirSobre();
      y0 = null;
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && !audio.paused) musica(false); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
