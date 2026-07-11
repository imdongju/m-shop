// 발행 상태 저장/로드 — data/published.json (레포에 커밋되어 매일 누적됨)
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "data", "published.json");

// [{ slug, keyword, intro, catSlug, firstPublished }]
function readPublished() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

function writePublished(list) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2) + "\n");
}

module.exports = { readPublished, writePublished, FILE };
