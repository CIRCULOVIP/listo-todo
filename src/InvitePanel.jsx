import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function InvitePanel({ folders }) {
  const [email, setEmail] = useState("");
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | sending | ok | error
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setSelectedFolders((current) => current.filter((id) => folders.some((f) => f.id === id)));
  }, [folders]);

  function toggleFolder(id) {
    setSelectedFolders((current) => (current.includes(id) ? current.filter((f) => f !== id) : [...current, id]));
  }

  async function handleInvite(e) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || selectedFolders.length === 0) return;
    setStatus("sending");
    setMsg("");

    const { data, error } = await supabase.functions.invoke("listo-invite", {
      body: { email: trimmed, folderIds: selectedFolders, redirectTo: window.location.origin },
    });

    if (error || data?.error) {
      setStatus("error");
      setMsg(data?.error || error.message);
      return;
    }
    setStatus("ok");
    setMsg(
      data.alreadyExisted
        ? `${trimmed} ya tenía cuenta — se agregó a las carpetas elegidas`
        : `Invitación enviada a ${trimmed}`
    );
    setEmail("");
    setSelectedFolders([]);
  }

  return (
    <div className="border border-slate-200 bg-white rounded-xl p-4 mb-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Invitar al equipo</p>
      <form onSubmit={handleInvite} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@equipo.com"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
        />

        <div>
          <p className="text-xs text-slate-400 mb-1.5">Carpetas a las que entra:</p>
          <div className="flex flex-wrap gap-1.5">
            {folders.map((f) => (
              <button
                type="button"
                key={f.id}
                onClick={() => toggleFolder(f.id)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
                  selectedFolders.includes(f.id)
                    ? "bg-accent text-white border-accent"
                    : "bg-white text-slate-500 border-slate-200 hover:border-accent"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-none"
                  style={{ background: selectedFolders.includes(f.id) ? "#fff" : f.color }}
                />
                {f.name}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "sending" || selectedFolders.length === 0}
          className="bg-accent text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-50"
        >
          {status === "sending" ? "Enviando…" : "Invitar"}
        </button>
      </form>
      {msg && <p className={`text-xs mt-2 ${status === "error" ? "text-danger" : "text-emerald-600"}`}>{msg}</p>}
    </div>
  );
}
