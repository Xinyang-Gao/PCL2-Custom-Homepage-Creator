import { defineConfig } from 'vite';

// 开发时把 API 与内置图片请求代理到 Flask 后端（app.py，默认 5000 端口）
export default defineConfig({
    base: './',
    server: {
        port: 5173,
        proxy: {
            '/api': 'http://127.0.0.1:5000',
            '/images': 'http://127.0.0.1:5000'
        }
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        chunkSizeWarningLimit: 900
    }
});
