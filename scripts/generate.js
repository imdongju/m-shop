// 쿠팡 수집 → 카테고리별 정적 사이트 생성 (하루 perDay개씩 누적 발행)
const fs = require("fs");
const path = require("path");
const config = require("../config");
const { searchProducts } = require("./coupang");
const { extractTrendKeywords } = require("./trends");
const { readPublished, writePublished, readProductCache, writeProductCache } = require("./state");
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

// 이모지 파비콘 (별도 이미지 파일 불필요)
function favicon() {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${config.site.logoEmoji || "🛍️"}</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
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
<meta property="og:type" content="website">
<meta property="og:site_name" content="${T.esc(config.site.title)}">
${config.site.googleSiteVerification ? `<meta name="google-site-verification" content="${T.esc(config.site.googleSiteVerification)}">` : ""}
<link rel="icon" href="${favicon()}">
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
.block h2 small{color:var(--muted);font-weight:400;font-size:12px;margin-left:4px}
.block h3{font-size:15px;margin:16px 0 8px}
.block h3 small{color:var(--muted);font-weight:400}
.related{display:flex;flex-wrap:wrap;gap:8px}
.related a{font-size:13px;background:var(--bg2);color:var(--text);padding:7px 13px;border-radius:999px;text-decoration:none;border:1px solid var(--border);transition:border-color .15s}
.related a:hover{border-color:var(--brand)}
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
footer a{color:inherit}
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
<p><a href="./privacy.html">개인정보처리방침</a></p>
</footer>
</div>
</body>
</html>`;
}

async function keywordPage(entry, products, cat, related = [], dataDate = today) {
  const stats = T.priceStats(products);
  const guide = await buildGuide(entry, products, stats);
  const title = `${entry.keyword} 추천 ${new Date().getFullYear()} | ${config.site.title}`;
  const canonical = `${config.site.baseUrl}/${entry.slug}.html`;
  // 구조화 데이터 (구글이 상품 리스트로 인식)
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${entry.keyword} 추천`,
    itemListElement: products.slice(0, 10).map((p, i) => ({
      "@type": "ListItem", position: i + 1, name: p.productName, url: p.productUrl,
    })),
  }).replace(/</g, "\\u003c");
  // 내부 링크 (같은 카테고리 우선)
  const relatedHtml = related.length
    ? `<section class="block"><h2>다른 추천도 보기</h2><div class="related">${related
        .map((r) => `<a href="./${T.esc(r.slug)}.html">${T.esc(r.keyword)}</a>`).join("")}</div></section>`
    : "";
  const body = `<h1>${T.esc(entry.keyword)} 추천</h1>
<p class="intro">${T.esc(entry.intro || "")}</p>
${T.renderDataSummary(stats)}
<p class="intro" style="font-size:12px">가격 조회 기준일: ${dataDate} · 최신 가격은 쿠팡에서 확인하세요.</p>
${guide}
${T.renderRanking(products, 10)}
${T.renderPriceTiers(products)}
${T.renderComparison(products, 5)}
${relatedHtml}
<script type="application/ld+json">${ld}</script>`;
  return layout({ title, description: entry.intro || title, canonical, body, activeCat: cat && cat.slug });
}

