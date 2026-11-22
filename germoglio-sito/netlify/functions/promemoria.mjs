// Ogni mezz'ora (ore di giorno) manda i promemoria a chi li ha chiesti per quell'orario.
import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import { piano, oggiRoma, messaggio } from "../lib/promemoria.mjs";

export default async () => {
  const { data, ora } = oggiRoma();
  webpush.setVapidDetails("https://germoglio-compiti-389af7.netlify.app", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  const base = process.env.URL || "https://germoglio-compiti-389af7.netlify.app";
  const P = await piano(base);
  if (!P.giorni.some((g) => g.data === data)) return;
  const store = getStore({ name: "push", consistency: "strong" });
  const { blobs } = await store.list();
  for (const b of blobs) {
    const s = await store.get(b.key, { type: "json" }); if (!s) continue;
    const quale = s.ora1 === ora ? 1 : s.ora2 === ora ? 2 : 0; if (!quale) continue;
    const m = await messaggio(s.k, quale, P, data); if (!m) continue;
    try { await webpush.sendNotification(s.sub, JSON.stringify(m)) }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await store.delete(b.key) }
  }
};
export const config = { schedule: "0,30 5-19 * * *" };
