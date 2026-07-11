// 사이트 전역 설정 + 카테고리/키워드 구조
// 니치를 바꾸려면 categories 배열만 교체하면 된다.

module.exports = {
  site: {
    title: "자취 살림 추천",
    description: "자취·원룸 살림템을 카테고리별로 골라주는 큐레이션",
    baseUrl: process.env.SITE_URL || "https://imdongju.github.io/m-shop",
    lang: "ko",
  },

  adsenseClient: process.env.ADSENSE_CLIENT || "",

  // 쿠팡 파트너스 필수 고지문 (지우지 말 것)
  disclosure:
    "이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.",

  fetch: {
    limitPerKeyword: 30,
    subId: process.env.COUPANG_SUB_ID || "",
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
  // coupangCategoryId: 트렌드 모드에서 베스트셀러를 뽑을 쿠팡 카테고리 번호
  //   1007 주방 · 1008 생활용품 · 1009 홈인테리어 · 1010 가전디지털
  //   1004 뷰티 · 1016 반려동물 · 1011 스포츠레저 · 1017 헬스건강식품
  // keywords: 트렌드 모드 꺼져 있을 때 쓰는 수동 키워드
  categories: [
    {
      slug: "kitchen",
      name: "주방·조리",
      coupangCategoryId: 1007,
      keywords: [
        { slug: "airfryer", keyword: "에어프라이어", intro: "1~2인 자취 필수 가전." },
        { slug: "induction", keyword: "1구 인덕션", intro: "좁은 주방용 1구 인덕션." },
        { slug: "rice-cooker", keyword: "미니 밥솥", intro: "원룸에 맞는 소형 밥솥." },
      ],
    },
    {
      slug: "clean",
      name: "청소·세탁",
      coupangCategoryId: 1008,
      keywords: [
        { slug: "vacuum", keyword: "무선 청소기", intro: "자취방 청소용 가성비 무선 청소기." },
        { slug: "laundry-rack", keyword: "빨래 건조대", intro: "베란다 없는 원룸용 건조대." },
      ],
    },
    {
      slug: "storage",
      name: "수납·정리",
      coupangCategoryId: 1009,
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
