import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]

export default defineConfig({
  base: process.env.GITHUB_REPOSITORY && repoName ? `/${repoName}/` : '/',
  plugins: [react(), tailwindcss()],
})
