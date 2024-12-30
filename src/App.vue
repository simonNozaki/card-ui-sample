<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  data: () => ({
    message: 'Vue bundled!'
  })
})
</script>

<template>
  <div>
    <h1>Hello, Vue!</h1>
    <p>{{ message }}</p>
  </div>
</template>
