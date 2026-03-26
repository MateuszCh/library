import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            // Przekierowuje zapytania z http://localhost:5173/api
            // na http://localhost:3000/api
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false
            },
            '/uploads': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                secure: false
            }
        }
    }
});
