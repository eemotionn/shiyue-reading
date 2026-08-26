import { getCollection, type CollectionEntry } from 'astro:content';

export type ArticleEntry = CollectionEntry<'articles'>;

export type LogicalArticle = {
  category: string;
  slug: string;
  title: string;
  date: Date;
  summary?: string;
  source?: string;
  bilingual: boolean;
  versions: {
    zh?: ArticleEntry;
    en?: ArticleEntry;
  };
};

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

function entrySlug(entry: ArticleEntry): string {
  if (entry.data.pair) return entry.data.pair;
  return parseArticleId(entry.id).stem;
}

export async function getAllEntries(): Promise<ArticleEntry[]> {
  const entries = await getCollection('articles');
  for (const entry of entries) {
    const { category } = parseArticleId(entry.id);
    if (entry.data.category !== category) {
      throw new Error(
        `Category mismatch for ${entry.id}: frontmatter "${entry.data.category}" vs directory "${category}"`,
      );
    }
  }
  return entries;
}

export async function getLogicalArticles(category?: string): Promise<LogicalArticle[]> {
  const entries = await getAllEntries();
  const filtered = category
    ? entries.filter((e) => e.data.category === category)
    : entries;

  const map = new Map<string, LogicalArticle>();

  for (const entry of filtered) {
    const cat = entry.data.category;
    const slug = entrySlug(entry);
    const key = `${cat}::${slug}`;
    let logical = map.get(key);

    if (!logical) {
      logical = {
        category: cat,
        slug,
        title: entry.data.title,
        date: entry.data.date,
        summary: entry.data.summary,
        source: entry.data.source,
        bilingual: false,
        versions: {},
      };
      map.set(key, logical);
    }

    logical.versions[entry.data.lang] = entry;

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
