// 사이트 전역 설정 + 카테고리/키워드 구조
// 니치를 바꾸려면 categories 배열만 교체하면 된다.

module.exports = {
  site: {
    title: "자취 살림 추천",
    description: "자취·원룸 살림템을 카테고리별로 골라주는 큐레이션",
    baseUrl: process.env.SITE_URL || "https://imdongju.github.io/m-shop",
    lang: "ko",
    logoEmoji: "🏠", // 헤더 로고 이모지
    googleSiteVerification: "AvcLvvcwrEZuTk3OmREJqf3VgC0unWJ8wLyrRVJta60", // 서치콘솔 소유 확인
  },

  adsenseClient: process.env.ADSENSE_CLIENT || "",

  // 쿠팡 파트너스 필수 고지문 (지우지 말 것)
  disclosure:
    "이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.",

  fetch: {
    limitPerKeyword: 20, // 쿠팡 검색 API 허용 범위 (초과 시 자동으로 10으로 재시도)
    // 사이트 구분용 subId (파트너스 리포트에서 사이트별 실적 분리).
    // 사이트를 여러 개 만들면 COUPANG_SUB_ID 변수로 각각 다르게 지정.
    subId: process.env.COUPANG_SUB_ID || "githubchannel",
    // 실행 1회당 쿠팡 API 최대 호출 수 (시간당 한도 초과 = 계정 제재 경고 방지)
    // 워크플로에서 API_BUDGET 환경변수로 덮어씀 (푸시 빌드는 0 = 캐시만 사용)
    apiBudget: 4,
    delayMs: 1500, // 호출 간격
    refreshAfterDays: 3, // 기존 페이지 가격은 3일 지난 것만 갱신 (매시간 도니 과갱신 방지)
  },

  // 발행 리듬: 하루에 새 페이지 몇 개씩 누적할지
  // 매일 전체를 다시 찍는 게 아니라, 새 키워드를 perDay개씩만 추가한다.
  // 이미 발행된 페이지는 유지되며 가격만 갱신된다. (data/published.json에 상태 저장)
  publishing: {
    perDay: 5,
  },

  // 트렌드 키워드 자동 생성
  // enabled=true 면 각 카테고리의 keywords를 무시하고, 쿠팡 베스트셀러에서
  // 키워드를 매일 자동 추출한다. false 면 아래 수동 keywords 사용.
  // TREND=1 환경변수로도 켤 수 있다.
  trend: {
    enabled: process.env.TREND === "1",
    keywordsPerCategory: 6,
  },

  // === 카테고리 → 키워드 ===
  // seed: 트렌드 모드에서 이 검색어로 인기 상품을 찾아 키워드를 자동 추출한다.
  //   (넓은 대표 검색어일수록 다양한 키워드가 나옴. 항상 그 주제 상품만 나와 안전)
  // keywords: 트렌드 모드 꺼져 있을 때 쓰는 수동 키워드
  categories: [
    {
      slug: "kitchen",
      name: "주방·조리",
      seed: "주방용품",
      keywords: [
        { slug: "airfryer", keyword: "에어프라이어", intro: "1~2인 자취 필수 가전." },
        { slug: "induction", keyword: "1구 인덕션", intro: "좁은 주방용 1구 인덕션." },
        { slug: "rice-cooker", keyword: "미니 밥솥", intro: "원룸에 맞는 소형 밥솥." },
      ],
    },
    {
      slug: "clean",
      name: "청소·세탁",
      seed: "청소용품",
      keywords: [
        { slug: "vacuum", keyword: "무선 청소기", intro: "자취방 청소용 가성비 무선 청소기." },
        { slug: "laundry-rack", keyword: "빨래 건조대", intro: "베란다 없는 원룸용 건조대." },
      ],
    },
    {
      slug: "storage",
      name: "수납·정리",
      seed: "수납정리함",
      keywords: [
        { slug: "storage-box", keyword: "수납 정리함", intro: "좁은 방 공간 활용 수납템." },
        { slug: "hanger", keyword: "옷걸이 행거", intro: "원룸용 이동식 행거." },
      ],
    },
  ],
};

// 편의 함수: 전체 키워드 평탄화 + 키워드→카테고리 매핑
module.exports.allKeywords = () =>
  module.exports.categories.flatMap((c) =>
    c.keywords.map((k) => ({ ...k, category: c }))
  );
