const hoursNode = document.querySelector("#hours");
const minutesNode = document.querySelector("#minutes");
const secondsNode = document.querySelector("#seconds");
const modal = document.querySelector("#modal");
const modalStep = document.querySelector("#modalStep");
const modalTitle = document.querySelector("#modalTitle");
const modalText = document.querySelector("#modalText");
const modalButton = document.querySelector("#modalButton");
const questGame = document.querySelector("#questGame");
const questTarget = document.querySelector("#questTarget");
const questMath = document.querySelector("#questMath");
const questAnswer = document.querySelector("#questAnswer");
const questPhoto = document.querySelector("#questPhoto");
const questPhotoFile = document.querySelector("#questPhotoFile");
const questPhotoPreview = document.querySelector("#questPhotoPreview");
const questPhotoLabel = document.querySelector("#questPhotoLabel");
const questPhotoMeta = document.querySelector("#questPhotoMeta");
const questPhotoError = document.querySelector("#questPhotoError");
const questPhotoSubmit = document.querySelector("#questPhotoSubmit");
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
const mainPage = document.querySelector(".page");
const servicesTitle = document.querySelector("#servicesTitle");
const addressFields = document.querySelector("#addressFields");
const deliveryAddress = document.querySelector("#deliveryAddress");
const timeModalTitle = document.querySelector("#timeModalTitle");
const timeModal = document.querySelector("#timeModal");
const timeForm = document.querySelector("#timeForm");
const arrivalTime = document.querySelector("#arrivalTime");
const bookingDate = document.querySelector("#bookingDate");
const timeSubmit = document.querySelector("#timeSubmit");
const timeBack = document.querySelector("#timeBack");

const PROMO_END_TIMESTAMP = Date.UTC(2026, 8, 22, 21, 0, 0);
let modalStage = 0;
let modalFocusTarget = rescheduleButton;
let pendingServices = [];
let currentMode = "delivery";
let pendingPreferences = "";
let questActive = false;
let questStep = 0;
let gameHits = 0;
let photoPreviewUrl = "";
const QUEST_QUESTIONS = [
  "Вы точно хотите перенести VIP-доставку?",
  "Даже если курьер уже морально собрался в путь?",
  "Вы готовы объяснить ему, почему планы внезапно изменились?",
  "А если он уже выбрал лучший маршрут к вам?",
  "Вы помните, что перенос — это очень серьёзное решение?",
  "Уточним: эротическая фотосессия в спальне обсуждается только по отдельному взаимному согласию. Продолжим квест?",
  "Вы всё ещё надеетесь перенести доставку?",
  "Перенос без эротической фотосессии? Курьер удивится. Но согласие всё равно только добровольное. Идём дальше?",
  "Может, всё-таки просто дождаться курьера?",
  "Последний вопрос: вы действительно прошли всё это ради переноса?",
];

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
  questActive = true;
  questStep = 0;
  gameHits = 0;
  modalFocusTarget = rescheduleButton;
  modalStep.textContent = "Квест переноса · мини-игра";
  modalTitle.textContent = "Поймайте перенос";
  modalText.textContent = "Для начала поймайте убегающую кнопку.";
  questTarget.style.left = "50%";
  questTarget.style.top = "50%";
  questGame.hidden = false;
  questMath.hidden = true;
  questPhoto.hidden = true;
  questMath.reset();
  questPhoto.reset();
  if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
  photoPreviewUrl = "";
  questPhotoPreview.removeAttribute("src");
  questPhotoPreview.hidden = true;
  questPhotoLabel.textContent = "Выбрать фото";
  questPhotoMeta.textContent = "Нажмите, чтобы открыть галерею";
  modalButton.hidden = true;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => questTarget.focus(), 50);
}

function showQuestQuestion() {
  questGame.hidden = true;
  questMath.hidden = true;
  questPhoto.hidden = true;
  modalButton.hidden = false;
  modalStep.textContent = `Квест переноса · вопрос ${questStep + 1} из ${QUEST_QUESTIONS.length}`;
  modalTitle.textContent = questStep === QUEST_QUESTIONS.length - 1 ? "Финальная проверка" : "Вы уверены?";
  modalText.textContent = QUEST_QUESTIONS[questStep];
  modalButton.textContent = questStep === QUEST_QUESTIONS.length - 1 ? "Узнать результат" : "Да, продолжить";
  modalButton.focus();
}

