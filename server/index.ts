import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import authRouter from './routes/auth.ts';
import teachersRouter from './routes/teachers.ts';
import studentsRouter from './routes/students.ts';
import schemaRouter from './routes/schema.ts';
import outlookRouter from './modules/outlook/outlook.routes.ts';
import { initializeDatabase } from './db/firebase.ts';

export const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize persistent DB & initial admin account
initializeDatabase().catch((err) => {
  console.error('Database initialization warning:', err);
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/students', studentsRouter);
app.use('/api/schema', schemaRouter);
app.use('/api/outlook', outlookRouter);

// Database re-sync endpoint to fetch all details directly from Firestore
app.post('/api/sync', async (req: Request, res: Response) => {
  try {
    const { syncDatabaseFromFirestore } = await import('./db/firebase.ts');
    const result = await syncDatabaseFromFirestore();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to resync database: ' + err.message });
  }
});

app.get('/api/sync', async (req: Request, res: Response) => {
  try {
    const { syncDatabaseFromFirestore } = await import('./db/firebase.ts');
    const result = await syncDatabaseFromFirestore();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to resync database: ' + err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'EduCore Academic Portal API',
  });
});

export default app;
