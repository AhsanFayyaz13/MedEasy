import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const VENDOR_GROUPS = [
  ['vendor-react', ['/react/', '/react-dom/', '/scheduler/', '/react-router/', '/react-router-dom/']],
  ['vendor-ui', ['/react-bootstrap/', '/@restart/', '/@popperjs/', '/dom-helpers/', '/@react-aria/', '/uncontrollable/']],
  ['vendor-http', ['/axios/']],
]

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Long-term cacheable vendor chunks. chart.js is intentionally left out:
        // it is only imported by the lazily-loaded admin dashboard.
        manualChunks(id) {
          const path = id.split('\\').join('/')
          if (!path.includes('/node_modules/')) return undefined
          const group = VENDOR_GROUPS.find(([, pkgs]) => pkgs.some((p) => path.includes(`/node_modules${p}`)))
          return group ? group[0] : undefined
        },
      },
    },
  },
})
