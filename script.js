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

const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;
let modalStage = 0;
let modalFocusTarget = rescheduleButton;

function getMillisecondsUntilMoscowMidnight() {
  const now = Date.now();
  const moscowNow = new Date(now + MOSCOW_OFFSET_MS);
  const nextMidnightAsUtc = Date.UTC(
    moscowNow.getUTCFullYear(),
    moscowNow.getUTCMonth(),
    moscowNow.getUTCDate() + 1
  );

  return Math.max(0, nextMidnightAsUtc - (now + MOSCOW_OFFSET_MS));
}

function updateTimer() {
  const remaining = getMillisecondsUntilMoscowMidnight();
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

orderButton.addEventListener("click", openOrderModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
});

updateTimer();
window.setInterval(updateTimer, 250);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
