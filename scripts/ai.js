// OpenAI 챗 클라이언트 (구매가이드·키워드 추출 공용)
// OPENAI_API_KEY 있으면 사용, 없으면 각 호출부에서 데이터 기반 폴백.
const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o";

function aiEnabled() {
  return !!KEY;
}

async function chat(prompt, { maxTokens = 600, temperature = 0.4 } = {}) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI 빈 응답");
  return text;
}

module.exports = { aiEnabled, chat, MODEL };
