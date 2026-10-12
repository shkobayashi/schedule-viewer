import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import GithubSlugger from "github-slugger";
import { Marked } from "marked";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const docsDir = path.join(root, "docs");
const manualDir = path.join(docsDir, "user-manual");
const imagesSrc = path.join(manualDir, "images");
const siteDir = path.join(root, "site");
const cssSrc = path.join(__dirname, "manual-site", "manual.css");

const GITHUB_BLOB =
  "https://github.com/shkobayashi/schedule-viewer/blob/main/docs/";

const PAGES = [
  {
    source: path.join(docsDir, "user-manual.md"),
    out: "index.html",
    nav: "index",
    title: "操作マニュアル",
  },
  {
    source: path.join(manualDir, "getting-started.md"),
    out: "getting-started.html",
    nav: "getting-started",
    title: "はじめに",
  },
  {
    source: path.join(manualDir, "tutorial.md"),
    out: "tutorial.html",
    nav: "tutorial",
    title: "チュートリアル",
  },
  {
    source: path.join(manualDir, "features.md"),
    out: "features.html",
    nav: "features",
    title: "全機能",
  },
];

const EXTERNAL_DOC_SLUG_SOURCES = [
  path.join(docsDir, "development.md"),
  path.join(docsDir, "external-spec.md"),
  path.join(docsDir, "data-format.md"),
];

const NAV_ITEMS = [
  { href: "index.html", nav: "index", label: "操作マニュアル" },
  { href: "getting-started.html", nav: "getting-started", label: "はじめに" },
  { href: "tutorial.html", nav: "tutorial", label: "チュートリアル" },
  { href: "features.html", nav: "features", label: "全機能" },
];

function buildSlugSet(markdown) {
  const slugger = new GithubSlugger();
  const ids = new Set();
  for (const line of markdown.split("\n")) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      ids.add(slugger.slug(match[2].trim()));
    }
  }
  return ids;
}

function loadMarkdown(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function externalSlugSets() {
  const map = new Map();
  for (const filePath of EXTERNAL_DOC_SLUG_SOURCES) {
    const rel = path.relative(docsDir, filePath);
    map.set(rel, buildSlugSet(loadMarkdown(filePath)));
  }
  return map;
}

const pageSlugSets = new Map(
  PAGES.map((page) => [page.out, buildSlugSet(loadMarkdown(page.source))]),
);

const externalSlugs = externalSlugSets();

function manualHtmlForHref(hrefPath) {
  const base = path.basename(hrefPath, ".md");
  if (base === "user-manual") {
    return "index.html";
  }
  return `${base}.html`;
}

function isExternalDoc(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  if (normalized.startsWith("user-manual/")) {
    return false;
  }
  if (normalized === "user-manual.md") {
    return false;
  }
  return normalized.endsWith(".md");
}

function resolveMarkdownLink(href, sourceFile) {
  if (/^(https?:|mailto:)/.test(href)) {
    return href;
  }

  const [target, fragment] = href.split("#");
  if (!target) {
    return fragment ? `#${fragment}` : href;
  }

  const sourceDir = path.dirname(sourceFile);
  const resolved = path.normalize(path.join(sourceDir, target));
  const relToDocs = path.relative(docsDir, resolved).replace(/\\/g, "/");

  if (isExternalDoc(relToDocs)) {
    const url = `${GITHUB_BLOB}${relToDocs}`;
    return fragment ? `${url}#${fragment}` : url;
  }

  const html = manualHtmlForHref(relToDocs);
  return fragment ? `${html}#${fragment}` : html;
}

function rewriteMarkdownLinks(markdown, sourceFile) {
  return markdown.replace(
    /(!?\[[^\]]*\])\(([^)]+)\)/g,
    (full, prefix, href) => {
      if (prefix.startsWith("!")) {
        const imgPath = href.split("#")[0];
        if (/^(https?:|mailto:)/.test(imgPath)) {
          return full;
        }
        const resolved = path.normalize(path.join(path.dirname(sourceFile), imgPath));
        if (!fs.existsSync(resolved)) {
          throw new Error(
            `Missing image ${imgPath} linked from ${path.relative(root, sourceFile)}`,
          );
        }
        return full;
      }
      const rewritten = resolveMarkdownLink(href, sourceFile);
      return `${prefix}(${rewritten})`;
    },
  );
}