function showMathGame() {
  questGame.hidden = true;
  questMath.hidden = false;
  modalButton.hidden = true;
  modalStep.textContent = "Квест переноса · шаг 3";
  modalTitle.textContent = "Математическая пауза";
  modalText.textContent = "Сколько будет 6 + 6 / 3 × 2? На ответ — одна попытка.";
  questAnswer.focus();
}

function showPhotoStep() {
  questGame.hidden = true;
  questMath.hidden = true;
  questPhoto.hidden = false;
  modalButton.hidden = true;
  questPhotoError.hidden = true;
  modalStep.textContent = "Квест переноса · шаг 2";
  modalTitle.textContent = "Ваше самое сексуальное фото";
  modalText.textContent = "Чтобы продолжить квест, загрузите фото. Оно будет отправлено курьеру в Telegram. Перенос доставки в конце квеста всё равно невозможен. Просто порадуйте курьера.";
  questPhotoFile.focus();
}

questPhotoFile.addEventListener("change", () => {
  if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
  photoPreviewUrl = "";
  const file = questPhotoFile.files?.[0];
  questPhotoPreview.hidden = true;
  questPhotoLabel.textContent = file ? "Фото выбрано" : "Выбрать фото";
  questPhotoMeta.textContent = file ? file.name : "Нажмите, чтобы открыть галерею";
  questPhotoError.hidden = true;
  if (file && file.type !== "image/heic" && file.type !== "image/heif") {
    photoPreviewUrl = URL.createObjectURL(file);
    questPhotoPreview.src = photoPreviewUrl;
    questPhotoPreview.hidden = false;
  }
});
questPhotoPreview.addEventListener("error", () => { questPhotoPreview.hidden = true; });

function showTransferImpossible() {
  questActive = false;
  questGame.hidden = true;
  questMath.hidden = true;
  questPhoto.hidden = true;
  modalButton.hidden = false;
  modalStage = 2;
  setModalContent(2);
  modalButton.focus();
}

function openOrderModal(stage = 3) {
  questActive = false;
  questGame.hidden = true;
  questMath.hidden = true;
  questPhoto.hidden = true;
  modalButton.hidden = false;
  modalStage = stage;
  modalFocusTarget = orderButton;
  setModalContent(modalStage);
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
  timeModal.querySelector(".modal__step").textContent = isDelivery ? "Время доставки" : "Дата бронирования";
  timeBack.textContent = isDelivery ? "Назад к услугам" : "Назад к развлечениям";
  document.querySelector("#arrivalTimeField").hidden = !isDelivery;
  document.querySelector("#bookingDateField").hidden = isDelivery;
  arrivalTime.required = isDelivery;
  bookingDate.required = !isDelivery;
  addressFields.hidden = !isDelivery;
  deliveryAddress.required = isDelivery;
  document.querySelectorAll(".services-group[data-mode]").forEach((group) => {
    group.hidden = group.dataset.mode !== mode;
  });
  updateServicesState();
  updateTimeState();
}

function updateTimeState() {
  timeSubmit.disabled = currentMode === "delivery"
    ? !arrivalTime.value || !deliveryAddress.value.trim()
    : !bookingDate.value;
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
  window.setTimeout(() => (currentMode === "delivery" ? arrivalTime : bookingDate).focus(), 50);
}

function closeTimeModal() {
  timeModal.classList.remove("is-open");
  timeModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("has-modal");
  orderButton.focus();
}

function closeModal() {
  questActive = false;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  modalFocusTarget.focus();
}

rescheduleButton.addEventListener("click", openModal);
function selectMode(mode) {
  if (mode === currentMode) return;
  setMode(mode);
  sendButtonNotification(mode === "delivery" ? "Выбрана VIP-доставка" : "Выбран Jenka Bar").catch(() => {});
}

