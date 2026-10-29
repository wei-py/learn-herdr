import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';

import './style.css';

/**
 * 原生模板应用，不保留旧字符串渲染器。
 * @type {import('vue').App<Element>}
 */
const app = createApp(App);
app.use(createPinia());
app.mount('#app');
