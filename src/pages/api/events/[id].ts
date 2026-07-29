import type { APIRoute } from 'astro';
import { getPrisma } from '~/lib/prisma';

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const { id } = params;
    if (!id) {
      return new Response(JSON.stringify({ error: 'Event ID wajib diisi' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prisma = getPrisma();
    await prisma.event.delete({
      where: { id },
    });

    return new Response(JSON.stringify({ message: 'Acara berhasil dihapus' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error DELETE /api/events/[id]:', error);
    return new Response(JSON.stringify({ error: error.message || 'Gagal menghapus acara' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
