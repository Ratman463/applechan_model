import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Ephemeral fallback secret for signing Bearer tokens when SESSION_SECRET is unset
const TOKEN_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_GAMESTATE_BYTES = 64 * 1024; // 64 KB cap per save payload
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,24}$/;

const USERS_DB_DIR = path.resolve(__dirname, 'data', 'users');
fs.mkdirSync(USERS_DB_DIR, { recursive: true });

interface AuthedRequest extends Request {
  authUsername?: string;
}

interface PlayerRow {
  id: number;
  username: string;
  password_hash: string;
  gamestate: string;
  created_at: string;
  updated_at: string;
}

/**
 * Strictly validates and resolves a user's individual SQLite database path
 * inside data/users/<normalized_username>.sqlite with trailing path.sep confinement.
 */
function resolveUserDbPath(rawUsername: string): { username: string; dbPath: string } | null {
  const trimmed = rawUsername.trim();
  if (!USERNAME_PATTERN.test(trimmed)) return null;
  const slug = trimmed.toLowerCase();
  const dbPath = path.resolve(USERS_DB_DIR, `${slug}.sqlite`);
  if (!dbPath.startsWith(USERS_DB_DIR + path.sep)) {
    return null;
  }
  return { username: trimmed, dbPath };
}

function openUserDatabase(dbPath: string): DatabaseSync {
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_account (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      gamestate TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function signAuthToken(username: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: username,
      iat: Date.now(),
      exp: Date.now() + TOKEN_TTL_MS,
    }),
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAuthToken(token: string): string | null {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payload || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { sub?: unknown; exp?: unknown };
    if (typeof decoded.sub !== 'string' || typeof decoded.exp !== 'number') {
      return null;
    }
    if (Date.now() > decoded.exp) return null;
    if (!USERNAME_PATTERN.test(decoded.sub)) return null;
    return decoded.sub;
  } catch {
    return null;
  }
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const token = header.slice('Bearer '.length).trim();
  const username = verifyAuthToken(token);
  if (!username) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
    return;
  }
  req.authUsername = username;
  next();
}

function serializeValidGameState(raw: unknown): string | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  try {
    const json = JSON.stringify(raw);
    if (Buffer.byteLength(json, 'utf8') > MAX_GAMESTATE_BYTES) {
      return null;
    }
    return json;
  } catch {
    return null;
  }
}

const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 25;
const authAttemptsByIp = new Map<string, { count: number; resetAt: number }>();

function authRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  if (authAttemptsByIp.size > 2000) {
    for (const [key, entry] of authAttemptsByIp.entries()) {
      if (now >= entry.resetAt) authAttemptsByIp.delete(key);
    }
  }
  const existing = authAttemptsByIp.get(ip);
  if (!existing || now >= existing.resetAt) {
    authAttemptsByIp.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    next();
    return;
  }
  existing.count += 1;
  if (existing.count > AUTH_MAX_ATTEMPTS) {
    res.status(429).json({ error: 'Too many authentication attempts. Please try again later.' });
    return;
  }
  next();
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(['/api/auth', '/api/gamestate'], (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Health probe
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, sqlite: true });
  });

  // Register a new player with their own individual SQLite database file
  app.post('/api/auth/register', authRateLimit, (req: Request, res: Response) => {
    const body = req.body as {
      username?: unknown;
      password?: unknown;
      gamestate?: unknown;
    };

    if (typeof body.username !== 'string' || typeof body.password !== 'string') {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const resolved = resolveUserDbPath(body.username);
    if (!resolved) {
      res.status(400).json({
        error: 'Username must be 3-24 characters (letters, numbers, _ or -).',
      });
      return;
    }

    if (body.password.length < 6 || body.password.length > 128) {
      res.status(400).json({
        error: 'Password must be between 6 and 128 characters.',
      });
      return;
    }

    if (fs.existsSync(resolved.dbPath)) {
      res.status(409).json({ error: 'Username already exists. Please sign in.' });
      return;
    }

    const gamestateJson = serializeValidGameState(body.gamestate ?? {});
    if (!gamestateJson) {
      res.status(400).json({ error: 'Invalid game state payload.' });
      return;
    }

    const now = new Date().toISOString();
    const passwordHash = hashPassword(body.password);

    let db: DatabaseSync | null = null;
    try {
      db = openUserDatabase(resolved.dbPath);
      const insertStmt = db.prepare(
        `INSERT INTO player_account (id, username, password_hash, gamestate, created_at, updated_at)
         VALUES (1, ?, ?, ?, ?, ?)`,
      );
      insertStmt.run(resolved.username, passwordHash, gamestateJson, now, now);

      const token = signAuthToken(resolved.username);
      res.status(201).json({
        token,
        user: {
          username: resolved.username,
          dbFile: `${resolved.username.toLowerCase()}.sqlite`,
          updatedAt: now,
        },
        gamestate: JSON.parse(gamestateJson),
      });
    } catch {
      res.status(500).json({ error: 'Could not create player database.' });
    } finally {
      db?.close();
    }
  });

  // Sign in to an existing player's individual SQLite database
  app.post('/api/auth/login', authRateLimit, (req: Request, res: Response) => {
    const body = req.body as { username?: unknown; password?: unknown };
    if (typeof body.username !== 'string' || typeof body.password !== 'string') {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }

    const resolved = resolveUserDbPath(body.username);
    if (!resolved || !fs.existsSync(resolved.dbPath)) {
      res.status(401).json({ error: 'Invalid username or password.' });
      return;
    }

    let db: DatabaseSync | null = null;
    try {
      db = openUserDatabase(resolved.dbPath);
      const selectStmt = db.prepare(
        `SELECT id, username, password_hash, gamestate, created_at, updated_at
         FROM player_account WHERE id = 1`,
      );
      const row = selectStmt.get() as PlayerRow | undefined;
      if (!row || !verifyPassword(body.password, row.password_hash)) {
        res.status(401).json({ error: 'Invalid username or password.' });
        return;
      }

      const token = signAuthToken(row.username);
      let parsedState: unknown = {};
      try {
        parsedState = JSON.parse(row.gamestate);
      } catch {
        parsedState = {};
      }

      res.json({
        token,
        user: {
          username: row.username,
          dbFile: `${row.username.toLowerCase()}.sqlite`,
          updatedAt: row.updated_at,
        },
        gamestate: parsedState,
      });
    } catch {
      res.status(500).json({ error: 'Could not read player database.' });
    } finally {
      db?.close();
    }
  });

  // Read authenticated player's saved gamestate from their individual SQLite database
  app.get('/api/gamestate', requireAuth, (req: AuthedRequest, res: Response) => {
    const resolved = resolveUserDbPath(req.authUsername || '');
    if (!resolved || !fs.existsSync(resolved.dbPath)) {
      res.status(404).json({ error: 'Player database not found.' });
      return;
    }

    let db: DatabaseSync | null = null;
    try {
      db = openUserDatabase(resolved.dbPath);
      const row = db
        .prepare(`SELECT username, gamestate, updated_at FROM player_account WHERE id = 1`)
        .get() as { username: string; gamestate: string; updated_at: string } | undefined;
      if (!row) {
        res.status(404).json({ error: 'Player record not found.' });
        return;
      }
      res.json({
        user: {
          username: row.username,
          dbFile: `${row.username.toLowerCase()}.sqlite`,
          updatedAt: row.updated_at,
        },
        gamestate: JSON.parse(row.gamestate),
      });
    } catch {
      res.status(500).json({ error: 'Could not load game state.' });
    } finally {
      db?.close();
    }
  });

  // Persist authenticated player's gamestate into their individual SQLite database
  app.put('/api/gamestate', requireAuth, (req: AuthedRequest, res: Response) => {
    const resolved = resolveUserDbPath(req.authUsername || '');
    if (!resolved || !fs.existsSync(resolved.dbPath)) {
      res.status(404).json({ error: 'Player database not found.' });
      return;
    }

    const body = req.body as { gamestate?: unknown };
    const gamestateJson = serializeValidGameState(body.gamestate);
    if (!gamestateJson) {
      res.status(400).json({ error: 'Invalid or oversized game state payload.' });
      return;
    }

    const now = new Date().toISOString();
    let db: DatabaseSync | null = null;
    try {
      db = openUserDatabase(resolved.dbPath);
      db.prepare(`UPDATE player_account SET gamestate = ?, updated_at = ? WHERE id = 1`).run(
        gamestateJson,
        now,
      );
      res.json({ ok: true, updatedAt: now });
    } catch {
      res.status(500).json({ error: 'Could not save game state.' });
    } finally {
      db?.close();
    }
  });

  // Download authenticated player's individual .sqlite database file
  app.get('/api/gamestate/export', requireAuth, (req: AuthedRequest, res: Response) => {
    const resolved = resolveUserDbPath(req.authUsername || '');
    if (!resolved || !fs.existsSync(resolved.dbPath)) {
      res.status(404).json({ error: 'Player database not found.' });
      return;
    }
    const safeFilename = `${resolved.username.toLowerCase()}_orchard.sqlite`;
    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.sendFile(resolved.dbPath);
  });

  // Live weather proxy (strictly validated lat/lon, hardcoded allowlisted Open-Meteo API)
  app.get('/api/weather', async (req: Request, res: Response) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      res.status(400).json({ error: 'Valid latitude and longitude required.' });
      return;
    }

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat.toFixed(2));
    url.searchParams.set('longitude', lon.toFixed(2));
    url.searchParams.set('current', 'temperature_2m,weather_code,is_day');
    url.searchParams.set('timezone', 'auto');

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const upstream = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timer);

      if (!upstream.ok) {
        res.status(502).json({ error: 'Weather service unavailable.' });
        return;
      }
      const data = (await upstream.json()) as {
        current?: { temperature_2m?: number; weather_code?: number; is_day?: number };
      };
      const cur = data.current;
      if (!cur || typeof cur.weather_code !== 'number') {
        res.status(502).json({ error: 'Unexpected weather payload.' });
        return;
      }
      res.json({
        temperatureC:
          typeof cur.temperature_2m === 'number' ? Math.round(cur.temperature_2m) : null,
        weatherCode: cur.weather_code,
        isDay: cur.is_day === 1,
      });
    } catch {
      res.status(502).json({ error: 'Weather lookup timed out.' });
    }
  });

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  // Mount Vite dev middleware in development, or serve built dist/ in production
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Apple-chan's Orchard server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
