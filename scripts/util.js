// 공용 유틸: 키워드 정규화 + 안정적 slug 생성
const crypto = require("crypto");

// 같은 키워드를 항상 같은 키로 (공백 제거 → 소문자 → 유니코드 NFC)
// ※ 파이썬 파이프라인과 바이트 단위로 일치해야 함 (공유 프로토콜) — 순서/단계 변경 금지.
function normKey(keyword) {
  return String(keyword || "")
    .replace(/\s+/g, "") // ① 공백 전부 제거
    .toLowerCase()       // ② 소문자화
    .normalize("NFC");   // ③ 유니코드 NFC
}

// 공유 상품 캐시 파일명 키 — 소문자 hex 12자 (파이썬과 동일)
function cacheKeyFor(keyword) {
  return crypto
    .createHash("md5")
    .update(normKey(keyword), "utf8")
    .digest("hex")
    .slice(0, 12);
}

// 키워드 → 안정적 영문 slug (한글 파일명 회피, 순서 바뀌어도 불변)
// 사이트 slug/URL 용도 — 6자, 기존 동작 유지.
function slugFor(prefix, keyword) {
  const h = crypto.createHash("md5").update(normKey(keyword)).digest("hex").slice(0, 6);
  return `${prefix}-${h}`;
}

module.exports = { normKey, cacheKeyFor, slugFor };
