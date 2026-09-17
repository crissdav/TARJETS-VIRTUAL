const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { DatabaseSync } = require('node:sqlite');
const qrcode = require('./qrcode-generator.js');

const PORT = process.env.PORT || 3005;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const FOTOS_DIR = path.join(ROOT, 'fotos');
const DB_PATH = path.join(ROOT, 'album.db');
const MAX_BYTES = 30 * 1024 * 1024;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'xv2026grecia';
const COOKIE_NAME = 'xa_sesion';
const SESSION_IDLE_MS = 3 * 60 * 60 * 1000;
const sessions = new Map();

if (!fs.existsSync(FOTOS_DIR)) fs.mkdirSync(FOTOS_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS fotos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    archivo TEXT NOT NULL,
    autor TEXT NOT NULL DEFAULT 'Invitado',
    fecha TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  )
`);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp'
};

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), 'application/json; charset=utf-8');
}

/* ── Sesión ─────────────────────────────────────────────── */
function passwordMatches(input, expected) {
  const a = Buffer.from(String(input || ''));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function issueSession() {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, Date.now() + SESSION_IDLE_MS);
  return token;
}

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

function isAuthed(req) {
  const token = getCookie(req, COOKIE_NAME);
  const exp = sessions.get(token);
  if (!exp) return false;
  if (exp < Date.now()) {
    sessions.delete(token);
    return false;
  }
  sessions.set(token, Date.now() + SESSION_IDLE_MS);
  return true;
}

function setSessionCookie(res, req, token) {
  const https = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim() === 'https';
  const parts = [
    COOKIE_NAME + '=' + token,
    'Path=/',
    'HttpOnly',
    'Max-Age=' + Math.floor(SESSION_IDLE_MS / 1000),
    'SameSite=Lax'
  ];
  if (https) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(res, req) {
  const https = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim() === 'https';
  let cookie = COOKIE_NAME + '=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax';
  if (https) cookie += '; Secure';
  res.setHeader('Set-Cookie', cookie);
}

/* ── QR → PNG (sin dependencias) ─────────────────────────── */
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function qrPngBytes(data) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const q = qrcode(0, 'M');
  q.addData(String(data));
  q.make();
  const n = q.getModuleCount();
  const cell = 8;
  const margin = 4 * cell;
  const px = n * cell + margin * 2;
  const raw = Buffer.alloc(px * (px * 3 + 1));
  for (let y = 0; y < px; y++) {
    const rowStart = y * (px * 3 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < px; x++) {
      const mx = x - margin, my = y - margin;
      const dark = mx >= 0 && my >= 0 && mx < n * cell && my < n * cell &&
        q.isDark(Math.floor(my / cell), Math.floor(mx / cell));
      const i = rowStart + 1 + x * 3;
      raw[i] = dark ? 0 : 255;
      raw[i + 1] = dark ? 0 : 255;
      raw[i + 2] = dark ? 0 : 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(px, 0);
  ihdr.writeUInt32BE(px, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

/* ── Utilidades ──────────────────────────────────────────── */
function baseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const host = req.headers.host || ('localhost:' + PORT);
  return proto + '://' + host;
}

function serveStatic(res, urlPath, raiz) {
  let filePath = path.normalize(path.join(raiz, urlPath));
  if (!filePath.startsWith(raiz)) {
    send(res, 403, 'Prohibido', 'text/plain; charset=utf-8');
    return;
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    send(res, 404, 'No encontrado', 'text/plain; charset=utf-8');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  send(res, 200, fs.readFileSync(filePath), MIME[ext] || 'application/octet-stream');
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => {
      data += c;
      if (data.length > 1e6) {
        reject(new Error('cuerpo demasiado grande'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(new Error('JSON inválido')); }
    });
    req.on('error', e => reject(e));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  try {
    /* ---------- Login de la quinceañera ---------- */
    if (p === '/api/login' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (passwordMatches(body.password, ADMIN_PASSWORD)) {
        const token = issueSession();
        setSessionCookie(res, req, token);
        sendJson(res, 200, { ok: true });
      } else {
        sendJson(res, 401, { error: 'Contraseña incorrecta' });
      }
      return;
    }

    /* ---------- Logout ---------- */
    if (p === '/api/logout' && req.method === 'POST') {
      sessions.delete(getCookie(req, COOKIE_NAME));
      clearSessionCookie(res, req);
      sendJson(res, 200, { ok: true });
      return;
    }

    /* ---------- Estado de sesión ---------- */
    if (p === '/api/sesion' && req.method === 'GET') {
      sendJson(res, 200, { ok: isAuthed(req) });
      return;
    }

    /* ---------- QR del enlace de subida (imagen PNG) ---------- */
    if (p === '/api/qr' && req.method === 'GET') {
      const data = url.searchParams.get('data') || (baseUrl(req) + '/subir');
      send(res, 200, qrPngBytes(data), 'image/png');
      return;
    }

    /* ---------- Lista de fotos (pública: la página de subir muestra recientes) ---------- */
    if (p === '/api/fotos' && req.method === 'GET') {
      const rows = db.prepare('SELECT * FROM fotos ORDER BY id DESC').all();
      const items = rows.map(r => ({
        id: r.id,
        url: '/fotos/' + r.archivo,
        autor: r.autor,
        fecha: r.fecha
      }));
      sendJson(res, 200, items);
      return;
    }

    /* ---------- Subir fotos (cuerpo = imagen cruda) ---------- */
    if (p === '/api/subir' && req.method === 'POST') {
      const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const ext = EXT_BY_MIME[mime];
      if (!ext) {
        sendJson(res, 415, { error: 'Formato no permitido. Usa JPG, PNG, GIF o WebP.' });
        return;
      }
      const autor = String(req.headers['x-nombre'] || '').trim().slice(0, 60) || 'Invitado';
      const total = Number(req.headers['content-length'] || 0);
      if (total > MAX_BYTES) {
        sendJson(res, 413, { error: 'La foto supera los 30 MB.' });
        return;
      }

      const nombre = Date.now() + '-' + crypto.randomBytes(6).toString('hex') + ext;
      const destino = path.join(FOTOS_DIR, nombre);
      let recibidos = 0;
      let terminado = false;
      const out = fs.createWriteStream(destino);

      const cerrar = (code, msg) => {
        if (terminado) return;
        terminado = true;
        try { fs.unlinkSync(destino); } catch (e) { /* sin archivo */ }
        sendJson(res, code, msg);
      };

      req.on('data', c => {
        recibidos += c.length;
        if (recibidos > MAX_BYTES) {
          req.destroy();
          cerrar(413, { error: 'La foto supera los 30 MB.' });
        }
      });

      out.on('error', () => cerrar(500, { error: 'No se pudo guardar la foto.' }));

      req.on('end', () => {
        if (terminado) return;
        out.end(() => {
          terminado = true;
          const info = db.prepare('INSERT INTO fotos (archivo, autor) VALUES (?, ?)').run(nombre, autor);
          const row = db.prepare('SELECT * FROM fotos WHERE id = ?').get(Number(info.lastInsertRowid));
          sendJson(res, 201, {
            id: row.id,
            url: '/fotos/' + row.archivo,
            autor: row.autor,
            fecha: row.fecha
          });
        });
      });

      req.on('error', () => cerrar(500, { error: 'Error recibiendo la foto.' }));
      req.pipe(out);
      return;
    }

    /* ---------- Estáticos: /fotos/<archivo> ---------- */
    if (p.startsWith('/fotos/')) {
      const rel = p.slice('/fotos/'.length).replace(/[^A-Za-z0-9.\-_]/g, '');
      const filePath = path.normalize(path.join(FOTOS_DIR, rel));
      if (!filePath.startsWith(FOTOS_DIR) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        send(res, 404, 'No encontrado', 'text/plain; charset=utf-8');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      send(res, 200, fs.readFileSync(filePath), MIME[ext] || 'application/octet-stream');
      return;
    }

    /* ---------- Páginas ---------- */
    if (p === '/') {
      serveStatic(res, '/escanea.html', PUBLIC);
      return;
    }
    if (p === '/subir') {
      serveStatic(res, '/subir.html', PUBLIC);
      return;
    }
    if (p === '/album') {
      if (isAuthed(req)) {
        serveStatic(res, '/album.html', PUBLIC);
      } else {
        serveStatic(res, '/login.html', PUBLIC);
      }
      return;
    }
    if (p === '/login') {
      serveStatic(res, '/login.html', PUBLIC);
      return;
    }

    /* ---------- 404 API ---------- */
    if (p.startsWith('/api/')) {
      sendJson(res, 404, { error: 'ruta no encontrada' });
      return;
    }

    serveStatic(res, p, PUBLIC);
  } catch (err) {
    sendJson(res, 500, { error: String(err.message || err) });
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ALBUM XV — GRECIA PEÑA (Noche de Mascaras)');
  console.log('  -------------------------------------------');
  console.log('  Landing para escanear QR:  http://localhost:' + PORT + '/');
  console.log('  Pagina para subir:         http://localhost:' + PORT + '/subir');
  console.log('  Landing quinceanera:       http://localhost:' + PORT + '/album');
  console.log('  Contraseña admin:          ' + ADMIN_PASSWORD);
  console.log('  API fotos:                 http://localhost:' + PORT + '/api/fotos');
  console.log('');
});