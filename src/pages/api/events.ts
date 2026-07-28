import type { APIRoute } from 'astro';
import { getPrisma } from '../../lib/prisma';

// Helper to ensure Event table exists in PostgreSQL with color column
async function ensureEventTable(prisma: any) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Event" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "start" TIMESTAMP(3) NOT NULL,
      "end" TIMESTAMP(3),
      "color" TEXT DEFAULT 'blue'
    );
  `);

  // Ensure color column exists if table was created previously without color column
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT 'blue';
    `);
  } catch (e) {
    // Ignore error if column already exists
  }
}

export const GET: APIRoute = async () => {
  try {
    const prisma = getPrisma();
    await ensureEventTable(prisma);

    const events = await prisma.$queryRawUnsafe<any[]>(`
      SELECT "id", "title", "start", "end", "color" FROM "Event" ORDER BY "start" ASC
    `);

    return new Response(JSON.stringify(events), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error GET /api/events:', error);
    return new Response(JSON.stringify({ error: error.message || 'Gagal mengambil data acara' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const prisma = getPrisma();
    await ensureEventTable(prisma);

    const body = await request.json();

    if (!body.title || !body.start) {
      return new Response(JSON.stringify({ error: 'Judul dan tanggal mulai wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = 'evt_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const startDate = new Date(body.start).toISOString();
    const endDate = body.end ? new Date(body.end).toISOString() : null;
    const color = body.color || 'blue';

    if (endDate) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Event" ("id", "title", "start", "end", "color") VALUES ($1, $2, $3::timestamp, $4::timestamp, $5)`,
        id,
        body.title,
        startDate,
        endDate,
        color
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Event" ("id", "title", "start", "color") VALUES ($1, $2, $3::timestamp, $4)`,
        id,
        body.title,
        startDate,
        color
      );
    }

    const newEvent = {
      id,
      title: body.title,
      start: startDate,
      end: endDate,
      color,
    };

    return new Response(JSON.stringify(newEvent), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error POST /api/events:', error);
    return new Response(JSON.stringify({ error: error.message || 'Gagal menyimpan acara' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
