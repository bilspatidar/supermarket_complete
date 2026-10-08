import path from 'path';
import { fileURLToPath } from 'url';
import app from './server/app.js';
//import db from './database/connection.js';
import { get } from './database/connection.js';
import { runMigrations } from './database/migrate.js';
import { runSeeder } from './database/seed.js';
import { initScheduledTasks } from './server/jobs/scheduledTasks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  try {
    // 1. Ensure Database & Seed Data
    await runMigrations();
    //const userCount = await db.get('SELECT COUNT(id) as count FROM users');
    const userCount = await get('SELECT COUNT(id) as count FROM users');
    if (Number(userCount?.count || 0) === 0) {
      console.log('[Server] Database is empty, seeding initial data...');
      await runSeeder();
    }

    // 2. Setup Frontend Serving (Vite in dev mode, static in prod mode)
    if (!isProduction) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[Server] Vite middleware mounted for React frontend');
    } else {
      const distPath = path.resolve(__dirname, 'dist');
      const express = (await import('express')).default;
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      console.log('[Server] Serving production build from dist/');
    }

    // 3. Initialize Scheduled Background Tasks (Birthdays, Anniversaries)
    initScheduledTasks();

    // 4. Start Listening on Port 3000
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Supermarket Platform running at http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('[Server] Fatal startup error:', error);
    process.exit(1);
  }
}

startServer();
