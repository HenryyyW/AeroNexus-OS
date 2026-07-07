import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cesium()],
  optimizeDeps: {
    include: ['cesium'],
  },
  server: {
    proxy: {
      '/api/weather': {
        target: 'https://data.weather.gov.hk',
        changeOrigin: true,
        followRedirects: true,
        rewrite: (path) => path.replace(/^\/api\/weather/, '')
      }
    }
  }
})
