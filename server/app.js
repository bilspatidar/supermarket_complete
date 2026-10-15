import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());

// Razorpay requires the original request bytes for webhook signature verification.
// This route is mounted under /api by the main application.
app.use(
  '/api/payments/razorpay/webhook',
  express.raw({ type: 'application/json', limit: '1mb' })
);

// Parse JSON for all other routes.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded assets.
const uploadsPath = path.resolve(__dirname, '../public/uploads');
app.use('/uploads', express.static(uploadsPath));

// Mount centralized API router.
app.use('/api', apiRouter);

// Central error handler.
app.use((err, req, res, next) => {
  console.error('[API Error]', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;
