# 阅读收藏

个人文章分类阅读站：用 Markdown 维护内容，Astro 构建成静态页，部署到云服务器后绑定域名即可随时阅读。

国外文章支持**原文 + 中文译文**切换；国内文章只保留中文版。

## 快速开始

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # 输出 dist/
npm run preview  # 本地预览构建结果
```

## 内容怎么放

目录：`src/content/articles/<分类>/`

### 双语（国外文）

同一主题两个文件，共用 `pair`：

```text
src/content/articles/agent/
  my-article.en.md
  my-article.zh.md
```

Frontmatter 示例：

```yaml
title: Agent 简明介绍
category: agent          # 必须与目录名一致
lang: zh                 # zh | en
pair: my-article         # 双语配对 id，建议等于文件名前缀
date: 2026-08-20
source: https://example.com/original   # 可选
summary: 列表页摘要                   # 可选
```

### 单语（国内文）

```text
src/content/articles/agent/local-notes.md
```

```yaml
title: 本地阅读笔记
category: agent
lang: zh
date: 2026-08-22
summary: 可选摘要
```

不写 `pair`。

## 页面

| 路径 | 说明 |
| --- | --- |
| `/` | 首页，分类卡片 |
| `/category/<分类>/` | 该分类文章列表（双语对合并为一条） |
| `/article/<分类>/<slug>/` | 正文；双语默认译文，可用 `?lang=en` 看原文 |

## 部署

1. 本机或 CI 执行 `npm run build`
2. 将 `dist/` 同步到服务器网站目录（例如 `/var/www/blog-essay`）
3. 用 Nginx / Caddy 指到该目录并绑定域名

仓库提供 Nginx 示例：[`deploy/nginx.example.conf`](deploy/nginx.example.conf)

HTTPS 可用 Let’s Encrypt（certbot 等）申请证书。

## 设计与计划

- 规格：`docs/superpowers/specs/2026-08-25-reading-collection-design.md`
- 实现计划：`docs/superpowers/plans/2026-08-26-reading-collection.md`
