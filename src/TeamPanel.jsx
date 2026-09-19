import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { initialsAvatar } from "./avatar";

export default function TeamPanel({ folders }) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [memberships, setMemberships] = useState([]); // [{folder_id, user_id}]

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      const [{ data: profileData }, { data: memberData }] = await Promise.all([
        supabase.from("listo_profiles").select("*").order("display_name", { ascending: true }),
        supabase.from("listo_folder_members").select("folder_id, user_id"),
      ]);
      if (cancelled) return;
      setProfiles(profileData || []);
      setMemberships(memberData || []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function isMember(userId, folderId) {
    return memberships.some((m) => m.user_id === userId && m.folder_id === folderId);
  }

  async function toggle(userId, folderId) {
    const member = isMember(userId, folderId);
    if (member) {
      setMemberships((current) => current.filter((m) => !(m.user_id === userId && m.folder_id === folderId)));
      await supabase.from("listo_folder_members").delete().eq("user_id", userId).eq("folder_id", folderId);
    } else {
      setMemberships((current) => [...current, { user_id: userId, folder_id: folderId }]);
      await supabase.from("listo_folder_members").insert({ user_id: userId, folder_id: folderId });
    }
  }

  async function removeFromTeam(p) {
    if (!confirm(`¿Sacar a ${p.display_name} del equipo? Pierde acceso a todas las carpetas.`)) return;
    setMemberships((current) => current.filter((m) => m.user_id !== p.id));
    await supabase.from("listo_folder_members").delete().eq("user_id", p.id);
  }

  return (
    <div className="border border-slate-200 bg-white rounded-xl p-4 mb-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wide text-slate-400"
      >
        Equipo y carpetas
        <span className="text-slate-300">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {profiles.length === 0 && <p className="text-xs text-slate-400">Cargando…</p>}
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center gap-3 flex-wrap">
              <img src={initialsAvatar(p.display_name)} alt="" className="w-6 h-6 rounded-full flex-none" />
              <span className="text-xs font-semibold text-slate-700 w-36 truncate" title={p.email}>
                {p.display_name}
                {p.is_admin && <span className="text-accent"> · admin</span>}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {folders.map((f) => {
                  const active = p.is_admin || isMember(p.id, f.id);
                  return (
                    <button
                      key={f.id}
                      disabled={p.is_admin}
                      onClick={() => toggle(p.id, f.id)}
                      title={p.is_admin ? "Los admins ven todas las carpetas" : undefined}
                      className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                        active
                          ? "bg-accent text-white border-accent"
                          : "bg-white text-slate-400 border-slate-200 hover:border-accent"
                      } ${p.is_admin ? "opacity-60 cursor-default" : ""}`}
                    >
                      {f.name}
                    </button>
                  );
                })}
              </div>
              {!p.is_admin && (
                <button
                  onClick={() => removeFromTeam(p)}
                  title="Sacar del equipo"
                  className="w-5 h-5 flex-none flex items-center justify-center text-slate-300 hover:text-danger hover:bg-slate-100 rounded-full ml-auto"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
