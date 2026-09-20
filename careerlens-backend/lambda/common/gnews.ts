import { getSecret } from './secrets';

interface GNewsArticle {
  title: string;
  description?: string;
  url: string;
  publishedAt: string;
  source?: { name?: string };
}

export interface NormalizedNews {
  id: string;
  tag: string;
  tone: 'good' | 'warn' | 'bad';
  title: string;
  summary: string;
  daysAgo: number;
  source: string;
  url: string;
}

// Keyword heuristic for tag/tone — same spirit as the rest of the app's deterministic
// classification (see engine.js): no LLM call for a simple two-bucket categorization.
function classify(text: string, defaultTag: string, defaultTone: NormalizedNews['tone']): { tag: string; tone: NormalizedNews['tone'] } {
  const t = text.toLowerCase();
  if (/layoff|job cuts|downsiz|retrench/.test(t)) return { tag: 'Layoffs', tone: 'bad' };
  if (/hiring|recruit|jobs? openings?|openings surge/.test(t)) return { tag: 'Hiring', tone: 'good' };
  if (/salary|pay hike|compensation/.test(t)) return { tag: 'Salaries', tone: 'warn' };
  return { tag: defaultTag, tone: defaultTone };
}

async function searchGNews(query: string): Promise<GNewsArticle[]> {
  const token = await getSecret(process.env.GNEWS_SECRET_NAME as string);
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&country=in&lang=en&max=10&apikey=${token}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GNews request failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { articles?: GNewsArticle[] };
  return data.articles || [];
}

function normalize(articles: GNewsArticle[], idPrefix: string, defaultTag: string, defaultTone: NormalizedNews['tone']): NormalizedNews[] {
  return articles.map((a, i) => {
    const { tag, tone } = classify(`${a.title} ${a.description || ''}`, defaultTag, defaultTone);
    return {
      id: `${idPrefix}-${i}`,
      tag,
      tone,
      title: a.title,
      summary: a.description || '',
      daysAgo: Math.max(0, Math.round((Date.now() - new Date(a.publishedAt).getTime()) / 86400000)),
      source: a.source?.name || 'News',
      url: a.url,
    };
  });
}

export async function fetchHiringNews(): Promise<NormalizedNews[]> {
  const articles = await searchGNews('India tech jobs hiring IT sector');
  return normalize(articles, 'news', 'Market', 'warn');
}

// Real headlines only, per the decision to never attach fabricated employee-count numbers to
// real company names — no structured "N employees, X%" data, just what was actually reported.
export async function fetchLayoffNews(): Promise<NormalizedNews[]> {
  const articles = await searchGNews('India tech layoffs job cuts IT company');
  return normalize(articles, 'layoff', 'Layoffs', 'bad');
}
