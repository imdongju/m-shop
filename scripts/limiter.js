// 쿠팡 API 시간당 카운터 + 파일 락 (파이썬 파이프라인과 공유하는 프로토콜)
// SHARED_DIR/ratelimit/ 아래에서 원자적 mkdir 락으로 동시성을 제어한다.
// ※ 이 파일 어디서도 쿠팡 API를 호출하지 않는다. 순수 파일/시각 연산만.
const fs = require("fs");
const path = require("path");

const SHARED_DIR = process.env.SHARED_DIR || "/opt/shared";
const RL_DIR = path.join(SHARED_DIR, "ratelimit");
const LOCK_DIR = path.join(RL_DIR, ".lock");

const LIMIT = () => Number(process.env.COUPANG_HOUR_LIMIT || 8);

// 현재 UTC 시각 문자열: "YYYY-MM-DD-HH" (예: 2026-07-12-14)
function hourKeyUTC() {
  return new Date().toISOString().slice(0, 13).replace("T", "-");
}

function counterFile() {
  return path.join(RL_DIR, `coupang-${hourKeyUTC()}.json`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 락 획득: 원자적 mkdir. 존재하면 50ms 대기 후 재시도, 총 최대 5초.
// 스테일 락(.lock mtime이 15초보다 오래됨)은 rmdir로 회수 후 재시도.
async function acquireLock() {
  fs.mkdirSync(RL_DIR, { recursive: true });
  const deadline = Date.now() + 5000;
  while (true) {
    try {
      fs.mkdirSync(LOCK_DIR); // 원자적 — 이미 있으면 예외
      return true;
    } catch (e) {
      // 스테일 락 회수 (크래시로 남은 락 방지)
      try {
        const st = fs.statSync(LOCK_DIR);
        if (Date.now() - st.mtimeMs > 15000) {
          try { fs.rmdirSync(LOCK_DIR); } catch {}
          continue; // 즉시 재시도
        }
      } catch {
        // stat 실패 = 그 사이 사라짐 → 재시도
      }
      if (Date.now() >= deadline) return false;
      await sleep(50);
    }
  }
}

function releaseLock() {
  try { fs.rmdirSync(LOCK_DIR); } catch {}
}

function readCount() {
  try {
    return Number(JSON.parse(fs.readFileSync(counterFile(), "utf8")).count) || 0;
  } catch {
    return 0;
  }
}

function writeCount(n) {
  fs.mkdirSync(RL_DIR, { recursive: true });
  fs.writeFileSync(counterFile(), JSON.stringify({ count: n }) + "\n");
}

// 호출 1회 예약 시도 → boolean.
// 락을 못 잡거나(5초), 한도 도달이거나, 어떤 예외든 → false (안전 기본값: 거부).
// 성공 시 카운터 +1 기록.
async function tryAcquire() {
  let locked = false;
  try {
    locked = await acquireLock();
    if (!locked) return false; // 5초 내 못 잡음 → 거부
    const count = readCount();
    if (count >= LIMIT()) return false; // 한도 도달 → 거부
    writeCount(count + 1);
    return true;
  } catch {
    return false;
  } finally {
    if (locked) releaseLock();
  }
}

module.exports = { tryAcquire };
