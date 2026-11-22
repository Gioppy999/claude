// Iscrizione ai promemoria di questo dispositivo, orari e notifica di prova.
import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import { createHash } from "node:crypto";
import { piano, oggiRoma, messaggio } from "../lib/promemoria.mjs";

const K = /^[A-Za-z0-9_-]{16,64}$/;
const ORA = /^([01]\d|2[0-3]):(00|30)$/;
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const id = (endpoint) => createHash("sha256").update(endpoint).digest("hex").slice(0, 32);

export default async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") return json({ chiave: process.env.VAPID_PUBLIC_KEY });
  if (req.method !== "POST") return json({ errore: "metodo non ammesso" }, 405);
  let b; try { b = await req.json() } catch { return json({ errore: "richiesta non valida" }, 400) }
  if (!K.test(String(b.k || ""))) return json({ errore: "chiave non valida" }, 403);
  const sub = b.sub; const ep = sub && typeof sub.endpoint === "string" ? sub.endpoint : "";
  if (!/^https:\/\//.test(ep)) return json({ errore: "iscrizione non valida" }, 400);
  const store = getStore({ name: "push", consistency: "strong" });
  const chiave = b.k + "/" + id(ep);
  if (b.azione === "togli") { await store.delete(chiave); return json({ ok: true }) }
  if (b.azione === "salva") {
    const ora1 = ORA.test(b.ora1) ? b.ora1 : "09:00", ora2 = ORA.test(b.ora2) ? b.ora2 : "16:00";
    await store.setJSON(chiave, { k: b.k, sub, ora1, ora2, aggiornato: new Date().toISOString() });
    return json({ ok: true, ora1, ora2 });
  }
  if (b.azione === "prova") {
    webpush.setVapidDetails("https://germoglio-compiti-389af7.netlify.app", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const P = await piano(url.origin); const { data } = oggiRoma();
    const m = (await messaggio(b.k, 2, P, data)) || { title: "Promemoria attivi!", body: "Riceverai qui i promemoria dei compiti." };
    try { await webpush.sendNotification(sub, JSON.stringify(m)); return json({ ok: true }) }
    catch (e) { return json({ errore: "Notifica non inviata (" + (e.statusCode || "errore") + ")." }, 502) }
  }
  return json({ errore: "azione non valida" }, 400);
};
export const config = { path: "/api/push" };
