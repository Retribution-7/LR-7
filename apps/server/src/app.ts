import cors from 'cors';
import express from 'express';
import { config } from './config';
import { authenticate, requireRole } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { categoriesRouter, companiesRouter, employeesRouter, worksRouter } from './routes/entities';
import { reportsRouter } from './routes/reports';
import { usersRouter } from './routes/users';

export const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());
app.use('/uploads', express.static(config.uploadDir));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);

app.use('/api/categories', authenticate, categoriesRouter);
app.use('/api/employees', authenticate, employeesRouter);
app.use('/api/companies', authenticate, companiesRouter);
app.use('/api/works', authenticate, worksRouter);
app.use('/api/reports', authenticate, reportsRouter);

app.use('/api/users', authenticate, requireRole('admin'), usersRouter);

app.use(notFoundHandler);
app.use(errorHandler);
