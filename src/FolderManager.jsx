import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function FolderManager({ folders }) {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadCounts() {
      const entries = await Promise.all(
        folders.map(async (f) => {
          const { count } = await supabase
            .from("listo_tasks")
            .select("id", { count: "exact", head: true })
            .eq("folder_id", f.id);
          return [f.id, count || 0];
        })
      );
      if (!cancelled) setCounts(Object.fromEntries(entries));
    }
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [open, folders]);

  async function saveName(f) {
    const name = editValue.trim();
    setEditingId(null);
    if (!name || name === f.name) return;
    await supabase.from("listo_folders").update({ name }).eq("id", f.id);
  }

  async function deleteFolder(f) {
    const count = counts[f.id] || 0;
    if (count > 0) return;
    if (!confirm(`¿Borrar la carpeta "${f.name}"? No se puede deshacer.`)) return;
    await supabase.from("listo_folders").delete().eq("id", f.id);
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl p-4 mb-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wide text-slate-400"
      >
        Gestionar carpetas
        <span className="text-slate-300">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col divide-y divide-slate-100 dark:divide-slate-700">
          {folders.map((f) => {
            const count = counts[f.id] ?? null;
            const empty = count === 0;
            return (
              <div key={f.id} className="py-2 first:pt-0 last:pb-0 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-none" style={{ background: f.color }} />
                {editingId === f.id ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveName(f)}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    maxLength={60}
                    className="text-xs font-semibold bg-transparent outline-none border-b border-accent min-w-0 flex-1 text-slate-700 dark:text-slate-200"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(f.id);
                      setEditValue(f.name);
                    }}
                    title="Editar nombre"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate min-w-0 flex-1 text-left hover:underline decoration-dotted"
                  >
                    {f.name}
                  </button>
                )}
                <span className="text-[11px] text-slate-400 flex-none">
                  {count === null ? "…" : `${count} tarea${count === 1 ? "" : "s"}`}
                </span>
                <button
                  onClick={() => deleteFolder(f)}
                  disabled={!empty}
                  title={empty ? "Borrar carpeta" : "Vaciá la carpeta primero para poder borrarla"}
                  className="w-5 h-5 flex-none flex items-center justify-center text-slate-300 hover:text-danger hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full disabled:opacity-30 disabled:hover:text-slate-300 disabled:hover:bg-transparent"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
