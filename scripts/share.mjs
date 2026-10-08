#!/usr/bin/env node
/**
 * Publica un flow.json y devuelve la URL del visor.
 *
 * La primera vez crea un gist secreto y guarda su id en `.fastshit-share.json`
 * junto al flujo. A partir de ahi, cada ejecucion sobreescribe ESE gist: la URL
 * no cambia nunca, asi que se pasa una sola vez y quien la tenga ve el estado
 * nuevo al refrescar.
 *
 *   node scripts/share.mjs flow.json              # crea o actualiza la sesion
 *   node scripts/share.mjs flow.json --snapshot   # URL con los datos dentro, sin cuenta
 *   node scripts/share.mjs flow.json --url-only   # imprime solo la URL
 *
 * Token: variable de entorno GITHUB_TOKEN (fine-grained, permiso Gists:
 * read/write). Solo hace falta para la sesion viva, no para --snapshot.
 * Base del visor: FASTSHIT_BASE_URL, o se deduce del remote git.
 */

import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const GIST_FILENAME = "flow.json";
const STATE_FILENAME = ".fastshit-share.json";
const SNAPSHOT_MAX_LIMIT = 8000;

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const flowPath = resolve(args.find((a) => !a.startsWith("--")) ?? "flow.json");
const urlOnly = flags.has("--url-only");

if (!existsSync(flowPath)) fail(`no existe ${flowPath}`);

let bundle;
try {
  bundle = JSON.parse(readFileSync(flowPath, "utf8"));
} catch (err) {
  fail(`${flowPath} no es JSON valido: ${err.message}`);
}
if (!Array.isArray(bundle?.sheets)) fail(`${flowPath} no tiene un array "sheets": no parece un bundle de fastShit`);

/** Base del visor: `https://<owner>.github.io/<repo>/`. */
function viewerBase() {
  if (process.env.FASTSHIT_BASE_URL) {
    const base = process.env.FASTSHIT_BASE_URL;
    return base.endsWith("/") ? base : `${base}/`;
  }
  try {
    const remote = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd: dirname(flowPath),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const match = /github\.com[/:]([^/]+)\/([^/.]+)/.exec(remote);
    if (match) return `https://${match[1].toLowerCase()}.github.io/${match[2].toLowerCase()}/`;
  } catch {
    /* sin remote: se usa el fallback */
  }
  fail("no se pudo deducir la URL del visor. Pasa FASTSHIT_BASE_URL=https://<usuario>.github.io/<repo>/");
}

function snapshotUrl() {
  const encoded = gzipSync(Buffer.from(JSON.stringify(bundle)), { level: 9 })
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${viewerBase()}#/v?d=${encoded}`;
}

const statePath = resolve(dirname(flowPath), STATE_FILENAME);

function readState() {
  if (!existsSync(statePath)) return null;
  try {
    return JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    return null;
  }
}

async function github(url, method, token) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "fastshit-share",
    },
    body: JSON.stringify({
      description: "fastShit flow - sesion compartida",
      files: { [GIST_FILENAME]: { content: JSON.stringify(bundle, null, 2) } },
      ...(method === "POST" ? { public: false } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401) fail("GITHUB_TOKEN rechazado (401). Revisa que siga vigente.");
    if (res.status === 403) fail("403: al token le falta el permiso Gists read/write.");
    if (res.status === 404) fail("404: el gist guardado ya no existe. Borra .fastshit-share.json y vuelve a publicar.");
    fail(`GitHub respondio ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  if (flags.has("--snapshot")) {
    const url = snapshotUrl();
    if (urlOnly) {
      console.log(url);
      return;
    }
    console.log(url);
    console.log(`\n${url.length} caracteres.`);
    if (url.length > SNAPSHOT_MAX_LIMIT) {
      console.log("Es larga: pegada en un chat puede cortarse. Publica sin --snapshot para una URL fija y corta.");
    }
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    fail(
      "falta GITHUB_TOKEN (fine-grained, permiso Gists read/write).\n" +
        "       Sin token: node scripts/share.mjs <flow.json> --snapshot"
    );
  }

  const state = readState();
  const existing = state?.gistId && state?.owner ? state : null;

  const data = existing
    ? await github(`https://api.github.com/gists/${existing.gistId}`, "PATCH", token)
    : await github("https://api.github.com/gists", "POST", token);

  const owner = data.owner?.login ?? existing?.owner;
  if (!owner) fail("el gist no tiene dueño: el token no esta asociado a una cuenta.");

  const next = { owner, gistId: data.id, updatedAt: new Date().toISOString() };
  writeFileSync(statePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");

  const url = `${viewerBase()}#/v?g=${owner}/${data.id}`;
  if (urlOnly) {
    console.log(url);
    return;
  }

  const nodes = bundle.sheets.reduce((acc, s) => acc + (s.nodes?.length ?? 0), 0);
  console.log(existing ? "Sesion actualizada (misma URL)." : "Sesion creada.");
  console.log(url);
  console.log(`\n${nodes} nodos en ${bundle.sheets.length} capa(s). Estado en ${STATE_FILENAME}.`);
  if (!existing) console.log("Pasa esa URL una vez: las siguientes publicaciones no la cambian.");
}

await main();
