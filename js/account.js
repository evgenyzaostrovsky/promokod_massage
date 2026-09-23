const USERS_KEY = "malyshka-users-v1";
const SESSION_KEY = "malyshka-session-v1";
const ORDERS_KEY = "malyshka-orders-v1";

const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  else if (digits.startsWith("9")) digits = `7${digits}`;
  return digits.slice(0, 11);
}

function formatPhone(value) {
  const digits = normalizePhone(value);
  if (!digits) return "";
  const local = digits.slice(1);
  let result = "+7";
  if (local.length) result += ` (${local.slice(0, 3)}`;
  if (local.length >= 3) result += ")";
  if (local.length > 3) result += ` ${local.slice(3, 6)}`;
  if (local.length > 6) result += `-${local.slice(6, 8)}`;
  if (local.length > 8) result += `-${local.slice(8, 10)}`;
  return result;
}

async function hashPassword(phone, password) {
  const bytes = new TextEncoder().encode(`${phone}:malyshka-delivery:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function isCompleted(order) {
  const now = new Date();
  if (order.mode === "delivery") {
    const [hours, minutes] = order.time.split(":").map(Number);
    const due = new Date(order.createdAt);
    due.setHours(hours, minutes, 0, 0);
    return due <= now;
  }
  const time = order.mode === "date" ? order.time : "23:59";
  return new Date(`${order.date}T${time}:00`) <= now;
}

const orderTitle = (mode) => mode === "delivery" ? "VIP-доставка" : mode === "jenka" ? "Jenka Bar" : "Свидание";
function orderDetails(order) {
  const pieces = [];
  if (order.date) pieces.push(new Date(`${order.date}T12:00:00`).toLocaleDateString("ru-RU"));
  if (order.time) pieces.push(order.time);
  if (order.address) pieces.push(`г. Волгоград, ${escapeHtml(order.address)}`);
  return pieces.join(" · ");
}

export function initAccount() {
  document.body.insertAdjacentHTML("beforeend", `
    <button class="account-trigger" id="accountTrigger" type="button" data-notify="manual" aria-label="Личный кабинет"><span aria-hidden="true">♡</span><b>Войти</b></button>
    <div class="account-modal" id="accountModal" aria-hidden="true">
      <div class="account-modal__backdrop" data-account-close></div>
      <section class="account-modal__sheet" role="dialog" aria-modal="true" aria-labelledby="accountTitle">
        <header class="account-modal__header"><div><p class="modal__step">Малышка's Delivery</p><h2 id="accountTitle">Личный кабинет</h2></div><button type="button" data-account-close aria-label="Закрыть">×</button></header>
        <div id="accountContent"></div>
      </section>
    </div>`);

  const trigger = document.querySelector("#accountTrigger");
  const modal = document.querySelector("#accountModal");
  const content = document.querySelector("#accountContent");
  let resolveAuth = null;
  let authMode = "login";
  const currentPhone = () => localStorage.getItem(SESSION_KEY) || "";
  const updateTrigger = () => {
    trigger.classList.toggle("is-authorized", Boolean(currentPhone()));
    trigger.querySelector("b").textContent = currentPhone() ? "Профиль" : "Войти";
  };
  const showError = (message, success = false) => {
    const node = content.querySelector("[data-auth-error]");
    if (node) { node.textContent = message; node.hidden = !message; node.classList.toggle("is-success", success); }
  };

  function renderAuth(mode = authMode) {
    authMode = mode;
    content.innerHTML = `
      <div class="auth-tabs"><button class="${mode === "login" ? "is-active" : ""}" type="button" data-auth-mode="login">Вход</button><button class="${mode === "register" ? "is-active" : ""}" type="button" data-auth-mode="register">Регистрация</button></div>
      <form class="account-form" id="authForm">
        <label>Номер телефона<input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (999) 000-00-00" required></label>
        <label>${mode === "register" ? "Придумайте пароль" : "Пароль"}<input name="password" type="password" autocomplete="${mode === "register" ? "new-password" : "current-password"}" minlength="6" placeholder="Минимум 6 символов" required></label>
        <p class="account-error" data-auth-error role="alert" hidden></p><button class="button button--primary" type="submit">${mode === "register" ? "Создать аккаунт" : "Войти"}</button>
      </form><p class="account-caption">Без подтверждения по электронной почте.</p>`;
    const phoneInput = content.querySelector('[name="phone"]');
    phoneInput.addEventListener("input", () => { phoneInput.value = formatPhone(phoneInput.value); });
    content.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => renderAuth(button.dataset.authMode)));
    content.querySelector("#authForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const phone = normalizePhone(data.get("phone"));
      const password = String(data.get("password") || "");
      if (!/^7\d{10}$/.test(phone)) return showError("Введите российский номер из 11 цифр.");
      if (password.length < 6) return showError("Пароль должен содержать не меньше 6 символов.");
      const users = read(USERS_KEY, {});
      const passwordHash = await hashPassword(phone, password);
      if (mode === "register") {
        if (users[phone]) return showError("Аккаунт с таким номером уже существует.");
        users[phone] = { phone, passwordHash, createdAt: new Date().toISOString() };
        write(USERS_KEY, users);
      } else if (!users[phone] || users[phone].passwordHash !== passwordHash) return showError("Неверный номер телефона или пароль.");
      localStorage.setItem(SESSION_KEY, phone);
      updateTrigger();
      if (resolveAuth) { const resolve = resolveAuth; resolveAuth = null; close(); resolve(true); } else renderHistory();
    });
  }

  const stars = (order) => `<div class="order-rating"><span>Ваша оценка</span><div>${[1,2,3,4,5].map((star) => `<button type="button" data-rate="${star}" data-order="${order.id}" class="${star <= (order.rating || 0) ? "is-active" : ""}" aria-label="${star} из 5">★</button>`).join("")}</div><button class="order-rating__reset" type="button" data-rate="0" data-order="${order.id}">Сбросить до 0</button></div>`;

  function renderHistory() {
    const phone = currentPhone();
    const orders = read(ORDERS_KEY, {})[phone] || [];
    content.innerHTML = `<div class="cabinet-nav"><button type="button" data-cabinet="history" class="is-active">История заказов</button><button type="button" data-cabinet="settings">Настройки</button></div><div class="order-list">${orders.length ? orders.slice().reverse().map((order) => {
      const completed = isCompleted(order);
      return `<article class="order-card ${completed ? "is-completed" : ""}"><button class="order-card__summary" type="button" data-order-toggle aria-expanded="false"><span><small>${completed ? "Выполнен" : "Запланирован"}</small><strong>${orderTitle(order.mode)}</strong><em>${orderDetails(order)}</em></span><b>⌄</b></button><div class="order-card__details" hidden><p>${order.items.length ? order.items.map(escapeHtml).join(" · ") : "Индивидуальные пожелания"}</p>${order.preferences ? `<p>Пожелания: ${escapeHtml(order.preferences)}</p>` : ""}${completed ? stars(order) : "<small>Оценка станет доступна после выполнения.</small>"}</div></article>`;
    }).join("") : `<div class="account-empty"><span>♡</span><h3>Здесь пока тихо</h3><p>Оформленные доставки, свидания и брони Jenka Bar появятся здесь.</p></div>`}</div>`;
    bindNav();
    content.querySelectorAll("[data-order-toggle]").forEach((button) => button.addEventListener("click", () => { const details = button.nextElementSibling; details.hidden = !details.hidden; button.setAttribute("aria-expanded", String(!details.hidden)); }));
    content.querySelectorAll("[data-rate]").forEach((button) => button.addEventListener("click", () => {
      const all = read(ORDERS_KEY, {}); const order = (all[phone] || []).find((item) => item.id === button.dataset.order);
      if (order) { order.rating = Number(button.dataset.rate); write(ORDERS_KEY, all); renderHistory(); }
    }));
  }

  function renderSettings() {
    content.innerHTML = `<div class="cabinet-nav"><button type="button" data-cabinet="history">История заказов</button><button type="button" data-cabinet="settings" class="is-active">Настройки</button></div><div class="account-settings"><p class="account-phone">${formatPhone(currentPhone())}</p><form class="account-form" id="passwordForm"><label>Текущий пароль<input name="current" type="password" autocomplete="current-password" required></label><label>Новый пароль<input name="next" type="password" autocomplete="new-password" minlength="6" required></label><p class="account-error" data-auth-error role="alert" hidden></p><button class="button button--primary" type="submit">Изменить пароль</button></form><button class="button button--secondary" id="logoutButton" type="button">Выйти из аккаунта</button></div>`;
    bindNav();
    content.querySelector("#passwordForm").addEventListener("submit", async (event) => {
      event.preventDefault(); const data = new FormData(event.currentTarget); const current = String(data.get("current")); const next = String(data.get("next"));
      if (next.length < 6) return showError("Новый пароль должен содержать не меньше 6 символов.");
      const phone = currentPhone(); const users = read(USERS_KEY, {});
      if (users[phone]?.passwordHash !== await hashPassword(phone, current)) return showError("Текущий пароль указан неверно.");
      users[phone].passwordHash = await hashPassword(phone, next); write(USERS_KEY, users); event.currentTarget.reset(); showError("Пароль успешно изменён.", true);
    });
    content.querySelector("#logoutButton").addEventListener("click", () => { localStorage.removeItem(SESSION_KEY); updateTrigger(); renderAuth("login"); });
  }

  function bindNav() { content.querySelector('[data-cabinet="history"]').addEventListener("click", renderHistory); content.querySelector('[data-cabinet="settings"]').addEventListener("click", renderSettings); }
  function open(requireAuth = false) { modal.classList.add("is-open"); modal.setAttribute("aria-hidden", "false"); document.body.classList.add("has-modal"); currentPhone() ? renderHistory() : renderAuth(requireAuth ? "register" : "login"); }
  function close() { modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); document.body.classList.remove("has-modal"); if (resolveAuth) { resolveAuth(false); resolveAuth = null; } }
  trigger.addEventListener("click", () => open());
  modal.addEventListener("click", (event) => event.stopPropagation());
  modal.querySelectorAll("[data-account-close]").forEach((node) => node.addEventListener("click", close));
  updateTrigger();

  return {
    ensureAuthenticated() { if (currentPhone()) return Promise.resolve(true); open(true); return new Promise((resolve) => { resolveAuth = resolve; }); },
    recordOrder(order) { const phone = currentPhone(); if (!phone) return; const all = read(ORDERS_KEY, {}); all[phone] ||= []; all[phone].push({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), rating: 0, ...order }); write(ORDERS_KEY, all); },
  };
}
