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

  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.category !== undefined) updateData.category = body.category;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.liveUrl !== undefined) updateData.liveUrl = body.liveUrl;
  if (body.incrementVisitor) {
    updateData.visitorCount = { increment: 1 };
  }

  const project = await (prisma.project as any).update({
    where: { id: params.id },
    data: updateData,
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
