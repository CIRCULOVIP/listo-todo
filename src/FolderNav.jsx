import { useState } from "react";
import { supabase } from "./supabaseClient";

const COLORS = ["#3654D8", "#DD5B45", "#2E9E6B", "#B3742E", "#7C4DB0", "#2E8FB0"];

export default function FolderNav({ folders, currentFolderId, onSelect, isAdmin, session }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function createFolder(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const color = COLORS[folders.length % COLORS.length];
    const { data, error } = await supabase
      .from("listo_folders")
      .insert({ name: trimmed, color, created_by: session.user.id })
      .select()
      .single();
    if (!error && data) {
      await supabase.from("listo_folder_members").insert({ folder_id: data.id, user_id: session.user.id });
      onSelect(data.id);
    }
    setName("");
    setCreating(false);
  }

  return (
    <div className="flex items-center gap-2 mb-5 flex-wrap">
      {folders.map((f) => (
        <button
          key={f.id}
          onClick={() => onSelect(f.id)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
            f.id === currentFolderId
              ? "bg-accent text-white border-accent"
              : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-accent"
          }`}
        >
          <span
            className="w-2 h-2 rounded-full flex-none"
            style={{ background: f.id === currentFolderId ? "#fff" : f.color }}
          />
          {f.name}
        </button>
      ))}

      {isAdmin &&
        (creating ? (
          <form onSubmit={createFolder} className="flex items-center gap-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => !name.trim() && setCreating(false)}
              placeholder="Nombre de la carpeta"
              className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 outline-none focus:border-accent"
              maxLength={60}
            />
          </form>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 hover:border-accent hover:text-accent"
          >
            + Carpeta
          </button>
        ))}
    </div>
  );
}
