import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'todo_user'

function readStoredUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    console.warn('Failed to parse stored user', error)
    return null
  }
}

function persistUser(value) {
  if (typeof window === 'undefined') return
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch (error) {
    console.warn('Failed to persist user', error)
  }
}

function normaliseUser(payload) {
  if (!payload) return null
  const id = payload.id ?? payload.userId ?? `user-${Date.now()}`
  const username = payload.username ?? payload.name ?? ''
  const token = payload.token ?? null
  return { id, username, token }
}

export const useAuthStore = defineStore('auth', () => {
  const initialUser = normaliseUser(readStoredUser())
  const user = ref(initialUser)

  if (initialUser) {
    persistUser(initialUser)
  }

  const isAuthenticated = computed(() => Boolean(user.value?.id))

  function setUser(payload) {
    const normalised = normaliseUser(payload)
    user.value = normalised
    persistUser(normalised)
    return normalised
  }

  function login(payload) {
    return setUser(payload)
  }

  function restore() {
    const restored = normaliseUser(readStoredUser())
    if (restored) {
      user.value = restored
      persistUser(restored)
    }
    return restored
  }

  function logout() {
    user.value = null
    persistUser(null)
  }

  return {
    user,
    isAuthenticated,
    login,
    setUser,
    restore,
    logout
  }
})
