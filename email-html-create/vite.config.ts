import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev serves at root ("/"); production build is served from the GitHub Pages
// subpath (https://<user>.github.io/rmkt-email-ai/). Image/asset URLs use
// import.meta.env.BASE_URL so they resolve correctly in both.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/rmkt-email-ai/' : '/',
  plugins: [react()],
}))
