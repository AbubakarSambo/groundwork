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
    /*
     * NOTHING IS EVER EXPOSED BEYOND THIS MAC (Hafsah). `host: true` bound every network address
     * this machine has, not only itself, so the dev server answered anyone on the same network.
     * 'localhost' is this machine alone. Dev server only - `build` and `preview` (what a deploy
     * runs) are untouched.
     */
    host: 'localhost',
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
        /* '127.0.0.1', not 'localhost': the API now binds 127.0.0.1 only in development (nothing
           is ever exposed beyond this Mac), and Node's 'localhost' can resolve to '::1' first -
           where nothing is listening - so the two would miss each other. */
        target: process.env.VITE_PROXY_TARGET ?? 'http://127.0.0.1:3000',
        changeOrigin: true,
        /*
         * ONE ORIGIN FOR THE DEV CLIENT, HOWEVER IT IS ADDRESSED. The API's allow-list names
         * localhost:5173; a page opened as 127.0.0.1:5173 is the same dev client on the same
         * machine, and it was refused ("Origin http://127.0.0.1:5173 not allowed by CORS", 21 Sep
         * 2026) the one time it was useful: two people signed in side by side, in one browser, to
         * look at a check-in from both sides. The proxy presents the client's own origin.
         */
        headers: { origin: 'http://localhost:5173' },
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
