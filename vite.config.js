import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 获取你的 GitHub 仓库名称。如果你的仓库是 my-username/my-wordmaster，name就是 my-wordmaster。
const repoName = 'my-wordmaster'; 

export default defineConfig({
  plugins: [react()],
  // 设置 base 路径为你的仓库名，这是 GitHub Pages 的要求
  base: `/${repoName}/`, 
})