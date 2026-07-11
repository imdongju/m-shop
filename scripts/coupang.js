// 쿠팡 파트너스 오픈 API 클라이언트 (의존성 없음, Node 20+ 내장 fetch/crypto 사용)
const crypto = require("crypto");

const DOMAIN = "https://api-gateway.coupang.com";

// HMAC-SHA256 서명 생성 → Authorization 헤더 값 반환
function signedAuthorization(method, urlWithQuery, accessKey, secretKey) {
  const [path, query = ""] = urlWithQuery.split("?");
  // 서명용 시각 포맷: YYMMDDT HHMMSS Z (예: 260711T091500Z)
  const datetime =
    new Date().toISOString().substr(2, 17).replace(/[-:]/g, "") + "Z";
  const message = datetime + method + path + query;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

// 상품 검색 — 반환된 productUrl 은 이미 파트너스 추적이 붙은 제휴 링크다.
async function searchProducts(keyword, { accessKey, secretKey, limit = 20, subId = "" }) {
  const basePath =
    "/v2/providers/affiliate_open_api/apis/openapi/v1/products/search";
  const params = new URLSearchParams({ keyword, limit: String(limit) });
  if (subId) params.set("subId", subId);
  const query = params.toString();
  const urlWithQuery = `${basePath}?${query}`;

  const authorization = signedAuthorization("GET", urlWithQuery, accessKey, secretKey);
  const res = await fetch(DOMAIN + urlWithQuery, {
    method: "GET",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`쿠팡 검색 실패 (${res.status}) "${keyword}": ${body}`);
  }
  const json = await res.json();
  // 응답 구조가 엔드포인트마다 다를 수 있어 양쪽 다 처리
  const d = json?.data;
  const products = Array.isArray(d) ? d : (d?.productData || []);
  if (!products.length) {
    console.warn(`   (검색 "${keyword}" 응답: rCode=${json?.rCode} rMessage=${json?.rMessage} dataKeys=${d && !Array.isArray(d) ? Object.keys(d).join(",") : (Array.isArray(d) ? "array" : "none")})`);
  }
  return products;
}

// 카테고리별 베스트셀러 (실시간 인기 = 트렌드). productUrl 은 제휴 링크.
async function bestCategories(categoryId, { accessKey, secretKey, limit = 30, subId = "" }) {
  const basePath = `/v2/providers/affiliate_open_api/apis/openapi/v1/products/bestcategories/${categoryId}`;
  const params = new URLSearchParams({ limit: String(limit) });
  if (subId) params.set("subId", subId);
  const urlWithQuery = `${basePath}?${params.toString()}`;
  const authorization = signedAuthorization("GET", urlWithQuery, accessKey, secretKey);
  const res = await fetch(DOMAIN + urlWithQuery, {
    method: "GET",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`베스트카테고리 실패 (${res.status}) ${categoryId}: ${await res.text()}`);
  const json = await res.json();
  return json?.data || [];
}

// 골드박스 (오늘의 특가 — 매일 바뀌는 트렌드)
async function goldbox({ accessKey, secretKey, subId = "" }) {
  const basePath = "/v2/providers/affiliate_open_api/apis/openapi/v1/goldbox";
  const params = new URLSearchParams();
  if (subId) params.set("subId", subId);
  const q = params.toString();
  const urlWithQuery = q ? `${basePath}?${q}` : basePath;
  const authorization = signedAuthorization("GET", urlWithQuery, accessKey, secretKey);
  const res = await fetch(DOMAIN + urlWithQuery, {
    method: "GET",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`골드박스 실패 (${res.status}): ${await res.text()}`);
  const json = await res.json();
  return json?.data || [];
}

// 임의 쿠팡 URL → 제휴 딥링크 변환 (직접 고른 상품을 넣고 싶을 때 사용)
async function createDeeplink(coupangUrls, { accessKey, secretKey, subId = "" }) {
  const path = "/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink";
  const authorization = signedAuthorization("POST", path, accessKey, secretKey);
  const res = await fetch(DOMAIN + path, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ coupangUrls, subId: subId || undefined }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`딥링크 생성 실패 (${res.status}): ${body}`);
  }
  const json = await res.json();
  return json?.data || [];
}

module.exports = { searchProducts, bestCategories, goldbox, createDeeplink };
