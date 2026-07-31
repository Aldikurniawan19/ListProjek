import type { APIRoute } from 'astro';
import { supabase } from '~/lib/supabase';
import { getPrisma } from '~/lib/prisma';

// GET /api/books - Fetch all books from Supabase (with Prisma fallback)
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (accessToken?.value && refreshToken?.value) {
      await supabase.auth.setSession({
        refresh_token: refreshToken.value,
        access_token: accessToken.value,
      });
    }

    let books: any[] = [];
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase GET books warning, falling back to Prisma:', error.message);
      const prisma = getPrisma();
      books = await prisma.$queryRawUnsafe(
        `SELECT id, title, author, description, file_path, file_url, file_size, created_at FROM public.books ORDER BY created_at DESC`
      );
    } else {
      books = data || [];
    }

    return new Response(JSON.stringify(books), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error GET /api/books:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Gagal mengambil data buku' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// POST /api/books - Upload PDF file to Supabase Storage & Insert record into `public.books`
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (accessToken?.value && refreshToken?.value) {
      await supabase.auth.setSession({
        refresh_token: refreshToken.value,
        access_token: accessToken.value,
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string || '').trim();
    const author = (formData.get('author') as string || '').trim();
    const description = (formData.get('description') as string || '').trim();

    if (!file || !file.name) {
      return new Response(
        JSON.stringify({ error: 'File PDF buku wajib diunggah' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Judul buku wajib diisi' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize filename and create unique storage path
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `buku_${timestamp}_${cleanFileName}`;

    const fileBuffer = await file.arrayBuffer();

    // Try uploading to 'books' bucket in Supabase storage
    const bucketName = 'books';

    // Check if bucket exists or attempt upload
    let { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'application/pdf',
        upsert: true,
      });

    // If bucket doesn't exist or returns storage error, attempt creating public bucket 'books'
    if (uploadError && (uploadError.message.includes('not found') || uploadError.message.includes('Bucket'))) {
      try {
        await supabase.storage.createBucket(bucketName, { public: true });
        const retryResult = await supabase.storage
          .from(bucketName)
          .upload(filePath, fileBuffer, {
            contentType: file.type || 'application/pdf',
            upsert: true,
          });
        uploadError = retryResult.error;
        uploadData = retryResult.data;
      } catch (e) {
        console.warn('Bucket creation attempt warning:', e);
      }
    }

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Gagal mengunggah file ke Storage: ${uploadError.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const publicUrl = urlData?.publicUrl || `${process.env.SUPABASE_URL || 'https://sqhiewfgvsudhfhfrmrg.supabase.co'}/storage/v1/object/public/${bucketName}/${filePath}`;

    // Insert book metadata into Supabase `public.books` table
    let insertedData: any = null;

    const { data: sbData, error: dbError } = await supabase
      .from('books')
      .insert([
        {
          title,
          author: author || 'Penulis Tidak Diketahui',
          description: description || 'Tidak ada deskripsi singkat.',
          file_path: filePath,
          file_url: publicUrl,
          file_size: file.size || fileBuffer.byteLength,
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.warn('Supabase DB Insert Error, attempting Prisma fallback:', dbError.message);
      try {
        const prisma = getPrisma();
        const result: any[] = await prisma.$queryRawUnsafe(
          `INSERT INTO public.books (title, author, description, file_path, file_url, file_size) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, author, description, file_path, file_url, file_size, created_at`,
          title,
          author || 'Penulis Tidak Diketahui',
          description || 'Tidak ada deskripsi singkat.',
          filePath,
          publicUrl,
          file.size || fileBuffer.byteLength
        );
        insertedData = result[0];
      } catch (prismaErr: any) {
        console.error('Prisma DB Insert Error:', prismaErr);
        // Cleanup uploaded file if both fail
        await supabase.storage.from(bucketName).remove([filePath]);
        return new Response(
          JSON.stringify({ error: `Gagal menyimpan ke database: ${dbError.message}` }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      insertedData = sbData;
    }

    return new Response(JSON.stringify(insertedData), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error POST /api/books:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Gagal memproses buku baru' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE /api/books?id=... - Delete book record and its PDF file from storage
export const DELETE: APIRoute = async ({ url, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token');
    const refreshToken = cookies.get('sb-refresh-token');

    if (accessToken?.value && refreshToken?.value) {
      await supabase.auth.setSession({
        refresh_token: refreshToken.value,
        access_token: accessToken.value,
      });
    }

    const bookId = url.searchParams.get('id');

    if (!bookId) {
      return new Response(
        JSON.stringify({ error: 'ID Buku tidak ditemukan' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let existingFilePath = '';

    // Fetch existing book record to get file_path
    const { data: existingBook, error: fetchError } = await supabase
      .from('books')
      .select('file_path')
      .eq('id', bookId)
      .single();

    if (fetchError || !existingBook) {
      try {
        const prisma = getPrisma();
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT file_path FROM public.books WHERE id = $1::uuid`,
          bookId
        );
        if (rows.length > 0) existingFilePath = rows[0].file_path;
      } catch (e) {}
    } else {
      existingFilePath = existingBook.file_path;
    }

    // Delete file from Supabase Storage
    if (existingFilePath) {
      await supabase.storage.from('books').remove([existingFilePath]);
    }

    // Delete record from `public.books`
    const { error: deleteError } = await supabase
      .from('books')
      .delete()
      .eq('id', bookId);

    if (deleteError) {
      const prisma = getPrisma();
      await prisma.$queryRawUnsafe(
        `DELETE FROM public.books WHERE id = $1::uuid`,
        bookId
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Buku berhasil dihapus' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error DELETE /api/books:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Gagal menghapus buku' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
