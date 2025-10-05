import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles.css'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Restore persisted auth state before routing kicks in
const auth = useAuthStore()
auth.restore()

app.use(router)
app.mount('#app')
