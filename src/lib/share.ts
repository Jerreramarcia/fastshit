import type { ExportedBundle } from "./graphTypes";

/**
 * Dos formas de compartir un flujo:
 *
 * - `snapshot`: el bundle entero comprimido dentro del hash de la URL (`#/v?d=...`).
 *   No toca la red, no necesita cuenta, pero es una foto fija: si seguis editando,
 *   quien tenga el link sigue viendo el estado viejo. Ademas la URL crece con el flujo.
 * - `live`: el bundle vive en un gist y la URL solo lleva su id (`#/v?g=owner/id`).
 *   La URL es corta, estable y la misma para siempre: cada vez que se publica se
 *   actualiza el gist, y quien tenga el link ve el estado nuevo al refrescar.
 */

const TOKEN_KEY = "fastshit.githubToken";
const SESSION_KEY = "fastshit.liveSession";
const GIST_FILENAME = "flow.json";

/** Por encima de esto, pegar la URL en Slack/WhatsApp/Jira la puede truncar. */
export const SNAPSHOT_SAFE_LIMIT = 2000;
export const SNAPSHOT_MAX_LIMIT = 8000;

export interface LiveSession {
  owner: string;
  gistId: string;
  updatedAt: string;
}

// ---------------------------------------------------------------- compresion

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  void writer.write(new TextEncoder().encode(text));
  void writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

async function gunzip(bytes: Uint8Array): Promise<string> {
  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  void writer.write(bytes);
  void writer.close();
  return new Response(stream.readable).text();
}

export async function encodeBundle(bundle: ExportedBundle): Promise<string> {
  return toBase64Url(await gzip(JSON.stringify(bundle)));
}

export async function decodeBundle(encoded: string): Promise<ExportedBundle> {
  return JSON.parse(await gunzip(fromBase64Url(encoded))) as ExportedBundle;
}

// ---------------------------------------------------------------------- URLs

function viewerBase(): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${window.location.origin}${base}`;
}

export async function buildSnapshotUrl(bundle: ExportedBundle): Promise<string> {
  return `${viewerBase()}#/v?d=${await encodeBundle(bundle)}`;
}

export function buildLiveUrl(session: Pick<LiveSession, "owner" | "gistId">): string {
  return `${viewerBase()}#/v?g=${session.owner}/${session.gistId}`;
}

export type ShareTarget = { kind: "snapshot"; encoded: string } | { kind: "live"; owner: string; gistId: string };

/** Lee el hash de la URL actual. `null` si no es un link de visor. */
export function parseShareHash(hash: string): ShareTarget | null {
  const match = /^#\/v\?(.*)$/.exec(hash);
  if (!match) return null;
  const params = new URLSearchParams(match[1]);

  const live = params.get("g");
  if (live) {
    const [owner, gistId] = live.split("/");
    if (owner && gistId) return { kind: "live", owner, gistId };
  }

  const encoded = params.get("d");
  if (encoded) return { kind: "snapshot", encoded };

  return null;
}

// --------------------------------------------------------------- token local

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* modo privado: compartir en vivo no va a funcionar, el snapshot si */
  }
}

export function getLiveSession(): LiveSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as LiveSession) : null;
  } catch {
    return null;
  }
}

export function setLiveSession(session: LiveSession | null) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignorar */
  }
}

// ----------------------------------------------------------------- gists API

function gistBody(bundle: ExportedBundle) {
  return {
    description: "fastShit flow - sesion compartida",
    files: { [GIST_FILENAME]: { content: JSON.stringify(bundle, null, 2) } },
  };
}

async function githubError(res: Response): Promise<string> {
  let detail = "";
  try {
    const body = (await res.json()) as { message?: string };
    detail = body.message ? ` - ${body.message}` : "";
  } catch {
    /* sin cuerpo util */
  }
  if (res.status === 401) return "Token rechazado (401). Revisa que siga vigente y tenga permiso de Gists.";
  if (res.status === 403) return "GitHub devolvio 403: al token le falta el permiso de Gists (read/write).";
  if (res.status === 404) return "Gist no encontrado (404). Pudo borrarse, o el token no es de su dueño.";
  return `GitHub respondio ${res.status}${detail}`;
}

/** Crea el gist de la sesion. Secreto: no se lista, pero quien tenga el id lo lee. */
export async function createLiveSession(token: string, bundle: ExportedBundle): Promise<LiveSession> {
  const res = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...gistBody(bundle), public: false }),
  });
  if (!res.ok) throw new Error(await githubError(res));
  const data = (await res.json()) as { id: string; owner?: { login: string } };
  if (!data.owner?.login) throw new Error("El gist se creo sin dueño: el token no esta asociado a una cuenta.");
  return { owner: data.owner.login, gistId: data.id, updatedAt: new Date().toISOString() };
}

/** Sobreescribe el gist existente. La URL compartida no cambia. */
export async function publishToLiveSession(
  token: string,
  session: LiveSession,
  bundle: ExportedBundle
): Promise<LiveSession> {
  const res = await fetch(`https://api.github.com/gists/${session.gistId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(gistBody(bundle)),
  });
  if (!res.ok) throw new Error(await githubError(res));
  return { ...session, updatedAt: new Date().toISOString() };
}

/**
 * Lee el bundle de una sesion en vivo. Va por `gist.githubusercontent.com` y no por
 * la API a proposito: la API sin autenticar permite solo 60 peticiones/hora por IP, y
 * varios compañeros detras del mismo NAT la agotan enseguida. El raw va por CDN.
 * Ese CDN responde `max-age=300`, asi que sin romper la cache veriamos hasta 5
 * minutos de retraso: el parametro `t` fuerza una entrada nueva en cada consulta.
 */
export async function fetchLiveBundle(owner: string, gistId: string): Promise<ExportedBundle> {
  const url = `https://gist.githubusercontent.com/${owner}/${gistId}/raw/${GIST_FILENAME}?t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) throw new Error("No existe ese flujo compartido (404). Puede haberse borrado.");
  if (!res.ok) throw new Error(`No se pudo leer el flujo compartido (${res.status}).`);
  return (await res.json()) as ExportedBundle;
}
