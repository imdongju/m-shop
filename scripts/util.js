// 공용 유틸: 키워드 정규화 + 안정적 slug 생성
const crypto = require("crypto");

// 같은 키워드를 항상 같은 키로 (공백/대소문자 무시)
function normKey(keyword) {
  return String(keyword || "").replace(/\s+/g, "").toLowerCase();
}

// 키워드 → 안정적 영문 slug (한글 파일명 회피, 순서 바뀌어도 불변)
function slugFor(prefix, keyword) {
  const h = crypto.createHash("md5").update(normKey(keyword)).digest("hex").slice(0, 6);
  return `${prefix}-${h}`;
}

module.exports = { normKey, slugFor };
