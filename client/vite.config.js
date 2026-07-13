import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // send /api requests to the express server (avoids cors)
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
