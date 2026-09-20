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

const PROMO_END_TIMESTAMP = Date.UTC(2026, 8, 21, 21, 0, 0);
let modalStage = 0;
let modalFocusTarget = rescheduleButton;

function sendButtonNotification(action, services = []) {
  fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, services }),
    keepalive: true,
  }).catch(() => {});
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
      text: "Нажимая кнопку, вы соглашаетесь на эротическую фотосессию в ванной для курьера.",
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
      title: "Заявка принята",
      text: "С вами свяжется курьер для оформления доп. услуг.",
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

function openOrderModal() {
  modalStage = 3;
  modalFocusTarget = orderButton;
  setModalContent(modalStage);
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => modalButton.focus(), 50);
}

function updateServicesState() {
  const selectedCount = serviceInputs.filter((input) => input.checked).length;
  servicesSubmit.disabled = selectedCount === 0;
  servicesHint.textContent = selectedCount
    ? `Выбрано услуг: ${selectedCount}`
    : "Выберите хотя бы одну услугу";
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

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  modalFocusTarget.focus();
}

rescheduleButton.addEventListener("click", openModal);
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

servicesForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const selectedServices = serviceInputs.filter((input) => input.checked).map((input) => input.value);
  if (!selectedServices.length) return;

  sendButtonNotification("Оформить выбранное", selectedServices);
  closeServicesModal();
  servicesForm.reset();
  updateServicesState();
  openOrderModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (servicesModal.classList.contains("is-open")) closeServicesModal();
  else if (modal.classList.contains("is-open")) closeModal();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button && button.dataset.notify !== "manual") sendButtonNotification(button.textContent.trim());
});

updateTimer();
window.setInterval(updateTimer, 250);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
