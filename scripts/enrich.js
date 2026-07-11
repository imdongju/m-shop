// 구매 가이드 생성.
// ANTHROPIC_API_KEY 가 있으면 실제 상품 데이터를 근거로 AI가 작성,
// 없으면 데이터 기반 문구로 폴백. (없는 정보는 지어내지 않는다)
const { esc, won, groupByPriceTier } = require("./templates");

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-haiku-4-5-20251001";

// 데이터 기반 폴백 — 실제 가격대만 사용, 리뷰/스펙 조작 없음
function fallbackGuide(entry, products, stats) {
  const groups = groupByPriceTier(products);
  const tierLines = groups.map((g) => {
    const prices = g.items.map((p) => Number(p.productPrice)).filter(Number.isFinite);
    return `<li><b>${esc(g.label)}</b> (${won(Math.min(...prices))}~${won(Math.max(...prices))}): ${g.items.length}개</li>`;
  }).join("");
  return `<p>${esc(entry.keyword)}는 현재 <b>${won(stats.min)}~${won(stats.max)}</b> 사이에 분포하며, 중간값은 <b>${won(stats.median)}</b>입니다. 로켓배송 상품이 ${stats.rocket}개로 배송이 급하면 참고하세요.</p>
<ul>${tierLines}</ul>
<p class="note">가격·구성은 수시로 바뀌니 최종 확인은 쿠팡에서 하세요.</p>`;
}

async function aiGuide(entry, products, stats) {
  const list = products.slice(0, 12)
    .map((p) => `- ${p.productName} / ${won(p.productPrice)}${p.isRocket ? " / 로켓" : ""}`)
    .join("\n");
  const prompt = `아래는 "${entry.keyword}" 쿠팡 검색 상품 데이터다. 이 데이터만 근거로, 구매 가이드를 한국어로 작성하라.
규칙: 없는 스펙/리뷰/평점을 지어내지 말 것. 가격대와 상품명에서 드러나는 사실만 사용. 과장 금지.
형식: 2~3문장 요약 + "이런 분께 추천" 항목 3개(가격대별). HTML 조각(<p>,<ul>,<li>)만, 코드블록 없이.

상품:
${list}

통계: 최저 ${won(stats.min)}, 최고 ${won(stats.max)}, 중간값 ${won(stats.median)}, 로켓 ${stats.rocket}/${stats.count}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = (json.content || []).map((c) => c.text || "").join("").trim();
  if (!text) throw new Error("AI 빈 응답");
  return text;
}

async function buildGuide(entry, products, stats) {
  let inner;
  if (KEY) {
    try {
      inner = await aiGuide(entry, products, stats);
    } catch (e) {
      console.warn(`   AI 가이드 실패(폴백): ${e.message}`);
      inner = fallbackGuide(entry, products, stats);
    }
  } else {
    inner = fallbackGuide(entry, products, stats);
  }
  return `<section class="block guide"><h2>${esc(entry.keyword)} 어떻게 고를까</h2>${inner}</section>`;
}

module.exports = { buildGuide };
