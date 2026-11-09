import cors from 'cors';
import express from 'express';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { categoriesRouter, companiesRouter, employeesRouter, worksRouter } from './routes/entities';
import { reportsRouter } from './routes/reports';

export const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());
app.use('/uploads', express.static(config.uploadDir));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/categories', categoriesRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/works', worksRouter);
app.use('/api/reports', reportsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
