import { getCollection, type CollectionEntry } from 'astro:content';

export type ArticleEntry = CollectionEntry<'articles'>;

export type LogicalArticle = {
  category: string;
  slug: string;
  title: string;
  date: Date;
  summary?: string;
  source?: string;
  searchText: string;
  bilingual: boolean;
  versions: {
    zh?: ArticleEntry;
    en?: ArticleEntry;
  };
};

const SAFE_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assertSafeSegment(value: string, field: string, entryId: string): void {
  if (!SAFE_SEGMENT.test(value)) {
    throw new Error(
      `${field} for ${entryId} must contain only lowercase letters, numbers, and single hyphens: "${value}"`,
    );
  }
}

/** Parse category and filename stem from collection id like `agent/intro-to-agents.zh`. */
export function parseArticleId(id: string): { category: string; stem: string } {
  const slash = id.lastIndexOf('/');
  if (slash < 0) {
    throw new Error(`Article id must include category directory: ${id}`);
  }
  const category = id.slice(0, slash);
  const filename = id.slice(slash + 1);
  const stem = filename.replace(/\.(en|zh)$/, '');
  return { category, stem };
}

export async function getAllEntries(): Promise<ArticleEntry[]> {
  const entries = await getCollection('articles');
  for (const entry of entries) {
    const { category, stem } = parseArticleId(entry.id);
    if (entry.data.category !== category) {
      throw new Error(
        `Category mismatch for ${entry.id}: frontmatter "${entry.data.category}" vs directory "${category}"`,
      );
    }
    assertSafeSegment(category, 'Category', entry.id);
    assertSafeSegment(stem, 'Filename stem', entry.id);
    if (entry.data.pair) assertSafeSegment(entry.data.pair, 'Pair', entry.id);
  }
  return entries;
}

export async function getLogicalArticles(category?: string): Promise<LogicalArticle[]> {
  const entries = await getAllEntries();
  const filtered = category
    ? entries.filter((e) => e.data.category === category)
    : entries;

  const map = new Map<string, LogicalArticle>();
  const pairLanguages = new Map<string, Set<'zh' | 'en'>>();

  for (const entry of filtered) {
    if (!entry.data.pair) continue;
    const key = `${entry.data.category}::${entry.data.pair}`;
    const languages = pairLanguages.get(key) ?? new Set<'zh' | 'en'>();
    if (languages.has(entry.data.lang)) {
      throw new Error(
        `Duplicate ${entry.data.lang} version for ${entry.data.category}/${entry.data.pair}`,
      );
    }
    languages.add(entry.data.lang);
    pairLanguages.set(key, languages);
  }

  for (const entry of filtered) {
    const cat = entry.data.category;
    const pairKey = entry.data.pair ? `${cat}::${entry.data.pair}` : undefined;
    const isCompletePair = pairKey ? pairLanguages.get(pairKey)?.size === 2 : false;
    const slug = isCompletePair && entry.data.pair
      ? entry.data.pair
      : parseArticleId(entry.id).stem;
    const key = `${cat}::${slug}`;
    let logical = map.get(key);

    if (logical && !isCompletePair) {
      throw new Error(
        `Duplicate article route ${cat}/${slug}; add a shared pair to intentional bilingual versions`,
      );
    }

    if (!logical) {
      logical = {
        category: cat,
        slug,
        title: entry.data.title,
        date: entry.data.date,
        summary: entry.data.summary,
        source: entry.data.source,
        searchText: `${entry.data.title} ${entry.data.category} ${entry.data.summary ?? ''} ${entry.body ?? ''}`,
        bilingual: false,
        versions: {},
      };
      map.set(key, logical);
    }

    if (logical.versions[entry.data.lang]) {
      throw new Error(`Duplicate ${entry.data.lang} article route: ${cat}/${slug}`);
    }
    logical.versions[entry.data.lang] = entry;
    logical.searchText += ` ${entry.body ?? ''} ${entry.data.title} ${entry.data.summary ?? ''}`;

    if (entry.data.lang === 'zh') {
      logical.title = entry.data.title;
      if (entry.data.summary) logical.summary = entry.data.summary;
      if (entry.data.source) logical.source = entry.data.source;
      logical.date = entry.data.date;
    } else if (!logical.versions.zh) {
      logical.title = entry.data.title;
      if (entry.data.summary) logical.summary = entry.data.summary;
      if (entry.data.source) logical.source = entry.data.source;
      logical.date = entry.data.date;
    }

    if (entry.data.source && !logical.source) {
      logical.source = entry.data.source;
    }
  }

  for (const logical of map.values()) {
    logical.bilingual = Boolean(logical.versions.zh && logical.versions.en);
  }

  return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function categoryHref(category: string): string {
  return `/category/${encodeURIComponent(category)}/`;
}

export function articleHref(article: Pick<LogicalArticle, 'category' | 'slug'>): string {
  return `/article/${encodeURIComponent(article.category)}/${encodeURIComponent(article.slug)}/`;
}

export async function getLogicalArticle(
  category: string,
  slug: string,
): Promise<LogicalArticle | undefined> {
  const articles = await getLogicalArticles(category);
  return articles.find((a) => a.slug === slug);
}

export async function getCategories(): Promise<{ name: string; count: number }[]> {
  const articles = await getLogicalArticles();
  const counts = new Map<string, number>();
  for (const article of articles) {
    counts.set(article.category, (counts.get(article.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function pickVersion(
  article: LogicalArticle,
  lang: 'zh' | 'en' | undefined,
): { entry: ArticleEntry; lang: 'zh' | 'en' } {
  const requested = lang === 'en' ? 'en' : 'zh';

  if (article.bilingual) {
    const entry = article.versions[requested] ?? article.versions.zh ?? article.versions.en;
    if (!entry) throw new Error(`No versions for ${article.category}/${article.slug}`);
    return { entry, lang: entry.data.lang };
  }

  const entry = article.versions.zh ?? article.versions.en;
  if (!entry) throw new Error(`No versions for ${article.category}/${article.slug}`);
  return { entry, lang: entry.data.lang };
}
