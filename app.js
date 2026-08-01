// ---------- Phase layout per scene count ----------
const PHASE_MAP = {
  2: ["HOOK + PAIN", "CTA"],
  3: ["HOOK + PAIN", "STORY + INSIGHT", "CTA"],
  4: ["HOOK + PAIN", "STORY", "INSIGHT + VISION", "CTA"],
  6: ["HOOK", "PAIN", "STORY", "INSIGHT", "VISION", "CTA"],
  8: ["HOOK", "PAIN", "STORY", "STORY", "INSIGHT", "VISION", "VISION", "CTA"],
};

// ---------- Dialogue line generators per phase ----------
const LINES = {
  HOOK: (ctx) => pick([
    `Có một sự thật về ${ctx.topic} mà rất ít người chịu nói thẳng.`,
    `${ctx.name} sẽ không nói với bạn điều này công khai — nhưng hôm nay tôi sẽ nói.`,
    `Dừng lại 3 giây. Điều bạn sắp nghe về ${ctx.topic} sẽ thay đổi cách bạn nghĩ.`,
  ]),
  PAIN: (ctx) => pick([
    `Bạn đã từng loay hoay mãi mà không thấy kết quả? Đó chính xác là vấn đề số đông đang gặp.`,
    `Rất nhiều người cố gắng mỗi ngày, nhưng vẫn dậm chân tại chỗ — không phải vì họ lười, mà vì họ đi sai cách.`,
    `Càng cố càng mệt, càng làm càng rối — nghe quen không?`,
  ]),
  STORY: (ctx) => pick([
    `${ctx.name} đã thử ${ctx.product} trong thời gian dài, và đây là những gì thực sự xảy ra...`,
    `Mọi chuyện bắt đầu khi ${ctx.name} quyết định thử một cách làm hoàn toàn khác với ${ctx.product}.`,
    `Không phải phép màu, chỉ là một lựa chọn đúng thời điểm — và ${ctx.product} đã ở đó.`,
  ]),
  INSIGHT: (ctx) => pick([
    `Sự thật là: ${ctx.message}`,
    `Bí quyết không nằm ở việc cố gắng nhiều hơn, mà ở việc chọn đúng công cụ ngay từ đầu.`,
    `Điều khác biệt không phải là may mắn — mà là một quyết định đúng vào đúng lúc.`,
  ]),
  VISION: (ctx) => pick([
    `Hãy tưởng tượng nếu bạn cũng có thể đạt được điều đó chỉ trong vài tuần tới — mọi thứ sẽ khác đi rất nhiều.`,
    `Một phiên bản tốt hơn của bạn đang chờ, chỉ cách bạn một lựa chọn.`,
    `Đây không chỉ là ${ctx.product} — đây là điểm bắt đầu cho một kết quả hoàn toàn khác.`,
  ]),
  CTA: (ctx) => pick([
    `Nếu bạn cũng muốn trải nghiệm điều đó, ${ctx.product} đang chờ bạn — nhấn vào link bên dưới ngay hôm nay.`,
    `Đừng chỉ xem rồi lướt qua — hành động ngay, trước khi bạn lại trì hoãn thêm một ngày nữa.`,
    `Theo dõi ${ctx.name} để biết thêm, và bắt đầu với ${ctx.product} ngay hôm nay.`,
  ]),
};

const VISUAL_HINTS = {
  HOOK: "Cận mặt nhân vật, ánh mắt trực diện camera, ánh sáng tương phản mạnh.",
  PAIN: "Cắt cảnh nhịp nhanh, biểu cảm căng thẳng/mệt mỏi, tông màu lạnh.",
  STORY: "Góc máy rộng hơn, chuyển động chậm, ánh sáng ấm dần lên.",
  INSIGHT: "Cận mặt, giọng chậm lại, nhấn nhá bằng ánh sáng rim light.",
  VISION: "Slow motion, ánh sáng vàng ấm, không khí mơ mộng/hy vọng.",
  CTA: "Cận sản phẩm + logo, chữ CTA lớn, nhịp dựng nhanh dứt khoát.",
};

