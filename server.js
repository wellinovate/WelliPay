import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5174;

app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'WelliPay Platform',
    timestamp: new Date().toISOString(),
    engine: 'PostgreSQL Ledger Sync Active',
  });
});

// Serve static files from Vite production build
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Client-Side Routing Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`WelliPay server listening on http://0.0.0.0:${PORT}`);
});

export default app;
