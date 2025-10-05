import { ref, onMounted, watch } from 'vue'
import { useAuth } from './useAuth'
import api from '../services/api'

export function useCachedTodos() {
  const { user } = useAuth()
  const todos = ref([])
  const loading = ref(false)
  const error = ref('')

  async function load() {
    const userId = user.value?.id
    if (!userId) {
      todos.value = []
      error.value = ''
      return
    }

    loading.value = true
    error.value = ''
    try {
      const list = await api.getTasks(userId)
      todos.value = Array.isArray(list) ? list : []
    } catch (err) {
      error.value = err?.message || 'Failed to load tasks'
      todos.value = []
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  watch(
    () => user.value?.id,
    () => {
      load()
    }
  )

  return { todos, loading, error, load }
}