const BANNED_WORDS = ["cam kết", "tốt nhất", "duy nhất", "100%", "đảm bảo", "thần dược", "chữa khỏi", "số 1 thị trường"];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ---------- Image upload previews ----------
function wireImageUpload(btnId, inputId, thumbId) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  const thumb = document.getElementById(thumbId);
  btn.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      thumb.style.backgroundImage = `url(${e.target.result})`;
      thumb.textContent = "";
    };
    reader.readAsDataURL(file);
  });
}

wireImageUpload("charImgBtn", "charImgInput", "charThumb");
wireImageUpload("outfitImgBtn", "outfitImgInput", "outfitThumb");
wireImageUpload("productImgBtn", "productImgInput", "productThumb");

// ---------- Script generation ----------
let lastScript = null;

function buildTimings(phases, totalSeconds) {
  const perScene = Math.round(totalSeconds / phases.length);
  const timings = [];
  let t = 0;
  phases.forEach((phaseLabel, i) => {
    const start = t;
    const end = i === phases.length - 1 ? totalSeconds : t + perScene;
    t = end;
    timings.push({ index: i + 1, phaseLabel, start, end });
  });
  return timings;
}

function fillFromTemplate(timings, ctx) {
  return timings.map((s) => {
    const parts = s.phaseLabel.split(" + ");
    const line = parts.map((p) => LINES[p](ctx)).join(" ");
    const visual = VISUAL_HINTS[parts[parts.length - 1]];
    return { ...s, line, visual };
  });
}

function fillFromAI(timings, aiScenes) {
  return timings.map((s, i) => ({
    ...s,
    line: aiScenes[i]?.dialogue || "",
    visual: aiScenes[i]?.visual || "",
  }));
}

