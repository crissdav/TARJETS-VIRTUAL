# Álbum XV — Grecia Peña (Noche de Máscaras)

Álbum de fotos en tiempo real para los XV de Grecia Peña. Los invitados escanean un
código QR y **suben fotos sin límite**; la quinceañera las ve aparecer al instante,
las descarga o las elimina.

Sin dependencias externas: se construye solo con módulos nativos de Node
(`http`, `node:sqlite`, `zlib`). La generación del QR es propia (`qrcode-generator.js`).

---

## Requisitos

- **Node.js >= 22** (usa `node:sqlite`, disponible desde Node 22).
- No requiere `npm install` (no hay dependencias).

## Arranque local

```bash
node server.js
# o
npm start
```

Abre `http://localhost:3005/`.

## Variables de entorno

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `3005` | Puerto del servidor. |
| `ADMIN_PASSWORD` | `xv2026grecia` | Contraseña de la landing de la quinceañera. **En producción siempre defínela.** |
| `DATA_DIR` | carpeta del proyecto | Carpeta donde viven `album.db` y `fotos/`. Útil para montar un volumen persistente en el hosting. |

Ejemplo:

```bash
PORT=3005 ADMIN_PASSWORD=miClaveSegura DATA_DIR=/data node server.js
```

---

## Rutas (páginas)

| Ruta | Qué muestra |
|---|---|
| `/` | Redirige (302) a `/subir`. |
| `/subir` | **Landing de invitados**: nombre + elegir/tomar foto(s). |
| `/album` | **Landing de la quinceañera**: galería, estadísticas y acciones (requiere sesión; si no, muestra el login). |
| `/login` | Formulario de acceso a la landing de la quinceañera. |
| `/fotos/<archivo>` | Imagen subida (nombre aleatorio, acceso público). |

## API

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/login` | — | `{ password }` → sesión (cookie `HttpOnly`). 5 fallos/10 min por IP → `429`. |
| `POST` | `/api/logout` | — | Cierra la sesión. |
| `GET` | `/api/sesion` | — | `{ ok: true/false }`. |
| `GET` | `/api/qr` | — | PNG del QR hacia `baseUrl + /subir` (o `?data=` para otro contenido). |
| `GET` | `/api/eventos` | ✔ | **SSE**: emite `event: fotos` cuando algo cambia (subida/borrado). |
| `GET` | `/api/fotos` | ✔ | Todas las fotos `{ id, autor, fecha, url }` (más recientes primero). |
| `POST` | `/api/subir` | — | Cuerpo binario de la imagen, `Content-Type: image/*`, header `X-Nombre` con el autor. Máx **30 MB**. |
| `GET` | `/api/recientes` | — | Últimas 30 fotos `{ id, url }` (semáforo público para `/subir`). |
| `DELETE` | `/api/fotos/:id` | ✔ | Elimina la foto (registro + archivo). |
| `GET` | `/api/descargar` | ✔ | Descarga **todas** las fotos en un ZIP. |

Formatos aceptados: `jpg`, `png`, `gif`, `webp`.

---

## Estructura

```
album/
├── server.js            # HTTP + API + SSE + SQLite + ZIP + QR
├── qrcode-generator.js  # Generación de QR sin dependencias
├── package.json
├── album.db             # SQLite (se crea solo; en .gitignore)
├── fotos/               # Imágenes subidas (se crea solo; en .gitignore)
└── public/
    ├── subir.html / subir.js    # Landing de invitados
    ├── album.html / landing.js  # Landing de la quinceañera (galería + estadísticas)
    ├── login.html               # Login
    └── style.css
```

Tabla `fotos`: `id`, `archivo`, `autor`, `fecha`.

---

## Cómo funciona el QR

`GET /api/qr` genera el PNG a partir del host de la petición, apuntando a `/subir`.
Para obtener el QR definitivo, ábrelo **desde el dominio público**:

```
https://TU-DOMINIO/api/qr
```

Guárdalo e imprímelo en la invitación. También puedes generar cualquier QR con
`/api/qr?data=<texto>`.

---

## Deploy

Necesita **Node >= 22 + disco persistente** (la base SQLite y las fotos no pueden vivir
en un filesystem efímero). Por eso **Vercel / Netlify no sirven**. Opciones válidas:

| Host | Disco persistente | Notas |
|---|---|---|
| **Railway** | Volume | La más simple: conecta el repo, detecta Node y arranca solo. |
| **Render** | Disco (plan pago) | Web Service + Persistent Disk. |
| **Fly.io** | Volume | Requiere CLI/Docker. |
| **VPS** | Todo el disco | Con `pm2`/`systemd` + Caddy/Nginx para HTTPS. |

Pasos (ejemplo Railway):

1. Sube el repositorio a GitHub.
2. **New Project → Deploy from repo**, Root Directory = `03/album`.
3. Variables de entorno:
   - `ADMIN_PASSWORD` = tu contraseña real.
   - `DATA_DIR` = ruta del volumen (p. ej. `/data`).
4. Crea un **Volume** y móntalo en esa misma ruta (p. ej. `/data`).
5. Comandos: Build `npm install` (no-op), Start `npm start`.
6. Abre `https://TU-DOMINIO/` → redirige a `/subir`. El QR sale de `https://TU-DOMINIO/api/qr`.

Con `DATA_DIR` apuntando al volumen, `album.db` y `fotos/` sobreviven a los redeploys.

> **HTTPS**: los hostings anteriores lo dan gratis. Solo la webcam del portátil
> (`getUserMedia`) exige contexto seguro (HTTPS o `localhost`); en el celular los
> invitados usan la cámara nativa y no lo necesitan.

---

## Seguridad

- Cookie de sesión `HttpOnly` (+ `Secure` automático si la conexión es HTTPS).
- Sesión con caducidad de **3 h de inactividad** (se guarda en memoria: al reiniciar
  el server hay que volver a iniciar sesión).
- Comparación de contraseña con `timingSafeEqual`.
- **Rate-limit** del login: 5 intentos fallidos por IP cada 10 min.
- `/api/fotos`, `/api/eventos`, `/api/descargar` y `DELETE` requieren sesión.
- Protección contra *path traversal* en `/fotos/`.
- El servidor avisa en consola si arranca con la contraseña por defecto.

---

## Limpiar los datos de prueba

Antes de usarlo en la fiesta, borra las fotos y la base de prueba:

```bash
# con el servidor detenido
rm -rf fotos album.db        # Linux/macOS
Remove-Item fotos,album.db -Recurse -Force   # Windows PowerShell
```

Se regeneran vacíos al arrancar de nuevo.

---

## Prueba recomendada (en un celular real)

1. En el portátil: `node server.js` y abre `http://<IP-del-portatil>:3005/` (permite el
   puerto en el firewall).
2. Escanea el QR con el celular.
3. Escribe tu nombre → **📸 Tomar foto** y **🖼️ Elegir fotos** (varias).
4. En el portátil entra a `/album`, inicia sesión y comprueba:
   - la foto **aparece al instante** (SSE),
   - **⬇️ Descargar** y **🗑️ Eliminar** funcionan,
   - **⬇️ Descargar todas** genera el ZIP.
