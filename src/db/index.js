const STORAGE_KEY = 'cached_tasks'

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function safeParse(json) {
  if (!json) return null
  try {
    return JSON.parse(json)
  } catch (error) {
    console.warn('Failed to parse cached data', error)
    return null
  }
}

export function initDB() {
  return Promise.resolve()
}

export function getCachedTasks() {
  if (!isBrowser()) return []
  const parsed = safeParse(window.localStorage.getItem(STORAGE_KEY))
  return Array.isArray(parsed) ? parsed : []
}

export function setCachedTasks(tasks) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch (error) {
    console.warn('Failed to persist cached tasks', error)
  }
}

export function upsertCachedTask(task) {
  if (!task) return
  const cache = getCachedTasks()
  const index = cache.findIndex((item) => String(item.id) === String(task.id))
  if (index >= 0) {
    cache[index] = { ...cache[index], ...task }
  } else {
    cache.push(task)
  }
  setCachedTasks(cache)
}

export function removeCachedTask(id) {
  const cache = getCachedTasks().filter((task) => String(task.id) !== String(id))
  setCachedTasks(cache)
}

export function replaceTasksForUser(tasks, userId, matcher) {
  if (!userId || !Array.isArray(tasks)) return
  const cache = getCachedTasks()
  const remaining = typeof matcher === 'function'
    ? cache.filter((task) => !matcher(task, userId))
    : cache
  setCachedTasks([...remaining, ...tasks])
}
