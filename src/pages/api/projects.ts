import type { APIRoute } from 'astro';
import { getPrisma } from '~/lib/prisma';
import { supabase } from '~/lib/supabase';

async function getAuthUser(cookies: any, bodyUserId?: string, queryUserId?: string) {
  if (queryUserId) return { id: queryUserId, email: '' };
  if (bodyUserId) return { id: bodyUserId, email: '' };

  const accessToken = cookies.get('sb-access-token');
  const refreshToken = cookies.get('sb-refresh-token');

  if (!accessToken?.value || !refreshToken?.value) {
    return null;
  }

  const { data, error } = await supabase.auth.setSession({
    refresh_token: refreshToken.value,
    access_token: accessToken.value,
  });

  if (error || !data.user) {
    return null;
  }

  return { id: data.user.id, email: data.user.email || '' };
}

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const prisma = getPrisma();
    const queryUserId = url.searchParams.get('userId');
    const authUser = await getAuthUser(cookies, undefined, queryUserId || undefined);

    if (!authUser) {
      return new Response(JSON.stringify({ error: 'Pengguna tidak terotentikasi' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const projects = await prisma.project.findMany({
      where: { userId: authUser.id },
      include: { tasks: true },
      orderBy: { createdAt: 'desc' },
    });

    return new Response(JSON.stringify(projects), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error GET /api/projects:', error);
    return new Response(JSON.stringify({ error: error.message || 'Gagal mengambil data projek' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const prisma = getPrisma();
    const body = await request.json();
    const authUser = await getAuthUser(cookies, body.userId);

    if (!authUser) {
      return new Response(JSON.stringify({ error: 'Pengguna tidak terotentikasi (userId required)' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure User record exists in Prisma database
    let existingUser = await prisma.user.findUnique({ where: { id: authUser.id } });
    if (!existingUser) {
      existingUser = await prisma.user.create({
        data: {
          id: authUser.id,
          email: authUser.email || `user_${authUser.id}@placeholder.com`,
          password: '',
        },
      });
    }

    const project = await prisma.project.create({
      data: {
        title: body.title,
        category: body.category || 'Umum',
        description: body.description || 'Tidak ada deskripsi projek.',
        userId: authUser.id,
      },
      include: { tasks: true },
    });

    return new Response(JSON.stringify(project), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error POST /api/projects:', error);
    return new Response(JSON.stringify({ error: error.message || 'Gagal menyimpan projek baru' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
