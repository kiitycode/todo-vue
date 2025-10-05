<template>
  <section v-if="!loading && task" class="page edit-task-page">
    <h1>Edit Task</h1>
    <form @submit.prevent="save">
      <div class="mb-1">
        <label>Name</label>
        <input v-model="task.name" class="form-control" />
      </div>

      <div class="mb-1">
        <label>Description</label>
        <textarea v-model="task.description" class="form-control" />
      </div>

      <div class="mb-1">
        <label>Status</label>
        <select v-model="task.status">
          <option value="TODO">TODO</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div class="mb-1">
        <label>Priority</label>
        <select v-model="task.priority">
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>

      <div class="flex-between mt-2">
        <router-link :to="{ name: 'DetailPage', params: { id: task.id } }" class="btn">
          Cancel
        </router-link>
        <button class="btn" type="submit" :disabled="saving">{{ saving ? 'Saving...' : 'Save' }}</button>
      </div>

      <p v-if="error" class="text-danger mt-2">{{ error }}</p>
    </form>
  </section>

  <div v-else-if="loading">Loading...</div>
  <div v-else-if="error" class="text-danger">{{ error }}</div>
  <div v-else>No task found.</div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const router = useRouter()
const { user } = useAuth()

const task = ref(null)
const loading = ref(true)
const saving = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await api.getTask(route.params.id, user.value?.id)
    task.value = result
  } catch (err) {
    error.value = err?.message || 'Failed to load task'
    task.value = null
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!task.value) return

  const currentUser = user.value
  if (!currentUser?.id) {
    router.push({ name: 'Login' })
    return
  }

  saving.value = true
  error.value = ''
  try {
    await api.updateTask(
      route.params.id,
      {
        name: task.value.name,
        description: task.value.description,
        status: task.value.status,
        priority: task.value.priority
      },
      currentUser.id
    )
    router.push({ name: 'DetailPage', params: { id: route.params.id } })
  } catch (err) {
    error.value = err?.message || 'Failed to update task'
  } finally {
    saving.value = false
  }
}

onMounted(load)

watch(() => route.params.id, () => {
  load()
})
</script>

