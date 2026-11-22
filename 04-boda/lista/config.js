/* ── Configuración del panel ─────────────────────────────────
   Supabase: Settings → API (los mismos dos valores que en
   tarjeta/datos.js). La anon key es pública: la protege RLS. */
window.BODA_PANEL = {
  SUPABASE_URL: 'https://dgogtngftdqibxrwmgzs.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnb2d0bmdmdGRxaWJ4cndtZ3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2Njg0NDEsImV4cCI6MjEwMTI0NDQ0MX0.uPAoAVgW13JwzaGoKX3k8CNYGZSvjroB29PGaP6frhA',

  NOVIOS: 'Nombre de la novia & Nombre del novio',                     // ← CAMBIAR
  FECHA_TEXTO: 'Sábado 20 de febrero de 2027',     // ← CAMBIAR

  /* Dirección pública de la tarjeta en Vercel (termina en /). */
  TARJETA_URL: 'https://boda-01-mu.vercel.app/',

  /* Mensaje que se envía por WhatsApp con la invitación.
     {nombre}, {pases} y {enlace} se reemplazan solos. */
  MENSAJE: '¡Hola, {nombre}! 💍\n\nCon mucha alegría queremos invitarte a nuestra boda. ' +
    'Hemos reservado {pases} para ti.\n\nAbre tu invitación y confírmanos aquí:\n{enlace}\n\n' +
    'Con cariño, Nombre de la novia & Nombre del novio'               // ← CAMBIAR la firma
};
