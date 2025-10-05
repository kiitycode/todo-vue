<template>
  <section class="auth-page page">
    <h1>Welcome</h1>
    <p class="auth-intro">Use any username and password to sign in and manage your tasks.</p>

    <form @submit.prevent="onSubmit" class="login-form">
      <div class="form-group">
        <label for="username">Username</label>
        <input id="username" v-model="username" placeholder="Enter any username" autocomplete="username" />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input id="password" type="password" v-model="password" placeholder="Enter any password" autocomplete="current-password" />
      </div>

      <button type="submit" class="btn">Sign In</button>
      <p v-if="error" class="text-danger">{{ error }}</p>
    </form>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import api from '../services/api';

const router = useRouter();
const { login } = useAuth();

const username = ref('');
const password = ref('');
const error = ref('');

async function onSubmit() {
  const name = username.value.trim();
  const pass = password.value.trim();

  if (!name || !pass) {
    error.value = 'Username and password are required';
    return;
  }

  const id = `user-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'guest'}`;
  const profile = login({ id, username: name, token: `demo-${Date.now()}` });

  try {
    await api.getTasks(profile.id);
  } catch (err) {
    // ok for first-time users
    console.warn('Initial task load failed', err);
  }

  error.value = '';
  username.value = '';
  password.value = '';
  router.replace({ name: 'Home' });
}
</script>

<style scoped>
.auth-page { text-align: center; align-items: center; }
.auth-intro { margin: 0 0 var(--space-lg); opacity: 0.85; }
.login-form { width: min(420px, 100%); margin: 0 auto; display: flex; flex-direction: column; gap: var(--space-md); }
.login-form button { width: 100%; }
</style>
