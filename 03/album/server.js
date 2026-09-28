const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { DatabaseSync } = require('node:sqlite');
const qrcode = require('./qrcode-generator.js');

const PORT = process.env.PORT || 3005;
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : ROOT;
const PUBLIC = path.join(ROOT, 'public');
const FOTOS_DIR = path.join(DATA_DIR, 'fotos');
const DB_PATH = path.join(DATA_DIR, 'album.db');
const MAX_BYTES = 30 * 1024 * 1024;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'xv2026grecia';
const COOKIE_NAME = 'xa_sesion';
const SESSION_IDLE_MS = 3 * 60 * 60 * 1000;
const sessions = new Map();
const loginAttempts = new Map();
const LOGIN_MAX = 5;
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
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

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket.remoteAddress || 'desconocido';
}

function loginBlockRemaining(req) {
  const ip = clientIp(req);
  const rec = loginAttempts.get(ip);
  if (!rec) return 0;
  const rem = rec.until - Date.now();
  if (rem <= 0) {
    loginAttempts.delete(ip);
    return 0;
  }
  return rec.count >= LOGIN_MAX ? rem : 0;
}

function recordLoginFailure(req) {
  const ip = clientIp(req);
  const now = Date.now();
  let rec = loginAttempts.get(ip);
  if (!rec || rec.until <= now) rec = { count: 0, until: now + LOGIN_WINDOW_MS };
  rec.count += 1;
  if (rec.count >= LOGIN_MAX) rec.until = now + LOGIN_WINDOW_MS;
  loginAttempts.set(ip, rec);
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

/* ── Tiempo real (SSE) ───────────────────────────────────── */
const sseClients = new Set();

function broadcastFotos() {
  for (const client of sseClients) {
    try { client.write('event: fotos\ndata: {}\n\n'); }
    catch (e) { sseClients.delete(client); }
  }
}

/* ── ZIP sin dependencias (método almacenado) ────────────── */
function zipStore(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const crc = zlib.crc32(entry.data) >>> 0;
    const size = entry.data.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, entry.data);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(size, 20);
    cd.writeUInt32LE(size, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);

    offset += local.length + nameBuf.length + size;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...chunks, centralBuf, end]);
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
      const bloqueo = loginBlockRemaining(req);
      if (bloqueo > 0) {
        res.setHeader('Retry-After', String(Math.ceil(bloqueo / 1000)));
        sendJson(res, 429, { error: 'Demasiados intentos. Espera ' + Math.ceil(bloqueo / 60000) + ' min.' });
        return;
      }
      const body = await readJsonBody(req);
      if (passwordMatches(body.password, ADMIN_PASSWORD)) {
        loginAttempts.delete(clientIp(req));
        const token = issueSession();
        setSessionCookie(res, req, token);
        sendJson(res, 200, { ok: true });
      } else {
        recordLoginFailure(req);
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

    /* ---------- Eventos en vivo (SSE) — solo la quinceañera ---------- */
    if (p === '/api/eventos' && req.method === 'GET') {
      if (!isAuthed(req)) {
        sendJson(res, 401, { error: 'no autorizado' });
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      res.write('retry: 3000\n\n');
      sseClients.add(res);
      const ping = setInterval(() => {
        try { res.write(': ping\n\n'); } catch (e) { /* cliente cerrado */ }
      }, 25000);
      req.on('close', () => {
        clearInterval(ping);
        sseClients.delete(res);
      });
      return;
    }

    /* ---------- Lista completa de fotos — solo la quinceañera ---------- */
    if (p === '/api/fotos' && req.method === 'GET') {
      if (!isAuthed(req)) {
        sendJson(res, 401, { error: 'no autorizado' });
        return;
      }
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

    /* ---------- Semáforo público de fotos recientes (página de invitados) ---------- */
    if (p === '/api/recientes' && req.method === 'GET') {
      const rows = db.prepare('SELECT id, archivo FROM fotos ORDER BY id DESC LIMIT 30').all();
      sendJson(res, 200, rows.map(r => ({ id: r.id, url: '/fotos/' + r.archivo })));
      return;
    }

    /* ---------- Eliminar una foto — solo la quinceañera ---------- */
    const delMatch = p.match(/^\/api\/fotos\/(\d+)$/);
    if (delMatch && req.method === 'DELETE') {
      if (!isAuthed(req)) {
        sendJson(res, 401, { error: 'no autorizado' });
        return;
      }
      const id = Number(delMatch[1]);
      const row = db.prepare('SELECT * FROM fotos WHERE id = ?').get(id);
      if (!row) {
        sendJson(res, 404, { error: 'Foto no encontrada' });
        return;
      }
      db.prepare('DELETE FROM fotos WHERE id = ?').run(id);
      try { fs.unlinkSync(path.join(FOTOS_DIR, row.archivo)); } catch (e) { /* ya no existe */ }
      broadcastFotos();
      sendJson(res, 200, { ok: true });
      return;
    }

    /* ---------- Descargar todas (ZIP) — solo la quinceañera ---------- */
    if (p === '/api/descargar' && req.method === 'GET') {
      if (!isAuthed(req)) {
        sendJson(res, 401, { error: 'no autorizado' });
        return;
      }
      const rows = db.prepare('SELECT * FROM fotos ORDER BY id ASC').all();
      const entries = [];
      rows.forEach(r => {
        const fp = path.join(FOTOS_DIR, r.archivo);
        if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
          entries.push({ name: r.archivo, data: fs.readFileSync(fp) });
        }
      });
      const zip = zipStore(entries);
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="album-xv-grecia.zip"',
        'Content-Length': zip.length,
        'Cache-Control': 'no-store'
      });
      res.end(zip);
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
          broadcastFotos();
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
      res.writeHead(302, { Location: '/subir' });
      res.end();
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
  console.log('  Pagina para subir (QR):    http://localhost:' + PORT + '/subir');
  console.log('  Landing quinceanera:       http://localhost:' + PORT + '/album');
  console.log('  Contraseña admin:          ' + (process.env.ADMIN_PASSWORD ? '(definida por variable de entorno)' : ADMIN_PASSWORD));
  if (!process.env.ADMIN_PASSWORD) {
    console.log('  ⚠️  Usando contraseña por defecto. En producción define ADMIN_PASSWORD.');
  }
  console.log('  API fotos:                 http://localhost:' + PORT + '/api/fotos');
  console.log('');
});