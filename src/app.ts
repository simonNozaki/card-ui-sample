import Vue from 'vue'
import App from './App.vue'

/**
 * ルートとなるVueインスタンスを返す
 */
export function createApp(): Vue {
  return new Vue({
    render: (h) => h(App)
  })
}
