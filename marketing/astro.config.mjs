// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
// One source for the live domain, shared with Layout.astro - see src/site.mjs.
import { SITE } from './src/site.mjs';


export default defineConfig({
  site: SITE,
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()]
  }
});
