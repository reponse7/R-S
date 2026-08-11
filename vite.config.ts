import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'clients-api-mock',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const filePath = path.resolve(__dirname, 'src/data/clientsData.json');
          
          if (req.url === '/api/clients' && req.method === 'GET') {
            if (fs.existsSync(filePath)) {
              const data = fs.readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
            } else {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'clientsData.json not found' }));
            }
            return;
          }
          
          if (req.url === '/api/clients' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const clients = JSON.parse(body);
                if (Array.isArray(clients)) {
                  fs.writeFileSync(filePath, JSON.stringify(clients, null, 2));
                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true }));
                } else {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Expected an array' }));
                }
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Failed to write' }));
              }
            });
            return;
          }
          
          next();
        });
      }
    }
  ],
})
