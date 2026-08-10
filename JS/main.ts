type Priority = "low" | "medium" | "high";
type Status = "todo" | "in-progress" | "completed";

interface Task {
  id: string;
  code: string; 
  title: string;
  description: string;
  priority: Priority;
  dueDate: string; 
  createdAt: string; 
  status: Status;
}

interface TaskFormValues {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
}

declare const Modal: any;

const TASKS_KEY = "kanban:tasks";
const COUNTER_KEY = "kanban:task-counter";

function readCounter(): number {
  const raw = localStorage.getItem(COUNTER_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

function writeCounter(value: number): void {
  localStorage.setItem(COUNTER_KEY, String(value));
}

function nextCode(): string {
  const next = readCounter() + 1;
  writeCounter(next);
  return `#${String(next).padStart(3, "0")}`;
}

function generateId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const TaskStorage = {
  getAll(): Task[] {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Task[]) : [];
    } catch {
      return [];
    }
  },

  saveAll(tasks: Task[]): void {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  },

  getById(id: string): Task | undefined {
    return this.getAll().find((t) => t.id === id);
  },

  getByStatus(status: Status): Task[] {
    return this.getAll()
      .filter((t) => t.status === status)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  create(values: TaskFormValues): Task {
    const task: Task = {
      id: generateId(),
      code: nextCode(),
      title: values.title,
      description: values.description,
      priority: values.priority,
      dueDate: values.dueDate,
      createdAt: new Date().toISOString(),
      status: "todo",
    };
    const tasks = this.getAll();
    tasks.push(task);
    this.saveAll(tasks);
    return task;
  },

  update(id: string, values: Partial<TaskFormValues>): void {
    const tasks = this.getAll();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;
    tasks[idx] = { ...tasks[idx], ...values };
    this.saveAll(tasks);
  },

  updateStatus(id: string, status: Status): void {
    const tasks = this.getAll();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;
    tasks[idx].status = status;
    this.saveAll(tasks);
  },

  delete(id: string): void {
    const tasks = this.getAll().filter((t) => t.id !== id);
    this.saveAll(tasks);
  },
};

const PRIORITY_STYLES: Record<Priority, { badge: string; dot: string; label: string }> = {
  high: {
    badge: "bg-red-50 text-red-600",
    dot: "bg-red-500",
    label: "HIGH PRIORITY",
  },
  medium: {
    badge: "bg-orange-50 text-orange-600",
    dot: "bg-orange-500",
    label: "MEDIUM",
  },
  low: {
    badge: "bg-blue-50 text-blue-600",
    dot: "bg-blue-500",
    label: "LOW",
  },
};

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function priorityBadge(priority: Priority): string {
  const style = PRIORITY_STYLES[priority];
  return `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-base text-2xs font-semibold ${style.badge}">
      <span class="w-1.5 h-1.5 rounded-full ${style.dot}"></span>
      ${style.label}
    </span>
  `;
}

function actionButtons(task: Task): string {
  if (task.status === "todo") {
    return `
      <button data-action="start" data-id="${task.id}" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium hover:scale-105 transition-all duration-200 bg-amber-100 text-amber-700 hover:bg-amber-200">
        <i class="fa-solid fa-play fa-sm" style="color: rgb(189, 79, 0);"></i>
        Start
      </button>
      <button data-action="complete" data-id="${task.id}" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium hover:scale-105 transition-all duration-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
        <i class="fa-solid fa-check fa-sm" style="color: rgb(1, 123, 86);"></i>
        Complete
      </button>
    `;
  }
  if (task.status === "in-progress") {
    return `
      <button data-action="todo" data-id="${task.id}" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium hover:scale-105 transition-all duration-200 bg-slate-100 text-slate-700 hover:bg-slate-200">
      <i class="fa-solid fa-arrow-rotate-left fa-sm" style="color: rgb(49, 65, 88);"></i>
        To Do
      </button>
      <button data-action="complete" data-id="${task.id}" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium hover:scale-105 transition-all duration-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
        <i class="fa-solid fa-check fa-sm" style="color: rgb(1, 123, 86);"></i>
        Complete
      </button>
    `;
  }
  return `
    <button data-action="todo" data-id="${task.id}" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium hover:scale-105 transition-all duration-200 bg-slate-100 text-slate-700 hover:bg-slate-200">
    <i class="fa-solid fa-arrow-rotate-left fa-sm" style="color: rgb(49, 65, 88);"></i>
      To Do
    </button>
    <button data-action="start" data-id="${task.id}" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium hover:scale-105 transition-all duration-200 bg-amber-100 text-amber-700 hover:bg-amber-200">
        <i class="fa-solid fa-play fa-sm" style="color: rgb(189, 79, 0);"></i>
        Start
      </button>
  `;
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderCard(task: Task): string {
  return `
    <div class="bg-white border border-slate-100 rounded-base shadow-xs hover:shadow-md hover:border-slate-200 transition-all duration-200 p-4" data-task-card="${task.id}">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          <span class="text-xs text-slate-400 font-medium">${task.code}</span>
        </div>
        <div class="flex items-center gap-1">
          <button data-action="edit" data-id="${task.id}" class="text-slate-400 hover:text-indigo-500 p-1 rounded transition-colors" aria-label="Edit task">
            <i class="fa-solid fa-xs fa-pen"></i>
          </button>
          <button data-action="delete" data-id="${task.id}" class="text-slate-400 hover:text-red-600 p-1 rounded transition-colors" aria-label="Delete task">
            <i class="fa-solid fa-xs fa-trash-can"></i>
          </button>
        </div>
      </div>

      <h3 class="font-bold text-heading mb-1.5">${escapeHtml(task.title)}</h3>
      ${task.description ? `<p class="text-sm text-body mb-2.5">${escapeHtml(task.description)}</p>` : ""}

      <div class="mb-3">${priorityBadge(task.priority)}</div>

      <div class="flex items-center gap-4 text-xs text-slate-400 pb-3 mb-3 border-b border-default">
        ${
          task.dueDate
            ? `<span class="flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>${formatDate(task.dueDate)}</span>`
            : ""
        }
        <span class="flex items-center gap-1"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3"/></svg>${formatRelativeTime(task.createdAt)}</span>
      </div>

      <div class="flex items-center gap-2">
        ${actionButtons(task)}
      </div>
    </div>
  `;
}

function renderEmptyState(): string {
  return `
    <div class="flex flex-col items-center justify-center py-16 text-center text-slate-400">
      <i class="fa-regular fa-folder-open text-4xl mb-3 opacity-50"></i>
      <p class="font-sm">No tasks yet</p>
      <p class="text-xs">Click + to add one</p>
    </div>
  `;
}

const COLUMNS: { status: Status; listId: string; countId: string }[] = [
  { status: "todo", listId: "todo-list", countId: "todo-count" },
  { status: "in-progress", listId: "in-progress-list", countId: "in-progress-count" },
  { status: "completed", listId: "completed-list", countId: "completed-count" },
];

let modalInstance: any;
let editingTaskId: string | null = null;

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
}

function renderBoard(): void {
  for (const col of COLUMNS) {
    const list = $<HTMLDivElement>(col.listId);
    const countEl = $<HTMLSpanElement>(col.countId);
    const tasks = TaskStorage.getByStatus(col.status);

    countEl.textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
    list.innerHTML = tasks.length ? tasks.map(renderCard).join("") : renderEmptyState();
  }
}

function openModal(mode: "create" | "edit", taskId?: string): void {
  const form = $<HTMLFormElement>("task-form");
  const titleEl = $<HTMLHeadingElement>("modal-title");
  const submitLabel = $<HTMLSpanElement>("modal-submit-label");

  form.reset();
  editingTaskId = null;

  if (mode === "edit" && taskId) {
    const task = TaskStorage.getById(taskId);
    if (!task) return;
    editingTaskId = task.id;
    titleEl.textContent = "Edit Task";
    submitLabel.textContent = "Save changes";
    $<HTMLInputElement>("task-title").value = task.title;
    $<HTMLTextAreaElement>("description").value = task.description;
    $<HTMLSelectElement>("priority").value = task.priority;
    $<HTMLInputElement>("date").value = task.dueDate;
  } else {
    titleEl.textContent = "Create New Task";
    submitLabel.textContent = "Add task";
  }

  modalInstance.show();
}

function handleFormSubmit(e: SubmitEvent): void {
  e.preventDefault();

  const title = $<HTMLInputElement>("task-title").value.trim();
  const description = $<HTMLTextAreaElement>("description").value.trim();
  const priority = $<HTMLSelectElement>("priority").value as Priority;
  const dueDate = $<HTMLInputElement>("date").value;

  if (!title) return;

  if (editingTaskId) {
    TaskStorage.update(editingTaskId, { title, description, priority, dueDate });
  } else {
    TaskStorage.create({ title, description, priority, dueDate });
  }

  modalInstance.hide();
  renderBoard();
}

function handleBoardClick(e: MouseEvent): void {
  const target = e.target as HTMLElement;
  const btn = target.closest<HTMLElement>("[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (!id) return;

  switch (action) {
    case "edit":
      openModal("edit", id);
      break;
    case "delete":
      TaskStorage.delete(id);
      renderBoard();
      break;
    case "start":
      TaskStorage.updateStatus(id, "in-progress");
      renderBoard();
      break;
    case "complete":
      TaskStorage.updateStatus(id, "completed");
      renderBoard();
      break;
    case "todo":
      TaskStorage.updateStatus(id, "todo");
      renderBoard();
      break;
  }
}

function init(): void {
  const modalEl = $<HTMLDivElement>("crud-modal");
  modalInstance = new Modal(modalEl, {
    backdropClasses: "bg-gray-900/50 fixed inset-0 z-40",
  });

  $<HTMLButtonElement>("add-task-btn").addEventListener("click", () => openModal("create"));
  $<HTMLButtonElement>("modal-close-btn").addEventListener("click", () => modalInstance.hide());
  $<HTMLButtonElement>("modal-cancel-btn").addEventListener("click", () => modalInstance.hide());
  $<HTMLFormElement>("task-form").addEventListener("submit", handleFormSubmit);
  document.body.addEventListener("click", handleBoardClick);

  renderBoard();
}

document.addEventListener("DOMContentLoaded", init);