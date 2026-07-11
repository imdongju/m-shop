// 상품 성격별 그룹핑 + 콘텐츠 블록 렌더링 (데이터 기반, 조작 없음)

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function won(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString("ko-KR") + "원" : "-";
}

// 실제 데이터에서 통계 추출
function priceStats(products) {
  const prices = products.map((p) => Number(p.productPrice)).filter(Number.isFinite).sort((a, b) => a - b);
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
  return {
    count: products.length,
    min: prices[0] || 0,
    max: prices[prices.length - 1] || 0,
    median,
    rocket: products.filter((p) => p.isRocket).length,
    free: products.filter((p) => p.isFreeShipping).length,
  };
}

// 상품 성격별 그룹 1: 가격대 (저가/중가/고가 3분위)
function groupByPriceTier(products) {
  const sorted = [...products].sort((a, b) => Number(a.productPrice) - Number(b.productPrice));
  const n = sorted.length;
  const t1 = Math.ceil(n / 3);
  const t2 = Math.ceil((n * 2) / 3);
  return [
    { key: "budget", label: "가성비 (저가형)", items: sorted.slice(0, t1) },
    { key: "mid", label: "밸런스 (중가형)", items: sorted.slice(t1, t2) },
    { key: "premium", label: "프리미엄 (고가형)", items: sorted.slice(t2) },
  ].filter((g) => g.items.length);
}

function productCard(p) {
  const badges = [];
  if (p.isRocket) badges.push('<span class="badge rocket">로켓배송</span>');
  if (p.isFreeShipping) badges.push('<span class="badge">무료배송</span>');
  return `<div class="card">
<a href="${esc(p.productUrl)}" target="_blank" rel="nofollow sponsored noopener"><img loading="lazy" src="${esc(p.productImage)}" alt="${esc(p.productName)}"></a>
<div class="b">
<div class="name">${esc(p.productName)}</div>
<div class="price">${won(p.productPrice)}</div>
<div class="badges">${badges.join("")}</div>
<a class="btn" href="${esc(p.productUrl)}" target="_blank" rel="nofollow sponsored noopener">쿠팡에서 보기</a>
</div>
</div>`;
}

// 블록: 데이터 요약 (실제 수치)
function renderDataSummary(stats) {
  return `<section class="block"><h2>한눈에 보기</h2>
<ul class="stats">
<li><b>${stats.count}개</b> 상품 비교</li>
<li>가격대 <b>${won(stats.min)} ~ ${won(stats.max)}</b></li>
<li>중간값 <b>${won(stats.median)}</b></li>
<li>로켓배송 <b>${stats.rocket}개</b> · 무료배송 <b>${stats.free}개</b></li>
</ul></section>`;
}

// 블록: 인기 랭킹 (쿠팡 반환 순 = 인기/판매 기준)
function renderRanking(products, topN = 10) {
  const items = products.slice(0, topN)
    .map((p, i) => `<div class="rankcard">${productCard(p)}<span class="rankno">${i + 1}</span></div>`)
    .join("");
  return `<section class="block"><h2>인기 랭킹 TOP ${Math.min(topN, products.length)}</h2>
<div class="grid rankgrid">${items}</div></section>`;
}

// 블록: 상품 성격별 (가격대 그룹)
function renderPriceTiers(products) {
  const groups = groupByPriceTier(products);
  const body = groups.map((g) => {
    const prices = g.items.map((p) => Number(p.productPrice)).filter(Number.isFinite);
    const lo = Math.min(...prices), hi = Math.max(...prices);
    return `<h3>${esc(g.label)} <small>${won(lo)}~${won(hi)}</small></h3>
<div class="grid">${g.items.slice(0, 6).map(productCard).join("")}</div>`;
  }).join("");
  return `<section class="block"><h2>가격대별 추천</h2>${body}</section>`;
}

// 블록: 상위 상품 비교표
function renderComparison(products, topN = 5) {
  const rows = products.slice(0, topN).map((p, i) => `<tr>
<td>${i + 1}</td>
<td class="tname"><a href="${esc(p.productUrl)}" target="_blank" rel="nofollow sponsored noopener">${esc(p.productName)}</a></td>
<td>${won(p.productPrice)}</td>
<td>${p.isRocket ? "✔" : "-"}</td>
<td><a class="tbtn" href="${esc(p.productUrl)}" target="_blank" rel="nofollow sponsored noopener">보기</a></td>
</tr>`).join("");
  return `<section class="block"><h2>상위 ${Math.min(topN, products.length)}개 비교</h2>
<div class="tablewrap"><table>
<thead><tr><th>#</th><th>상품</th><th>가격</th><th>로켓</th><th></th></tr></thead>
<tbody>${rows}</tbody></table></div></section>`;
}

module.exports = {
  esc, won, priceStats, groupByPriceTier,
  productCard, renderDataSummary, renderRanking, renderPriceTiers, renderComparison,
};
