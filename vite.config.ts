import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import fileApiPlugin from './vite-file-api-plugin';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), fileApiPlugin()],
});
