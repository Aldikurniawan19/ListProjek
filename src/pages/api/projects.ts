import type { APIRoute } from 'astro';
import { getPrisma } from '../../lib/prisma';

export const GET: APIRoute = async () => {
  const prisma = getPrisma();
  const projects = await prisma.project.findMany({
    include: { tasks: true },
    orderBy: { createdAt: 'desc' },
  });
  return new Response(JSON.stringify(projects), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const prisma = getPrisma();
  const body = await request.json();
  const project = await prisma.project.create({
    data: {
      title: body.title,
      category: body.category || 'Umum',
      description: body.description || 'Tidak ada deskripsi projek.',
    },
    include: { tasks: true },
  });
  return new Response(JSON.stringify(project), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
