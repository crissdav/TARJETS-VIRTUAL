/* ════════════════════════════════════════════════════════════
   DATOS DE LA BODA
   Todo lo que se ve en la tarjeta sale de aquí. Cambia los
   textos entre comillas y la tarjeta se actualiza sola.
   Lo marcado con  ← CAMBIAR  son datos de ejemplo.
   ════════════════════════════════════════════════════════════ */
window.BODA = {
  NOVIA: 'Nombre de la novia',                     // ← CAMBIAR
  NOVIO: 'Nombre del novio',                     // ← CAMBIAR
  /* Fecha y hora de la ceremonia (hora local, formato AAAA-MM-DDTHH:MM). */
  FECHA: '2027-02-20T16:00',              // ← CAMBIAR
  CIUDAD: 'Lima, Perú',                   // ← CAMBIAR

  FRASE: 'El amor no consiste en mirarse el uno al otro, sino en mirar juntos en la misma dirección.',
  FRASE_AUTOR: 'Antoine de Saint-Exupéry',

  /* Se omiten las filas que queden vacías. */
  PADRES_NOVIA: ['Nombre del papá', 'Nombre de la mamá'],     // ← CAMBIAR
  PADRES_NOVIO: ['Nombre del papá', 'Nombre de la mamá'],     // ← CAMBIAR
  PADRINOS: ['Nombre del padrino', 'Nombre de la madrina'],   // ← CAMBIAR

  CEREMONIA: {
    TITULO: 'Ceremonia religiosa',
    LUGAR: 'Parroquia Nuestra Señora',    // ← CAMBIAR
    DIRECCION: 'Dirección de la iglesia', // ← CAMBIAR
    HORA: '4:00 p. m.',
    MAPA: 'https://maps.google.com/?q=Lima' // ← CAMBIAR (enlace de Google Maps)
  },
  RECEPCION: {
    TITULO: 'Recepción',
    LUGAR: 'Salón de eventos',            // ← CAMBIAR
    DIRECCION: 'Dirección del salón',     // ← CAMBIAR
    HORA: '7:00 p. m.',
    MAPA: 'https://maps.google.com/?q=Lima' // ← CAMBIAR
  },

  /* Iconos disponibles: anillos, copas, cena, baile, pastel, luna, camara, musica */
  ITINERARIO: [
    { hora: '4:00 p. m.', titulo: 'Ceremonia', texto: 'Nos damos el sí', icono: 'anillos' },
    { hora: '7:00 p. m.', titulo: 'Recepción', texto: 'Brindis de bienvenida', icono: 'copas' },
    { hora: '8:30 p. m.', titulo: 'Cena', texto: 'Compartimos la mesa', icono: 'cena' },
    { hora: '10:00 p. m.', titulo: 'Primer baile', texto: 'Y abrimos la pista', icono: 'baile' },
    { hora: '11:30 p. m.', titulo: 'Pastel', texto: 'Un dulce momento', icono: 'pastel' },
    { hora: '3:00 a. m.', titulo: 'Despedida', texto: 'Gracias por venir', icono: 'luna' }
  ],

  DRESS_CODE: 'Formal',
  DRESS_TEXTO: 'Damas: vestido largo o de cóctel. Caballeros: terno y corbata.',
  /* Colores sugeridos (puedes poner los que quieras) y la nota final. */
  DRESS_COLORES: ['#8A9A7B', '#C9A9A6', '#B8975A', '#5E6B73', '#E8DCC8'],
  DRESS_NOTA: 'El color blanco está reservado para la novia.',

  /* Regalos. Deja la lista vacía [] para ocultar la sección. */
  REGALOS_TEXTO: 'Tu presencia es nuestro mejor regalo. Si deseas tener un detalle con nosotros, puedes hacerlo así:',
  REGALOS: [
    { titulo: 'Lluvia de sobres', texto: 'Habrá un buzón en la recepción.' },
    { titulo: 'Transferencia', texto: 'BCP · Cuenta 000-00000000-0-00', copiar: '000-00000000-0-00' } // ← CAMBIAR
  ],

  /* WhatsApp que recibe las confirmaciones (código de país + número, sin +). */
  WHATSAPP: '51900000000',                // ← CAMBIAR
  /* Hasta cuándo se confirma (texto libre). */
  CONFIRMAR_ANTES: '31 de enero de 2027', // ← CAMBIAR
  /* Sin enlace personal, ¿cuántas personas puede confirmar alguien? */
  MAX_PERSONAS_SIN_INVITACION: 2,
  /* true: cualquiera con la tarjeta puede confirmar.
     false: solo quien abre su enlace personal (?i=codigo). */
  RSVP_ABIERTO: true,

  HASHTAG: '#NuestraBoda',            // ← CAMBIAR
  /* Fotos (opcional). Copia las fotos a la carpeta tarjeta/fotos/ y
     escribe sus nombres. Vacío = no se muestra.
     FOTO_PORTADA va dentro del arco de la portada (vertical queda mejor). */
  FOTO_PORTADA: '',                       // ej.: 'fotos/portada.jpg'
  HISTORIA: 'Cada momento juntos nos trajo hasta aquí.',
  GALERIA: [],                            // ej.: ['fotos/1.jpg', 'fotos/2.jpg', 'fotos/3.jpg']

  /* Hospedaje para invitados de fuera (opcional). [] = se oculta. */
  HOSPEDAJE_TEXTO: 'Si vienes de fuera, estos lugares quedan cerca:',
  HOSPEDAJE: [],                          // ej.: [{ nombre: 'Hotel X', texto: 'A 5 min del salón', enlace: 'https://...' }]

  /* Música de fondo: copia la canción (.mp3) en esta carpeta (tarjeta/)
     con el nombre musica.mp3, o escribe aquí el nombre de tu archivo.
     Suena al abrir el sobre; el botón de abajo a la derecha la pausa.
     Si el archivo no existe, el botón no aparece. Vacío '' = sin música. */
  MUSICA: 'musica.mp3',

  /* Supabase (Settings → API). Igual que en lista/config.js.
     Sin configurar, la tarjeta confirma solo por WhatsApp. */
  SUPABASE_URL: 'https://dgogtngftdqibxrwmgzs.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnb2d0bmdmdGRxaWJ4cndtZ3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2Njg0NDEsImV4cCI6MjEwMTI0NDQ0MX0.uPAoAVgW13JwzaGoKX3k8CNYGZSvjroB29PGaP6frhA'
};
