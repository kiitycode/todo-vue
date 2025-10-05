<template>
  <section class="card chatbot">
    <header class="chatbot__header">
      <h2>AI Chatbot</h2>
      <small class="muted">Ask for help about tasks, filters, or anything.</small>
    </header>

    <div class="chatbot__window" ref="scroller">
      <div v-for="(m, i) in messages" :key="i" :class="['msg', m.role]">
        <div class="bubble"><p>{{ m.content }}</p></div>
      </div>
      <div v-if="loading" class="msg assistant">
        <div class="bubble"><p>Thinking…</p></div>
      </div>
    </div>

    <form class="chatbot__input" @submit.prevent="send">
      <input
        v-model="input"
        placeholder="Ask something…"
        :disabled="loading || !hasToken"
        @keydown.enter.exact.prevent="send"
      />
      <button class="btn" type="submit" :disabled="loading || !input.trim() || !hasToken">Send</button>
    </form>

    <p v-if="error" class="text-danger mt-1">{{ error }}</p>
    <p v-if="!hasToken" class="text-danger mt-1">
      Missing/invalid VITE_HF_TOKEN in .env. Create a Hugging Face <em>Read</em> token (starts with <code>hf_</code>), set it, then restart dev server.
    </p>
  </section>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';

// Use a public-by-default model to avoid 404 due to gated access
const MODEL = 'HuggingFaceH4/zephyr-7b-beta';
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN || '';
const hasToken = HF_TOKEN.startsWith('hf_');

const messages = ref([
  { role: 'assistant', content: 'Hello. I can help with your todo app. Ask a question.' }
]);
const input = ref('');
const loading = ref(false);
const error = ref('');
const scroller = ref(null);

function scrollToBottom() {
  nextTick(() => {
    if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight;
  });
}

function buildPrompt(history, userMsg) {
  const sys = 'You are a concise assistant helping with a Vue todo app. Be direct.';
  const turns = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
  return `${sys}\n\n${turns}\nUser: ${userMsg}\nAssistant:`;
}

async function callHuggingFace(prompt) {
  // wait_for_model=true avoids 503 “loading” responses
  const url = `https://api-inference.huggingface.co/models/${MODEL}?wait_for_model=true`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${HF_TOKEN}` // require token
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { max_new_tokens: 256, temperature: 0.7, return_full_text: false }
    })
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    // Common causes: bad token (401), gated/private model (404), loading (503)
    throw new Error(`HF error ${res.status}: ${text.slice(0, 200) || 'Request failed'}`);
  }

  // HF may return array or object. Try both.
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text.trim();
    if (data?.generated_text) return data.generated_text.trim();
    return typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500);
  } catch {
    return text.slice(0, 500) || 'No response';
  }
}

async function send() {
  if (!hasToken) {
    error.value = 'No Hugging Face token configured.';
    return;
  }

  const q = input.value.trim();
  if (!q || loading.value) return;

  error.value = '';
  messages.value.push({ role: 'user', content: q });
  input.value = '';
  loading.value = true;
  scrollToBottom();

  try {
    const prompt = buildPrompt(messages.value, q);
    const reply = await callHuggingFace(prompt);
    messages.value.push({ role: 'assistant', content: reply });
  } catch (e) {
    messages.value.push({ role: 'assistant', content: 'Error fetching response.' });
    error.value = e?.message || 'Failed to fetch response.';
  } finally {
    loading.value = false;
    scrollToBottom();
  }
}

onMounted(() => {
  // quick visibility for debugging env
  // console.log('HF token present?', hasToken);
  scrollToBottom();
});
</script>

<style scoped>
.chatbot { max-width: 720px; margin: 1rem auto; padding: 1rem; }
.chatbot__header { display: flex; flex-direction: column; gap: .25rem; margin-bottom: .5rem; }
.muted { opacity: .7; font-size: .9rem; }
.chatbot__window {
  height: 320px;
  overflow-y: auto;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: .5rem;
  padding: .5rem;
}
.msg { display: flex; margin: .35rem 0; }
.msg.user { justify-content: flex-end; }
.msg.assistant { justify-content: flex-start; }
.bubble {
  max-width: 80%;
  padding: .5rem .625rem;
  border-radius: .75rem;
  font-size: .95rem;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg.user .bubble {
  background: var(--accent, #f9c934);
  color: #111;
  border-top-right-radius: .25rem;
}
.msg.assistant .bubble {
  background: #fff;
  border: 1px solid #e5e7eb;
  color: #111;
  border-top-left-radius: .25rem;
}
.chatbot__input { display: flex; gap: .5rem; margin-top: .5rem; }
.chatbot__input input {
  flex: 1;
  padding: .5rem .75rem;
  border: 1px solid #e5e7eb;
  border-radius: .5rem;
  outline: none;
}
.chatbot__input input:focus { border-color: #cbd5e1; }
.btn { padding: .5rem .9rem; border-radius: .5rem; }
.mt-1 { margin-top: .5rem; }
</style>
