import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  site: 'https://mcv.chaihuo.org',
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  // Legacy /documentation collection retired in favor of /journals.
  // Top-level URLs redirect; deep links to old doc slugs fall through to 404,
  // which is acceptable since those slugs were placeholder content.
  redirects: {
    '/documentation': '/journals',
    '/en/documentation': '/en/journals',
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
    optimizeDeps: {
      include: [
        'react', 'react-dom', 'react/jsx-runtime',
        'motion/react', 'lucide-react',
        'astro/zod', 'react-slick', 'd3-geo',
        'gsap', 'gsap/ScrollTrigger', 'gsap/ScrollToPlugin',
      ],
    },
    ssr: {
      noExternal: ['motion'],
    },
  },
});
