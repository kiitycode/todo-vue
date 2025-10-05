<template>
  <main class="container page">
    <!-- Header -->
    <div class="user-header">
      <div class="user-greeting">
        Welcome, <span>{{ (currentUser && currentUser.username) || 'Guest' }}</span>
      </div>
      <button @click="handleLogout" class="btn logout-btn">Logout</button>
    </div>

    <!-- 2-column on desktop, single column on mobile -->
    <div class="main-grid">
      <!-- Left: Tasks -->
      <section class="tasks card">
        <div class="flex-between">
          <h1>Task List</h1>
          <router-link :to="{ name: 'CreateTask' }" class="btn">+ New Task</router-link>
        </div>

        <div class="mt-2 flex-between filters">
          <input type="text" placeholder="Search task name..." v-model="search" class="filter-input" />
          <select v-model="status">
            <option value="all">All Statuses</option>
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <select v-model="priority">
            <option value="all">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
          <button type="button" class="btn" @click="reload">Reload</button>
        </div>

        <p v-if="loading" class="mt-2">Loading tasks...</p>
        <p v-if="error" class="mt-2 text-danger">{{ error }}</p>
        <p v-if="!loading && !error && filteredTasks.length === 0" class="mt-2">No tasks found.</p>

        <ul class="mt-2 task-list">
          <li
            v-for="task in currentTasks"
            :key="task.id"
            :class="['card mb-1', { 'card-highlight': isHighlighted(task.id) }]"
          >
            <div class="flex-between">
              <div>
                <strong>{{ task.name }}</strong>
                <p class="mt-1">
                  <span>Status: {{ task.status }}</span><br />
                  <span>Priority: {{ task.priority }}</span>
                </p>
              </div>
              <router-link :to="{ name: 'DetailPage', params: { id: task.id } }" class="btn">View</router-link>
            </div>
          </li>
        </ul>

        <div class="flex-between mt-2 pagination-controls" v-if="totalPages > 1">
          <button v-if="currentPage > 1" @click="goToPage(currentPage - 1)" class="btn">Prev</button>
          <button
            v-for="page in totalPages"
            :key="page"
            @click="goToPage(page)"
            class="btn"
            :disabled="currentPage === page"
            :class="{ 'btn-active': currentPage === page }"
          >
            {{ page }}
          </button>
          <button v-if="currentPage < totalPages" @click="goToPage(currentPage + 1)" class="btn">Next</button>
        </div>
      </section>

      <!-- Right: Chatbot -->
      <aside class="chat card">
        <ChatBot />
      </aside>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../services/api';
import { useAuth } from '../composables/useAuth';
import ChatBot from '../components/ChatBot.vue';

const router = useRouter();
const route = useRoute();
const { user, logout } = useAuth();

const tasks = ref([]);
const error = ref('');
const loading = ref(false);

const search = ref('');
const status = ref('all');
const priority = ref('all');

const currentPage = ref(1);
const tasksPerPage = 10;

const currentUser = computed(() => user.value || null);
const userId = computed(() => (currentUser.value && currentUser.value.id ? currentUser.value.id : null));
const searchTerm = computed(() => search.value.trim().toLowerCase());

const highlightTaskId = ref(route.query.highlight ? String(route.query.highlight) : null);
const clearTimers = [];

function scheduleHighlightClear() {
  if (typeof window === 'undefined') return;
  while (clearTimers.length) clearTimeout(clearTimers.pop());
  if (highlightTaskId.value) {
    const timer = window.setTimeout(() => {
      highlightTaskId.value = null;
    }, 4000);
    clearTimers.push(timer);
  }
}

async function loadTasks() {
  if (!userId.value) {
    tasks.value = [];
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    tasks.value = await api.getTasks(userId.value);
  } catch (err) {
    error.value = (err && err.message) || 'Failed to fetch tasks';
    tasks.value = [];
  } finally {
    loading.value = false;
  }
}

function reload() {
  loadTasks();
}
function goToPage(page) {
  currentPage.value = page;
}

function handleLogout() {
  const uid = userId.value;
  if (uid) api.clearUserTasks(uid);
  logout();
  tasks.value = [];
  router.replace({ name: 'Login' });
}

function isHighlighted(id) {
  return highlightTaskId.value && String(id) === highlightTaskId.value;
}

function clearQueryKeys(keys) {
  const next = { ...route.query };
  let dirty = false;
  keys.forEach((key) => {
    if (key in next) {
      delete next[key];
      dirty = true;
    }
  });
  if (dirty) router.replace({ query: next });
}

const filteredTasks = computed(() => {
  const term = searchTerm.value;
  return tasks.value.filter((task) => {
    const name = String(task.name || '').toLowerCase();
    const matchesSearch = !term || name.includes(term);
    const matchesStatus = status.value === 'all' || task.status === status.value;
    const matchesPriority = priority.value === 'all' || task.priority === priority.value;
    return matchesSearch && matchesStatus && matchesPriority;
  });
});

const totalPages = computed(() => {
  const count = Math.ceil(filteredTasks.value.length / tasksPerPage);
  return count > 0 ? count : 1;
});

const currentTasks = computed(() => {
  const indexOfLast = currentPage.value * tasksPerPage;
  const indexOfFirst = indexOfLast - tasksPerPage;
  return filteredTasks.value.slice(indexOfFirst, indexOfLast);
});

onMounted(async () => {
  await loadTasks();
  scheduleHighlightClear();
});

watch(userId, async (newId, oldId) => {
  if (!newId) {
    tasks.value = [];
    return;
  }
  if (newId !== oldId) {
    currentPage.value = 1;
    await loadTasks();
  }
});

watch([search, status, priority], () => {
  currentPage.value = 1;
});

watch(filteredTasks, () => {
  if (currentPage.value > totalPages.value) currentPage.value = 1;
});

watch(
  () => route.query.refresh,
  async (val) => {
    if (val) {
      await loadTasks();
      clearQueryKeys(['refresh']);
    }
  }
);

watch(
  () => route.query.highlight,
  (val) => {
    highlightTaskId.value = val ? String(val) : null;
    if (val) clearQueryKeys(['highlight']);
  }
);

watch(highlightTaskId, () => {
  scheduleHighlightClear();
});

onUnmounted(() => {
  if (typeof window === 'undefined') return;
  while (clearTimers.length) clearTimeout(clearTimers.pop());
});
</script>

<style scoped>
/* Layout */
.main-grid {
  display: grid;
  grid-template-columns: 1fr;        /* mobile: single column */
  gap: 1rem;
  align-items: start;
}
@media (min-width: 980px) {
  .main-grid {
    grid-template-columns: 1.5fr 1fr; /* desktop: tasks larger, chat smaller */
  }
}

/* Cards wrap for both panes */
.card {
  border: 1px solid black;
  background: grey;
  border-radius: 0.75rem;
  padding: 1rem;
}

/* Filters */
.filters { gap: 0.75rem; flex-wrap: wrap; }
.filters select, .filters .filter-input { padding: 0.5rem 0.75rem; }

/* Buttons */
.btn-active { background: var(--accent, #f9c934); color: #000; }

/* Task list */
.card-highlight { border: 2px solid var(--accent, #f9c934); background: #fff9e6; transition: background 0.3s ease; }
.mb-1 { margin-bottom: .75rem; }
.mt-1 { margin-top: .25rem; }
.mt-2 { margin-top: .75rem; }

/* Optional spacing for right pane */
.chat { position: sticky; top: 1rem; }
@media (max-width: 979px) {
  .chat { position: static; }
}
</style>
