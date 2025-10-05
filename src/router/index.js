import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '../composables/useAuth';

import Home from '../views/Home.vue';
import CreateTask from '../views/CreateTasks.vue';
import DetailPage from '../views/DetailPage.vue';
import EditTask from '../views/EditTask.vue';
import Login from '../views/Login.vue';
import NotFound from '../views/NotFound.vue';

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/create', name: 'CreateTask', component: CreateTask },
  { path: '/todos/:id', name: 'DetailPage', component: DetailPage, props: true },
  { path: '/todos/:id/edit', name: 'EditTask', component: EditTask, props: true },
  { path: '/login', name: 'Login', component: Login },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// simple auth guard
router.beforeEach((to, _from, next) => {
  const { isLoggedIn } = useAuth();
  if (to.name !== 'Login' && !isLoggedIn.value) return next({ name: 'Login' });
  if (to.name === 'Login' && isLoggedIn.value) return next({ name: 'Home' });
  next();
});

export default router;
