import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Expose the API_KEY to the client-side code as process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    optimizeDeps: {
      include: ['xlsx'],
    },
    server: {
      proxy: {
        // Proxy all /api calls to the Express backend on port 5000
        '/api': {
          target: 'http://localhost:5005',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})