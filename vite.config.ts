import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';

/* Serves /manus-storage/{key} uploads through the project's Forge credentials. */
function vitePluginStorageProxy(): Plugin {
  return {
    name: 'manus-storage-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/manus-storage', async (req, res) => {
        const key = req.url?.replace(/^\//, '');
        if (!key) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing storage key');
          return;
        }
        const forgeBaseUrl = (process.env.BUILT_IN_FORGE_API_URL || '').replace(/\/+$/, '');
        const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
        if (!forgeBaseUrl || !forgeKey) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Storage proxy not configured');
          return;
        }
        try {
          const forgeUrl = new URL('v1/storage/presign/get', forgeBaseUrl + '/');
          forgeUrl.searchParams.set('path', key);
          const forgeResp = await fetch(forgeUrl, {
            headers: { Authorization: `Bearer ${forgeKey}` },
          });
          if (!forgeResp.ok) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Storage backend error');
            return;
          }
          const { url } = (await forgeResp.json()) as { url: string };
          if (!url) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Empty signed URL');
            return;
          }
          res.writeHead(307, { Location: url, 'Cache-Control': 'no-store' });
          res.end();
        } catch {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end('Storage proxy error');
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), vitePluginStorageProxy()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    // 868 WebP frames + 8 posters live in public/ and are copied verbatim.
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // Split by package so the animation engine and the framework cache
        // independently of the site's own code.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/gsap')) return 'gsap';
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules/scheduler')
          ) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },
});
