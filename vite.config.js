import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 將所有 /api/weather 的請求代理到天文台
      '/api/weather': {
        target: 'https://data.weather.gov.hk',
        changeOrigin: true,
        // 關鍵：允許自動跟隨重新導向，解決 3xx 重導向問題
        followRedirects: true, 
        rewrite: (path) => path.replace(/^\/api\/weather/, '')
      }
    }
  }
})
