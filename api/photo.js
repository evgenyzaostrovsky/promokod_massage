import { createHash } from "node:crypto";

const MAX_SIZE = 3 * 1024 * 1024;

function detectImageType(bytes) {
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return ["image/jpeg", ".jpg"];
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return ["image/png", ".png"];
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return ["image/webp", ".webp"];
  if (bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp" && /^(heic|heix|hevc|hevx|heif|heis|mif1)/.test(bytes.toString("ascii", 8, 12))) return ["image/heic", ".heic"];
  return null;
}

async function checkRateLimit(request) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const ipHashSalt = process.env.IP_HASH_SALT;
  const forwarded = request.headers["x-forwarded-for"] || request.headers["x-real-ip"];
  const ip = String(Array.isArray(forwarded) ? forwarded[0] : forwarded || "").split(",")[0].trim();
  if (!redisUrl || !redisToken || !ipHashSalt || !ip) throw new Error("Rate limit unavailable");
  const hash = createHash("sha256").update(`${ipHashSalt}:${ip}`).digest("hex");
  const key = `quest-photo:${new Date().toISOString().slice(0, 10)}:${hash}`;
  const command = async (parts) => {
    const result = await fetch(redisUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(parts),
    });
    if (!result.ok) throw new Error("Rate limit unavailable");
    return result.json();
  };
  const count = Number((await command(["INCR", key])).result);
  if (count === 1) await command(["EXPIRE", key, 86400]);
  return count <= 5;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return response.status(503).json({ error: "Notifications are not configured" });

  let body;
  try {
    body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  } catch {
    return response.status(400).json({ error: "Invalid JSON" });
  }
  const data = body?.data;
  if (typeof data !== "string" || data.length > Math.ceil(MAX_SIZE / 3) * 4 + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    return response.status(400).json({ error: "Invalid photo" });
  }
  const bytes = Buffer.from(data, "base64");
  const imageType = detectImageType(bytes);
  if (!bytes.length || bytes.length > MAX_SIZE || !imageType) {
    return response.status(400).json({ error: "Unsupported photo" });
  }

  try {
    if (!(await checkRateLimit(request))) return response.status(429).json({ error: "Too many uploads" });
  } catch {
    return response.status(503).json({ error: "Upload temporarily unavailable" });
  }

  const [mimeType, extension] = imageType;
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", "📷 Добровольно отправлено фото в квесте переноса VIP-доставки. Перенос не оформляется.");
  form.append("document", new Blob([bytes], { type: mimeType }), `quest-photo${extension}`);
  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: "POST",
      body: form,
    });
    if (!telegramResponse.ok) return response.status(502).json({ error: "Telegram upload failed" });
    return response.status(204).end();
  } catch {
    return response.status(502).json({ error: "Telegram upload failed" });
  }
}