deliveryMode.addEventListener("click", () => selectMode("delivery"));
jenkaMode.addEventListener("click", () => selectMode("jenka"));

let swipeStart = null;
mainPage.addEventListener("touchstart", (event) => {
  if (event.touches.length !== 1) return;
  swipeStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
}, { passive: true });
mainPage.addEventListener("touchend", (event) => {
  if (!swipeStart || event.changedTouches.length !== 1) return;
  const distanceX = event.changedTouches[0].clientX - swipeStart.x;
  const distanceY = event.changedTouches[0].clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(distanceX) < 60 || Math.abs(distanceX) < Math.abs(distanceY) * 1.4) return;
  selectMode(distanceX < 0 ? "jenka" : "delivery");
}, { passive: true });
mainPage.addEventListener("touchcancel", () => { swipeStart = null; }, { passive: true });
modalButton.addEventListener("click", () => {
  if (questActive) {
    sendButtonNotification("Квест переноса", { questStep: questStep + 1 }).catch(() => {});
    questStep += 1;
    if (questStep < QUEST_QUESTIONS.length) {
      showQuestQuestion();
    } else {
      showTransferImpossible();
    }
    return;
  }
  sendButtonNotification("Хорошо").catch(() => {});
  closeModal();
});

questTarget.addEventListener("click", () => {
  gameHits += 1;
  if (gameHits === 5) {
    sendButtonNotification("Мини-игра пройдена").catch(() => {});
    showPhotoStep();
    return;
  }
  const positions = [[18, 25], [76, 72], [32, 78], [83, 27]];
  const [x, y] = positions[gameHits - 1];
  questTarget.style.left = `${x}%`;
  questTarget.style.top = `${y}%`;
});

questMath.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!questActive) return;
  const isCorrect = questAnswer.value.trim() === "10";
  sendButtonNotification(isCorrect ? "Математика: верно" : "Математика: неверно").catch(() => {});
  if (isCorrect) showQuestQuestion();
  else showTransferImpossible();
});

questPhoto.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = questPhotoFile.files?.[0];
  if (!file) {
    questPhotoError.textContent = "Сначала выберите фото.";
    questPhotoError.hidden = false;
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    questPhotoError.textContent = "Фото слишком большое. Максимум 3 МБ.";
    questPhotoError.hidden = false;
    return;
  }
  questPhotoSubmit.disabled = true;
  questPhotoSubmit.textContent = "Отправляем…";
  questPhotoError.hidden = true;
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const response = await fetch("/api/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, mimeType: file.type, data: String(dataUrl).split(",")[1] }),
    });
    if (!response.ok) throw new Error("Photo upload failed");
    if (questActive && modal.classList.contains("is-open")) showMathGame();
  } catch {
    questPhotoError.textContent = "Фото не отправилось. Попробуйте ещё раз.";
    questPhotoError.hidden = false;
  } finally {
    questPhotoSubmit.disabled = false;
    questPhotoSubmit.textContent = "Отправить фото";
  }
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
bookingDate.addEventListener("input", updateTimeState);
deliveryAddress.addEventListener("input", updateTimeState);

timeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if ((!pendingServices.length && !pendingPreferences) || timeSubmit.disabled) return;

  timeSubmit.disabled = true;
  timeSubmit.textContent = "Подтверждаем…";

  let resultStage = 4;
  try {
    const response = await sendButtonNotification(currentMode === "delivery" ? "Подтвердить время" : "Подтвердить бронирование", {
      mode: currentMode,
      services: currentMode === "delivery" ? pendingServices : [],
      entertainments: currentMode === "jenka" ? pendingServices : [],
      preferences: pendingPreferences,
      deliveryTime: currentMode === "delivery" ? arrivalTime.value : "",
      bookingDate: currentMode === "jenka" ? bookingDate.value : "",
      address: currentMode === "delivery" ? deliveryAddress.value.trim() : "",
    });
    if (response.status === 204) resultStage = currentMode === "delivery" ? 3 : 5;
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
bookingDate.min = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
setMode("delivery");
window.setInterval(updateTimer, 250);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}
