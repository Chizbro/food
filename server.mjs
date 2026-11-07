// Serves the static site and POST /api/publish.
// The file the site reads is DATA_DIR/data.json (on lab1, ~/data/food).
// After that write succeeds, the same bytes are committed to the repo.
// A GitHub failure still leaves the lab file in place.

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = process.env.DATA_DIR || '/data';
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const STATIC_DIR = path.resolve(process.env.STATIC_DIR || 'public');
const EDIT_TOKEN = process.env.EDIT_TOKEN || '';
const GH_TOKEN = process.env.GH_TOKEN || '';
const GH_REPO = process.env.GH_REPO || 'Chizbro/food';
const GH_BRANCH = process.env.GH_BRANCH || 'main';
const MAX_BODY = 2_000_000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function authorized(req) {
  if (!EDIT_TOKEN) return false;
  const got = Buffer.from(req.headers.authorization || '');
  const want = Buffer.from(`Bearer ${EDIT_TOKEN}`);
  if (got.length !== want.length) return false;
  return crypto.timingSafeEqual(got, want);
}

function send(res, status, body, headers = {}) {
  const payload = Buffer.from(body);
  res.writeHead(status, { 'Content-Length': payload.length, ...headers });
  res.end(payload);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function seedDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.copyFile(path.join(STATIC_DIR, 'data.json'), DATA_FILE);
  }
}

async function writeData(text) {
  const tmp = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmp, text);
  await fs.rename(tmp, DATA_FILE);
}

// Returns true when the repo matches `text` afterwards.
async function commitData(text) {
  if (!GH_TOKEN) return false;
  const api = `https://api.github.com/repos/${GH_REPO}/contents/data.json`;
  const headers = {
    Authorization: `Bearer ${GH_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'eating-the-world',
    'Content-Type': 'application/json',
  };
  const cur = await fetch(`${api}?ref=${encodeURIComponent(GH_BRANCH)}`, { headers });
  let sha;
  if (cur.ok) {
    const info = await cur.json();
    const current = Buffer.from(info.content || '', 'base64').toString('utf8');
    if (current === text) return true;
    sha = info.sha;
  } else if (cur.status !== 404) {
    console.error('github read failed', cur.status);
    return false;
  }
  const res = await fetch(api, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: 'Update data.json',
      content: Buffer.from(text).toString('base64'),
      sha,
      branch: GH_BRANCH,
    }),
  });
  if (res.ok) return true;
  const detail = await res.text();
  if (/identical/i.test(detail)) return true;
  console.error('github write failed', res.status);
  return false;
}

async function publish(req, res) {
  if (!authorized(req)) return send(res, 401, 'Unauthorized', { 'Content-Type': 'text/plain; charset=utf-8' });
  let data;
  try {
    data = JSON.parse(await readBody(req));
  } catch (err) {
    const status = err.status || 400;
    return send(res, status, status === 413 ? 'Too large' : 'Bad JSON', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return send(res, 400, 'Expected a JSON object', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
  const text = JSON.stringify(data, null, 2) + '\n';
  await writeData(text);
  let github = false;
  try {
    github = await commitData(text);
  } catch (err) {
    console.error('github commit error', err.message);
  }
  if (!github) console.error('published locally; github backup failed');
  return sendJson(res, 200, { published: true, github });
}

async function serveStatic(req, res, url) {
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = rel === 'data.json' ? DATA_FILE : path.resolve(STATIC_DIR, rel);
  if (rel !== 'data.json' && !file.startsWith(STATIC_DIR + path.sep)) {
    return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
  try {
    const body = await fs.readFile(file);
    const type = MIME[path.extname(file)] || 'application/octet-stream';
    const headers = { 'Content-Type': type };
    if (rel === 'sw.js' || rel === 'data.json') headers['Cache-Control'] = 'no-cache';
    send(res, 200, body, headers);
  } catch {
    send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  try {
    if (req.method === 'POST' && url.pathname === '/api/publish') return await publish(req, res);
    if (req.method === 'GET' || req.method === 'HEAD') return await serveStatic(req, res, url);
    send(res, 405, 'Method not allowed', { 'Content-Type': 'text/plain; charset=utf-8' });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) send(res, 500, 'Failed', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
});

await seedDataFile();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`listening on ${PORT}`);
});
