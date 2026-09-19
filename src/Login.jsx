import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setStatus("sending");
    setErrorMsg("");

    const { data: allowlisted } = await supabase
      .from("listo_admin_allowlist")
      .select("email")
      .eq("email", trimmed)
      .maybeSingle();

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: !!allowlisted,
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(
        error.message.toLowerCase().includes("signups not allowed") ||
          error.status === 400
          ? "Ese email todavía no fue invitado. Pedile a un admin del equipo que te invite primero."
          : error.message
      );
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="min-h-full flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg p-7">
        <div className="flex items-center gap-3 mb-1">
          <img src="/logo.png" alt="Círculo VIP" className="w-9 h-9 rounded-xl flex-none object-cover" />
          <h1 className="font-display text-2xl font-extrabold tracking-tight dark:text-slate-100">Círculo Next</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Entrá con el email que te invitaron al equipo.</p>

        {status === "sent" ? (
          <div className="text-sm bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-lg px-4 py-3">
            Te mandamos un link a <strong>{email}</strong>. Abrilo desde el mismo dispositivo para entrar.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full bg-accent text-white font-semibold text-sm rounded-lg py-2.5 disabled:opacity-50"
            >
              {status === "sending" ? "Enviando…" : "Enviar link de acceso"}
            </button>
            {status === "error" && (
              <p className="text-xs text-danger">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
