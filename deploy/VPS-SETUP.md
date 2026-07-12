# m-shop VPS 셋업 & 컷오버 런북

m-shop(쿠팡 제휴 정적사이트, Node, 의존성 없음)을 GitHub Actions에서 **VPS 크론**으로 옮긴다.
목적: 파이썬 파이프라인(원퍼샵)과 **상품 DB + 시간당 API 카운터**를 한 머신의 `SHARED_DIR`에서 공유해
쿠팡 시간당 한도를 실제로 강제하기 위함.

---

## ⚠️ 컷오버 순서 (반드시 이 순서)

GitHub Actions는 GitHub 인프라에서 돌기 때문에 **VPS의 `/opt/shared` 카운터를 볼 수 없다.**
즉 Actions와 VPS 크론이 동시에 살아 있으면 시간당 한도를 두 곳이 각자 세어 **합산 초과**가 난다.

1. **먼저 Actions의 쿠팡 호출부터 끈다.** 둘 중 하나:
   - 레포 변수 `API_BUDGET`(스케줄용)을 **0**으로 (호출 0회, 캐시 렌더만), 또는
   - 워크플로 자체를 비활성화(Disable). 이 브랜치에서는 `.github/workflows/publish.yml`을 **삭제**했으므로,
     main 컷오버 머지 시 Actions 발행이 사라진다.
2. Actions가 더 이상 쿠팡을 호출하지 않는 것을 1시간 창에서 확인.
3. **그 다음** VPS 크론(`mshop-build.sh`)을 켠다.

> 절대 순서를 바꾸지 말 것: VPS 크론을 먼저 켜고 Actions를 나중에 끄면, 겹치는 동안 한도 초과 위험.

---

## 1. 사전 준비 (VPS)

```bash
# Node 20+, git, rsync
node -v        # v20 이상
git --version
rsync --version

# 저장소 clone (main)
sudo git clone <repo-url> /opt/m-shop
cd /opt/m-shop

# gh-pages push 인증: deploy key(쓰기 권한) 또는 토큰 원격 구성
# 예) git remote set-url origin git@github.com:<owner>/<repo>.git  (SSH deploy key)
```

## 2. 공유 디렉터리

```bash
sudo mkdir -p /opt/shared/products /opt/shared/ratelimit
sudo chown -R <run-user>:<run-user> /opt/shared
```

- `SHARED_DIR=/opt/shared` — 파이썬 파이프라인과 **같은 값**이어야 함.
- 상품 캐시: `/opt/shared/products/<cacheKey>.json` (cacheKey = md5(normalize(keyword))[:12])
- 시간당 카운터: `/opt/shared/ratelimit/coupang-<YYYY-MM-DD-HH>.json` (**UTC 시각**)
- 락: `/opt/shared/ratelimit/.lock` (원자적 mkdir, 15초 스테일 회수)

## 3. 비밀/설정 (env 파일)

`/opt/shared/mshop.env` (권한 600) 예시:

```bash
export COUPANG_ACCESS_KEY=...
export COUPANG_SECRET_KEY=...
export COUPANG_SUB_ID=...
export ADSENSE_CLIENT=...
export OPENAI_API_KEY=...
export OPENAI_MODEL=...
export SITE_URL=...
export TREND=...
# 공유 한도(파이썬과 동일 값). 기본 8.
export COUPANG_HOUR_LIMIT=8
```

`mshop-build.sh`가 자동으로 `. /opt/shared/mshop.env` 로 로드한다(경로는 `MSHOP_ENV`로 변경 가능).

## 4. 크론 등록

```cron
# 2시간마다 빌드·배포 (회당 API_BUDGET=4, 최종 게이트는 공유 시간당 한도)
0 */2 * * *  /opt/m-shop/deploy/mshop-build.sh >> /var/log/mshop-build.log 2>&1
```

- 회당 상한 `API_BUDGET=4`는 상한일 뿐, **실제 호출은 `limiter.tryAcquire()`가 공유 카운터로 최종 판정**한다.
- 파이썬 파이프라인과 합산해 어느 UTC 1시간 창에서도 `COUPANG_HOUR_LIMIT`(기본 8)을 넘지 않는다.

## 5. 첫 배포 동작

`mshop-build.sh`는 멱등이며 다음을 수행한다:
1. `git pull --ff-only` (main)
2. `SHARED_DIR=/opt/shared API_BUDGET=4 node scripts/generate.js` → `public/` 생성
3. `git worktree add /opt/m-shop-pages gh-pages` (최초엔 **orphan** 브랜치 생성)
4. `rsync -a --delete`로 `public/` → worktree 동기화(`.git` 제외)
5. `.nojekyll` 생성
6. gh-pages 만 commit & push

## 6. 검증 체크리스트

- [ ] `ls /opt/shared/products` 에 `<cacheKey>.json`(12자 hex) 파일들이 생김
- [ ] 호출이 있었던 UTC 시간엔 `ratelimit/coupang-<...>.json` 의 `count`가 증가
- [ ] 배포 후 `.lock` 디렉터리가 **남아 있지 않음**(finally 해제 확인)
- [ ] gh-pages 에 사이트가 뜨고 URL/파일명이 이전과 동일(slug 기반, 안 바뀜)
- [ ] Actions 발행이 꺼져 있음(워크플로 삭제/비활성 또는 API_BUDGET=0)

## 7. 롤백

- VPS 크론을 주석 처리(호출 즉시 중단, 사이트는 gh-pages에 그대로 유지).
- 필요 시 Actions 워크플로를 되살려 이전 방식으로 복귀(단, 카운터 공유 안 됨에 유의).

## 참고: 공유 프로토콜 요약 (파이썬과 바이트 일치)

- normalize(keyword): 공백 제거 → 소문자 → NFC
- cacheKey: `md5(normalize(keyword), utf8).hex[:12]`
- 상품 캐시: `<SHARED_DIR>/products/<cacheKey>.json`
  `{ "keyword", "fetchedAt":"YYYY-MM-DD", "products":[...], "guide"?:"..." }`
  신선 기준 refreshAfterDays=3. write 시 기존 `guide` 등 미지 필드 **merge 보존**.
- 시간당 카운터: `<SHARED_DIR>/ratelimit/coupang-<YYYY-MM-DD-HH>.json` (UTC), `{ "count": N }`, 한도 `COUPANG_HOUR_LIMIT`(기본 8).
- 락: `<SHARED_DIR>/ratelimit/.lock` (mkdir 원자적, 15초 스테일 회수, 총 5초 재시도).
