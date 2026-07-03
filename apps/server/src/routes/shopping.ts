import type { FastifyInstance } from 'fastify';
import type { ShoppingItem, ShoppingItemCreate, ShoppingItemUpdate } from '@trano/shared';
import { SHOPPING_CATEGORIES } from '@trano/shared';
import { db, newId } from '../db.ts';
import { broadcast } from '../ws.ts';

interface ItemRow {
  id: string;
  title: string;
  category: string;
  quantity: string | null;
  author_id: string | null;
  status: string;
  recurrence_days: number | null;
  next_due: string | null;
  created_at: string;
  bought_at: string | null;
  bought_by: string | null;
}

function toItem(row: ItemRow): ShoppingItem {
  return {
    id: row.id,
    title: row.title,
    category: row.category as ShoppingItem['category'],
    quantity: row.quantity,
    authorId: row.author_id,
    status: row.status as ShoppingItem['status'],
    recurrenceDays: row.recurrence_days,
    nextDue: row.next_due,
    createdAt: row.created_at,
    boughtAt: row.bought_at,
    boughtBy: row.bought_by,
  };
}

/**
 * Réactive les articles récurrents dont l'échéance est passée :
 * un article récurrent coché repasse en "à acheter" à sa prochaine échéance.
 */
function reviveRecurringItems(): void {
  const result = db
    .prepare(
      `UPDATE shopping_items
       SET status = 'todo', bought_at = NULL, bought_by = NULL, next_due = NULL
       WHERE status = 'bought' AND next_due IS NOT NULL AND next_due <= datetime('now')`
    )
    .run();
  if (result.changes > 0) broadcast('shopping');
}

export function shoppingRoutes(app: FastifyInstance): void {
  // Filet de sécurité en plus du check à chaque lecture : toutes les 15 min
  const interval = setInterval(reviveRecurringItems, 15 * 60 * 1000);
  app.addHook('onClose', () => clearInterval(interval));

  app.get('/api/shopping', () => {
    reviveRecurringItems();
    const rows = db
      .prepare('SELECT * FROM shopping_items ORDER BY created_at DESC')
      .all() as unknown as ItemRow[];
    return rows.map(toItem);
  });

  app.post<{ Body: ShoppingItemCreate }>('/api/shopping', (req, reply) => {
    const { title, category = 'autre', quantity = null, authorId = null, recurrenceDays = null } = req.body ?? {};
    if (!title?.trim()) return reply.code(400).send({ error: 'Le titre est requis' });
    if (!SHOPPING_CATEGORIES.includes(category)) {
      return reply.code(400).send({ error: 'Catégorie inconnue' });
    }

    const id = newId();
    db.prepare(
      'INSERT INTO shopping_items (id, title, category, quantity, author_id, recurrence_days) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, title.trim(), category, quantity, authorId, recurrenceDays);

    broadcast('shopping');
    const row = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(id) as unknown as ItemRow;
    return reply.code(201).send(toItem(row));
  });

  app.patch<{ Params: { id: string }; Body: ShoppingItemUpdate }>('/api/shopping/:id', (req, reply) => {
    const row = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(req.params.id) as unknown as
      | ItemRow
      | undefined;
    if (!row) return reply.code(404).send({ error: 'Article introuvable' });

    const current = toItem(row);
    const b = req.body ?? {};

    if (b.category && !SHOPPING_CATEGORIES.includes(b.category)) {
      return reply.code(400).send({ error: 'Catégorie inconnue' });
    }

    const next = {
      title: b.title?.trim() || current.title,
      category: b.category ?? current.category,
      quantity: b.quantity !== undefined ? b.quantity : current.quantity,
      recurrenceDays: b.recurrenceDays !== undefined ? b.recurrenceDays : current.recurrenceDays,
      status: b.status ?? current.status,
      boughtAt: current.boughtAt,
      boughtBy: current.boughtBy,
      nextDue: current.nextDue,
    };

    // Transition cocher/décocher gérée côté serveur (source de vérité unique)
    if (b.status === 'bought' && current.status === 'todo') {
      next.boughtAt = new Date().toISOString();
      next.boughtBy = b.boughtBy ?? null;
      next.nextDue = next.recurrenceDays
        ? new Date(Date.now() + next.recurrenceDays * 86_400_000).toISOString()
        : null;
    } else if (b.status === 'todo' && current.status === 'bought') {
      next.boughtAt = null;
      next.boughtBy = null;
      next.nextDue = null;
    }

    db.prepare(
      `UPDATE shopping_items
       SET title = ?, category = ?, quantity = ?, recurrence_days = ?, status = ?, bought_at = ?, bought_by = ?, next_due = ?
       WHERE id = ?`
    ).run(
      next.title,
      next.category,
      next.quantity,
      next.recurrenceDays,
      next.status,
      next.boughtAt,
      next.boughtBy,
      next.nextDue,
      req.params.id
    );

    broadcast('shopping');
    const updated = db.prepare('SELECT * FROM shopping_items WHERE id = ?').get(req.params.id) as unknown as ItemRow;
    return toItem(updated);
  });

  app.delete<{ Params: { id: string } }>('/api/shopping/:id', (req, reply) => {
    const result = db.prepare('DELETE FROM shopping_items WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return reply.code(404).send({ error: 'Article introuvable' });
    broadcast('shopping');
    return reply.code(204).send();
  });
}
