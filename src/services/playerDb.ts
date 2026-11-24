import { PersistedGameState, PlayerSession } from '../scene/types';

interface AuthApiResponse {
  token: string;
  user: {
    username: string;
    dbFile: string;
    updatedAt: string;
  };
  gamestate: Partial<PersistedGameState>;
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    if (data && typeof data.error === 'string' && data.error.trim().length > 0) {
      return data.error;
    }
  } catch {
    // Ignore non-JSON error body
  }
  return fallback;
}

export async function checkSqliteBackend(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean; sqlite?: boolean };
    return Boolean(data.ok && data.sqlite);
  } catch {
    return false;
  }
}

export async function registerPlayerAccount(
  username: string,
  password: string,
  initialState: PersistedGameState,
): Promise<{ session: PlayerSession; gamestate: Partial<PersistedGameState> }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, gamestate: initialState }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Registration failed.'));
  }
  const data = (await res.json()) as AuthApiResponse;
  return {
    session: {
      token: data.token,
      username: data.user.username,
      dbFile: data.user.dbFile,
      updatedAt: data.user.updatedAt,
    },
    gamestate: data.gamestate,
  };
}

export async function loginPlayerAccount(
  username: string,
  password: string,
): Promise<{ session: PlayerSession; gamestate: Partial<PersistedGameState> }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Sign in failed.'));
  }
  const data = (await res.json()) as AuthApiResponse;
  return {
    session: {
      token: data.token,
      username: data.user.username,
      dbFile: data.user.dbFile,
      updatedAt: data.user.updatedAt,
    },
    gamestate: data.gamestate,
  };
}

export async function savePlayerGameState(
  token: string,
  gamestate: PersistedGameState,
): Promise<{ updatedAt: string }> {
  const res = await fetch('/api/gamestate', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ gamestate }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Could not save progress.'));
  }
  const data = (await res.json()) as { updatedAt: string };
  return { updatedAt: data.updatedAt };
}

export async function downloadPlayerSqliteDb(
  token: string,
  username: string,
): Promise<void> {
  const res = await fetch('/api/gamestate/export', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, 'Could not export database.'));
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${username.toLowerCase()}_orchard.sqlite`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
