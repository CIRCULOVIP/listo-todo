import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import TaskItem from "./TaskItem.jsx";
import InvitePanel from "./InvitePanel.jsx";
import FolderNav from "./FolderNav.jsx";
import FolderManager from "./FolderManager.jsx";
import TeamPanel from "./TeamPanel.jsx";
import ProfileMenu from "./ProfileMenu.jsx";
import KanbanBoard from "./KanbanBoard.jsx";
import ActivityLog from "./ActivityLog.jsx";

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "mine", label: "Asignadas a mí" },
  { id: "overdue", label: "Vencidas" },
];

export default function TaskBoard({ session }) {
  const [profile, setProfile] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState([]);
  const [addFolderId, setAddFolderId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [boardView, setBoardView] = useState("list");
  const [view, setView] = useState("board");

  const folderKey = [...selectedFolderIds].sort().join(",");
  const foldersById = Object.fromEntries(folders.map((f) => [f.id, f]));

  // Perfil + carpetas visibles + equipo (una sola vez por sesión)
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
      setSelectedFolderIds((current) => (current.length ? current : list.map((f) => f.id)));

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

  // Si alguna carpeta seleccionada se borró, sacarla de la selección
  useEffect(() => {
    if (!folders.length) return;
    const validIds = new Set(folders.map((f) => f.id));
    setSelectedFolderIds((current) => {
      const filtered = current.filter((id) => validIds.has(id));
      if (filtered.length) return filtered.length === current.length ? current : filtered;
      return folders.map((f) => f.id);
    });
  }, [folders]);

  // La carpeta destino para tareas nuevas siempre tiene que estar entre las seleccionadas
  useEffect(() => {
    if (!selectedFolderIds.length) {
      setAddFolderId(null);
      return;
    }
    setAddFolderId((current) => (current && selectedFolderIds.includes(current) ? current : selectedFolderIds[0]));
  }, [folderKey]);

  // Equipo con acceso a las carpetas seleccionadas (para el selector de "asignar a")
  useEffect(() => {
    if (!selectedFolderIds.length) {
      setTeamMembers([]);
      return;
    }
    let cancelled = false;

    async function loadMembers() {
      const [{ data: profilesData }, { data: memberRows }] = await Promise.all([
        supabase.from("listo_profiles").select("id, display_name, is_admin"),
        supabase.from("listo_folder_members").select("user_id").in("folder_id", selectedFolderIds),
      ]);
      if (cancelled) return;
      const memberIds = new Set((memberRows || []).map((m) => m.user_id));
      const scoped = (profilesData || [])
        .filter((p) => p.is_admin || memberIds.has(p.id))
        .sort((a, b) => a.display_name.localeCompare(b.display_name));
      setTeamMembers(scoped);
    }
    loadMembers();
    return () => {
      cancelled = true;
    };
  }, [folderKey]);

  // Tareas de las carpetas seleccionadas
  useEffect(() => {
    if (!selectedFolderIds.length) {
      setTasks([]);
      setLoading(false);
      return;
    }
    const idsAtSubscribe = new Set(selectedFolderIds);
    let channel;
    setLoading(true);

    async function load() {
      const { data: taskData } = await supabase
        .from("listo_tasks")
        .select("*")
        .in("folder_id", selectedFolderIds)
        .order("created_at", { ascending: true });
      setTasks(taskData || []);
      setLoading(false);

      channel = supabase
        .channel(`listo_tasks_changes_${folderKey}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "listo_tasks" }, (payload) => {
          const row = payload.new?.id ? payload.new : payload.old;
          if (!idsAtSubscribe.has(row.folder_id)) return;
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
        })
        .subscribe();
    }

    load();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [folderKey]);

  async function addTask(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || !addFolderId) return;
    setNewTitle("");

    const optimistic = {
      id: `optimistic-${Date.now()}`,
      title,
      done: false,
      folder_id: addFolderId,
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
        folder_id: addFolderId,
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

  async function setDueDate(task, due_date) {
    setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, due_date } : t)));
    await supabase.from("listo_tasks").update({ due_date }).eq("id", task.id);
  }

  async function setNotes(task, notes) {
    setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, notes } : t)));
    await supabase.from("listo_tasks").update({ notes }).eq("id", task.id);
  }

  async function setStatus(taskId, status) {
    setTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, status, done: status === "done" } : t))
    );
    await supabase.from("listo_tasks").update({ status }).eq("id", taskId);
  }

  async function setAssignee(task, member) {
    const assigned_to = member?.id || null;
    const assigned_to_name = member?.display_name || null;
    setTasks((current) => current.map((t) => (t.id === task.id ? { ...t, assigned_to, assigned_to_name } : t)));
    await supabase.from("listo_tasks").update({ assigned_to, assigned_to_name }).eq("id", task.id);
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = tasks.filter((t) => {
    if (query.trim() && !t.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (filter === "mine" && t.assigned_to !== session.user.id) return false;
    if (filter === "overdue" && (!t.due_date || t.done || new Date(t.due_date + "T00:00:00") >= today)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    return new Date(a.created_at) - new Date(b.created_at);
  });
  const pending = tasks.filter((t) => !t.done).length;
  const done = tasks.length - pending;

  const wide = view === "board" && boardView === "kanban";

  return (
    <div className={`${wide ? "max-w-4xl" : "max-w-xl"} mx-auto px-4 py-9 pb-16`}>
      <header className="flex items-center gap-3 mb-1">
        <img src="/logo.png" alt="Círculo VIP" className="w-8 h-8 rounded-lg flex-none object-cover" />
        <h1 className="font-display text-xl font-extrabold tracking-tight flex-1 dark:text-slate-100">Círculo Next</h1>
        {profile?.is_admin && view === "board" && (
          <button
            onClick={() => setView("activity")}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Actividad
          </button>
        )}
        <ProfileMenu
          session={session}
          profile={profile}
          onUpdated={(avatar_url) => setProfile((current) => ({ ...current, avatar_url }))}
        />
      </header>
      <p className="text-xs text-slate-400 mb-5 ml-11">Se sincroniza en vivo con todo el equipo.</p>

      {view === "activity" ? (
        <ActivityLog folders={folders} onBack={() => setView("board")} />
      ) : (
        <>
          <FolderNav
            folders={folders}
            selectedFolderIds={selectedFolderIds}
            onToggle={(id) =>
              setSelectedFolderIds((current) =>
                current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
              )
            }
            onSelectAll={() => setSelectedFolderIds(folders.map((f) => f.id))}
            isAdmin={!!profile?.is_admin}
            session={session}
          />

          {profile?.is_admin && (
            <>
              <FolderManager folders={folders} />
              <TeamPanel folders={folders} session={session} />
              <InvitePanel folders={folders} />
            </>
          )}

          <form onSubmit={addTask} className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow px-4 py-3 mb-3">
            {selectedFolderIds.length > 1 && (
              <select
                value={addFolderId || ""}
                onChange={(e) => setAddFolderId(e.target.value)}
                className="text-xs bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-lg px-2 py-1.5 outline-none flex-none"
              >
                {selectedFolderIds.map((id) => (
                  <option key={id} value={id}>
                    {foldersById[id]?.name}
                  </option>
                ))}
              </select>
            )}
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Agregar una tarea…"
              className="flex-1 min-w-0 text-sm outline-none bg-transparent text-slate-900 placeholder-slate-400 dark:text-slate-100 dark:placeholder-slate-500"
              maxLength={300}
            />
            <button type="submit" className="bg-accent text-white text-sm font-semibold rounded-lg px-4 py-2 flex-none">
              Agregar
            </button>
          </form>

          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[140px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
              <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-slate-400 flex-none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar tareas…"
                className="flex-1 min-w-0 text-xs outline-none bg-transparent text-slate-900 placeholder-slate-400 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border flex-none ${
                  filter === f.id
                    ? "bg-accent text-white border-accent"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="flex items-center gap-1 flex-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
              {[
                { id: "list", label: "Lista" },
                { id: "kanban", label: "Kanban" },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setBoardView(v.id)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${
                    boardView === v.id
                      ? "bg-accent text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400 text-center py-10">Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">
              {tasks.length === 0 ? "Sin tareas todavía." : "Nada coincide con la búsqueda/filtro."}
            </p>
          ) : boardView === "kanban" ? (
            <KanbanBoard
              tasks={filtered}
              teamMembers={teamMembers}
              foldersById={selectedFolderIds.length > 1 ? foldersById : undefined}
              onSetStatus={setStatus}
              onToggle={toggleDone}
              onDelete={deleteTask}
              onRename={renameTask}
              onSetDueDate={setDueDate}
              onSetNotes={setNotes}
              onSetAssignee={setAssignee}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {sorted.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  teamMembers={teamMembers}
                  folder={selectedFolderIds.length > 1 ? foldersById[task.folder_id] : undefined}
                  onToggle={toggleDone}
                  onDelete={deleteTask}
                  onRename={renameTask}
                  onSetDueDate={setDueDate}
                  onSetNotes={setNotes}
                  onSetAssignee={setAssignee}
                />
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
        </>
      )}

      <p className="text-center text-[11px] text-slate-300 dark:text-slate-600 mt-8">Created by: Círculo VIP IA</p>
    </div>
  );
}
