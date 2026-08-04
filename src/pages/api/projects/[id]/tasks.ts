import type { APIRoute } from 'astro';
import { getPrisma } from '../../../../lib/prisma';

let schemaEnsured = false;
async function ensureTaskParentIdColumn(prisma: any) {
  if (schemaEnsured) return;
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "parentId" TEXT REFERENCES "Task"("id") ON DELETE CASCADE;'
    );
    schemaEnsured = true;
  } catch (err) {
    console.error('Error ensuring parentId column:', err);
  }
}

function generateId() {
  return 'c' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
}

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const prisma = getPrisma();
    await ensureTaskParentIdColumn(prisma);

    const body = await request.json();
    const newId = generateId();
    const title = body.title || 'Task Baru';
    const description = body.description || '';
    const parentId = body.parentId || null;
    const projectId = params.id!;

    let task: any;
    try {
      const result: any[] = await prisma.$queryRawUnsafe(
        `INSERT INTO "Task" ("id", "title", "description", "completed", "parentId", "projectId") VALUES ($1, $2, $3, false, $4, $5) RETURNING *`,
        newId,
        title,
        description,
        parentId,
        projectId
      );
      task = result && result[0] ? result[0] : { id: newId, title, description, completed: false, parentId, projectId };
    } catch (rawErr) {
      console.warn('Raw SQL insert failed, attempting fallback create:', rawErr);
      task = await (prisma.task as any).create({
        data: {
          id: newId,
          title,
          description,
          projectId,
        },
      });
      task.parentId = parentId;
    }

    const createdTasks: any[] = [task];

    if (Array.isArray(body.subtasks) && body.subtasks.length > 0) {
      for (const st of body.subtasks) {
        const stTitle = typeof st === 'string' ? st.trim() : (st && st.title ? st.title.trim() : '');
        if (!stTitle) continue;
        const stId = generateId();
        try {
          const stResult: any[] = await prisma.$queryRawUnsafe(
            `INSERT INTO "Task" ("id", "title", "description", "completed", "parentId", "projectId") VALUES ($1, $2, '', false, $3, $4) RETURNING *`,
            stId,
            stTitle,
            task.id,
            projectId
          );
          if (stResult && stResult[0]) {
            createdTasks.push(stResult[0]);
          } else {
            createdTasks.push({ id: stId, title: stTitle, description: '', completed: false, parentId: task.id, projectId });
          }
        } catch (stErr) {
          console.error('Failed to create subtask:', stErr);
        }
      }
    }

    return new Response(JSON.stringify({ task, createdTasks }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error POST /api/projects/[id]/tasks:', err);
    return new Response(JSON.stringify({ error: err.message || 'Gagal membuat task' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

