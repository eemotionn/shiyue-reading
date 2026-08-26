# Reading Collection Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static Astro site that categorizes personal reading articles, with bilingual (EN/ZH) toggle for foreign pieces and Chinese-only for domestic ones.

**Architecture:** Astro Content Collections load Markdown under `src/content/articles/`. Build-time helpers merge bilingual pairs into logical articles. Static routes for home, category list, and article pages. Client script toggles `?lang=zh|en` on bilingual pages. Deploy as `dist/` behind Nginx.

**Tech Stack:** Astro (latest stable) + TypeScript, Markdown content collections, plain global CSS, npm

**Spec:** `docs/superpowers/specs/2026-08-25-reading-collection-design.md`

## Global Constraints

- No auth, search, tags, comments, CMS, or RSS in v1
- Frontmatter: `title`, `category`, `lang` (`zh`|`en`), optional `pair`, `date`, optional `source`, optional `summary`
- Category = subdirectory name; frontmatter `category` must match
- Bilingual default display: Chinese (`zh`); URL `?lang=zh|en`
- List pages show each logical article once (merged pairs)
- Reading-focused light UI, responsive, body max-width ~65–75ch
- Package manager: npm
- Provide `deploy/nginx.example.conf`

---

### Task 1: Scaffold Astro project

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/env.d.ts`, `.gitignore`, `README.md`
- Create: `public/favicon.svg` (simple mark)

**Interfaces:**
- Produces: Runnable `npm run dev` / `npm run build` Astro app skeleton

- [ ] **Step 1: Create project files**

Use Astro with content collections support. Minimal `package.json`:

```json
{
  "name": "blog-essay",
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

`astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://example.com',
});
```

`tsconfig.json` extends `astro/tsconfigs/strict`. `src/env.d.ts` references `astro/client`.

`.gitignore`: `node_modules/`, `dist/`, `.astro/`.

- [ ] **Step 2: Install and verify scaffold builds**

Run: `npm install` then `npm run build`  
Expected: Build succeeds (may need a placeholder page first — add `src/pages/index.astro` with minimal HTML if required).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "chore: scaffold Astro reading collection site"
```

---

### Task 2: Content collection schema + article helpers

**Files:**
- Create: `src/content.config.ts`
- Create: `src/lib/articles.ts`

**Interfaces:**
- Produces:
  - Collection `articles` with schema fields matching spec
  - `getLogicalArticles(category?: string): LogicalArticle[]`
  - `getLogicalArticle(category: string, slug: string): LogicalArticle | undefined`
  - `getCategories(): { name: string; count: number }[]`
  - Type `LogicalArticle`: `{ category, slug, title, date, summary?, source?, bilingual: boolean, versions: { zh?: Entry; en?: Entry } }`

- [ ] **Step 1: Define collection**

```ts
// src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    lang: z.enum(['zh', 'en']),
    pair: z.string().optional(),
    date: z.coerce.date(),
    source: z.string().url().optional(),
    summary: z.string().optional(),
  }),
});

export const collections = { articles };
```

- [ ] **Step 2: Implement helpers in `src/lib/articles.ts`**

Rules from spec:
- Slug for bilingual = `pair`; for monolingual = filename stem without `.en`/`.zh`
- Merge same `category` + `pair` into one logical article
- List title prefers `zh` title, fallback `en`
- Sort by date descending
- Validate `category` matches path directory when resolving (warn or throw at build if mismatch)

Derive file path category from `id` (e.g. `agent/intro-to-agents.zh` → category `agent`, stem `intro-to-agents`).

- [ ] **Step 3: Add sample Markdown (needed for later tasks; can land here)**

Create under `src/content/articles/agent/`:
- `intro-to-agents.en.md` + `intro-to-agents.zh.md` (same `pair: intro-to-agents`)
- `local-notes.md` (`lang: zh`, no `pair`)

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts src/lib/articles.ts src/content/articles
git commit -m "feat: content schema and logical article helpers"
```

---

### Task 3: Global layout, styles, and site chrome

**Files:**
- Create: `src/styles/global.css`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/Header.astro`

**Interfaces:**
- Consumes: `getCategories()` from `src/lib/articles.ts`
- Produces: Layout with `<slot />`, header site name + category nav, reading-friendly CSS

- [ ] **Step 1: Write global CSS**

Light background, system/ui font stack, body ~1.125rem, line-height ~1.7, `.prose` max-width 72ch, readable links, mobile padding.

- [ ] **Step 2: BaseLayout + Header**

Site title: e.g. 「阅读收藏」. Header lists categories from `getCategories()`.

- [ ] **Step 3: Commit**

```bash
git add src/styles src/layouts src/components
git commit -m "feat: base layout, header, and reading styles"
```

---

### Task 4: Home, category, and article pages

**Files:**
- Create: `src/pages/index.astro`
- Create: `src/pages/category/[category].astro`
- Create: `src/pages/article/[category]/[slug].astro`
- Create: `src/components/LangToggle.astro`

**Interfaces:**
- Consumes: helpers from Task 2; BaseLayout
- Produces: Routes `/`, `/category/:category`, `/article/:category/:slug` with `?lang=` support

- [ ] **Step 1: Home page**

Show short intro + category cards (name + article count). Link to `/category/[category]`.

- [ ] **Step 2: Category list page**

`getStaticPaths` from categories. List logical articles: title, date, summary, bilingual badge. Link to `/article/[category]/[slug]`.

- [ ] **Step 3: Article page + LangToggle**

`getStaticPaths` from all logical articles. Render markdown of selected lang (default `zh` if available, else `en`). Bilingual: show LangToggle updating `?lang=`. Monolingual: no toggle. Show `source` link if present. Use `set:html` from rendered entry or Astro `render()`.

LangToggle (client):

```html
<!-- buttons set location.search to ?lang=zh or ?lang=en; highlight active from URL -->
```

Use a small `<script>` in the component (no heavy framework).

- [ ] **Step 4: Build and smoke-check**

Run: `npm run build`  
Expected: Success; `dist/index.html`, category and article HTML exist.

- [ ] **Step 5: Commit**

```bash
git add src/pages src/components/LangToggle.astro
git commit -m "feat: home, category, and bilingual article pages"
```

---

### Task 5: Deploy example, README, final verification

**Files:**
- Create: `deploy/nginx.example.conf`
- Modify: `README.md` (usage, content rules, deploy steps)

- [ ] **Step 1: Nginx example**

Serve `dist/` as root, `try_files` for static, placeholder `server_name`.

- [ ] **Step 2: README**

Document: npm scripts, how to add mono/bilingual articles, build + sync to server, link to nginx example.

- [ ] **Step 3: Full verification**

Run: `npm run build`  
Manually check (preview or open dist):
- Home lists `agent`
- Category merges bilingual into one row + shows monolingual
- Article default Chinese; `?lang=en` shows English; monolingual has no toggle

- [ ] **Step 4: Commit**

```bash
git add deploy README.md
git commit -m "docs: README and nginx deploy example"
```

---

## Self-Review

1. **Spec coverage:** Architecture, content model, pairing, routes, UI, deploy example, sample content, bilingual default zh — all mapped to tasks.
2. **Placeholders:** None intentional; concrete schemas and file paths given.
3. **Type consistency:** `LogicalArticle` and helper names reused across Tasks 2–4.
