import { Request, Router } from 'express';
import { Prisma } from '../generated/prisma/client';
import { prisma } from '../db';
import { HttpError } from '../errors';
import { ah } from '../middleware/asyncHandler';
import { requireRole } from '../middleware/auth';
import { publicPath, removeUploaded, upload } from '../middleware/upload';
import { nest, optInt, parseDate, parseId, parsePagination, Q, setCond, str } from '../utils/query';

export interface FilterDef {
  param: string;
  field: string;
  type: 'int' | 'number' | 'date' | 'string';
  op: 'equals' | 'gte' | 'lte' | 'contains';
}

export interface CrudConfig {
  model: 'category' | 'employee' | 'company' | 'work';
  label: string;
  searchFields: string[];
  sortFields: string[];
  defaultSort: string;
  defaultOrder?: 'asc' | 'desc';
  filters: FilterDef[];
  include?: Record<string, unknown>;
  detailInclude?: Record<string, unknown>;
  hasPhoto?: boolean;
  deleteConflictMessage: string;
}

function buildFilters(q: Q, defs: FilterDef[]): Record<string, any> {
  const where: Record<string, any> = {};
  for (const f of defs) {
    const raw = str(q, f.param);
    if (raw === undefined) continue;

    let value: string | number | Date;
    switch (f.type) {
      case 'int':
        value = optInt(q, f.param, Number.MIN_SAFE_INTEGER)!;
        break;
      case 'number': {
        const n = Number(raw.replace(',', '.'));
        if (Number.isNaN(n)) throw new HttpError(400, `Параметр ${f.param}: ожидается число`);
        value = n;
        break;
      }
      case 'date':
        value = parseDate(raw, f.param);
        break;
      default:
        value = raw;
    }

    setCond(where, f.field, f.op === 'contains' ? { contains: value, mode: 'insensitive' } : { [f.op]: value });
  }
  return where;
}

export function createCrudRouter(cfg: CrudConfig) {
  const router = Router();
  const model = () => prisma[cfg.model] as any;
  const notFound = (id: number) => new HttpError(404, `${cfg.label} с id=${id} не найден(а)`);
  const uploadMw = cfg.hasPhoto ? [upload.single('photo')] : [];

  const discardUpload = (req: Request) => (req.file ? removeUploaded(publicPath(req.file.filename)) : undefined);

  router.get(
    '/',
    ah(async (req, res) => {
      const q = req.query as Q;
      const { page, limit, skip } = parsePagination(q);

      const sortBy = str(q, 'sortBy') ?? cfg.defaultSort;
      if (!cfg.sortFields.includes(sortBy)) {
        throw new HttpError(400, `Сортировка по полю «${sortBy}» недоступна. Допустимо: ${cfg.sortFields.join(', ')}`);
      }
      const order = (str(q, 'order') ?? cfg.defaultOrder ?? 'asc').toLowerCase();
      if (order !== 'asc' && order !== 'desc') throw new HttpError(400, 'Параметр order: asc или desc');

      const where = buildFilters(q, cfg.filters);
      const search = str(q, 'search');
      if (search) {
        where.OR = cfg.searchFields.map((f) => nest(f, { contains: search, mode: 'insensitive' }));
      }

      const orderBy: any[] = [nest(sortBy, order)];
      if (sortBy !== 'id') orderBy.push({ id: 'asc' }); // стабильный порядок для пагинации

      const [total, data] = await Promise.all([
        model().count({ where }),
        model().findMany({ where, orderBy, skip, take: limit, include: cfg.include }),
      ]);

      res.json({ data, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
    }),
  );

  router.head(
    '/:id',
    ah(async (req, res) => {
      const count = await model().count({ where: { id: parseId(req.params.id) } });
      res.status(count > 0 ? 200 : 404).end();
    }),
  );

  router.get(
    '/:id/exists',
    ah(async (req, res) => {
      const id = parseId(req.params.id);
      res.json({ id, exists: (await model().count({ where: { id } })) > 0 });
    }),
  );

  router.get(
    '/:id',
    ah(async (req, res) => {
      const id = parseId(req.params.id);
      const item = await model().findUnique({ where: { id }, include: cfg.detailInclude ?? cfg.include });
      if (!item) throw notFound(id);
      res.json(item);
    }),
  );

  router.post(
    '/',
    ...uploadMw,
    ah(async (req, res) => {
      try {
        const data: Record<string, unknown> = { ...req.body };
        if (cfg.hasPhoto) {
          delete data.photo; // путь к фото задаёт только сервер
          delete data.removePhoto;
          if (req.file) data.photo = publicPath(req.file.filename);
        }
        const created = await model().create({ data, include: cfg.detailInclude ?? cfg.include });
        res.status(201).json(created);
      } catch (e) {
        await discardUpload(req);
        throw e;
      }
    }),
  );

  const update = ah(async (req, res) => {
    try {
      const id = parseId(req.params.id);
      const existing = await model().findUnique({ where: { id } });
      if (!existing) throw notFound(id);

      const data: Record<string, unknown> = { ...req.body };
      if (cfg.hasPhoto) {
        delete data.photo;
        const remove = String(data.removePhoto) === 'true';
        delete data.removePhoto;
        if (req.file) data.photo = publicPath(req.file.filename);
        else if (remove) data.photo = null;
      }

      const updated = await model().update({ where: { id }, data, include: cfg.detailInclude ?? cfg.include });
      if (cfg.hasPhoto && 'photo' in data) await removeUploaded(existing.photo); // старое фото больше не нужно
      res.json(updated);
    } catch (e) {
      await discardUpload(req);
      throw e;
    }
  });
  router.put('/:id', ...uploadMw, update);
  router.patch('/:id', ...uploadMw, update);

  router.delete(
    '/:id',
    requireRole('admin'),
    ah(async (req, res) => {
      const id = parseId(req.params.id);
      const existing = await model().findUnique({ where: { id } });
      if (!existing) throw notFound(id);
      try {
        await model().delete({ where: { id } });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
          throw new HttpError(409, cfg.deleteConflictMessage);
        }
        throw e;
      }
      if (cfg.hasPhoto) await removeUploaded(existing.photo);
      res.json({ message: `${cfg.label} удалён(а)`, id });
    }),
  );

  return router;
}
