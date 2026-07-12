// 발행 상태 + 상품 캐시 저장/로드.
// 경로 우선순위: 환경변수 SHARED_DIR (파이썬 파이프라인과 공유) → 없으면 기존 data/ 폴백.
const fs = require("fs");
const path = require("path");

// SHARED_DIR가 있으면 그 아래, 없으면 레포의 data/ 폴더.
const BASE = process.env.SHARED_DIR || path.join(__dirname, "..", "data");
const FILE = path.join(BASE, "published.json");
const CACHE_DIR = path.join(BASE, "products");

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

// 상품 데이터 캐시 — <BASE>/products/<key>.json
// key는 호출측이 cacheKey(공유 프로토콜) 또는 trend-<slug> 등으로 넘긴다.
function readProductCache(key) {
  try {
    return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, key + ".json"), "utf8"));
  } catch {
    return null;
  }
}

// data: { keyword, fetchedAt, products, guide?, keywords? }
// ※ 기존 파일의 guide 등 "알려지지 않은 필드"를 절대 지우지 않는다 — 기존을 읽어 merge.
//    (파이썬/노드 어느 쪽이 먼저 써도 상대가 만든 필드를 보존)
function writeProductCache(key, data) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, key + ".json");
  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(file, "utf8")) || {};
  } catch {
    existing = {};
  }
  const merged = { ...existing, ...data };
  fs.writeFileSync(file, JSON.stringify(merged) + "\n");
  return merged;
}

module.exports = { readPublished, writePublished, readProductCache, writeProductCache, FILE, CACHE_DIR };
