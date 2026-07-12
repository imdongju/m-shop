#!/usr/bin/env bash
# m-shop VPS 빌드 & 배포 스크립트 (정의/문서용 — 이 저장소 체크아웃에서 실행하지 말 것)
#
# 역할: 최신 코드로 정적 사이트를 생성해 gh-pages 브랜치로 배포한다.
#   - 상품 DB / 시간당 API 카운터는 SHARED_DIR(/opt/shared)에서 파이썬 파이프라인과 공유.
#   - 실제 쿠팡 호출은 scripts/limiter.js 의 시간당 공유 한도 안에서만 일어난다.
#
# 사전 조건(런북 deploy/VPS-SETUP.md 참고):
#   - Node 20+, git, rsync 설치
#   - 이 저장소가 VPS에 clone 되어 있고, gh-pages push 가능한 원격 인증(deploy key/토큰) 구성
#   - 쿠팡 키 등 비밀은 환경변수로 주입 (예: /opt/shared/mshop.env 를 source)
#
# cron 예시(2시간마다):  0 */2 * * *  /opt/m-shop/deploy/mshop-build.sh >> /var/log/mshop-build.log 2>&1
#
# 멱등: 여러 번 돌려도 안전. gh-pages worktree/브랜치가 없으면 만들고, 있으면 재사용.

set -euo pipefail

# ---- 설정 (환경변수로 덮어쓸 수 있음) ----
REPO_DIR="${REPO_DIR:-/opt/m-shop}"                 # 이 저장소(main) 체크아웃 위치
PAGES_WORKTREE="${PAGES_WORKTREE:-/opt/m-shop-pages}" # gh-pages 전용 worktree
PAGES_BRANCH="${PAGES_BRANCH:-gh-pages}"
SHARED_DIR="${SHARED_DIR:-/opt/shared}"
API_BUDGET="${API_BUDGET:-4}"                        # 회당 상한(실제 호출은 공유 시간당 한도가 최종 게이트)
COUPANG_HOUR_LIMIT="${COUPANG_HOUR_LIMIT:-8}"

export SHARED_DIR API_BUDGET COUPANG_HOUR_LIMIT

# 비밀/사이트 설정 파일이 있으면 로드 (COUPANG_ACCESS_KEY 등)
[ -f "${MSHOP_ENV:-/opt/shared/mshop.env}" ] && . "${MSHOP_ENV:-/opt/shared/mshop.env}"

cd "$REPO_DIR"

# ---- 1) 최신 코드 ----
git fetch --prune origin
git checkout main
git pull --ff-only origin main

# ---- 2) 정적 사이트 생성 (공유 DB + 공유 카운터 사용) ----
echo "▶ build: SHARED_DIR=$SHARED_DIR API_BUDGET=$API_BUDGET HOUR_LIMIT=$COUPANG_HOUR_LIMIT"
node scripts/generate.js

# ---- 3) gh-pages worktree 준비 (없으면 생성; 최초엔 orphan 브랜치) ----
if ! git show-ref --verify --quiet "refs/heads/${PAGES_BRANCH}" \
   && ! git ls-remote --exit-code --heads origin "${PAGES_BRANCH}" >/dev/null 2>&1; then
  # 로컬·원격 모두 gh-pages 없음 → orphan 브랜치 최초 생성
  echo "▶ gh-pages 최초 생성 (orphan)"
  git worktree add --detach "$PAGES_WORKTREE" 2>/dev/null || true
  ( cd "$PAGES_WORKTREE"
    git checkout --orphan "$PAGES_BRANCH"
    git rm -rf . >/dev/null 2>&1 || true )
else
  # 이미 존재 → worktree 붙이기 (이미 붙어 있으면 재사용)
  if [ ! -d "$PAGES_WORKTREE/.git" ] && ! git worktree list | grep -q "$PAGES_WORKTREE"; then
    git fetch origin "${PAGES_BRANCH}:${PAGES_BRANCH}" 2>/dev/null || true
    git worktree add "$PAGES_WORKTREE" "$PAGES_BRANCH"
  fi
fi

# ---- 4) public/ → worktree 로 동기화 (.git 보존, 나머지는 --delete) ----
rsync -a --delete --exclude '.git' "$REPO_DIR/public/" "$PAGES_WORKTREE/"

# ---- 5) Jekyll 우회 (밑줄 파일/폴더도 그대로 서빙) ----
touch "$PAGES_WORKTREE/.nojekyll"

# ---- 6) 커밋 & 푸시 (gh-pages 만) ----
cd "$PAGES_WORKTREE"
git add -A
if git diff --staged --quiet; then
  echo "▶ 변경 없음 — 배포 스킵"
else
  git -c user.name="mshop-bot" -c user.email="mshop-bot@localhost" \
      commit -m "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  git push origin "HEAD:${PAGES_BRANCH}"
  echo "▶ 배포 완료"
fi
