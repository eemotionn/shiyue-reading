# 个人阅读分类站设计规格

**日期：** 2026-08-25  
**状态：** 已确认并实现  
**方案：** Astro 静态站 + Markdown 内容（方案 A）

## 1. 目标与约束

做一个挂在云服务器、绑定域名的个人阅读站，用于分类浏览想看的文章。

| 项 | 决定 |
| --- | --- |
| 使用者 | 主要自己用；域名公开可访问，第一版不加密码 |
| 国外文章 | 原文 + 中文译文，一键切换 |
| 国内文章 | 仅一个中文版 |
| 内容维护 | 电脑上改 Markdown，构建后部署 |
| 非目标（v1） | 登录、搜索、标签、评论、在线编辑、RSS |

**成功标准：** 打开域名能按分类找到文章；国外篇可在原文/译文间切换；国内篇正常阅读；手机浏览器可读。

## 2. 架构

```text
[本地 Markdown] → astro build → dist/ → 云服务器 Nginx/Caddy → 域名
```

- 无数据库、无服务端运行时逻辑（纯静态）。
- 内容通过 Astro Content Collections 在构建期校验与聚合。
- 双语切换用客户端少量脚本（或 Astro 岛屿）完成，不依赖后端。

## 3. 内容模型

### 3.1 目录

```text
src/content/articles/
  agent/
    intro-to-agents.en.md
    intro-to-agents.zh.md
    local-notes.md          # 国内/单语示例
  other-category/
    ...
```

分类以**子目录名**为准；frontmatter 中的 `category` 必须与所在目录一致（构建期可校验或由目录推导）。

### 3.2 Frontmatter

```yaml
title: string          # 必填
category: string       # 必填，与目录名一致
lang: zh | en          # 必填；国外原文也可用其他语言码，v1 先支持 en/zh
pair: string           # 可选；双语配对 id，同 category 下相同 pair 成对
date: YYYY-MM-DD       # 必填
source: url            # 可选，原文链接
summary: string        # 可选，列表摘要
```

### 3.3 配对与展示规则

- 同一 `category` + 同一 `pair`，且存在 `lang: en` 与 `lang: zh` → **双语文章**；详情页默认显示译文（`zh`），提供「原文 / 译文」切换。
- 仅有中文、无 `pair`（或 pair 只有一方）→ **单语文章**；不显示切换控件。
- 列表页每个逻辑文章只出现一次：双语对合并为一条（标题优先用中文版 `title`，可回退英文）。

### 3.4 文件命名建议

- 双语：`{slug}.en.md` / `{slug}.zh.md`，`pair` 建议等于 `{slug}`。
- 单语：`{slug}.md`，`lang: zh`，不写 `pair`。

## 4. 页面与路由

| 路由 | 作用 |
| --- | --- |
| `/` | 首页：站点说明 + 分类卡片（每类文章数） |
| `/category/[category]` | 该分类下的文章列表（标题、日期、摘要、是否双语标记） |
| `/article/[category]/[slug]` | 文章阅读页；双语根据当前语言显示对应正文 |

顶栏：站点名 + 各分类链接。

### 4.1 文章页交互

- 双语：切换按钮「译文」「原文」；默认显示译文。URL 使用查询参数 `?lang=zh|en`（缺省视为 `zh`），切换时更新该参数，便于刷新与分享后仍停留在同一语言。
- 单语：无切换按钮；忽略 `lang` 查询参数。
- 若有 `source`，页内展示「查看来源」外链。
- 文章页 `slug`：双语对取共用 pair（即建议的文件名前缀）；单语取不含扩展名的文件名。

## 5. UI 原则

- 浅色、偏阅读：较大正文字号、舒适行高、正文最大宽度约 65–75ch。
- 响应式：手机与桌面均可读。
- 无复杂动效；切换即时。

## 6. 技术栈

- Astro（最新稳定版）+ TypeScript
- Markdown / MDX 按 Astro 默认 Content Collection（v1 用 Markdown 即可）
- 样式：少量全局 CSS（或 Astro 自带方式），不引入重型 UI 库
- 包管理：npm

## 7. 部署

- `npm run build` → 输出 `dist/`
- 服务器：Nginx 或 Caddy 将站点根指到 `dist/`，配置域名与 HTTPS
- 仓库提供 `deploy/nginx.example.conf` 示例
- 更新流程：改 Markdown → 本地（或 CI）构建 → 同步 `dist/` 到服务器

## 8. 示例内容

第一版附带至少：

1. 一个分类 `agent` 下的双语示例（短文即可）
2. 同分类或另一分类下的单语中文示例  

用于验证配对、列表合并与切换。

## 9. 测试要点

- 构建成功，`dist/` 含首页、分类页、文章页
- 双语列表不重复；切换原文/译文内容正确
- 单语无切换控件
- 窄屏布局不横向溢出

## 10. 后续可扩展（不在 v1）

密码保护、全文搜索、标签、RSS、在线编辑后台、更多原文语言。
