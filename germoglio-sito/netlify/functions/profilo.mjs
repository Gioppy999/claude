// Profilo: nome da mostrare e foto (o avatar). Legato alla chiave dei progressi.
import { getStore } from "@netlify/blobs";
const K = /^[A-Za-z0-9_-]{16,64}$/;
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export default async (req) => {
  const k = new URL(req.url).searchParams.get("k") || "";
  if (!K.test(k)) return json({ errore: "chiave non valida" }, 403);
  const store = getStore({ name: "profili", consistency: "strong" });
  if (req.method === "GET") return json((await store.get(k, { type: "json" })) || {});
  if (req.method === "PUT") {
    const t = await req.text();
    if (t.length > 300000) return json({ errore: "La foto è troppo grande." }, 413);
    let d; try { d = JSON.parse(t) } catch { return json({ errore: "richiesta non valida" }, 400) }
    const nome = String(d.nome || "").trim().slice(0, 30);
    const foto = typeof d.foto === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(d.foto) ? d.foto : "";
    const avatar = typeof d.avatar === "string" ? d.avatar.slice(0, 8) : "";
    await store.setJSON(k, { nome, foto, avatar, aggiornato: new Date().toISOString() });
    return json({ ok: true });
  }
  return json({ errore: "metodo non ammesso" }, 405);
};
export const config = { path: "/api/profilo" };
