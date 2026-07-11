// 발행 상태 저장/로드 — data/published.json (레포에 커밋되어 매일 누적됨)
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "published.json");

// [{ slug, keyword, intro, catSlug, firstPublished }]
function readPublished() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

function writePublished(list) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2) + "\n");
}

// 상품 데이터 캐시 — data/products/<slug>.json (레포에 커밋)
// API 호출을 아끼기 위해 매 실행 전체 재조회 대신 캐시를 쓰고 일부만 갱신한다.
const CACHE_DIR = path.join(__dirname, "..", "data", "products");

function readProductCache(slug) {
  try {
    return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, slug + ".json"), "utf8"));
  } catch {
    return null;
  }
}

function writeProductCache(slug, products) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const fetchedAt = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(CACHE_DIR, slug + ".json"), JSON.stringify({ fetchedAt, products }) + "\n");
  return fetchedAt;
}

module.exports = { readPublished, writePublished, readProductCache, writeProductCache, FILE };
