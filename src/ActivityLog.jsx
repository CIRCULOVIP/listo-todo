import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { initialsAvatar } from "./avatar";

const ACTION_LABELS = {
  created: "creó la tarea",
  completed: "completó",
  reopened: "reabrió",
  renamed: "renombró a",
  assigned: "asignó",
  unassigned: "quitó la asignación de",
  due_date_set: "cambió la fecha de",
  status_changed: "movió",
  deleted: "borró",
  folder_access_granted: "dio acceso de carpeta a",
  folder_access_revoked: "quitó el acceso de carpeta a",
  admin_promoted: "hizo admin a",
  admin_demoted: "le quitó el admin a",
  invited: "invitó a",
  invite_resent: "reenvió la invitación a",
  team_member_removed: "sacó del equipo a",
};

function describe(entry) {
  const label = ACTION_LABELS[entry.action] || entry.action;
  const who = entry.actor_name || "Alguien";
  const target = entry.task_title || entry.details?.to || "";
  const extra = entry.action === "status_changed" && entry.details ? ` (${entry.details.from} → ${entry.details.to})` : "";
  const folder = entry.action === "folder_access_granted" || entry.action === "folder_access_revoked" ? ` a ${entry.details?.folder || ""}` : "";
  return `${who} ${label}${target ? ` "${target}"` : ""}${folder}${extra}`;
}

export default function ActivityLog({ folders, defaultFolderId, onBack }) {
  const [folderId, setFolderId] = useState(defaultFolderId || "all");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      let q = supabase.from("listo_activity_log").select("*").order("created_at", { ascending: false }).limit(150);
      if (folderId !== "all") q = q.eq("folder_id", folderId);
      const { data } = await q;
      if (!cancelled) {
        setEntries(data || []);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [folderId]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-none">
          ← Volver
        </button>
        <h2 className="font-display text-lg font-extrabold flex-1 dark:text-slate-100">Actividad</h2>
        <select
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 dark:text-slate-200 outline-none"
        >
          <option value="all">Todas las carpetas</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-10">Cargando…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">Sin actividad todavía.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs"
            >
              <img src={initialsAvatar(entry.actor_name || "?")} className="w-5 h-5 rounded-full flex-none" alt="" />
              <span className="flex-1 text-slate-600 dark:text-slate-300 truncate">{describe(entry)}</span>
              <span className="text-slate-400 flex-none">
                {new Date(entry.created_at).toLocaleString("es-CL", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
