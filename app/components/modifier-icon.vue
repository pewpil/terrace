<script setup lang="ts">
defineProps<{
  name: 'punctuation' | 'numbers' | 'capitalization'
}>()
</script>

<template>
  <span
    v-if="name === 'capitalization'"
    class="modifier-icon aa"
    aria-hidden="true"
  >
    <span class="aa-big">A</span><span class="aa-small">a</span>
  </span>
  <svg
    v-else
    class="modifier-icon"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.4"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <template v-if="name === 'punctuation'">
      <path d="M4.4 3.2v6.2" />
      <circle cx="4.4" cy="12.5" r="1.05" fill="currentColor" stroke="none" />
      <path
        d="M8.9 5.2c.2-.9 1.1-1.6 2.2-1.6 1.4 0 2.3.9 2.3 2.2 0 1.1-.5 1.8-1.6 2.4-.9.6-1.2 1.1-1.2 2"
      />
      <circle cx="10.6" cy="12.5" r="1.05" fill="currentColor" stroke="none" />
    </template>
    <template v-else>
      <path d="M6.1 2.8 4.9 13.2M11.1 2.8 9.9 13.2M2.8 6.2h10.5M2.2 9.8h10.5" />
    </template>
  </svg>
</template>

<style scoped>
.modifier-icon {
  flex: none;
}

svg.modifier-icon {
  width: 1em;
  height: 1em;
}

.aa {
  display: inline-flex;
  align-items: baseline;
  gap: 0.02em;
  font-family: inherit;
  font-size: 1.05em;
  line-height: 1;
}

.aa-big {
  font-weight: 700;
}

.aa-small {
  font-size: 0.78em;
}
</style>
