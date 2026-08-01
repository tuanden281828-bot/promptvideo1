require("dotenv").config();
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "\n⚠️  Chưa có GEMINI_API_KEY. Mở file .env và dán API key Google AI Studio vào, " +
    "rồi khởi động lại server. App vẫn chạy được nhưng nút 'Tạo kịch bản video' sẽ báo lỗi.\n"
  );
}

app.use(express.json());
app.use(express.static(__dirname));

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

app.post("/api/generate-script", async (req, res) => {
  try {
    const { ctx, phases } = req.body;
    if (!ctx || !phases || !Array.isArray(phases)) {
      return res.status(400).json({ error: "Thiếu ctx hoặc phases" });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Chưa cấu hình GEMINI_API_KEY trong .env" });
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
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err) {
    console.error("Lỗi gọi Gemini API:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ NEON STORY STUDIO đang chạy tại: http://localhost:${PORT}\n`);
});
