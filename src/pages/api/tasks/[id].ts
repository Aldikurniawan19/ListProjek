import type { APIRoute } from 'astro';
import { getPrisma } from '../../../lib/prisma';

export const PUT: APIRoute = async ({ params, request }) => {
  const prisma = getPrisma();
  const body = await request.json();
  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      title: body.title,
      description: body.description,
      completed: body.completed,
    },
  });
  return new Response(JSON.stringify(task), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const prisma = getPrisma();
  await prisma.task.delete({ where: { id: params.id } });
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
