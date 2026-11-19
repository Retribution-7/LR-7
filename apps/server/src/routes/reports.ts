import { Router } from 'express';
import { prisma } from '../db';
import { ah } from '../middleware/asyncHandler';
import { optInt, Q } from '../utils/query';

const r2 = (n: number) => Math.round(n * 100) / 100;

export const reportsRouter = Router();

reportsRouter.get(
  '/payroll',
  ah(async (req, res) => {
    const q = req.query as Q;
    const year = optInt(q, 'year', 1990, 2100);
    const month = optInt(q, 'month', 1, 12);
    const companyId = optInt(q, 'companyId');

    const where: Record<string, unknown> = {};
    if (companyId) where.companyId = companyId;
    if (year) {
      where.workDate = month
        ? { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) }
        : { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };
    }

    const works = await prisma.work.findMany({
      where,
      include: { company: true, employee: { include: { category: true } } },
      orderBy: [{ company: { name: 'asc' } }, { workDate: 'asc' }, { id: 'asc' }],
    });

    const groups = new Map<number, { company: { id: number; name: string }; rows: any[]; totalHours: number; totalAccrued: number }>();
    let totalHours = 0;
    let totalAccrued = 0;

    for (const w of works) {
      const hours = Number(w.hoursWorked);
      const rate = Number(w.employee.category.hourlyRate);
      const accrued = r2(hours * rate);

      let g = groups.get(w.companyId);
      if (!g) {
        g = { company: { id: w.company.id, name: w.company.name }, rows: [], totalHours: 0, totalAccrued: 0 };
        groups.set(w.companyId, g);
      }
      g.rows.push({
        workId: w.id,
        employee: w.employee.fullName,
        category: w.employee.category.name,
        hourlyRate: rate,
        workDate: w.workDate.toISOString().slice(0, 10),
        hoursWorked: hours,
        accrued,
      });
      g.totalHours += hours;
      g.totalAccrued += accrued;
      totalHours += hours;
      totalAccrued += accrued;
    }

    res.json({
      year: year ?? null,
      month: month ?? null,
      companies: [...groups.values()].map((g) => ({ ...g, totalHours: r2(g.totalHours), totalAccrued: r2(g.totalAccrued) })),
      totalHours: r2(totalHours),
      totalAccrued: r2(totalAccrued),
    });
  }),
);
