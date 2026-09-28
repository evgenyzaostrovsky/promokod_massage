const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = String(process.env.TELEGRAM_CHAT_ID || "");
  const conversationId = String(request.query?.conversationId || "").trim();
  const after = Math.max(0, Number(request.query?.after) || 0);
  if (!token || !chatId) return response.status(503).json({ error: "Chat is not configured" });
  if (!UUID_PATTERN.test(conversationId)) return response.status(400).json({ error: "Invalid conversation" });

  const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=-100&limit=100&timeout=0`, {
    headers: { "Cache-Control": "no-store" },
  });
  if (!telegramResponse.ok) return response.status(502).json({ error: "Telegram poll failed" });
  const payload = await telegramResponse.json();
  const marker = `[CHAT:${conversationId}]`;
  const messages = (payload.result || []).flatMap((update) => {
    const message = update.message || update.edited_message;
    const replyText = String(message?.reply_to_message?.text || message?.reply_to_message?.caption || "");
    const text = String(message?.text || message?.caption || "").trim();
    if (update.update_id <= after || String(message?.chat?.id) !== chatId || !replyText.includes(marker) || !text) return [];
    return [{ id: update.update_id, text, createdAt: (message.date || Math.floor(Date.now() / 1000)) * 1000 }];
  });
  response.setHeader("Cache-Control", "no-store, max-age=0");
  return response.status(200).json({ messages });
}
