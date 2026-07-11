// 쿠팡 수집 → 카테고리별 정적 사이트 생성 (하루 perDay개씩 누적 발행)
const fs = require("fs");
const path = require("path");
const config = require("../config");
const { searchProducts } = require("./coupang");
const { trendKeywords } = require("./trends");
const { readPublished, writePublished } = require("./state");
const { normKey } = require("./util");
const T = require("./templates");
const { buildGuide } = require("./enrich");

const OUT = path.join(__dirname, "..", "public");
const ACCESS_KEY = process.env.COUPANG_ACCESS_KEY;
const SECRET_KEY = process.env.COUPANG_SECRET_KEY;
const today = new Date().toISOString().slice(0, 10);
const catBySlug = Object.fromEntries(config.categories.map((c) => [c.slug, c]));

function adsenseHead() {
  if (!config.adsenseClient) return "";
  return `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${T.esc(config.adsenseClient)}" crossorigin="anonymous"></script>`;
}
function categoryNav(activeCatSlug) {
  return config.categories.map((c) =>
    `<a href="./cat-${T.esc(c.slug)}.html"${c.slug === activeCatSlug ? ' class="on"' : ""}>${T.esc(c.name)}</a>`
  ).join("");
}

function layout({ title, description, canonical, body, activeCat }) {
  return `<!doctype html>
<html lang="${T.esc(config.site.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${T.esc(title)}</title>
<meta name="description" content="${T.esc(description)}">
<link rel="canonical" href="${T.esc(canonical)}">
<meta property="og:title" content="${T.esc(title)}">
<meta property="og:description" content="${T.esc(description)}">
${adsenseHead()}
<link rel="stylesheet" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css">
<style>
:root{color-scheme:light dark;--brand:#2563eb;--brand-d:#1d4ed8;--bg:#ffffff;--bg2:#f6f7f9;--text:#1a1c20;--muted:#6b7280;--border:#ececf0;--card:#ffffff;--shadow:0 1px 2px rgba(20,20,40,.05),0 6px 20px rgba(20,20,40,.06);--shadow-h:0 6px 16px rgba(20,20,40,.10),0 16px 40px rgba(20,20,40,.14)}
@media (prefers-color-scheme:dark){:root{--bg:#0f1115;--bg2:#161922;--text:#e8eaf0;--muted:#9aa1ad;--border:#262b34;--card:#161922;--shadow:0 1px 2px rgba(0,0,0,.3);--shadow-h:0 10px 30px rgba(0,0,0,.55)}}
*{box-sizing:border-box}
body{font-family:'Pretendard Variable',Pretendard,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.6;margin:0;color:var(--text);background:var(--bg);-webkit-font-smoothing:antialiased}
.wrap{max-width:920px;margin:0 auto;padding:0 16px 16px}
.topbar{position:sticky;top:0;z-index:20;background:var(--bg);background:color-mix(in srgb,var(--bg) 85%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--border);margin:0 -16px 12px;padding:13px 16px}
.logo{font-weight:800;text-decoration:none;font-size:19px;color:var(--text);display:inline-flex;align-items:center;gap:7px}
.logo .em{font-size:20px}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
nav a{font-size:13px;background:var(--bg2);color:var(--text);padding:7px 13px;border-radius:999px;text-decoration:none;border:1px solid var(--border);transition:border-color .15s}
nav a:hover{border-color:var(--brand)}
nav a.on{background:var(--brand);color:#fff;border-color:var(--brand)}
.hero{background:linear-gradient(135deg,var(--brand),#7c3aed);color:#fff;border-radius:18px;padding:34px 26px;margin:6px 0 22px;box-shadow:var(--shadow)}
.hero h1{font-size:26px;margin:0 0 8px;color:#fff}
.hero p{margin:0;opacity:.92;font-size:15px}
.disclosure{background:#fff8e1;border:1px solid #f0e0a0;color:#6b5900;font-size:13px;padding:10px 12px;border-radius:10px;margin:12px 0}
@media (prefers-color-scheme:dark){.disclosure{background:#2a2410;border-color:#4a411c;color:#e6d69a}}
h1{font-size:23px;margin:16px 0 4px}
.intro{color:var(--muted);margin:0 0 8px}
.block{margin:28px 0}
.block h2{font-size:18px;border-left:4px solid var(--brand);padding-left:9px;margin:0 0 14px}
.block h3{font-size:15px;margin:16px 0 8px}
.block h3 small{color:var(--muted);font-weight:400}
.stats{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.stats li{background:var(--bg2);padding:9px 13px;border-radius:10px;font-size:13px;border:1px solid var(--border)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
.rankgrid .rankcard{position:relative}
.rankno{position:absolute;top:8px;left:8px;z-index:2;background:var(--brand);color:#fff;font-size:12px;font-weight:700;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.card{border:1px solid var(--border);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;background:var(--card);box-shadow:var(--shadow);transition:transform .16s ease,box-shadow .16s ease}
.card:hover{transform:translateY(-3px);box-shadow:var(--shadow-h)}
.card img{width:100%;aspect-ratio:1/1;object-fit:cover;background:var(--bg2)}
.card .b{padding:11px;display:flex;flex-direction:column;gap:6px;flex:1}
.name{font-size:13px;line-height:1.45;height:3.8em;overflow:hidden}
.price{font-weight:800;font-size:15px}
.badges{display:flex;gap:4px;flex-wrap:wrap}
.badge{font-size:11px;padding:2px 7px;border-radius:6px;background:var(--bg2);color:var(--muted)}
.rocket{background:#e8f0ff;color:#1a56db}
@media (prefers-color-scheme:dark){.rocket{background:#16305e;color:#9cc2ff}}
.btn{margin-top:auto;text-align:center;background:var(--brand);color:#fff;text-decoration:none;padding:9px;border-radius:9px;font-size:13px;font-weight:600;transition:background .15s}
.btn:hover{background:var(--brand-d)}
.tablewrap{overflow-x:auto;border:1px solid var(--border);border-radius:12px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{padding:10px;border-bottom:1px solid var(--border);text-align:left}
tr:last-child td{border-bottom:none}
th{background:var(--bg2);font-weight:600}
.tname a{color:var(--brand);text-decoration:none;font-weight:500}
.tbtn{background:var(--brand);color:#fff;padding:5px 11px;border-radius:7px;text-decoration:none;font-size:12px}
.guide .note{color:var(--muted);font-size:12px}
.catlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.catcard{border:1px solid var(--border);border-radius:14px;padding:18px;background:var(--card);box-shadow:var(--shadow);transition:transform .16s ease,box-shadow .16s ease}
.catcard:hover{transform:translateY(-3px);box-shadow:var(--shadow-h)}
.catcard a{text-decoration:none;display:block;color:var(--text)}
.catcard small{color:var(--muted)}
.catcard .trendlink{color:var(--brand);font-size:13px;margin-top:10px;font-weight:600}
footer{margin:40px 0 24px;color:var(--muted);font-size:12px;border-top:1px solid var(--border);padding-top:16px}
</style>
</head>
<body>
<div class="wrap">
<header class="topbar"><a class="logo" href="./"><span class="em">${T.esc(config.site.logoEmoji || "🛍️")}</span>${T.esc(config.site.title)}</a></header>
<nav><a href="./"${!activeCat ? ' class="on"' : ""}>홈</a>${categoryNav(activeCat)}</nav>
<div class="disclosure">${T.esc(config.disclosure)}</div>
${body}
<footer>
<p>${T.esc(config.disclosure)}</p>
<p>가격·재고는 실시간으로 바뀔 수 있습니다. 최종 확인은 쿠팡에서. 갱신일: ${today}</p>
</footer>
</div>
</body>
</html>`;
}

