# 쿠팡 파트너스 자동 발행 사이트 (GitHub Pages)

쿠팡 파트너스 상품을 **카테고리별 + 상품 성격별(가격대·로켓·랭킹)**로 자동 수집해
정적 사이트로 만들고, GitHub Actions가 매일 갱신 → GitHub Pages로 무료 배포한다.

## 구조

```
config.js              카테고리·키워드·사이트 설정 (여기만 바꾸면 니치 전환)
scripts/coupang.js     쿠팡 파트너스 API (HMAC 서명)
scripts/templates.js   성격별 그룹핑 + 콘텐츠 블록 렌더
scripts/enrich.js      구매 가이드 (AI 있으면 AI, 없으면 데이터 기반)
scripts/generate.js    수집 → 페이지 조립 → public/
.github/workflows/publish.yml   매일 자동 빌드·배포
```

각 상품 페이지는 5개 블록으로 구성된다:
1. 데이터 요약 (실제 가격 통계) 2. 구매 가이드 3. 인기 랭킹 4. 가격대별 추천 5. 상위 비교표

## 셋업

### 1. GitHub에 올리기
```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/<사용자명>/<레포명>.git
git push -u origin main
```

### 2. 시크릿 등록 (레포 → Settings → Secrets and variables → Actions)
| 이름 | 필수 | 설명 |
|---|---|---|
| `COUPANG_ACCESS_KEY` | ✅ | 쿠팡 파트너스 액세스 키 |
| `COUPANG_SECRET_KEY` | ✅ | 쿠팡 파트너스 시크릿 키 |
| `COUPANG_SUB_ID` | | 유입 추적용 채널 ID (선택) |
| `ADSENSE_CLIENT` | | `ca-pub-xxxx` (선택, 있으면 광고 삽입) |
| `ANTHROPIC_API_KEY` | | 있으면 AI 구매가이드, 없으면 데이터 기반 문구 |

`SITE_URL` 은 Variables 탭에 등록 (예: 커스텀 도메인 `https://mysite.com`).

### 3. Pages 켜기
레포 → Settings → Pages → Source: **GitHub Actions** 선택.
이후 push하거나 Actions 탭에서 "Publish to GitHub Pages" 수동 실행.

## 로컬 테스트
```bash
# PowerShell
$env:COUPANG_ACCESS_KEY="..."; $env:COUPANG_SECRET_KEY="..."
npm run build
# → public/ 폴더에 결과. index.html 브라우저로 열어 확인
```

## 니치 바꾸기
`config.js`의 `categories` 배열만 교체하면 끝. slug는 영문(파일명), keyword는 실제 검색어.

## ⚠️ 정책 (지키지 않으면 계정 정지)
- 쿠팡 고지문(`config.disclosure`)은 절대 삭제 금지 — 전 페이지 상·하단에 자동 노출됨.
- 제휴 링크는 `rel="nofollow sponsored"` 로 자동 처리됨.
- 가격은 "변동 가능" 문구와 함께 표기됨 (캐싱 오인 방지).
- AI 가이드는 **실제 상품 데이터만 근거**로 하고 없는 스펙/리뷰를 지어내지 않도록 프롬프트가 제약됨.
- 자동 생성이라도 니치 하나에 집중하고, 무의미한 대량 양산은 피할 것 (구글 scaled content 정책).
