const CHAT_KEY = "malyshka-chat-v1";

const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const readAll = () => { try { return JSON.parse(localStorage.getItem(CHAT_KEY)) || {}; } catch { return {}; } };
const writeAll = (value) => localStorage.setItem(CHAT_KEY, JSON.stringify(value));

export function initChat(account) {
  document.body.insertAdjacentHTML("beforeend", `
    <button class="chat-trigger" id="chatTrigger" type="button" data-notify="manual" aria-label="Открыть чат"><span aria-hidden="true">✦</span><b>Чат</b><i id="chatBadge" hidden></i></button>
    <div class="chat-modal" id="chatModal" aria-hidden="true">
      <div class="chat-modal__backdrop" data-chat-close></div>
      <section class="chat-modal__sheet" role="dialog" aria-modal="true" aria-labelledby="chatTitle">
        <header class="chat-header"><div><p class="modal__step">На связи лично</p><h2 id="chatTitle">Чат с Жекой</h2><small><i></i> Обычно отвечает быстро</small></div><button type="button" data-chat-close aria-label="Закрыть">×</button></header>
        <div class="chat-messages" id="chatMessages" aria-live="polite"></div>
        <form class="chat-form" id="chatForm"><textarea id="chatInput" rows="1" maxlength="1000" placeholder="Напишите сообщение…" aria-label="Сообщение" required></textarea><button type="submit" aria-label="Отправить сообщение">↑</button></form>
        <p class="chat-status" id="chatStatus" aria-live="polite"></p>
      </section>
    </div>`);

  const trigger = document.querySelector("#chatTrigger");
  const badge = document.querySelector("#chatBadge");
  const modal = document.querySelector("#chatModal");
  const messagesNode = document.querySelector("#chatMessages");
  const form = document.querySelector("#chatForm");
  const input = document.querySelector("#chatInput");
  const status = document.querySelector("#chatStatus");
  let pollTimer;
  let polling = false;

  function stateFor(phone) {
    const all = readAll();
    all[phone] ||= { conversationId: crypto.randomUUID(), messages: [], lastUpdateId: 0, unread: 0 };
    writeAll(all);
    return { all, state: all[phone] };
  }

  function render(phone) {
    const { state } = stateFor(phone);
    messagesNode.innerHTML = state.messages.length ? state.messages.map((message) => `
      <div class="chat-message chat-message--${message.from}"><p>${escapeHtml(message.text)}</p><time>${new Date(message.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</time></div>`).join("") : `<div class="chat-welcome"><span>♡</span><p>Напишите Жеке — сообщение сразу придёт ему в Telegram.</p></div>`;
    messagesNode.scrollTop = messagesNode.scrollHeight;
    badge.hidden = !state.unread;
    badge.textContent = state.unread > 9 ? "9+" : String(state.unread || "");
  }

  async function poll() {
    const phone = account.getCurrentPhone();
    if (!phone || polling) return;
    polling = true;
    try {
      const { all, state } = stateFor(phone);
      const response = await fetch(`/api/chat-poll?conversationId=${encodeURIComponent(state.conversationId)}&after=${state.lastUpdateId}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      for (const message of data.messages || []) {
        if (state.messages.some((item) => item.updateId === message.id)) continue;
        state.messages.push({ id: crypto.randomUUID(), updateId: message.id, from: "courier", text: message.text, createdAt: message.createdAt });
        state.lastUpdateId = Math.max(state.lastUpdateId, message.id);
        if (!modal.classList.contains("is-open")) state.unread += 1;
      }
      writeAll(all);
      render(phone);
    } catch {} finally { polling = false; }
  }

  async function open() {
    if (!await account.ensureAuthenticated()) return;
    const phone = account.getCurrentPhone();
    const { all, state } = stateFor(phone);
    state.unread = 0;
    writeAll(all);
    render(phone);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-modal");
    input.focus();
    poll();
  }
  function close() { modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); document.body.classList.remove("has-modal"); }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    const phone = account.getCurrentPhone();
    if (!text || !phone) return;
    const { all, state } = stateFor(phone);
    const pending = { id: crypto.randomUUID(), from: "client", text, createdAt: Date.now(), pending: true };
    state.messages.push(pending); writeAll(all); input.value = ""; render(phone);
    form.querySelector("button").disabled = true; status.textContent = "Отправляем…";
    try {
      const response = await fetch("/api/chat-send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: state.conversationId, phone, text }) });
      if (!response.ok) throw new Error();
      pending.pending = false; status.textContent = "Доставлено в Telegram";
    } catch { state.messages = state.messages.filter((message) => message.id !== pending.id); status.textContent = "Не отправилось. Попробуйте ещё раз."; }
    writeAll(all); render(phone); form.querySelector("button").disabled = false;
  });
  input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = `${Math.min(input.scrollHeight, 120)}px`; });
  trigger.addEventListener("click", open);
  modal.addEventListener("click", (event) => event.stopPropagation());
  modal.querySelectorAll("[data-chat-close]").forEach((node) => node.addEventListener("click", close));
  pollTimer = window.setInterval(poll, 5000);
  window.addEventListener("focus", poll);
  poll();
  return { destroy: () => window.clearInterval(pollTimer) };
}