async function keywordPage(entry, products, cat) {
  const stats = T.priceStats(products);
  const guide = await buildGuide(entry, products, stats);
  const title = `${entry.keyword} 추천 ${new Date().getFullYear()} | ${config.site.title}`;
  const canonical = `${config.site.baseUrl}/${entry.slug}.html`;
  const body = `<h1>${T.esc(entry.keyword)} 추천</h1>
<p class="intro">${T.esc(entry.intro || "")}</p>
${T.renderDataSummary(stats)}
${guide}
${T.renderRanking(products, 10)}
${T.renderPriceTiers(products)}
${T.renderComparison(products, 5)}`;
  return layout({ title, description: entry.intro || title, canonical, body, activeCat: cat && cat.slug });
}

function categoryPage(cat, liveEntries, productsBySlug) {
  const title = `${cat.name} | ${config.site.title}`;
  const canonical = `${config.site.baseUrl}/cat-${cat.slug}.html`;
  const body = liveEntries.map((k) => {
    const products = productsBySlug[k.slug];
    if (!products) return "";
    return `<div class="block"><h2>${T.esc(k.keyword)}</h2>
<p class="intro">${T.esc(k.intro || "")} <a href="./${T.esc(k.slug)}.html">자세히 →</a></p>
<div class="grid">${products.slice(0, 6).map(T.productCard).join("")}</div></div>`;
  }).join("") || `<p class="intro">준비 중입니다.</p>`;
  return layout({ title, description: `${cat.name} 추천 모음`, canonical, body, activeCat: cat.slug });
}

