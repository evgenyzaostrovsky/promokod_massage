const hoursNode = document.querySelector("#hours");
const minutesNode = document.querySelector("#minutes");
const secondsNode = document.querySelector("#seconds");
const modal = document.querySelector("#modal");
const modalStep = document.querySelector("#modalStep");
const modalTitle = document.querySelector("#modalTitle");
const modalText = document.querySelector("#modalText");
const modalButton = document.querySelector("#modalButton");
const rescheduleButton = document.querySelector("#rescheduleButton");
const orderButton = document.querySelector("#orderButton");
const servicesModal = document.querySelector("#servicesModal");
const servicesClose = document.querySelector("#servicesClose");
const servicesForm = document.querySelector("#servicesForm");
const servicesSubmit = document.querySelector("#servicesSubmit");
const servicesHint = document.querySelector("#servicesHint");
const serviceInputs = [...document.querySelectorAll('input[name="service"]')];
const entertainmentInputs = [...document.querySelectorAll('input[name="entertainment"]')];
const preferences = document.querySelector("#preferences");
const deliveryMode = document.querySelector("#deliveryMode");
const jenkaMode = document.querySelector("#jenkaMode");
const servicesTitle = document.querySelector("#servicesTitle");
const addressFields = document.querySelector("#addressFields");
const deliveryAddress = document.querySelector("#deliveryAddress");
const timeModalTitle = document.querySelector("#timeModalTitle");
const timeModal = document.querySelector("#timeModal");
const timeForm = document.querySelector("#timeForm");
const arrivalTime = document.querySelector("#arrivalTime");
const timeSubmit = document.querySelector("#timeSubmit");
const timeBack = document.querySelector("#timeBack");

const PROMO_END_TIMESTAMP = Date.UTC(2026, 8, 21, 21, 0, 0);
let modalStage = 0;
let modalFocusTarget = rescheduleButton;
let pendingServices = [];
let currentMode = "delivery";
let pendingPreferences = "";

function sendButtonNotification(action, details = {}) {
  return fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...details }),
    keepalive: true,
  });
}

function updateTimer() {
  const remaining = Math.max(0, PROMO_END_TIMESTAMP - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  hoursNode.textContent = String(hours).padStart(2, "0");
  minutesNode.textContent = String(minutes).padStart(2, "0");
  secondsNode.textContent = String(seconds).padStart(2, "0");
}

function setModalContent(stage) {
  const content = [
    {
      step: "Подтверждение",
      title: "Вы уверены?",
      text: "Перенести VIP-доставку на другую дату?",
      button: "Да",
    },
    {
      step: "Важное условие",
      title: "Подтвердите согласие",
      text: "Нажимая кнопку, вы соглашаетесь на эротическую фотосессию в спальне для курьера.",
      button: "Ок",
    },
    {
      step: "VIP-доставка",
      title: "Перенос невозможен",
      text: "Ожидайте курьера.",
      button: "Хорошо",
    },
    {
      step: "VIP-доставка",
      title: "Заказ подтверждён",
      text: "Ожидайте курьера.",
      button: "Хорошо",
    },
    {
      step: "VIP-доставка",
      title: "Доставка уже оформлена",
      text: "Повторное оформление с этого подключения невозможно. Ожидайте курьера.",
      button: "Хорошо",
    },
    {
      step: "Ошибка",
      title: "Не удалось оформить",
      text: "Попробуйте ещё раз через несколько минут.",
      button: "Хорошо",
    },
    {
      step: "Jenka Bar",
      title: "Бронь подтверждена",
      text: "Ждём вас в Jenka Bar.",
      button: "Хорошо",
    },
  ][stage];

  modalStep.textContent = content.step;
  modalTitle.textContent = content.title;
  modalText.textContent = content.text;
  modalButton.textContent = content.button;
}

function openModal() {
  modalStage = 0;
  modalFocusTarget = rescheduleButton;
  setModalContent(modalStage);
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => modalButton.focus(), 50);
}

function openOrderModal(stage = 3) {
  modalStage = stage;
  modalFocusTarget = orderButton;
  setModalContent(modalStage);
  if (stage === 4 && currentMode === "jenka") {
    modalStep.textContent = "Jenka Bar";
    modalTitle.textContent = "Бронь уже оформлена";
    modalText.textContent = "Повторное бронирование с этого подключения невозможно.";
  }
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => modalButton.focus(), 50);
}

function updateServicesState() {
  const inputs = currentMode === "delivery" ? serviceInputs : entertainmentInputs;
  const selectedCount = inputs.filter((input) => input.checked).length;
  servicesSubmit.disabled = selectedCount === 0 && !preferences.value.trim();
  servicesHint.textContent = selectedCount
    ? `Выбрано: ${selectedCount}`
    : "Выберите вариант или напишите свой";
}