function validateFragment(sourceFile, href, rewritten) {
  const fragment = href.includes("#") ? href.split("#")[1] : "";
  if (!fragment) {
    return;
  }

  if (/^(https?:|mailto:)/.test(rewritten)) {
    const docPath = rewritten
      .slice(GITHUB_BLOB.length)
      .split("#")[0];
    const ids = externalSlugs.get(docPath);
    if (!ids?.has(fragment)) {
      throw new Error(
        `Unknown fragment #${fragment} in ${docPath} (from ${path.relative(root, sourceFile)}: ${href})`,
      );
    }
    return;
  }

  const htmlFile = rewritten.split("#")[0];
  const ids = pageSlugSets.get(htmlFile);
  if (!ids?.has(fragment)) {
    throw new Error(
      `Unknown fragment #${fragment} in ${htmlFile} (from ${path.relative(root, sourceFile)}: ${href})`,
    );
  }
}

function validateLinks(markdown, sourceFile) {
  const re = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of markdown.matchAll(re)) {
    const href = match[1];
    if (/^(https?:|mailto:)/.test(href)) {
      continue;
    }
    const rewritten = resolveMarkdownLink(href, sourceFile);
    validateFragment(sourceFile, href, rewritten);
  }
}

function renderNav(currentNav) {
  const items = NAV_ITEMS.map(
    ({ href, nav, label }) =>
      `<li><a href="${href}"${nav === currentNav ? ' aria-current="page"' : ""}>${label}</a></li>`,
  ).join("\n");
  return `<nav class="site-nav" aria-label="操作マニュアル">\n<ul>\n${items}\n</ul>\n</nav>`;
}

function wrapPage({ title, nav, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — schedule-viewer</title>
  <link rel="stylesheet" href="manual.css">
</head>
<body>
${renderNav(nav)}
<main>
${bodyHtml}
</main>
</body>
</html>
`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPageToc(tocEntries) {
  if (tocEntries.length === 0) {
    return "";
  }

  const groups = [];
  let current = null;
  for (const entry of tocEntries) {
    if (entry.depth === 2) {
      current = { id: entry.id, text: entry.text, h3s: [] };
      groups.push(current);
    } else if (entry.depth === 3 && current) {
      current.h3s.push({ id: entry.id, text: entry.text });
    }
  }

  const items = groups
    .map(({ id, text, h3s }) => {
      const h3List =
        h3s.length === 0
          ? ""
          : `<ul>\n${h3s
              .map(
                (h3) =>
                  `<li><a href="#${escapeHtml(h3.id)}">${escapeHtml(h3.text)}</a></li>`,
              )
              .join("\n")}\n</ul>`;
      return `<li><a href="#${escapeHtml(id)}">${escapeHtml(text)}</a>${h3List ? `\n${h3List}` : ""}</li>`;
    })
    .join("\n");

  return `<nav class="page-toc" aria-label="このページ">\n<ul>\n${items}\n</ul>\n</nav>\n`;
}

function insertTocBeforeFirstH2(bodyHtml, tocHtml) {
  if (!tocHtml) {
    return bodyHtml;
  }
  const idx = bodyHtml.indexOf("<h2");
  if (idx === -1) {
    return bodyHtml;
  }
  return `${bodyHtml.slice(0, idx)}${tocHtml}${bodyHtml.slice(idx)}`;
}

function inlinePlainText(tokens) {
  let plain = "";
  for (const token of tokens) {
    if (token.type === "html" || token.type === "image") {
      continue;
    }
    if (Array.isArray(token.tokens) && token.tokens.length > 0) {
      plain += inlinePlainText(token.tokens);
      continue;
    }
    if (typeof token.text === "string") {
      plain += token.text;
    }
  }
  return plain;
}

function createMarked(slugger, tocEntries) {
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading(token) {
        const text = this.parser.parseInline(token.tokens);
        const plain = inlinePlainText(token.tokens);
        const id = slugger.slug(plain);
        if (tocEntries && (token.depth === 2 || token.depth === 3)) {
          tocEntries.push({ depth: token.depth, id, text: plain });
        }
        return `<h${token.depth} id="${id}">${text}</h${token.depth}>\n`;
      },
    },
  });
  return marked;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function rmDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  rmDir(siteDir);
  fs.mkdirSync(siteDir, { recursive: true });
  fs.copyFileSync(cssSrc, path.join(siteDir, "manual.css"));
  copyDir(imagesSrc, path.join(siteDir, "images"));

  for (const page of PAGES) {
    const raw = loadMarkdown(page.source);
    validateLinks(raw, page.source);
    const markdown = rewriteMarkdownLinks(raw, page.source);
    const slugger = new GithubSlugger();
    const tocEntries = page.out === "features.html" ? [] : null;
    const marked = createMarked(slugger, tocEntries);
    let bodyHtml = marked.parse(markdown);
    if (tocEntries) {
      bodyHtml = insertTocBeforeFirstH2(bodyHtml, renderPageToc(tocEntries));
    }
    const html = wrapPage({
      title: page.title,
      nav: page.nav,
      bodyHtml,
    });
    fs.writeFileSync(path.join(siteDir, page.out), html);
  }

  console.log(`Wrote ${siteDir}`);
}

main();
