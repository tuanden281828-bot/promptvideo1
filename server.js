require("dotenv").config();
const express = require("express");
const { generateScript } = require("./lib/generateScript");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.GEMINI_API_KEY) {
  console.warn(
    "\n⚠️  Chưa có GEMINI_API_KEY. Mở file .env và dán API key Google AI Studio vào, " +
    "rồi khởi động lại server. App vẫn chạy được nhưng nút 'Tạo kịch bản video' sẽ báo lỗi.\n"
  );
}

app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/generate-script", async (req, res) => {
  try {
    const { ctx, phases } = req.body;
    if (!ctx || !phases || !Array.isArray(phases)) {
      return res.status(400).json({ error: "Thiếu ctx hoặc phases" });
    }
    const parsed = await generateScript(ctx, phases);
    res.json(parsed);
  } catch (err) {
    console.error("Lỗi gọi Gemini API:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ VIDEO STUDIO đang chạy tại: http://localhost:${PORT}\n`);
});
