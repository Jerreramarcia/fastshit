import { useEffect, useState } from "react";
import type { ExportedBundle } from "../lib/graphTypes";
import {
  SNAPSHOT_MAX_LIMIT,
  SNAPSHOT_SAFE_LIMIT,
  buildLiveUrl,
  buildSnapshotUrl,
  createLiveSession,
  getToken,
  publishToLiveSession,
  setToken as storeToken,
  type LiveSession,
} from "../lib/share";

interface Props {
  bundle: ExportedBundle;
  session: LiveSession | null;
  onSessionChange: (session: LiveSession | null) => void;
  autoPublish: boolean;
  onToggleAutoPublish: (value: boolean) => void;
  onClose: () => void;
}

const panel: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: 14,
};

const primaryButton: React.CSSProperties = {
  padding: "7px 14px",
  border: "1px solid var(--ink)",
  borderRadius: 6,
  background: "var(--ink)",
  color: "var(--surface)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
};

const plainButton: React.CSSProperties = {
  padding: "7px 14px",
  border: "1px solid var(--line)",
  borderRadius: 6,
  background: "var(--surface)",
  color: "var(--ink)",
  cursor: "pointer",
  fontSize: 13,
};

function UrlRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: "var(--mono)",
          fontSize: 11,
          padding: "6px 8px",
          border: "1px solid var(--line)",
          borderRadius: 6,
          background: "var(--paper)",
          color: "var(--ink)",
        }}
      />
      <button onClick={() => void copy()} style={{ ...plainButton, whiteSpace: "nowrap" }}>
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

export default function ShareDialog({
  bundle,
  session,
  onSessionChange,
  autoPublish,
  onToggleAutoPublish,
  onClose,
}: Props) {
  const [token, setTokenDraft] = useState(() => getToken() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<string | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [showSnapshot, setShowSnapshot] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!showSnapshot) return;
    void buildSnapshotUrl(bundle).then(setSnapshotUrl);
  }, [showSnapshot, bundle]);

  async function startSession() {
    const trimmed = token.trim();
    if (!trimmed) {
      setError("Pega un token para poder crear la sesion.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await createLiveSession(trimmed, bundle);
      storeToken(trimmed);
      onSessionChange(next);
      setPublished(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la sesion.");
    } finally {
      setBusy(false);
    }
  }

  async function publishNow() {
    if (!session) return;
    const trimmed = token.trim();
    setBusy(true);
    setError(null);
    try {
      const next = await publishToLiveSession(trimmed, session, bundle);
      onSessionChange(next);
      setPublished(next.updatedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar.");
    } finally {
      setBusy(false);
    }
  }

  const snapshotLength = snapshotUrl?.length ?? 0;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(24,32,39,0.35)", zIndex: 80 }} />
      <div
        role="dialog"
        aria-label="Compartir flujo"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(620px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 48px)",
          overflowY: "auto",
          background: "var(--paper)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          boxShadow: "0 18px 50px rgba(24,32,39,0.25)",
          padding: 18,
          zIndex: 90,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>Compartir flujo</h2>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={{ ...plainButton, padding: "4px 10px" }}>
            Cerrar
          </button>
        </div>

        {session ? (
          <div style={panel}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Sesion en vivo</div>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 10px", lineHeight: 1.5 }}>
              Esta URL no cambia nunca. Pasala una vez y, cada vez que publiques, tu compañero vera el estado
              nuevo al refrescar (el visor se relee solo cada 15 segundos).
            </p>
            <UrlRow url={buildLiveUrl(session)} />

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button onClick={() => void publishNow()} disabled={busy} style={primaryButton}>
                {busy ? "Publicando..." : "Publicar cambios"}
              </button>
              <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={autoPublish}
                  onChange={(e) => onToggleAutoPublish(e.target.checked)}
                />
                publicar solo al editar
              </label>
              <span style={{ flex: 1 }} />
              <button
                onClick={() => {
                  onSessionChange(null);
                  setPublished(null);
                }}
                style={{ ...plainButton, fontSize: 12 }}
                title="Deja de usar este gist. El gist sigue existiendo en tu cuenta de GitHub."
              >
                Desvincular
              </button>
            </div>

            {published && (
              <div style={{ fontSize: 12, color: "var(--ok)", marginTop: 8 }}>
                Publicado {new Date(published).toLocaleTimeString()}
              </div>
            )}
          </div>
        ) : (
          <div style={panel}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Crear sesion en vivo</div>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 10px", lineHeight: 1.5 }}>
              El flujo se guarda en un gist secreto de tu cuenta y obtienes una URL fija. Hace falta un token
              <strong> fine-grained</strong> con el permiso <strong>Gists: read and write</strong> y nada mas.
              Se guarda solo en este navegador.
            </p>
            <input
              type="password"
              value={token}
              placeholder="github_pat_..."
              onChange={(e) => setTokenDraft(e.target.value)}
              style={{
                width: "100%",
                fontFamily: "var(--mono)",
                fontSize: 12,
                padding: "7px 9px",
                border: "1px solid var(--line)",
                borderRadius: 6,
                marginBottom: 10,
              }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={() => void startSession()} disabled={busy} style={primaryButton}>
                {busy ? "Creando..." : "Crear sesion"}
              </button>
              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: "var(--action)" }}
              >
                Crear token en GitHub
              </a>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 10px",
              borderRadius: 6,
              background: "var(--error-bg)",
              color: "var(--error)",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ ...panel, marginTop: 12 }}>
          <button
            onClick={() => setShowSnapshot((v) => !v)}
            style={{
              ...plainButton,
              border: "none",
              background: "transparent",
              padding: 0,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {showSnapshot ? "▾" : "▸"} Enlace de foto fija (sin cuenta)
          </button>
          {showSnapshot && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 10px", lineHeight: 1.5 }}>
                Lleva el flujo entero dentro de la propia URL: no necesita token ni red, pero queda congelado
                en el estado de ahora y la URL crece con el flujo.
              </p>
              {snapshotUrl ? (
                <>
                  <UrlRow url={snapshotUrl} />
                  <div
                    style={{
                      fontSize: 12,
                      marginTop: 8,
                      color: snapshotLength > SNAPSHOT_MAX_LIMIT ? "var(--error)" : "var(--ink-soft)",
                    }}
                  >
                    {snapshotLength} caracteres.{" "}
                    {snapshotLength <= SNAPSHOT_SAFE_LIMIT
                      ? "Se puede pegar en cualquier sitio sin problema."
                      : snapshotLength <= SNAPSHOT_MAX_LIMIT
                        ? "Funciona en el navegador, pero Slack, WhatsApp o Jira la pueden cortar al pegarla: mejor usa la sesion en vivo."
                        : "Demasiado larga para pegarla en un chat sin que se corte. Usa la sesion en vivo."}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Generando...</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
