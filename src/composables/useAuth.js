// singleton auth store
import { ref, computed } from 'vue';

const _user = ref(JSON.parse(localStorage.getItem('auth:user') || 'null'));

function persist() {
  localStorage.setItem('auth:user', JSON.stringify(_user.value));
}

export function useAuth() {
  const isLoggedIn = computed(() => !!_user.value && !!_user.value.id);

  function login(u) {
    _user.value = u;
    persist();
    return _user.value;
  }

  function logout() {
    _user.value = null;
    localStorage.removeItem('auth:user');
  }

  return { user: _user, isLoggedIn, login, logout };
}
