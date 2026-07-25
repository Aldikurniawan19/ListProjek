import type { APIRoute } from 'astro';
import { getPrisma } from '../../../lib/prisma';

export const GET: APIRoute = async ({ params }) => {
  const prisma = getPrisma();
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { tasks: true },
  });
  if (!project) {
    return new Response(JSON.stringify({ error: 'Project not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify(project), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const prisma = getPrisma();
  const body = await request.json();
  const project = await prisma.project.update({
    where: { id: params.id },
    data: {
      title: body.title,
      category: body.category,
      description: body.description,
    },
    include: { tasks: true },
  });
  return new Response(JSON.stringify(project), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const prisma = getPrisma();
  await prisma.project.delete({ where: { id: params.id } });
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
