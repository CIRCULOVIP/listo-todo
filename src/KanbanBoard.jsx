import TaskItem from "./TaskItem.jsx";

const COLUMNS = [
  { id: "todo", label: "Por hacer" },
  { id: "in_progress", label: "En curso" },
  { id: "done", label: "Hecho" },
];

function statusOf(task) {
  return task.status || (task.done ? "done" : "todo");
}

export default function KanbanBoard({ tasks, teamMembers, onSetStatus, ...taskHandlers }) {
  function handleDrop(e, status) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) onSetStatus(taskId, status);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => statusOf(t) === col.id);
        return (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, col.id)}
            className="bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-2 min-h-[140px]"
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 px-1 mb-2">
              {col.label} · {colTasks.length}
            </p>
            <div className="flex flex-col gap-2">
              {colTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <TaskItem task={task} teamMembers={teamMembers} {...taskHandlers} />
                </div>
              ))}
              {colTasks.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-4">Arrastrá una tarjeta acá</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
