import type { APIRoute } from 'astro';

interface CachedNews {
  timestamp: number;
  data: any[];
}

let newsCache: CachedNews | null = null;
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const API_KEY = 'pub_7ccb7c7d9e0b4969960bff9418f79b25';

export const GET: APIRoute = async ({ url }) => {
  try {
    const forceRefresh = url.searchParams.get('refresh') === 'true';
    const now = Date.now();

    // Check if cache is still valid (less than 15 minutes old) and forceRefresh is false
    if (!forceRefresh && newsCache && (now - newsCache.timestamp < CACHE_DURATION_MS)) {
      const timeRemainingMs = CACHE_DURATION_MS - (now - newsCache.timestamp);
      const minutesRemaining = Math.ceil(timeRemainingMs / (60 * 1000));

      return new Response(JSON.stringify({
        source: 'cache',
        lastUpdated: new Date(newsCache.timestamp).toISOString(),
        nextUpdateInMinutes: minutesRemaining,
        results: newsCache.data,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch Page 1 from NewsData API
    const response1 = await fetch(`https://newsdata.io/api/1/latest?apikey=${API_KEY}&language=id`);
    
    if (!response1.ok) {
      if (newsCache && newsCache.data.length > 0) {
        return new Response(JSON.stringify({
          source: 'cache_fallback',
          lastUpdated: new Date(newsCache.timestamp).toISOString(),
          results: newsCache.data,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`News API response error: ${response1.statusText}`);
    }

    const data1 = await response1.json();
    let rawArticles = data1.results || [];

    // Fetch Page 2 if nextPage token exists to get up to 20 articles total
    if (data1.nextPage) {
      try {
        const response2 = await fetch(`https://newsdata.io/api/1/latest?apikey=${API_KEY}&language=id&page=${data1.nextPage}`);
        if (response2.ok) {
          const data2 = await response2.json();
          if (Array.isArray(data2.results)) {
            rawArticles = [...rawArticles, ...data2.results];
          }
        }
      } catch (err) {
        // Silently fallback to page 1 articles if page 2 fetch fails
        console.warn('Page 2 fetch error:', err);
      }
    }

    const formattedArticles = rawArticles.map((article: any) => ({
      article_id: article.article_id || 'art_' + Math.random().toString(36).substring(2, 9),
      title: article.title || 'Tanpa Judul',
      description: article.description || 'Tidak ada deskripsi singkat untuk berita ini.',
      link: article.link || '#',
      image_url: article.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80',
      pubDate: article.pubDate || new Date().toISOString(),
      source_name: article.source_name || article.source_id || 'Portal Berita',
      source_icon: article.source_icon || null,
      category: Array.isArray(article.category) ? article.category : [article.category || 'top'],
    }));

    // Update in-memory cache
    newsCache = {
      timestamp: now,
      data: formattedArticles,
    };

    return new Response(JSON.stringify({
      source: 'live',
      lastUpdated: new Date(now).toISOString(),
      nextUpdateInMinutes: 15,
      results: formattedArticles,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in GET /api/news:', error);

    // Return cached data if available
    if (newsCache && newsCache.data.length > 0) {
      return new Response(JSON.stringify({
        source: 'cache_fallback',
        lastUpdated: new Date(newsCache.timestamp).toISOString(),
        results: newsCache.data,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      error: error.message || 'Gagal mengambil data berita.',
      results: [],
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
