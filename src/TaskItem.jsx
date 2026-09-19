import { useState } from "react";
import { initialsAvatar } from "./avatar";

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

export default function TaskItem({ task, onToggle, onDelete, onRename, onSetDueDate }) {
  const [title, setTitle] = useState(task.title);
  const status = dueStatus(task);

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
          className={`flex-1 min-w-0 text-sm bg-transparent outline-none ${
            task.done ? "line-through text-slate-400" : "text-slate-900 dark:text-slate-100"
          }`}
        />

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
        {status && <span className={`w-2 h-2 rounded-full flex-none ${STATUS_DOT[status]}`} title={
          status === "green" ? "Con tiempo" : status === "yellow" ? "Vence pronto" : "Vencida"
        } />}
        <input
          type="date"
          value={task.due_date || ""}
          onChange={(e) => onSetDueDate(task, e.target.value || null)}
          className="text-[11px] text-slate-400 dark:text-slate-500 bg-transparent outline-none [color-scheme:light] dark:[color-scheme:dark]"
        />

        {task.created_by_name && (
          <img
            src={initialsAvatar(task.created_by_name)}
            title={`Agregada por ${task.created_by_name}`}
            className="w-5 h-5 rounded-full flex-none ml-auto"
            alt=""
          />
        )}
      </div>
    </div>
  );
}
