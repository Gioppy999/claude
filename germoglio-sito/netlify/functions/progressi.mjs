// Salva e legge i progressi della famiglia. La chiave "k" arriva dal link privato.
import { getStore } from "@netlify/blobs";

const K = /^[A-Za-z0-9_-]{16,64}$/;
const D = /^\d{4}-\d{2}-\d{2}$/;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  const url = new URL(req.url);
  const k = url.searchParams.get("k") || "";
  if (!K.test(k)) return json({ errore: "chiave non valida" }, 403);
  const store = getStore({ name: "progressi", consistency: "strong" });

  if (req.method === "GET") {
    const { blobs } = await store.list({ prefix: k + "/" });
    const out = {};
    await Promise.all(blobs.map(async (b) => { out[b.key.slice(k.length + 1)] = await store.get(b.key, { type: "json" }); }));
    return json(out);
  }
  if (req.method === "PUT") {
    const d = url.searchParams.get("d") || "";
    if (!D.test(d)) return json({ errore: "data non valida" }, 400);
    const testo = await req.text();
    if (testo.length > 50000) return json({ errore: "troppo grande" }, 413);
    let dati; try { dati = JSON.parse(testo) } catch { return json({ errore: "JSON non valido" }, 400) }
    if (typeof dati !== "object" || dati === null || Array.isArray(dati)) return json({ errore: "formato non valido" }, 400);
    await store.setJSON(k + "/" + d, dati);
    return json({ ok: true });
  }
  return json({ errore: "metodo non ammesso" }, 405);
};

export const config = { path: "/api/progressi" };
