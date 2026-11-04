<script setup lang="ts">
const nudged = ref(false)
</script>

<template>
  <main class="landing">
    <h1 class="logo">TERRACE</h1>
    <p class="tagline">
      a typing trainer - moving from the terminal to the web
    </p>
    <button type="button" class="start" @click="nudged = true">
      press start
    </button>
    <p v-if="nudged" class="soon">soon - web edition is under construction</p>
  </main>
</template>

<style scoped>
.landing {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.75rem;
  text-align: center;
}

.logo {
  margin: 0;
  font-size: clamp(3rem, 9vw, 5.5rem);
  font-weight: 700;
  letter-spacing: 0.3em;
  text-indent: 0.3em; /* offset the trailing letter-spacing so the word centers */
  color: #c0caf5;
}

.logo::after {
  content: '\258D'; /* ▍ terminal-caret block, blinking */
  margin-left: 0.15em;
  color: #a6e3a1;
  animation: blink 1.1s steps(1) infinite;
}

.tagline {
  margin: 0;
  color: #565f89;
}

.start {
  font-family: inherit;
  font-size: 1.25rem;
  letter-spacing: 0.12em;
  padding: 0.85rem 2.4rem;
  color: #c0caf5;
  background: transparent;
  border: 2px solid #565f89;
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.start:hover,
.start:focus-visible {
  color: #a6e3a1;
  border-color: #a6e3a1;
  box-shadow: 0 0 18px rgba(166, 227, 161, 0.25);
  outline: none;
}

.start:active {
  transform: translateY(1px);
}

.soon {
  margin: 0;
  color: #a6e3a1;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .logo::after {
    animation: none;
  }
}
</style>
