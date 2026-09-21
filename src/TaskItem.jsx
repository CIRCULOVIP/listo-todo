import { useRef, useState } from "react";
import { initialsAvatar } from "./avatar";
import { supabase } from "./supabaseClient";

function dueStatus(task) {
  if (!task.due_date || task.done) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.due_date + "T00:00:00");
  const diffDays = Math.round((due - today) / 86400000);
  if (diffDays < 0) return "red";
  if (diffDays <= 1) return "yellow";
  return "green";
}

const STATUS_DOT = {
  green: "bg-done",
  yellow: "bg-amber-400",
  red: "bg-danger",
};

export default function TaskItem({ task, teamMembers, onToggle, onDelete, onRename, onSetDueDate, onSetNotes, onSetAssignee }) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || "");
  const [notesOpen, setNotesOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const status = dueStatus(task);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "nota.webm");
          const { data, error } = await supabase.functions.invoke("listo-transcribe", { body: form });
          if (error) {
            let message = error.message || "No se pudo transcribir el audio";
            try {
              const body = await error.context?.json();
              if (body?.error) message = body.error;
            } catch {}
            alert(message);
          } else if (data?.text) {
            const merged = ((notes ? notes + " " : "") + data.text).trim();
            setNotes(merged);
            setNotesOpen(true);
            onSetNotes(task, merged || null);
          } else if (data?.error) {
            alert(data.error);
          }
        } catch {
          alert("No se pudo transcribir el audio");
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      alert("No se pudo acceder al micrófono");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <div
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 ${
        task.done ? "opacity-55" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => onToggle(task)}
          className={`w-5 h-5 rounded-full border-2 flex-none flex items-center justify-center ${
            task.done ? "bg-done border-done" : "border-slate-300 dark:border-slate-600"
          }`}
          aria-label="Tildar tarea"
        >
          {task.done && (
            <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3">
              <path d="M4 12.5l5 5L20 6" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== task.title && onRename(task, title.trim())}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className={`flex-1 min-w-[70px] text-sm bg-transparent outline-none ${
            task.done ? "line-through text-slate-400" : "text-slate-900 dark:text-slate-100"
          }`}
        />

        <button
          onClick={() => setNotesOpen((v) => !v)}
          title={task.notes ? "Ver nota" : "Agregar nota"}
          className={`relative w-6 h-6 flex-none flex items-center justify-center rounded-md ${
            task.notes
              ? "bg-accent text-white shadow-sm"
              : "text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          <svg viewBox="0 0 24 24" fill={task.notes ? "currentColor" : "none"} className="w-3.5 h-3.5">
            <path
              d="M6 4h12v13l-4 3-2-1.5L10 20l-4-3V4z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={transcribing}
          title={recording ? "Detener grabación" : transcribing ? "Transcribiendo…" : "Dictar nota por voz"}
          className={`w-6 h-6 flex-none flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 ${
            recording ? "text-danger animate-pulse" : transcribing ? "text-accent" : "text-slate-300"
          }`}
        >
          {transcribing ? (
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 animate-spin">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
              <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
              <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
              <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          )}
        </button>

        <button
          onClick={() => onDelete(task)}
          className="w-6 h-6 flex-none flex items-center justify-center text-slate-300 hover:text-danger hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
          aria-label="Eliminar tarea"
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2 mt-2 pl-8">
        {status && (
          <span
            className={`w-2 h-2 rounded-full flex-none ${STATUS_DOT[status]}`}
            title={status === "green" ? "Con tiempo" : status === "yellow" ? "Vence pronto" : "Vencida"}
          />
        )}
        <input
          type="date"
          value={task.due_date || ""}
          onChange={(e) => onSetDueDate(task, e.target.value || null)}
          className="text-[11px] text-slate-400 dark:text-slate-500 bg-transparent outline-none [color-scheme:light] dark:[color-scheme:dark]"
        />

        <div className="relative ml-auto flex items-center gap-1.5">
          {task.created_by_name && (
            <img
              src={initialsAvatar(task.created_by_name)}
              title={`Agregada por ${task.created_by_name}`}
              className="w-5 h-5 rounded-full flex-none"
              alt=""
            />
          )}
          <button onClick={() => setAssigneeOpen((v) => !v)} className="flex items-center" title="Asignar a">
            {task.assigned_to_name ? (
              <img src={initialsAvatar(task.assigned_to_name)} className="w-5 h-5 rounded-full ring-2 ring-accent" alt="" />
            ) : (
              <span className="w-5 h-5 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-300">
                <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3">
                  <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M5 20c1.3-3.6 3.7-5.4 7-5.4s5.7 1.8 7 5.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              </span>
            )}
          </button>

          {assigneeOpen && (
            <div className="absolute right-0 top-6 z-10 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
              <button
                onClick={() => {
                  onSetAssignee(task, null);
                  setAssigneeOpen(false);
                }}
                className="w-full text-left text-xs px-3 py-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Sin asignar
              </button>
              {teamMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSetAssignee(task, m);
                    setAssigneeOpen(false);
                  }}
                  className="w-full flex items-center gap-2 text-left text-xs px-3 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <img src={initialsAvatar(m.display_name)} className="w-4 h-4 rounded-full flex-none" alt="" />
                  <span className="truncate">{m.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {notesOpen && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (task.notes || "") && onSetNotes(task, notes.trim() || null)}
          placeholder="Agregar notas…"
          rows={2}
          className="mt-2 ml-8 w-[calc(100%-2rem)] text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 outline-none focus:border-accent dark:text-slate-100 dark:placeholder-slate-500"
        />
      )}
    </div>
  );
}
