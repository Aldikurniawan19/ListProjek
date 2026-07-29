import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabase';
import { prisma } from '~/lib/prisma';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const email = formData.get('email')?.toString().trim().toLowerCase();
    const password = formData.get('password')?.toString();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email dan password wajib diisi.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (data.user) {
      await prisma.user.upsert({
        where: { email: data.user.email! },
        update: {
          id: data.user.id,
        },
        create: {
          id: data.user.id,
          email: data.user.email!,
          password: '',
        },
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Registrasi berhasil!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Terjadi kesalahan server saat registrasi.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
