# 💍 Boda — Tarjeta de invitación + Lista de invitados

Dos sitios estáticos que se publican en **Vercel** y comparten una base de datos en **Supabase**:

| Carpeta | Qué es | Quién la usa |
|---|---|---|
| `tarjeta/` | Invitación digital (sobre con sello, cuenta regresiva, calendario, lugares, itinerario, dress code, regalos, confirmación y pase QR) | Invitados |
| `lista/` | Panel privado: lista de invitados, envío de invitaciones por WhatsApp, respuestas en vivo, control de ingreso con escáner QR, CSV y PDF | Los novios |

## Cómo funciona

1. Los novios agregan invitados en el panel (uno por uno o pegando la lista desde Excel), con el **número de pases** de cada uno.
2. Cada invitado tiene un **enlace personal** (`https://tarjeta…/?i=codigo`). El botón **Enviar** lo manda por WhatsApp con un mensaje ya escrito.
3. Al abrir el enlace, la tarjeta saluda al invitado por su nombre ("Para Familia Rojas") y le muestra cuántos lugares tiene reservados.
4. El invitado responde **sí / no**, cuántas personas van (hasta sus pases), el **nombre de cada acompañante** (un campo por persona extra, obligatorio) y un mensaje. Queda guardado al instante en el panel.
   - El panel tiene dos apartados: **Invitados** (los que asisten y los que aún no responden; es la lista para confirmar asistentes y controlar el ingreso) y **No asistirán** (quienes marcaron «No podré asistir», con su mensaje). Desde «No asistirán», **Volver a la lista** lo devuelve a *sin responder* si cambia de opinión. El PDF trae las dos listas por separado.
5. Si confirma, recibe un **pase QR** que puede descargar. El día de la boda, en la puerta, se escanea desde el panel (**Escanear pase**) y se registra el ingreso. El panel avisa si un pase ya se usó.
6. Si `RSVP_ABIERTO: true`, quien no tenga enlace personal también puede confirmar escribiendo su nombre. En el panel aparece como *"se anotó desde la tarjeta"*.
7. Si Supabase no está configurado o no hay internet, la tarjeta igual permite confirmar **por WhatsApp**.

## 1. Poner los datos de la boda

- **`tarjeta/datos.js`**: nombres, fecha, lugares y enlaces de Google Maps, padres, padrinos, itinerario, dress code, regalos, WhatsApp, hashtag y música. Todo lo que dice `← CAMBIAR` son datos de ejemplo.
- **`lista/config.js`**: nombres, fecha, la URL pública de la tarjeta (`TARJETA_URL`) y el mensaje de WhatsApp para las invitaciones.
- Música (opcional): copia el `.mp3` en `tarjeta/` y pon su nombre en `MUSICA`.
- Fotos (opcional): crea `tarjeta/fotos/`, copia las fotos y escribe sus rutas en `FOTO_PORTADA` (va dentro del arco de la portada; mejor vertical) y en `GALERIA` (sección «Nuestra historia» con visor). Vacío = no se muestra.
- Hospedaje (opcional): lista `HOSPEDAJE` con `nombre`, `texto` y `enlace`. `[]` = se oculta.

## Diseño y animaciones

- **Ilustraciones** (`flora.js`): rosas en capas, eucalipto, olivo, bayas y el sello de lacre se dibujan por código en SVG. No hay imágenes que descargar y se ven nítidas en cualquier pantalla.
- **Sobre**: papel con textura, sello de lacre en relieve que se parte en dos, solapa que gira en 3D con forro salvia y filete dorado, y la carta que sale del sobre.
- **Animaciones** (`animaciones.js`, con GSAP + ScrollTrigger): entrada de la portada (flores, arco dorado que se dibuja, nombres que aparecen como escritos), contenido que aparece al bajar, línea del itinerario que se dibuja con el scroll, flores con parallax, pétalos que caen en canvas y confeti al confirmar.
- **Cuenta regresiva**: muestra meses · días · horas · min mientras falte más de un mes; en el último mes pasa a días · horas · min · seg.
- **Mobile-first**: los estilos base son para celular; tablet (≥ 768 px) y escritorio (≥ 1024 px) solo agregan cambios.
- Si GSAP no carga o el teléfono tiene activado «reducir movimiento», la tarjeta funciona con animaciones simples. En teléfonos modestos se dibujan menos pétalos.

## 2. Supabase

Puedes usar el **mismo proyecto de Supabase de los XV** (las tablas y funciones llevan el prefijo `boda_` y no chocan) o crear uno nuevo.

1. **SQL Editor** → pega todo `lista/supabase/schema.sql` → **Run**.
2. **Authentication → Users → Add user**: correo y contraseña de los novios, con **Auto Confirm User** marcado.
3. Dale acceso al panel (en el SQL Editor):
   ```sql
   update auth.users
      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"panel":"boda"}'
    where email = 'correo-de-los-novios@ejemplo.com';
   ```
4. **Settings → API**: copia **Project URL** y **anon public key** en `tarjeta/datos.js` y en `lista/config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
5. Si es un proyecto nuevo: en **Authentication → Sign In / Providers → Email**, desactiva **Allow new users to sign up**.

La anon key es pública por diseño. La tabla tiene RLS: sin sesión de los novios no se puede leer ni modificar. La tarjeta solo puede usar tres funciones:

- `boda_invitacion(codigo)`: lee el nombre y los pases de **un** código.
- `boda_responder(codigo, …)`: guarda la respuesta. Nunca acepta más personas que los pases.
- `boda_registrar(nombre, …)`: confirmación sin enlace, con un máximo de 10 personas y sin duplicados.

## 3. Vercel (dos proyectos)

| Proyecto | Root Directory | Framework / Build |
|---|---|---|
| Tarjeta | `04-boda/tarjeta` | Other · sin build |
| Lista | `04-boda/lista` | Other · sin build |

1. Sube el repo a GitHub → en Vercel, **Add New → Project**, importa el repo y elige el Root Directory.
2. Repite con el segundo proyecto.
3. Copia la URL de la tarjeta (p. ej. `https://boda-novios.vercel.app/`) en `TARJETA_URL` de `lista/config.js` y vuelve a publicar.

`vercel.json` activa `cleanUrls`. El panel envía además `X-Robots-Tag: noindex` para que los buscadores no lo indexen.

## Probar en local

```bash
npx serve 04-boda
# tarjeta: http://localhost:3000/tarjeta/
# panel:   http://localhost:3000/lista/
```

## Archivos

```
04-boda/
├── tarjeta/
│   ├── index.html          estructura
│   ├── styles.css          estilos (marfil, salvia y dorado)
│   ├── script.js           relleno desde datos.js, sobre, cuenta, confirmación, pase QR
│   ├── flora.js            ilustraciones botánicas y sello de lacre (SVG)
│   ├── animaciones.js      GSAP, pétalos, confeti
│   ├── datos.js            ← DATOS DE LA BODA
│   ├── qrcode-generator.js QR (Kazuhiko Arase, MIT)
│   ├── favicon.svg
│   └── vercel.json
└── lista/
    ├── index.html          redirige a login
    ├── login.html/.js      acceso (Supabase Auth)
    ├── lista.html/.js      panel
    ├── styles.css
    ├── config.js           ← CONFIGURACIÓN DEL PANEL
    ├── supabase/schema.sql
    ├── favicon.svg
    └── vercel.json
```
