/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // Allow access from network
    proxy: {
      '/api': {
        /**
         * The API this dev server talks to.
         *
         * Hardcoded to 3000 before, which is right almost always and impossible to
         * work around when it is not: verifying a change against a freshly built API
         * meant either killing the one already running on 3000 or editing this file
         * and remembering to put it back.
         */
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
