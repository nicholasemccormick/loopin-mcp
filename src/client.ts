// ─────────────────────────────────────────────────────────────────────────────
// LoopIn MCP Server — HTTP client
//
// Wraps every LoopIn REST endpoint with a typed fetch call.
// Reads LOOPIN_API_URL and LOOPIN_API_KEY from the environment.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL: string = (process.env['LOOPIN_API_URL'] ?? 'http://localhost:3002').replace(/\/$/, '');
const API_KEY: string  = process.env['LOOPIN_API_KEY'] ?? '';

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) h['X-API-Key'] = API_KEY;
  return h;
}

async function handleResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }

  if (!res.ok) {
    const msg = typeof body === 'object' && body !== null ? JSON.stringify(body) : text;
    throw new Error(`LoopIn API error ${res.status}: ${msg}`);
  }

  return body;
}

export const client = {
  async get(path: string): Promise<unknown> {
    const res = await fetch(`${BASE_URL}${path}`, { method: 'GET', headers: headers() });
    return handleResponse(res);
  },

  async post(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method:  'POST',
      headers: headers(),
      body:    JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async delete(path: string): Promise<unknown> {
    const res = await fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers: headers() });
    if (res.status === 204) return null;
    return handleResponse(res);
  },
};
