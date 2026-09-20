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

const ACTION_SHORT = {
  created: "Creó",
  completed: "Completó",
  reopened: "Reabrió",
  renamed: "Renombró",
  assigned: "Asignó",
  unassigned: "Quitó asignación",
  due_date_set: "Cambió fecha",
  status_changed: "Movió estado",
  deleted: "Borró",
  folder_access_granted: "Dio acceso",
  folder_access_revoked: "Quitó acceso",
  admin_promoted: "Hizo admin",
  admin_demoted: "Quitó admin",
  invited: "Invitó",
  invite_resent: "Reenvió invitación",
  team_member_removed: "Sacó del equipo",
};

function extraDetail(entry) {
  const d = entry.details || {};
  switch (entry.action) {
    case "renamed":
      return d.from ? `antes: "${d.from}"` : "";
    case "status_changed":
      return d.from && d.to ? `${d.from} → ${d.to}` : "";
    case "due_date_set":
      return d.due_date || "";
    case "folder_access_granted":
    case "folder_access_revoked":
      return d.folder || "";
    default:
      return "";
  }
}

function formatFecha(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function csvField(value) {
  const str = String(value ?? "");
  return /[";\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function exportCsv(entries, scopeLabel) {
  const rows = [
    ["Fecha", "Persona", "Acción", "Tarea", "Detalle"],
    ...entries.map((e) => [
      formatFecha(e.created_at),
      e.actor_name || "Alguien",
      ACTION_SHORT[e.action] || e.action,
      e.task_title || e.details?.to || "",
      extraDetail(e),
    ]),
  ];
  const csv = rows.map((r) => r.map(csvField).join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `actividad-${scopeLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ActivityLog({ folders, defaultFolderId, onBack }) {
  const [folderId, setFolderId] = useState(defaultFolderId || "all");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [fromDate, setFromDate] = useState("");

  const scopeLabel = folderId === "all" ? "todas las carpetas" : folders.find((f) => f.id === folderId)?.name || "esta carpeta";

  async function clearOlderThan() {
    if (!fromDate) return;
    if (!confirm(`¿Borrar el historial de ${scopeLabel} anterior al ${fromDate}? No se puede deshacer.`)) return;
    setClearing(true);
    const cutoff = `${fromDate}T00:00:00`;
    let q = supabase.from("listo_activity_log").delete().lt("created_at", cutoff);
    if (folderId !== "all") q = q.eq("folder_id", folderId);
    const { error } = await q;
    setClearing(false);
    if (error) {
      alert(error.message);
      return;
    }
    setEntries((current) => current.filter((e) => new Date(e.created_at) >= new Date(cutoff)));
  }

  async function deleteEntry(id) {
    setEntries((current) => current.filter((e) => e.id !== id));
    const { error } = await supabase.from("listo_activity_log").delete().eq("id", id);
    if (error) alert(error.message);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      let q = supabase.from("listo_activity_log").select("*").order("created_at", { ascending: false }).limit(150);
      if (folderId !== "all") q = q.eq("folder_id", folderId);
      if (fromDate) q = q.gte("created_at", `${fromDate}T00:00:00`);
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
  }, [folderId, fromDate]);

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

      <div className="flex items-center gap-2 mb-4 justify-end">
        <button
          onClick={() => exportCsv(entries, scopeLabel.replace(/\s+/g, "-"))}
          disabled={entries.length === 0}
          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-40"
        >
          Exportar CSV
        </button>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          title="Mostrar desde esta fecha"
          className="text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 dark:text-slate-200 outline-none [color-scheme:light] dark:[color-scheme:dark]"
        />
        {fromDate && (
          <button
            onClick={() => setFromDate("")}
            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Ver todo
          </button>
        )}
        <button
          onClick={clearOlderThan}
          disabled={clearing || !fromDate}
          title="Borra todo lo anterior a la fecha elegida"
          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-danger disabled:opacity-40"
        >
          {clearing ? "Borrando…" : "Borrar anteriores"}
        </button>
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
              <button
                onClick={() => deleteEntry(entry.id)}
                title="Borrar esta fila"
                className="w-5 h-5 flex-none flex items-center justify-center text-slate-300 hover:text-danger hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
