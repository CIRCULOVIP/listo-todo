import { useState } from "react";
import { initialsAvatar } from "./avatar";

export default function TaskItem({ task, onToggle, onDelete, onRename }) {
  const [title, setTitle] = useState(task.title);

  return (
    <div
      className={`flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-3 ${
        task.done ? "opacity-55" : ""
      }`}
    >
      <button
        onClick={() => onToggle(task)}
        className={`w-5 h-5 rounded-full border-2 flex-none flex items-center justify-center ${
          task.done ? "bg-done border-done" : "border-slate-300"
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
          task.done ? "line-through text-slate-400" : "text-slate-900"
        }`}
      />

      {task.created_by_name && (
        <img
          src={initialsAvatar(task.created_by_name)}
          title={`Agregada por ${task.created_by_name}`}
          className="w-5 h-5 rounded-full flex-none"
          alt=""
        />
      )}

      <button
        onClick={() => onDelete(task)}
        className="w-6 h-6 flex-none flex items-center justify-center text-slate-300 hover:text-danger hover:bg-slate-100 rounded-md"
        aria-label="Eliminar tarea"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