function trendPage(cat, best) {
  const stats = T.priceStats(best);
  const title = `${cat.name} 인기 TOP ${new Date().getFullYear()} | ${config.site.title}`;
  const canonical = `${config.site.baseUrl}/trend-${cat.slug}.html`;
  const body = `<h1>${T.esc(cat.name)} 이번 주 인기 TOP</h1>
<p class="intro">쿠팡 실시간 베스트셀러 기준. 매일 갱신됩니다. (${today})</p>
${T.renderDataSummary(stats)}
${T.renderRanking(best, 20)}`;
  return layout({ title, description: `${cat.name} 실시간 인기 상품`, canonical, body, activeCat: cat.slug });
}

function homePage(liveByCat, hasTrend) {
  const title = config.site.title;
  const canonical = config.site.baseUrl + "/";
  const cards = config.categories.map((c) => {
    const live = liveByCat[c.slug] || [];
    const kw = live.length ? live.map((k) => T.esc(k.keyword)).join(" · ") : "준비 중";
    const trendLink = hasTrend ? `<a class="trendlink" href="./trend-${T.esc(c.slug)}.html">🔥 인기 TOP</a>` : "";
    return `<div class="catcard">
<a href="./cat-${T.esc(c.slug)}.html"><b>${T.esc(c.name)}</b><br><small>${kw}</small></a>
${trendLink}</div>`;
  }).join("");
  const body = `<div class="hero"><h1>${T.esc(config.site.title)}</h1><p>${T.esc(config.site.description)}</p></div>
<div class="catlist">${cards}</div>`;
  return layout({ title, description: config.site.description, canonical, body });
}

function writeSeoFiles(liveSlugs, trendCatSlugs) {
  const urls = [
    config.site.baseUrl + "/",
    ...config.categories.map((c) => `${config.site.baseUrl}/cat-${c.slug}.html`),
    ...trendCatSlugs.map((s) => `${config.site.baseUrl}/trend-${s}.html`),
    ...liveSlugs.map((s) => `${config.site.baseUrl}/${s}.html`),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${T.esc(u)}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>`;
  fs.writeFileSync(path.join(OUT, "sitemap.xml"), sitemap);
  fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${config.site.baseUrl}/sitemap.xml\n`);
}

