import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!data.session) {
      return new Response(JSON.stringify({ error: 'Gagal mendapatkan sesi login.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { access_token, refresh_token } = data.session;
    
    cookies.set('sb-access-token', access_token, {
      path: '/',
    });
    cookies.set('sb-refresh-token', refresh_token, {
      path: '/',
    });

    return new Response(JSON.stringify({ success: true, message: 'Login berhasil!' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Terjadi kesalahan server saat login.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
