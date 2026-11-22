// Testi dei promemoria, condivisi tra la prova e l'invio programmato.
import { getStore } from "@netlify/blobs";
const MAT = { italiano: "Italiano", matematica: "Matematica", storia: "Storia", geografia: "Geografia", scienze: "Scienze", inglese: "Inglese", lettura: "Lettura" };

export async function piano(base) {
  const r = await fetch(new URL("/piano.json", base)); return r.json();
}
export function oggiRoma(d = new Date()) {
  const data = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const [h, m] = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d).split(":").map(Number);
  const mm = m < 15 ? 0 : m < 45 ? 30 : 0, hh = m >= 45 ? (h + 1) % 24 : h;
  return { data, ora: String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0") };
}
export async function messaggio(k, quale, P, data) {
  const g = P.giorni.find((x) => x.data === data);
  if (!g) return null;
  const prof = (await getStore({ name: "profili" }).get(k, { type: "json" })) || {};
  const ciao = prof.nome ? `, ${prof.nome}` : "";
  const prog = (await getStore({ name: "progressi", consistency: "strong" }).get(k + "/" + data, { type: "json" })) || {};
  const mancano = g.tappe.filter((t) => !(prog[t.id] || {}).fatto);
  const min = mancano.reduce((a, t) => a + t.minuti, 0);
  if (quale === 1) {
    if (!mancano.length) return null;
    return { title: `Buongiorno${ciao}!`, body: `Oggi ci sono ${g.tappe.length} tappe da fare, circa ${g.tappe.reduce((a, t) => a + t.minuti, 0)} minuti. Una alla volta!` };
  }
  if (mancano.length) {
    const elenco = mancano.map((t) => `${MAT[t.materia] || t.materia} – ${t.titolo}`).join(", ");
    return { title: mancano.length === 1 ? "Ti manca 1 tappa" : `Ti mancano ${mancano.length} tappe`, body: `${elenco}. Circa ${min} minuti e poi si apre il gioco del giorno.` };
  }
  if (!(prog.gioco || {}).fatto) return { title: `Bravissima${ciao}!`, body: "Hai finito tutte le tappe: ti aspetta il gioco del giorno con la figurina." };
  return null;
}
