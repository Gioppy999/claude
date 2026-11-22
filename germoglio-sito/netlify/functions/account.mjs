// Account: nome utente + password. Ogni account porta alla sua chiave dei progressi.
import { getStore } from "@netlify/blobs";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const U = /^[a-z0-9._-]{3,30}$/;
const K = /^[A-Za-z0-9_-]{16,64}$/;
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const hash = (pw, salt) => scryptSync(pw, salt, 32).toString("hex");

export default async (req) => {
  if (req.method !== "POST") return json({ errore: "metodo non ammesso" }, 405);
  let b; try { b = await req.json() } catch { return json({ errore: "richiesta non valida" }, 400) }
  const utente = String(b.utente || "").trim().toLowerCase();
  const password = String(b.password || "");
  if (!U.test(utente)) return json({ errore: "Il nome utente deve avere da 3 a 30 caratteri: lettere, numeri, punto, trattino." }, 400);
  if (password.length < 6 || password.length > 100) return json({ errore: "La password deve avere almeno 6 caratteri." }, 400);
  const store = getStore({ name: "account", consistency: "strong" });

  if (b.azione === "crea") {
    if (await store.get(utente)) return json({ errore: "Questo nome utente esiste già. Scegline un altro o entra." }, 409);
    const k = K.test(String(b.chiave || "")) ? b.chiave : randomBytes(24).toString("base64url");
    const salt = randomBytes(16).toString("hex");
    await store.setJSON(utente, { salt, hash: hash(password, salt), k, creato: new Date().toISOString() });
    return json({ k, utente });
  }
  if (b.azione === "entra") {
    const a = await store.get(utente, { type: "json" });
    const ok = a && timingSafeEqual(Buffer.from(hash(password, a.salt), "hex"), Buffer.from(a.hash, "hex"));
    if (!ok) { await pausa(800); return json({ errore: "Nome utente o password sbagliati." }, 401) }
    return json({ k: a.k, utente });
  }
  if (b.azione === "cambia-password") {
    const nuova = String(b.nuova || "");
    if (nuova.length < 6 || nuova.length > 100) return json({ errore: "La nuova password deve avere almeno 6 caratteri." }, 400);
    const a = await store.get(utente, { type: "json" });
    const ok = a && timingSafeEqual(Buffer.from(hash(password, a.salt), "hex"), Buffer.from(a.hash, "hex"));
    if (!ok) { await pausa(800); return json({ errore: "La password attuale non è giusta." }, 401) }
    const salt = randomBytes(16).toString("hex");
    await store.setJSON(utente, { ...a, salt, hash: hash(nuova, salt), cambiata: new Date().toISOString() });
    return json({ ok: true });
  }
  return json({ errore: "azione non valida" }, 400);
};

export const config = { path: "/api/account" };
