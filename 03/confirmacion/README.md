# Lista de Invitados + Confirmaciones — XV Grecia Peña (Noche de Máscaras)

Panel privado de invitados del XV. Los invitados se anotan solos desde la
tarjeta (`../tarjeta`) al confirmar por WhatsApp; los datos viven en
**Supabase** y este panel (más la tarjeta) se publican en **Vercel**.

No hay servidor propio: la tarjeta escribe con la función RPC `anotar` y el
panel lee/escribe con Supabase Auth + RLS.

## Estructura

```
confirmacion/
├── schema.sql             # SQL a pegar en Supabase (tabla + RLS + función)
├── config.js              # URL, anon key y correo del admin
├── vercel.json            # cleanUrls
├── login.html             # acceso (correo + contraseña)
├── login.js
├── lista.html             # la lista
├── lista.js
├── styles.css
├── mascara-icono.svg
└── README.md
```

## 1. Crear el proyecto en Supabase

1. <https://supabase.com> → **New project** (nombre libre, región más cercana).
2. **SQL Editor** → pegar todo el contenido de `schema.sql` → **Run**.
   Crea la tabla `confirmaciones`, las reglas RLS y la función `anotar`.
3. **Authentication → Users → Add user** → *Create new user*:
   - Email: el correo de la quinceañera (o el que se use para entrar).
   - Password: la contraseña del panel.
   - Marcar **Auto Confirm User**.
4. **Authentication → Sign In / Providers → Email**: dejar **Email** activo y
   **desactivar “Enable sign ups”** (nadie más puede registrarse).

## 2. Rellenar las credenciales

En **Settings → API** aparecen dos valores: **Project URL** y **anon public key**.

- `config.js`:

  ```js
  SUPABASE_URL: 'https://xxxxxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi...',
  ADMIN_EMAIL: 'correo@del.panel'
  ```

- `../tarjeta/script.js`, constante `CONFIG`: las mismas dos
  (`SUPABASE_URL` y `SUPABASE_ANON_KEY`).

La anon key es pública por diseño: RLS impide que alguien inserte o lea la
lista sin iniciar sesión. La tarjeta solo puede llamar a `anotar`.

## 3. Publicar (dos proyectos en Vercel)

| Proyecto | Root Directory | Build |
|---|---|---|
| Tarjeta | `03/tarjeta` | ninguno (estático) |
| Lista | `03/confirmacion` | ninguno (estático) |

Importar el repo de GitHub en Vercel y configurar cada proyecto con su root.
`vercel.json` ya activa `cleanUrls`, así que `/lista` y `/login` funcionan sin
`.html`.

## Cómo funciona

- **Tarjeta** (`../tarjeta/script.js`): al pulsar *Confirmar por WhatsApp* hace
  un `POST` silencioso a `{SUPABASE_URL}/rest/v1/rpc/anotar` con
  `p_nombre` y `p_acompanante`, y en paralelo abre el chat de WhatsApp.
- **`anotar`** (security definer): si el nombre ya existe (ignorando acentos y
  mayúsculas) actualiza el registro, si no lo inserta. Nunca duplica.
- **Panel**: `login.html` entra con `signInWithPassword`; `lista.html` solo
  carga si hay sesión. Lectura/edición/borrado van directo a la tabla
  (`select`/`update`/`delete` con rol `authenticated`).
- **En vivo**: el panel recarga la lista cada 15 segundos y al volver a la
  pestaña; la píldora de estado muestra `Actualizado hace N s`.
- **CSV**: se arma en el navegador desde la lista ya cargada.

## Probar en local

Abrir `login.html` con un servidor estático, por ejemplo:

```bash
npx serve 03/confirmacion
```

(los `.html` abren directo con doble clic, pero Supabase funciona igual).

## Seguridad

- La tabla está con RLS: solo el rol `authenticated` (el admin del panel) lee y
  edita. `anon` no tiene ninguna policy de select/insert.
- La única vía de escritura pública es la función `anotar`, que solo recibe
  nombre y acompañante.
- Para regenerar todo: borrar las policies/función y volver a correr `schema.sql`.