// 후보 키워드 풀 구성: 고정(config) 먼저 + 트렌드(선택) 뒤에, 중복 제거
async function buildPool() {
  const candidates = [];
  for (const c of config.categories)
    for (const k of c.keywords)
      candidates.push({ slug: k.slug, keyword: k.keyword, intro: k.intro, catSlug: c.slug });

  const bestByCat = {};
  if (config.trend.enabled) {
    console.log("🔥 트렌드 모드: 쿠팡 베스트셀러에서 키워드 자동 생성");
    for (const cat of config.categories) {
      if (!cat.seed) continue;
      try {
        const { keywords, best } = await trendKeywords(cat, {
          accessKey: ACCESS_KEY, secretKey: SECRET_KEY,
          subId: config.fetch.subId, count: config.trend.keywordsPerCategory,
        });
        bestByCat[cat.slug] = best;
        candidates.push(...keywords);
        console.log(`   [${cat.name}] → ${keywords.map((k) => k.keyword).join(", ") || "(0건)"}`);
        await new Promise((r) => setTimeout(r, 400));
      } catch (e) {
        console.error(`   [${cat.name}] 트렌드 실패: ${e.message}`);
      }
    }
  }

  const seen = new Set();
  const pool = [];
  for (const c of candidates) {
    const k = normKey(c.keyword);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    pool.push(c);
  }
  return { pool, bestByCat };
}

async function main() {
  if (!ACCESS_KEY || !SECRET_KEY) throw new Error("COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 환경변수가 필요합니다.");
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const { pool, bestByCat } = await buildPool();

  // 하루 perDay개씩 새 키워드만 발행 목록에 추가
  const published = readPublished();
  const pubKeys = new Set(published.map((p) => normKey(p.keyword)));
  const fresh = pool.filter((c) => !pubKeys.has(normKey(c.keyword))).slice(0, config.publishing.perDay);
  for (const f of fresh) published.push({ ...f, firstPublished: today });
  console.log(`📅 오늘 신규 ${fresh.length}개 / 총 발행 ${published.length}개`);
  if (fresh.length) console.log(`   신규: ${fresh.map((f) => f.keyword).join(", ")}`);

  // 발행된 모든 페이지 생성 (가격 갱신)
  const productsBySlug = {};
  const liveByCat = {};
  for (const entry of published) {
    const cat = catBySlug[entry.catSlug];
    if (!cat) continue;
    try {
      const products = await searchProducts(entry.keyword, {
        accessKey: ACCESS_KEY, secretKey: SECRET_KEY,
        limit: config.fetch.limitPerKeyword, subId: config.fetch.subId,
      });
      if (!products.length) { console.warn(`⚠️  "${entry.keyword}" 0건`); continue; }
      fs.writeFileSync(path.join(OUT, `${entry.slug}.html`), await keywordPage(entry, products, cat));
      productsBySlug[entry.slug] = products;
      (liveByCat[cat.slug] ||= []).push(entry);
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {
      console.error(`❌ ${entry.keyword}: ${e.message}`);
    }
  }

  writePublished(published); // 상태 저장 (레포에 커밋됨)

  const liveSlugs = Object.keys(productsBySlug);
  if (!liveSlugs.length) throw new Error("생성된 페이지가 없습니다. API 키/승인 상태 확인.");

  for (const cat of config.categories)
    fs.writeFileSync(path.join(OUT, `cat-${cat.slug}.html`), categoryPage(cat, liveByCat[cat.slug] || [], productsBySlug));

  const trendCatSlugs = [];
  for (const cat of config.categories) {
    const best = bestByCat[cat.slug];
    if (best && best.length) {
      fs.writeFileSync(path.join(OUT, `trend-${cat.slug}.html`), trendPage(cat, best));
      trendCatSlugs.push(cat.slug);
    }
  }

  fs.writeFileSync(path.join(OUT, "index.html"), homePage(liveByCat, config.trend.enabled));
  writeSeoFiles(liveSlugs, trendCatSlugs);
  console.log(`\n완료: 상품 ${liveSlugs.length} + 카테고리 ${config.categories.length} + 트렌드 ${trendCatSlugs.length} + 홈 → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
