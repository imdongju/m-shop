// 쿠팡 베스트셀러(실제 구매 트렌드) → 검색 키워드 자동 생성
// AI 키 있으면 상품명에서 핵심 키워드 추출, 없으면 빈도 기반 폴백.
const { bestCategories } = require("./coupang");
const { normKey, slugFor } = require("./util");
const { aiEnabled, chat } = require("./ai");

// 불용어/단위 — 키워드에서 걸러낼 토큰
const STOP = new Set([
  "정품", "무료배송", "당일발송", "특가", "행사", "사은품", "세트", "선물", "국내산",
  "대용량", "가정용", "업소용", "프리미엄", "신상", "인기", "베스트", "1+1", "무료",
  "개", "매", "팩", "박스", "세트상품", "택배", "쿠팡",
]);

function isNumericOrUnit(t) {
  return /^[0-9]+(ml|l|g|kg|cm|mm|m|w|호|매|개|p|x|inch|인치)?$/i.test(t);
}

// 폴백: 상품명 토큰 빈도로 상위 키워드 추출
function frequencyKeywords(products, count) {
  const freq = new Map();
  for (const p of products) {
    const tokens = String(p.productName || "")
      .replace(/[\[\]（）()「」,·/]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !STOP.has(t) && !isNumericOrUnit(t));
    for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([k]) => k);
}

async function aiKeywords(categoryName, products, count) {
  const names = products.slice(0, 25).map((p) => "- " + p.productName).join("\n");
  const prompt = `아래는 쿠팡 "${categoryName}" 카테고리 베스트셀러 상품명이다.
실제 검색에 쓸 수 있는 핵심 상품 키워드 ${count}개를 뽑아라.
규칙: 브랜드명·수식어("대용량","정품" 등)·용량숫자 제외, 일반 상품 유형명으로. 중복 금지.
출력: JSON 문자열 배열만. 예: ["에어프라이어","전기포트"]

상품명:
${names}`;
  const text = await chat(prompt, { maxTokens: 400, temperature: 0.3 });
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("AI 응답에서 JSON 배열 못 찾음");
  const arr = JSON.parse(match[0]);
  return arr.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim()).slice(0, count);
}

// 카테고리 하나에 대해 트렌드 키워드 목록 생성 → [{slug, keyword, intro}]
async function trendKeywords(cat, { accessKey, secretKey, subId = "", count = 6 }) {
  const best = await bestCategories(cat.coupangCategoryId, { accessKey, secretKey, limit: 40, subId });
  if (!best.length) return { keywords: [], best: [] };

  let words;
  if (aiEnabled()) {
    try {
      words = await aiKeywords(cat.name, best, count);
    } catch (e) {
      console.warn(`   AI 키워드 실패(폴백): ${e.message}`);
      words = frequencyKeywords(best, count);
    }
  } else {
    words = frequencyKeywords(best, count);
  }

  // 중복 제거 + 안정적 slug 부여
  const seen = new Set();
  const keywords = [];
  for (const w of words) {
    const key = normKey(w);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keywords.push({ slug: slugFor(cat.slug, w), keyword: w, intro: "이번 주 인기 상품 기준 추천.", catSlug: cat.slug });
  }
  return { keywords, best };
}

module.exports = { trendKeywords, frequencyKeywords };
