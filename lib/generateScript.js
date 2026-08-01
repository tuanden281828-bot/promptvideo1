const MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SCENE_SCHEMA = {
  type: "OBJECT",
  properties: {
    scenes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          phase: { type: "STRING" },
          dialogue: { type: "STRING" },
          visual: { type: "STRING" },
        },
        required: ["phase", "dialogue", "visual"],
      },
    },
  },
  required: ["scenes"],
};

function buildPrompt(ctx, phases) {
  return `Bạn là một Video Hollywood Strategist chuyên viết kịch bản video ngắn (TikTok/Reels) theo công thức storytelling: HOOK → PAIN → STORY → INSIGHT → VISION → CTA.

Thông tin video:
- Chủ đề / ý tưởng: ${ctx.topic}
- Sản phẩm / dịch vụ: ${ctx.product}
- Thông điệp chính: ${ctx.message}
- Nhân vật chính: ${ctx.name} (${ctx.gender}, ${ctx.age})
- Trang phục: ${ctx.outfit || "không mô tả"}
- Phong cách: ${ctx.style}
- Nền tảng: ${ctx.platform}

Hãy viết lời thoại (dialogue) và mô tả hình ảnh (visual) cho từng scene, theo đúng thứ tự và nhãn giai đoạn sau đây (mỗi nhãn có thể gộp 2 giai đoạn, ví dụ "HOOK + PAIN" nghĩa là scene đó vừa hook vừa pain):

${phases.map((p, i) => `Scene ${i + 1}: ${p}`).join("\n")}

Yêu cầu:
- Lời thoại bằng tiếng Việt, tự nhiên, đúng giọng của người kể chuyện thật (không sáo rỗng, không dùng từ cấm quảng cáo như "cam kết", "tốt nhất", "duy nhất", "100%", "đảm bảo").
- Mỗi dialogue dài 1-3 câu, đủ để đọc trong khoảng thời gian của 1 scene ngắn (~6-10 giây).
- Visual là mô tả ngắn gọn về hình ảnh/góc máy/ánh sáng phù hợp với giai đoạn đó.
- Trả về đúng ${phases.length} scene, đúng thứ tự nhãn giai đoạn đã cho.`;
}

async function generateScript(ctx, phases) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY");
  }

  const geminiRes = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(ctx, phases) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCENE_SCHEMA,
      },
    }),
  });

  const data = await geminiRes.json();
  if (!geminiRes.ok) {
    throw new Error(data?.error?.message || `Gemini API lỗi (HTTP ${geminiRes.status})`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Không nhận được nội dung từ Gemini");
  return JSON.parse(text);
}

module.exports = { generateScript };
