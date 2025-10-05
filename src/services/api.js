// src/services/api.js
// Dummy backend: JSONPlaceholder /todos + localStorage cache
const BASE_URL = 'https://jsonplaceholder.typicode.com';
const LOCAL_KEY = 'todo_tasks';

const isBrowser = () => typeof window !== 'undefined';

/* ---------- local cache ---------- */
const readLocalTasks = () => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('parse local tasks failed', e);
    return [];
  }
};

const writeLocalTasks = (tasks) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn('persist local tasks failed', e);
  }
};

const ensureUserId = (userId) => {
  const id = typeof userId === 'string' || typeof userId === 'number' ? String(userId) : null;
  if (!id) throw new Error('Not authenticated');
  return id;
};

const matchUser = (task, userId) => {
  const uid = String(userId);
  return (
    String(task.userId ?? '') === uid ||
    String(task.owner ?? '') === uid ||
    String(task.user_id ?? '') === uid
  );
};

/* ---------- shape adapters ---------- */
// App task: {id,name,description,status,priority,createdAt,updatedAt,userId}
const toAppTask = (remote, userId, fallbackId = '') => {
  const now = new Date().toISOString();
  const isRemoteTodo = remote && (remote.title !== undefined || remote.completed !== undefined);
  return {
    id: remote?.id || fallbackId || `local-${Date.now()}`,
    name: isRemoteTodo ? (remote.title || 'Untitled task') : (remote?.name || 'Untitled task'),
    description: remote?.description || '',
    status: isRemoteTodo ? (remote.completed ? 'DONE' : 'TODO') : (remote?.status || 'TODO'),
    priority: remote?.priority || 'MEDIUM',
    createdAt: remote?.createdAt || now,
    updatedAt: remote?.updatedAt || now,
    userId,
    owner: userId,
    user_id: userId,
    isTemp: Boolean(remote?.isTemp)
  };
};

const toRemoteTodo = (appTask) => ({
  userId: Number(appTask.userId) || appTask.userId,
  id: appTask.id,
  title: appTask.name || 'Untitled task',
  completed: appTask.status === 'DONE'
});

/* ---------- local upserts ---------- */
const upsertLocalTask = (task) => {
  const all = readLocalTasks();
  const idx = all.findIndex((t) => String(t.id) === String(task.id));
  if (idx >= 0) all[idx] = task;
  else all.push(task);
  writeLocalTasks(all);
  return task;
};

const removeLocalTask = (id) => {
  writeLocalTasks(readLocalTasks().filter((t) => String(t.id) !== String(id)));
};

const removeLocalTasksForUser = (userId) => {
  writeLocalTasks(readLocalTasks().filter((t) => !matchUser(t, userId)));
};

/* ---------- remote ops (JSONPlaceholder) ---------- */
const fetchRemoteTasks = async (userId) => {
  try {
    const res = await fetch(`${BASE_URL}/todos?userId=${encodeURIComponent(userId)}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) throw new Error(res.statusText);
    const list = await res.json();
    if (!Array.isArray(list)) return [];
    return list.map((t) => toAppTask(t, userId, t.id));
  } catch (e) {
    console.warn('remote fetch failed', e);
    return [];
  }
};

/* ---------- public API ---------- */
export async function fetchTasks(userId) {
  const uid = ensureUserId(userId);
  const localAll = readLocalTasks();
  const localForUser = localAll.filter((t) => matchUser(t, uid));
  let remote = await fetchRemoteTasks(uid);

  // optional hardening: drop temp locals that duplicate by title when remote has same title
  const remoteTitles = new Set(remote.map((t) => (t.name || '').trim().toLowerCase()));
  const prunedLocal = localForUser.filter(
    (t) => !t.isTemp || !remoteTitles.has((t.name || '').trim().toLowerCase())
  );

  let tasks;
  if (!remote.length) {
    tasks = prunedLocal;
  } else {
    const merged = new Map();
    remote.forEach((t) => merged.set(String(t.id), t));
    prunedLocal.forEach((t) => {
      const key = String(t.id);
      if (!merged.has(key)) merged.set(key, t);
    });
    tasks = Array.from(merged.values());
    const others = localAll.filter((t) => !matchUser(t, uid));
    writeLocalTasks([...others, ...tasks]);
  }

  return tasks
    .map((t) => ({ ...t }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function fetchTaskById(id, userId) {
  const uid = ensureUserId(userId);
  const tasks = await fetchTasks(uid);
  const task = tasks.find((t) => String(t.id) === String(id));
  if (!task) throw new Error('Task not found');
  return { ...task };
}

export async function createTask(data, userId) {
  const uid = ensureUserId(userId);

  // temp record to avoid duplicates later
  const temp = {
    ...toAppTask({ ...data, id: `temp-${Date.now()}` }, uid),
    isTemp: true
  };
  upsertLocalTask(temp);

  try {
    const res = await fetch(`${BASE_URL}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toRemoteTodo(temp))
    });

    if (res.ok) {
      const created = await res.json();
      const finalTask = {
        ...toAppTask(created, uid, created.id),
        description: temp.description,
        priority: temp.priority,
        createdAt: temp.createdAt,
        updatedAt: new Date().toISOString()
      };
      removeLocalTask(temp.id);
      upsertLocalTask(finalTask);
      return { ...finalTask };
    }
  } catch (e) {
    console.warn('remote create failed; keep temp', e);
  }

  return { ...temp };
}

export async function updateTask(id, data, userId) {
  const uid = ensureUserId(userId);
  const current = await fetchTaskById(id, uid);
  const updated = toAppTask({ ...current, ...data, id: current.id }, uid);
  upsertLocalTask(updated);

  try {
    await fetch(`${BASE_URL}/todos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toRemoteTodo(updated))
    });
  } catch (e) {
    console.warn('remote update failed; kept local', e);
  }

  return { ...updated };
}

export async function deleteTask(id, userId) {
  ensureUserId(userId);
  removeLocalTask(id);

  try {
    await fetch(`${BASE_URL}/todos/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('remote delete failed; removed locally', e);
  }

  return { success: true };
}

export function clearUserTasks(userId) {
  if (!userId) return;
  removeLocalTasksForUser(userId);
}

export default {
  getTasks: fetchTasks,
  getTask: fetchTaskById,
  addTask: createTask,
  updateTask,
  deleteTask,
  clearUserTasks
};
