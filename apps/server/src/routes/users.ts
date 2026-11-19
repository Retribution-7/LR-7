import { Router } from 'express';
import { basePrisma } from '../db';
import { HttpError, ValidationError } from '../errors';
import { ah } from '../middleware/asyncHandler';
import { parseId, parsePagination } from '../utils/query';
import { toPublicUser } from '../utils/users';
import { userRoleSchema } from '../validation/schemas';

export const usersRouter = Router();

usersRouter.get(
  '/',
  ah(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const [total, data] = await Promise.all([
      basePrisma.user.count(),
      basePrisma.user.findMany({ orderBy: { id: 'asc' }, skip, take: limit, include: { role: true } }),
    ]);
    res.json({ data: data.map(toPublicUser), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
  }),
);

usersRouter.patch(
  '/:id',
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    const parsed = userRoleSchema.safeParse(req.body);
    if (!parsed.success) throw ValidationError.fromZod(parsed.error);
    const { role } = parsed.data;

    if (req.user!.id === id) throw new HttpError(400, 'Нельзя изменить собственную роль');

    const existing = await basePrisma.user.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, `Пользователь с id=${id} не найден`);

    const updated = await basePrisma.user.update({
      where: { id },
      data: { role: { connect: { name: role } } },
      include: { role: true },
    });
    res.json(toPublicUser(updated));
  }),
);

usersRouter.delete(
  '/:id',
  ah(async (req, res) => {
    const id = parseId(req.params.id);
    if (req.user!.id === id) throw new HttpError(400, 'Нельзя удалить собственную учётную запись');

    const existing = await basePrisma.user.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, `Пользователь с id=${id} не найден`);

    await basePrisma.user.delete({ where: { id } });
    res.json({ message: 'Пользователь удалён', id });
  }),
);