async function generateScript() {
  const topic = document.getElementById("topic").value.trim();
  if (!topic) {
    alert("Vui lòng nhập Chủ đề / Ý tưởng video trước khi tạo kịch bản.");
    return;
  }

  const ctx = {
    topic,
    product: document.getElementById("product").value.trim() || "sản phẩm này",
    message: document.getElementById("message").value.trim() || "kết quả không đến từ may mắn, mà từ một cách làm đúng ngay từ đầu",
    name: document.getElementById("charName").value.trim() || "Nhân vật chính",
    gender: document.getElementById("gender").value,
    age: document.getElementById("age").value,
    outfit: document.getElementById("outfit").value.trim(),
    style: document.getElementById("style").value,
    platform: document.getElementById("platform").value,
  };

  const [durationStr, sceneStr] = document.getElementById("duration").value.split("-");
  const totalSeconds = parseInt(durationStr, 10);
  const sceneCount = parseInt(sceneStr, 10);
  const phases = PHASE_MAP[sceneCount];
  const timings = buildTimings(phases, totalSeconds);

  const generateBtn = document.getElementById("generateBtn");
  const originalBtnText = generateBtn.textContent;
  generateBtn.disabled = true;
  generateBtn.textContent = "⏳ Đang tạo bằng AI...";

  let scenes;
  let usedAI = false;
  try {
    const res = await fetch("/api/generate-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ctx, phases }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "API error");
    const data = await res.json();
    if (!data.scenes || data.scenes.length !== phases.length) throw new Error("AI trả về sai định dạng");
    scenes = fillFromAI(timings, data.scenes);
    usedAI = true;
  } catch (err) {
    console.warn("Không gọi được AI thật, dùng kịch bản mẫu:", err.message);
    scenes = fillFromTemplate(timings, ctx);
  }

  generateBtn.disabled = false;
  generateBtn.textContent = originalBtnText;

  lastScript = { ctx, scenes, totalSeconds, sceneCount, usedAI };
  renderResult(lastScript);
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function renderResult(data) {
  const { ctx, scenes, totalSeconds, sceneCount } = data;

  document.getElementById("resultTitle").textContent = `🎬 ${ctx.topic.toUpperCase()}`;

  const fullText = scenes.map((s) => s.line).join(" ");
  const flagged = BANNED_WORDS.filter((w) => fullText.toLowerCase().includes(w));
  const flagBadge = flagged.length
    ? `<span class="badge warn">⚠ Có thể chứa từ nhạy cảm: ${flagged.join(", ")}</span>`
    : `<span class="badge ok">✓ Không có từ cấm</span>`;

  const sourceBadge = data.usedAI
    ? `<span class="badge ok">✨ Gemini AI</span>`
    : `<span class="badge warn">📝 Mẫu (chưa kết nối AI)</span>`;

  document.getElementById("resultMeta").innerHTML = `
    <span>${ctx.name} · ${ctx.platform}</span>
    <span>~${totalSeconds}s · ${sceneCount} bối cảnh</span>
    <span class="badge">Chế độ ${ctx.style}</span>
    ${sourceBadge}
    ${flagBadge}
  `;

  const list = document.getElementById("scriptList");
  list.innerHTML = scenes.map((s) => `
    <div class="scene">
      <div class="scene-head">
        <span class="scene-num">SCENE ${String(s.index).padStart(2, "0")}</span>
        <span class="phase-tag">${s.phaseLabel}</span>
        <span class="timecode">${fmt(s.start)}–${fmt(s.end)}</span>
      </div>
      <p class="scene-line">"${s.line}"</p>
      <p class="scene-visual">🎥 ${s.visual}</p>
    </div>
  `).join("");
}

function buildFullText(data) {
  const { ctx, scenes, totalSeconds, sceneCount } = data;
  const header = `${ctx.topic.toUpperCase()}\n${ctx.name} · ${ctx.platform} · ~${totalSeconds}s · ${sceneCount} bối cảnh · Chế độ ${ctx.style}\n\n`;
  const body = scenes.map((s) =>
    `SCENE ${String(s.index).padStart(2, "0")} [${s.phaseLabel}] ${fmt(s.start)}–${fmt(s.end)}\n"${s.line}"\nHình ảnh: ${s.visual}`
  ).join("\n\n");
  return header + body;
}

function buildMasterPrompt(data) {
  const { ctx, scenes } = data;
  const dialogue = scenes.map((s) => s.line).join(" ");
  return [
    `Nhân vật: ${ctx.name}, ${ctx.gender.toLowerCase()}, ${ctx.age}${ctx.outfit ? `, trang phục: ${ctx.outfit}` : ""}.`,
    `Sản phẩm: ${ctx.product}.`,
    `Chủ đề video: ${ctx.topic}.`,
    `Phong cách: ${ctx.style}, nền tảng ${ctx.platform}.`,
    `Toàn bộ lời thoại (dùng cho voice AI / lipsync):\n${dialogue}`,
  ].join("\n");
}

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const original = btn.textContent;
    btn.textContent = "✓ Đã copy";
    setTimeout(() => (btn.textContent = original), 1500);
  } catch (e) {
    alert("Không thể copy tự động. Vui lòng copy thủ công.");
  }
}

document.getElementById("generateBtn").addEventListener("click", generateScript);

document.getElementById("copyAllBtn").addEventListener("click", (e) => {
  if (!lastScript) return alert("Hãy tạo kịch bản trước.");
  copyToClipboard(buildFullText(lastScript), e.target);
});

document.getElementById("copyScriptBtn").addEventListener("click", (e) => {
  if (!lastScript) return alert("Hãy tạo kịch bản trước.");
  copyToClipboard(buildFullText(lastScript), e.target);
});

document.getElementById("copyPromptBtn").addEventListener("click", (e) => {
  if (!lastScript) return alert("Hãy tạo kịch bản trước.");
  copyToClipboard(buildMasterPrompt(lastScript), e.target);
});
