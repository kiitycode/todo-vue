<template>
  <section v-if="!loading && task" class="page detail-page">
    <h1 class="mb-1">{{ task.name }}</h1>
    <p>Status: <strong>{{ task.status }}</strong></p>
    <p>Priority: <strong>{{ task.priority }}</strong></p>
    <p v-if="task.description" class="mt-1">{{ task.description }}</p>

    <div class="mt-2 flex gap-2 flex-wrap">
      <router-link
        :to="{ name: 'EditTask', params: { id: task.id } }"
        class="btn"
      >
        Edit Task
      </router-link>

      <button class="btn danger" @click="remove" :disabled="saving">
        {{ saving ? 'Deleting…' : 'Delete Task' }}
      </button>

      <button class="btn" type="button" @click="goHome">
        Back
      </button>
    </div>
  </section>

  <div v-else-if="loading">Loading...</div>
  <div v-else-if="error" class="text-danger">{{ error }}</div>
  <div v-else>No task found.</div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../services/api';
import { useAuth } from '../composables/useAuth';

const route = useRoute();
const router = useRouter();
const { user } = useAuth();

const task = ref(null);
const loading = ref(true);
const error = ref('');
const saving = ref(false);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const result = await api.getTask(route.params.id, user.value?.id);
    task.value = result || null;
  } catch (err) {
    error.value = err?.message || 'Failed to load task';
    task.value = null;
  } finally {
    loading.value = false;
  }
}

async function remove() {
  if (!task.value) return;
  const ok = confirm('Are you sure you want to delete this task?');
  if (!ok) return;

  try {
    saving.value = true;
    await api.deleteTask(task.value.id, user.value?.id);
    router.replace({ name: 'Home', query: { refresh: '1' } });
  } catch (err) {
    alert(err?.message || 'Delete failed');
  } finally {
    saving.value = false;
  }
}

function goHome() {
  router.replace({ name: 'Home' });
}

onMounted(load);
watch(() => route.params.id, load);
</script>

<style scoped>
.flex { display: flex; }
.gap-2 { gap: .5rem; }
.mb-1 { margin-bottom: .25rem; }
.mt-1 { margin-top: .25rem; }
.mt-2 { margin-top: .75rem; }
.btn.danger { background: #c62828; color: #fff; }
</style>
