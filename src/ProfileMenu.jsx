import { useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { avatarSrc } from "./avatar";

export default function ProfileMenu({ session, profile, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop() || "jpg";
    const path = `${session.user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("listo-avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      alert(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("listo-avatars").getPublicUrl(path);
    const avatar_url = `${data.publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabase.from("listo_profiles").update({ avatar_url }).eq("id", session.user.id);
    setUploading(false);
    if (updateError) {
      alert(updateError.message);
      return;
    }
    onUpdated?.(avatar_url);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} title="Mi perfil" className="flex items-center flex-none">
        <img src={avatarSrc(profile)} alt="" className="w-7 h-7 rounded-full object-cover" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
            {profile?.display_name || session.user.email}
          </p>
          <p className="text-[11px] text-slate-400 truncate mb-2">{session.user.email}</p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full text-left text-[11px] text-accent hover:underline decoration-dotted disabled:opacity-50"
          >
            {uploading ? "Subiendo…" : "Cambiar foto"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <div className="border-t border-slate-100 dark:border-slate-700 mt-2 pt-2">
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full text-left text-[11px] text-slate-400 hover:text-danger"
            >
              Salir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
