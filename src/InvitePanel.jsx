import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function InvitePanel() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | ok | error
  const [msg, setMsg] = useState("");

  async function handleInvite(e) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setStatus("sending");
    setMsg("");

    const { data, error } = await supabase.functions.invoke("listo-invite", {
      body: { email: trimmed, redirectTo: window.location.origin },
    });

    if (error || data?.error) {
      setStatus("error");
      setMsg(data?.error || error.message);
      return;
    }
    setStatus("ok");
    setMsg(`Invitación enviada a ${trimmed}`);
    setEmail("");
  }

  return (
    <div className="border border-slate-200 bg-white rounded-xl p-4 mb-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Invitar al equipo</p>
      <form onSubmit={handleInvite} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@equipo.com"
          className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="bg-accent text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-50 flex-none"
        >
          {status === "sending" ? "Enviando…" : "Invitar"}
        </button>
      </form>
      {msg && (
        <p className={`text-xs mt-2 ${status === "error" ? "text-danger" : "text-emerald-600"}`}>{msg}</p>
      )}
    </div>
  );
}
