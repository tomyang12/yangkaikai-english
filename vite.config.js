import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// SINGLE_FILE=1 时构建为单个 HTML 文件（用于 Artifact 分享），常规构建不受影响
export default defineConfig({
  base: process.env.SINGLE_FILE ? './' : '/',
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.SINGLE_FILE ? [viteSingleFile()] : []),
  ],
})
