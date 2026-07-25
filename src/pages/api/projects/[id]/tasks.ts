import type { APIRoute } from 'astro';
import { getPrisma } from '../../../../lib/prisma';

export const POST: APIRoute = async ({ params, request }) => {
  const prisma = getPrisma();
  const body = await request.json();
  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description || 'Tidak ada deskripsi detail.',
      projectId: params.id!,
    },
  });
  return new Response(JSON.stringify(task), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