// 개인정보처리방침 (애드센스 광고 쿠키 고지 포함)
function privacyPage() {
  const title = `개인정보처리방침 | ${config.site.title}`;
  const canonical = `${config.site.baseUrl}/privacy.html`;
  const body = `<h1>개인정보처리방침</h1>
<div class="block">
<p>본 사이트(${T.esc(config.site.title)})는 별도의 회원가입 없이 이용할 수 있으며, 이용자의 개인정보를 직접 수집·저장하지 않습니다.</p>
<h2>쿠키 및 광고</h2>
<p>본 사이트는 Google AdSense 광고를 게재할 수 있습니다. Google을 포함한 제3자 광고 사업자는 쿠키를 사용하여 이용자의 이전 방문 기록에 기반한 맞춤 광고를 제공할 수 있습니다. 이용자는 <a href="https://adssettings.google.com" target="_blank" rel="noopener">Google 광고 설정</a>에서 맞춤 광고를 해제할 수 있습니다.</p>
<h2>제휴 링크</h2>
<p>${T.esc(config.disclosure)} 상품 링크를 통해 쿠팡으로 이동할 경우 쿠팡의 개인정보처리방침이 적용됩니다.</p>
<h2>문의</h2>
<p>본 방침에 대한 문의는 사이트 하단 정보를 통해 접수해 주세요.</p>
<p class="intro">시행일: ${today}</p>
</div>`;
  return layout({ title, description: "개인정보처리방침 및 광고 쿠키 안내", canonical, body });
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

function trendPage(cat, best, dataDate = today) {
  const stats = T.priceStats(best);
  const title = `${cat.name} 인기 TOP ${new Date().getFullYear()} | ${config.site.title}`;
  const canonical = `${config.site.baseUrl}/trend-${cat.slug}.html`;
  const body = `<h1>${T.esc(cat.name)} 이번 주 인기 TOP</h1>
<p class="intro">쿠팡 인기 상품(검색 인기순) 기준 · 조회 기준일 ${dataDate}</p>
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
    `${config.site.baseUrl}/privacy.html`,
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

// 고정 키워드 풀 (config) — 트렌드 키워드는 main()에서 예산 내로 추가
function fixedPool() {
  const pool = [];
  for (const c of config.categories)
    for (const k of c.keywords)
      pool.push({ slug: k.slug, keyword: k.keyword, intro: k.intro, catSlug: c.slug });
  return pool;
}

async function main() {
  if (!ACCESS_KEY || !SECRET_KEY) throw new Error("COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 환경변수가 필요합니다.");
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // === API 호출 예산 (시간당 한도 초과 → 계정 제재 방지) ===
  // 푸시 빌드는 API_BUDGET=0 (캐시만 사용), 예약/수동 실행만 소량 호출
  let budget = Number(process.env.API_BUDGET ?? config.fetch.apiBudget);
  let rateLimited = false;
  const apiSearch = async (keyword) => {
    if (rateLimited || budget <= 0) return null;
    budget--;
    try {
      const products = await searchProducts(keyword, {
        accessKey: ACCESS_KEY, secretKey: SECRET_KEY,
        limit: config.fetch.limitPerKeyword, subId: config.fetch.subId,
      });
      await new Promise((r) => setTimeout(r, config.fetch.delayMs));
      return products.length ? products : null;
    } catch (e) {
      if (e.rateLimited) {
        rateLimited = true;
        console.warn(`🚫 쿠팡 API 한도 도달 — 남은 호출 전부 중단, 캐시로 렌더합니다.`);
        return null;
      }
      console.error(`❌ "${keyword}": ${e.message}`);
      return null;
    }
  };
  console.log(`🔋 이번 실행 API 예산: ${budget}회`);

  const published = readPublished();

  // 캐시 로드 (data/products/*.json — 레포에 커밋됨)
  const cacheBySlug = {};
  for (const p of published) {
    const c = readProductCache(p.slug);
    if (c) cacheBySlug[p.slug] = c;
  }

  // A) 캐시가 없는 기존 발행분부터 채운다 (최우선)
  for (const p of published) {
    if (cacheBySlug[p.slug] || rateLimited || budget <= 0) continue;
    const products = await apiSearch(p.keyword);
    if (products) {
      const fetchedAt = writeProductCache(p.slug, products);
      cacheBySlug[p.slug] = { fetchedAt, products };
      console.log(`📥 캐시 생성: ${p.keyword}`);
    }
  }

  // B) 트렌드 발굴 — 하루 1개 카테고리 로테이션 (호출 1회), 나머지는 캐시
  const pool = fixedPool();
  const trendCache = {};
  for (const cat of config.categories) {
    if (!cat.seed) continue;
    const c = readProductCache(`_trend-${cat.slug}`);
    if (c) trendCache[cat.slug] = c;
  }
  if (config.trend.enabled && !rateLimited && budget > 0) {
    const cats = config.categories.filter((c) => c.seed);
    if (cats.length) {
      const cat = cats[Math.floor(Date.now() / 86400000) % cats.length];
      const best = await apiSearch(cat.seed);
      if (best) {
        const fetchedAt = writeProductCache(`_trend-${cat.slug}`, best);
        trendCache[cat.slug] = { fetchedAt, products: best };
        console.log(`🔥 트렌드 갱신: [${cat.name}]`);
      }
    }
  }
  for (const cat of config.categories) {
    const tc = trendCache[cat.slug];
    if (!tc) continue;
    try {
      pool.push(...(await extractTrendKeywords(cat, tc.products, config.trend.keywordsPerCategory)));
    } catch (e) {
      console.warn(`   트렌드 키워드 추출 실패 [${cat.name}]: ${e.message}`);
    }
  }

  // C) 신규 발행 — 하루 총 perDay개 (하루에 여러 번 실행돼도 초과 발행 안 함)
  const pubKeys = new Set(published.map((p) => normKey(p.keyword)));
  let quota = Math.max(0, config.publishing.perDay - published.filter((p) => p.firstPublished === today).length);
  for (const cand of pool) {
    if (quota <= 0 || rateLimited || budget <= 0) break;
    const k = normKey(cand.keyword);
    if (!k || pubKeys.has(k)) continue;
    const products = await apiSearch(cand.keyword);
    if (!products) continue;
    const fetchedAt = writeProductCache(cand.slug, products);
    cacheBySlug[cand.slug] = { fetchedAt, products };
    published.push({ slug: cand.slug, keyword: cand.keyword, intro: cand.intro, catSlug: cand.catSlug, firstPublished: today });
    pubKeys.add(k);
    quota--;
    console.log(`🆕 신규 발행: ${cand.keyword}`);
  }

  // D) 남은 예산으로 가장 오래된 캐시부터 가격 갱신
  const stale = published
    .filter((p) => cacheBySlug[p.slug] && cacheBySlug[p.slug].fetchedAt !== today)
    .sort((a, b) => String(cacheBySlug[a.slug].fetchedAt).localeCompare(String(cacheBySlug[b.slug].fetchedAt)));
  for (const p of stale) {
    if (rateLimited || budget <= 0) break;
    const products = await apiSearch(p.keyword);
    if (products) {
      const fetchedAt = writeProductCache(p.slug, products);
      cacheBySlug[p.slug] = { fetchedAt, products };
      console.log(`♻️  가격 갱신: ${p.keyword}`);
    }
  }

  console.log(`📅 총 발행 ${published.length}개 / 캐시 ${Object.keys(cacheBySlug).length}개 / 남은 예산 ${budget}회`);

  // 렌더 — 전부 캐시 기반 (API가 막혀도 사이트는 그대로 유지)
  const productsBySlug = {};
  const liveByCat = {};
  for (const entry of published) {
    const c = cacheBySlug[entry.slug];
    const cat = catBySlug[entry.catSlug];
    if (!c || !cat) continue;
    productsBySlug[entry.slug] = c.products;
    (liveByCat[cat.slug] ||= []).push(entry);
  }

  for (const entry of published) {
    const c = cacheBySlug[entry.slug];
    const cat = catBySlug[entry.catSlug];
    if (!c || !cat) continue;
    const sameCat = (liveByCat[entry.catSlug] || []).filter((e) => e.slug !== entry.slug);
    const others = published.filter((e) => productsBySlug[e.slug] && e.catSlug !== entry.catSlug);
    const related = [...sameCat, ...others].slice(0, 6);
    fs.writeFileSync(path.join(OUT, `${entry.slug}.html`), await keywordPage(entry, c.products, cat, related, c.fetchedAt));
  }

  writePublished(published); // 상태 저장 (레포에 커밋됨)

  const liveSlugs = Object.keys(productsBySlug);
  if (!liveSlugs.length) throw new Error("생성된 페이지가 없습니다. API 키/승인 상태 확인.");

  for (const cat of config.categories)
    fs.writeFileSync(path.join(OUT, `cat-${cat.slug}.html`), categoryPage(cat, liveByCat[cat.slug] || [], productsBySlug));

  const trendCatSlugs = [];
  for (const cat of config.categories) {
    const tc = trendCache[cat.slug];
    if (tc && tc.products.length) {
      fs.writeFileSync(path.join(OUT, `trend-${cat.slug}.html`), trendPage(cat, tc.products, tc.fetchedAt));
      trendCatSlugs.push(cat.slug);
    }
  }

  fs.writeFileSync(path.join(OUT, "index.html"), homePage(liveByCat, config.trend.enabled));
  fs.writeFileSync(path.join(OUT, "privacy.html"), privacyPage());
  writeSeoFiles(liveSlugs, trendCatSlugs);
  console.log(`\n완료: 상품 ${liveSlugs.length} + 카테고리 ${config.categories.length} + 트렌드 ${trendCatSlugs.length} + 홈 → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
