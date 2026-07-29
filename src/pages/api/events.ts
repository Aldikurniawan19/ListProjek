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

    const events = await prisma.event.findMany({
      where: { userId: authUser.id },
      orderBy: { start: 'asc' },
    });

    const formattedEvents = events.map((e: any) => ({
      ...e,
      color: e.color || 'blue',
    }));

    return new Response(JSON.stringify(formattedEvents), {
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

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const prisma = getPrisma();
    const body = await request.json();

    if (!body.title || !body.start) {
      return new Response(JSON.stringify({ error: 'Judul dan tanggal mulai wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const authUser = await getAuthUser(cookies, body.userId);

    if (!authUser) {
      return new Response(JSON.stringify({ error: 'Pengguna tidak terotentikasi' }), {
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

    const startDate = new Date(body.start);
    const endDate = body.end ? new Date(body.end) : null;
    const color = body.color || 'blue';

    const newEvent = await prisma.event.create({
      data: {
        title: body.title,
        start: startDate,
        end: endDate,
        userId: authUser.id,
      },
    });

    return new Response(JSON.stringify({ ...newEvent, color }), {
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