function setMode(mode) {
  currentMode = mode;
  const isDelivery = mode === "delivery";
  deliveryMode.classList.toggle("is-active", isDelivery);
  jenkaMode.classList.toggle("is-active", !isDelivery);
  deliveryMode.setAttribute("aria-pressed", String(isDelivery));
  jenkaMode.setAttribute("aria-pressed", String(!isDelivery));
  orderButton.textContent = isDelivery ? "Оформить VIP-доставку" : "Забронировать Jenka Bar";
  rescheduleButton.hidden = !isDelivery;
  servicesTitle.textContent = isDelivery ? "Выберите удовольствие" : "Выберите развлечения";
  servicesModal.querySelector(".modal__step").textContent = isDelivery ? "Дополнительные услуги" : "Jenka Bar";
  servicesSubmit.textContent = isDelivery ? "Оформить выбранное" : "Продолжить бронирование";
  timeModalTitle.textContent = isDelivery ? "Когда приехать курьеру?" : "Когда вас ждать?";
  timeModal.querySelector(".modal__step").textContent = isDelivery ? "Время доставки" : "Время бронирования";
  timeBack.textContent = isDelivery ? "Назад к услугам" : "Назад к развлечениям";
  addressFields.hidden = !isDelivery;
  deliveryAddress.required = isDelivery;
  document.querySelectorAll(".services-group[data-mode]").forEach((group) => {
    group.hidden = group.dataset.mode !== mode;
  });
  updateServicesState();
  updateTimeState();
}

function updateTimeState() {
  timeSubmit.disabled = !arrivalTime.value || (currentMode === "delivery" && !deliveryAddress.value.trim());
}

function openServicesModal() {
  servicesModal.classList.add("is-open");
  servicesModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("has-modal");
  servicesModal.querySelector(".services-modal__sheet").scrollTop = 0;
  window.setTimeout(() => servicesClose.focus(), 50);
}

function closeServicesModal() {
  servicesModal.classList.remove("is-open");
  servicesModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("has-modal");
  orderButton.focus();
}

function openTimeModal() {
  timeModal.classList.add("is-open");
  timeModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("has-modal");
  window.setTimeout(() => arrivalTime.focus(), 50);
}

function closeTimeModal() {
  timeModal.classList.remove("is-open");
  timeModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("has-modal");
  orderButton.focus();
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  modalFocusTarget.focus();
}

rescheduleButton.addEventListener("click", openModal);
deliveryMode.addEventListener("click", () => {
  setMode("delivery");
  sendButtonNotification("Выбрана VIP-доставка").catch(() => {});
});
jenkaMode.addEventListener("click", () => {
  setMode("jenka");
  sendButtonNotification("Выбран Jenka Bar").catch(() => {});
});
modalButton.addEventListener("click", () => {
  if (modalStage < 2) {
    modalStage += 1;
    setModalContent(modalStage);
    return;
  }
  closeModal();
});

orderButton.addEventListener("click", openServicesModal);
servicesClose.addEventListener("click", closeServicesModal);
servicesModal.querySelector(".services-modal__backdrop").addEventListener("click", closeServicesModal);
serviceInputs.forEach((input) => input.addEventListener("change", updateServicesState));
entertainmentInputs.forEach((input) => input.addEventListener("change", updateServicesState));
preferences.addEventListener("input", updateServicesState);

servicesForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const inputs = currentMode === "delivery" ? serviceInputs : entertainmentInputs;
  const selectedServices = inputs.filter((input) => input.checked).map((input) => input.value);
  if (!selectedServices.length && !preferences.value.trim()) return;

  pendingServices = selectedServices;
  pendingPreferences = preferences.value.trim();
  closeServicesModal();
  openTimeModal();
});

arrivalTime.addEventListener("input", updateTimeState);
deliveryAddress.addEventListener("input", updateTimeState);

timeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!arrivalTime.value || (!pendingServices.length && !pendingPreferences) || (currentMode === "delivery" && !deliveryAddress.value.trim())) return;

  timeSubmit.disabled = true;
  timeSubmit.textContent = "Подтверждаем…";

  let resultStage = 5;
  try {
    const response = await sendButtonNotification("Подтвердить время", {
      mode: currentMode,
      services: currentMode === "delivery" ? pendingServices : [],
      entertainments: currentMode === "jenka" ? pendingServices : [],
      preferences: pendingPreferences,
      deliveryTime: arrivalTime.value,
      address: currentMode === "delivery" ? deliveryAddress.value.trim() : "",
    });
    if (response.status === 204) resultStage = currentMode === "delivery" ? 3 : 6;
    else if (response.status === 409) resultStage = 4;
  } catch {}

  closeTimeModal();
  servicesForm.reset();
  timeForm.reset();
  pendingServices = [];
  pendingPreferences = "";
  timeSubmit.disabled = true;
  timeSubmit.textContent = "Подтвердить";
  updateServicesState();
  openOrderModal(resultStage);
});

timeBack.addEventListener("click", () => {
  closeTimeModal();
  openServicesModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (servicesModal.classList.contains("is-open")) closeServicesModal();
  else if (timeModal.classList.contains("is-open")) closeTimeModal();
  else if (modal.classList.contains("is-open")) closeModal();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button && button.dataset.notify !== "manual") {
    sendButtonNotification(button.textContent.trim()).catch(() => {});
  }
});

updateTimer();
setMode("delivery");
window.setInterval(updateTimer, 250);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
