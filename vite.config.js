import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync } from 'fs'

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        cardapio: resolve(__dirname, 'src/pages/cardapio.html'),
        sobre: resolve(__dirname, 'src/pages/sobre.html'),
        links: resolve(__dirname, 'src/pages/links.html')
      },
      output: {
        manualChunks: {
          'pdf': ['pdfjs-dist']
        }
      }
    },
    minify: 'esbuild',
    target: 'es2015',
    // Garantir que o worker seja copiado corretamente
    assetsInlineLimit: 0
  },
  plugins: [
    {
      name: 'copy-htaccess',
      closeBundle() {
        try {
          copyFileSync(
            resolve(__dirname, 'public/.htaccess'),
            resolve(__dirname, 'dist/.htaccess')
          )
          console.log('✓ .htaccess copiado para dist/')
        } catch (e) {
          console.warn('⚠ Não foi possível copiar .htaccess')
        }
      }
    }
  ],
  server: {
    port: 3000,
    open: true,
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..']
    },
    middlewareMode: false,
    configureServer(server) {

      // Middleware para redirecionar rotas amigáveis
      server.middlewares.use((req, res, next) => {
        const url = req.url;

        // Redirect /cardapio to src/pages/cardapio.html
        if (url === '/cardapio' || url === '/cardapio/' || url === '/cardapio.html') {
          req.url = '/src/pages/cardapio.html';
          return next();
        }

        // Redirect /sobre to src/pages/sobre.html
        if (url === '/sobre' || url === '/sobre/' || url === '/sobre.html') {
          req.url = '/src/pages/sobre.html';
          return next();
        }

        // Redirect /links to src/pages/links.html
        if (url === '/links' || url === '/links/' || url === '/links.html') {
          req.url = '/src/pages/links.html';
          return next();
        }

        next();
      });
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  },
  worker: {
    format: 'es'
  }
})
