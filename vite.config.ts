import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: process.env.VITE_BASE_URL || '/',
  plugins: [preact(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  worker: {
    format: 'es',
  },
});