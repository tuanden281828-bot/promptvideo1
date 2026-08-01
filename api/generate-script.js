const { generateScript } = require("../lib/generateScript");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { ctx, phases } = req.body || {};
    if (!ctx || !phases || !Array.isArray(phases)) {
      res.status(400).json({ error: "Thiếu ctx hoặc phases" });
      return;
    }
    const parsed = await generateScript(ctx, phases);
    res.status(200).json(parsed);
  } catch (err) {
    console.error("Lỗi gọi Gemini API:", err.message);
    res.status(500).json({ error: err.message });
  }
};
