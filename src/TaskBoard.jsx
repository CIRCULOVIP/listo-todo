import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import TaskItem from "./TaskItem.jsx";
import InvitePanel from "./InvitePanel.jsx";
import FolderNav from "./FolderNav.jsx";

export default function TaskBoard({ session }) {
  const [profile, setProfile] = useState(null);
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  // Perfil + carpetas visibles (una sola vez por sesión)
  useEffect(() => {
    let foldersChannel;

    async function load() {
      const { data: profileData } = await supabase
        .from("listo_profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      setProfile(profileData || null);

      const { data: folderData } = await supabase.from("listo_folders").select("*").order("name", { ascending: true });
      const list = folderData || [];
      setFolders(list);
      setCurrentFolderId((current) => current || list.find((f) => f.name === "General")?.id || list[0]?.id || null);

      foldersChannel = supabase
        .channel("listo_folders_changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "listo_folders" }, (payload) => {
          setFolders((current) => {
            if (payload.eventType === "INSERT") {
              if (current.some((f) => f.id === payload.new.id)) return current;
              return [...current, payload.new].sort((a, b) => a.name.localeCompare(b.name));
            }
            if (payload.eventType === "UPDATE") return current.map((f) => (f.id === payload.new.id ? payload.new : f));
            if (payload.eventType === "DELETE") return current.filter((f) => f.id !== payload.old.id);
            return current;
          });
        })
        .subscribe();
    }

    load();
    return () => {
      if (foldersChannel) supabase.removeChannel(foldersChannel);
    };
  }, [session.user.id]);

  // Tareas de la carpeta activa
  useEffect(() => {
    if (!currentFolderId) return;
    let channel;
    setLoading(true);

    async function load() {
      const { data: taskData } = await supabase
        .from("listo_tasks")
        .select("*")
        .eq("folder_id", currentFolderId)
        .order("created_at", { ascending: true });
      setTasks(taskData || []);
      setLoading(false);

      channel = supabase
        .channel(`listo_tasks_changes_${currentFolderId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "listo_tasks", filter: `folder_id=eq.${currentFolderId}` },
          (payload) => {
            setTasks((current) => {
              if (payload.eventType === "INSERT") {
                if (current.some((t) => t.id === payload.new.id)) return current;
                return [...current, payload.new];
              }
              if (payload.eventType === "UPDATE") {
                return current.map((t) => (t.id === payload.new.id ? payload.new : t));
              }
              if (payload.eventType === "DELETE") {
                return current.filter((t) => t.id !== payload.old.id);
              }
              return current;
            });
          }
        )
        .subscribe();
    }

    load();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentFolderId]);

  async function addTask(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || !currentFolderId) return;
    setNewTitle("");

    const optimistic = {
      id: `optimistic-${Date.now()}`,
      title,
      done: false,
      folder_id: currentFolderId,
      created_by: session.user.id,
      created_by_email: session.user.email,
      created_by_name: profile?.display_name || session.user.email,
      created_at: new Date().toISOString(),
    };
    setTasks((current) => [...current, optimistic]);

    const { data, error } = await supabase
      .from("listo_tasks")
      .insert({
        title,
        folder_id: currentFolderId,
        created_by: session.user.id,
        created_by_email: session.user.email,
        created_by_name: profile?.display_name || session.user.email,
      })
      .select()
      .single();

    setTasks((current) => {
      const withoutOptimistic = current.filter((t) => t.id !== optimistic.id);
      if (error || !data) return withoutOptimistic;
      if (withoutOptimistic.some((t) => t.id === data.id)) return withoutOptimistic;
      return [...withoutOptimistic, data];
    });
  }

  async function toggleDone(task) {
    setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)));
    await supabase.from("listo_tasks").update({ done: !task.done }).eq("id", task.id);
  }

  async function renameTask(task, title) {
    setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, title } : t)));
    await supabase.from("listo_tasks").update({ title }).eq("id", task.id);
  }

  async function deleteTask(task) {
    setTasks((current) => current.filter((t) => t.id !== task.id));
    await supabase.from("listo_tasks").delete().eq("id", task.id);
  }

  async function clearCompleted() {
    const done = tasks.filter((t) => t.done);
    if (!done.length) return;
    if (!confirm(`¿Borrar ${done.length} tarea${done.length === 1 ? "" : "s"} completada${done.length === 1 ? "" : "s"}?`))
      return;
    setTasks((current) => current.filter((t) => !t.done));
    await supabase.from("listo_tasks").delete().in("id", done.map((t) => t.id));
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const sorted = [...tasks].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    return new Date(a.created_at) - new Date(b.created_at);
  });
  const pending = tasks.filter((t) => !t.done).length;
  const done = tasks.length - pending;

  return (
    <div className="max-w-xl mx-auto px-4 py-9 pb-16">
      <header className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-indigo-300 flex items-center justify-center text-white flex-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 12.5l5 5L20 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="font-display text-xl font-extrabold tracking-tight flex-1">Listo</h1>
        <button onClick={signOut} className="text-xs text-slate-400 hover:text-slate-600">
          Salir ({session.user.email})
        </button>
      </header>
      <p className="text-xs text-slate-400 mb-5 ml-11">Se sincroniza en vivo con todo el equipo.</p>

      <FolderNav
        folders={folders}
        currentFolderId={currentFolderId}
        onSelect={setCurrentFolderId}
        isAdmin={!!profile?.is_admin}
        session={session}
      />

      {profile?.is_admin && <InvitePanel folders={folders} />}

      <form onSubmit={addTask} className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl shadow px-4 py-3 mb-5">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Agregar una tarea…"
          className="flex-1 min-w-0 text-sm outline-none"
          maxLength={300}
        />
        <button type="submit" className="bg-accent text-white text-sm font-semibold rounded-lg px-4 py-2 flex-none">
          Agregar
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-10">Cargando…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">Sin tareas todavía.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((task) => (
            <TaskItem key={task.id} task={task} onToggle={toggleDone} onDelete={deleteTask} onRename={renameTask} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 px-1">
        <span className="text-xs text-slate-400">
          {pending} pendiente{pending === 1 ? "" : "s"}
          {done ? ` · ${done} completada${done === 1 ? "" : "s"}` : ""}
        </span>
        {done > 0 && (
          <button onClick={clearCompleted} className="text-xs text-slate-400 hover:text-danger">
            Borrar completadas
          </button>
        )}
      </div>
    </div>
  );
}
