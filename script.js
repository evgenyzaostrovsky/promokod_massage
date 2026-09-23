import { initAmbientAudio } from "./js/audio.js";
import { initBookingWeather } from "./js/weather.js";
import { createExtraQuest } from "./js/extra-quest.js";
import { initAccount } from "./js/account.js";

const hoursNode = document.querySelector("#hours");
const minutesNode = document.querySelector("#minutes");
const secondsNode = document.querySelector("#seconds");
const promoDateNode = document.querySelector("#promoDate");
const modal = document.querySelector("#modal");
const modalStep = document.querySelector("#modalStep");
const modalTitle = document.querySelector("#modalTitle");
const modalText = document.querySelector("#modalText");
const modalButton = document.querySelector("#modalButton");
const questGame = document.querySelector("#questGame");
const questTarget = document.querySelector("#questTarget");
const questMath = document.querySelector("#questMath");
const questAnswer = document.querySelector("#questAnswer");
const mathFeedback = document.querySelector("#mathFeedback");
const mathAttempts = document.querySelector("#mathAttempts");
const questExtras = document.querySelector("#questExtras");
const questPhoto = document.querySelector("#questPhoto");
const questPhotoFile = document.querySelector("#questPhotoFile");
const questPhotoPreview = document.querySelector("#questPhotoPreview");
const questPhotoLabel = document.querySelector("#questPhotoLabel");
const questPhotoMeta = document.querySelector("#questPhotoMeta");
const questPhotoError = document.querySelector("#questPhotoError");
const questPhotoSubmit = document.querySelector("#questPhotoSubmit");
const rescheduleButton = document.querySelector("#rescheduleButton");
const orderButton = document.querySelector("#orderButton");
const courierModal = document.querySelector("#courierModal");
const courierSelect = document.querySelector("#courierSelect");
const courierBack = document.querySelector("#courierBack");
const servicesModal = document.querySelector("#servicesModal");
const servicesClose = document.querySelector("#servicesClose");
const servicesForm = document.querySelector("#servicesForm");
const servicesSubmit = document.querySelector("#servicesSubmit");
const servicesHint = document.querySelector("#servicesHint");
const serviceInputs = [...document.querySelectorAll('input[name="service"]')];
const entertainmentInputs = [...document.querySelectorAll('input[name="entertainment"]')];
const dateInputs = [...document.querySelectorAll('.date-group input[type="radio"]')];
const preferences = document.querySelector("#preferences");
const preferencesLabel = document.querySelector("#preferencesLabel");
const deliveryMode = document.querySelector("#deliveryMode");
const jenkaMode = document.querySelector("#jenkaMode");
const dateMode = document.querySelector("#dateMode");
const mainPage = document.querySelector(".page");
const servicesTitle = document.querySelector("#servicesTitle");
const addressFields = document.querySelector("#addressFields");
const deliveryAddress = document.querySelector("#deliveryAddress");
const timeModalTitle = document.querySelector("#timeModalTitle");
const timeModal = document.querySelector("#timeModal");
const timeForm = document.querySelector("#timeForm");
const arrivalTime = document.querySelector("#arrivalTime");
const bookingDate = document.querySelector("#bookingDate");
const dateTime = document.querySelector("#dateTime");
const weatherCard = document.querySelector("#weatherCard");
const weatherIcon = document.querySelector("#weatherIcon");
const weatherTitle = document.querySelector("#weatherTitle");
const weatherDetails = document.querySelector("#weatherDetails");
const timeSubmit = document.querySelector("#timeSubmit");
const timeBack = document.querySelector("#timeBack");
const soundToggle = document.querySelector("#soundToggle");
const account = initAccount();

const moscowClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Moscow",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
let modalStage = 0;
let modalFocusTarget = rescheduleButton;
let pendingServices = [];
let currentMode = "delivery";
let pendingPreferences = "";
let pendingDateDetails = {};
let questActive = false;
let questStep = 0;
let gameHits = 0;
let photoPreviewUrl = "";
let mathChallenge;
let mathAttemptsLeft = 3;
const MATH_CHALLENGES = [
  { text: "Сколько будет 6 + 6 / 3 × 2?", answer: 10 },
  { text: "Сколько будет 18 / 3 + 4 × 2?", answer: 14 },
  { text: "Сколько будет 7 × 3 − 8?", answer: 13 },
  { text: "Сколько будет (12 + 8) / 4?", answer: 5 },
  { text: "Сколько будет 5² − 9?", answer: 16 },
  { text: "Сколько будет 36 / 6 + 7?", answer: 13 },
];
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
  const parts = Object.fromEntries(moscowClock.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  const elapsedSeconds = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  const totalSeconds = 86400 - elapsedSeconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  hoursNode.textContent = String(hours).padStart(2, "0");
  minutesNode.textContent = String(minutes).padStart(2, "0");
  secondsNode.textContent = String(seconds).padStart(2, "0");
  promoDateNode.textContent = `${parts.day}.${parts.month}`;
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
    {
      step: "Свидание",
      title: "Свидание запланировано",
      text: "Жека свяжется с вами, чтобы подтвердить детали.",
      button: "Прекрасно",
    },
  ][stage];

  modalStep.textContent = content.step;
  modalTitle.textContent = content.title;
  modalText.textContent = content.text;
  modalButton.textContent = content.button;
}

function openModal() {
  extraQuest.hide();
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
  extraQuest.hide();
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
  extraQuest.hide();
  questGame.hidden = true;
  questPhoto.hidden = true;
  questPhoto.reset();
  if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
  photoPreviewUrl = "";
  questPhotoPreview.removeAttribute("src");
  questPhotoPreview.hidden = true;
  questMath.hidden = false;
  questMath.reset();
  mathChallenge = MATH_CHALLENGES[Math.floor(Math.random() * MATH_CHALLENGES.length)];
  mathAttemptsLeft = 3;
  mathFeedback.textContent = "";
  mathAttempts.textContent = "Осталось попыток: 3";
  modalButton.hidden = true;
  modalStep.textContent = "Квест переноса · шаг 3";
  modalTitle.textContent = "Математическая пауза";
  modalText.textContent = `${mathChallenge.text} У вас три попытки.`;
  questAnswer.focus();
}

function showPhotoStep() {
  extraQuest.hide();
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
  extraQuest.hide();
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
  extraQuest.hide();
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
  if (currentMode === "date") {
    const requiredGroups = [...document.querySelectorAll('.date-group[data-required-group]')];
    const selectedCount = requiredGroups.filter((group) => group.querySelector("input:checked")).length;
    servicesSubmit.disabled = selectedCount !== requiredGroups.length;
    servicesHint.textContent = `Заполнено: ${selectedCount} из ${requiredGroups.length}`;
    return;
  }
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
  const isJenka = mode === "jenka";
  const isDate = mode === "date";
  deliveryMode.classList.toggle("is-active", isDelivery);
  jenkaMode.classList.toggle("is-active", isJenka);
  dateMode.classList.toggle("is-active", isDate);
  deliveryMode.setAttribute("aria-pressed", String(isDelivery));
  jenkaMode.setAttribute("aria-pressed", String(isJenka));
  dateMode.setAttribute("aria-pressed", String(isDate));
  orderButton.textContent = isDelivery ? "Оформить VIP-доставку" : isJenka ? "Забронировать Jenka Bar" : "Заказать свидание";
  rescheduleButton.hidden = !isDelivery;
  servicesTitle.textContent = isDelivery ? "Выберите удовольствие" : isJenka ? "Выберите развлечения" : "Соберите идеальное свидание";
  servicesModal.querySelector(".modal__step").textContent = isDelivery ? "Дополнительные услуги" : isJenka ? "Jenka Bar" : "Параметры свидания";
  servicesSubmit.textContent = isDelivery ? "Оформить выбранное" : isJenka ? "Продолжить бронирование" : "Выбрать дату и время";
  timeModalTitle.textContent = isDelivery ? "Когда приехать курьеру?" : isJenka ? "Когда вас ждать?" : "Когда устроим свидание?";
  timeModal.querySelector(".modal__step").textContent = isDelivery ? "Время доставки" : isJenka ? "Дата бронирования" : "Дата и время свидания";
  timeBack.textContent = isDelivery ? "Назад к услугам" : isJenka ? "Назад к развлечениям" : "Назад к параметрам";
  document.querySelector("#arrivalTimeField").hidden = !isDelivery;
  document.querySelector("#bookingDateField").hidden = isDelivery;
  document.querySelector("#dateTimeField").hidden = !isDate;
  arrivalTime.required = isDelivery;
  bookingDate.required = !isDelivery;
  dateTime.required = isDate;
  addressFields.hidden = !isDelivery;
  deliveryAddress.required = isDelivery;
  weatherCard.hidden = !isJenka || !bookingDate.value;
  preferencesLabel.firstChild.textContent = isDate ? "Дополнительные пожелания\n            " : "Или введите свои предпочтения\n            ";
  document.querySelectorAll(".services-group[data-mode]").forEach((group) => {
    group.hidden = group.dataset.mode !== mode;
  });
  updateServicesState();
  updateTimeState();
}

function updateTimeState() {
  timeSubmit.disabled = currentMode === "delivery"
    ? !arrivalTime.value || !deliveryAddress.value.trim()
    : currentMode === "date" ? !bookingDate.value || !dateTime.value : !bookingDate.value;
}

const bookingWeather = initBookingWeather({
  input: bookingDate,
  card: weatherCard,
  icon: weatherIcon,
  title: weatherTitle,
  details: weatherDetails,
  getMode: () => currentMode,
});

const extraQuest = createExtraQuest({
  root: questExtras,
  onProgress: (step) => sendButtonNotification("Дополнительный квест", { questGame: step }).catch(() => {}),
  onComplete: () => {
    extraQuest.hide();
    showQuestQuestion();
  },
  onFail: () => {
    sendButtonNotification("Дополнительный квест: попытки закончились").catch(() => {});
    showTransferImpossible();
  },
});

initAmbientAudio(soundToggle);

function openServicesModal() {
  servicesModal.classList.add("is-open");
  servicesModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("has-modal");
  servicesModal.querySelector(".services-modal__sheet").scrollTop = 0;
  window.setTimeout(() => servicesClose.focus(), 50);
}

function openCourierModal() {
  courierModal.classList.add("is-open");
  courierModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("has-modal");
  window.setTimeout(() => courierSelect.focus(), 50);
}

function closeCourierModal() {
  courierModal.classList.remove("is-open");
  courierModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("has-modal");
  orderButton.focus();
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
  extraQuest.hide();
  questActive = false;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  modalFocusTarget.focus();
}

rescheduleButton.addEventListener("click", openModal);
function selectMode(mode) {
  if (mode === currentMode) return;
  setMode(mode);
  const action = mode === "delivery" ? "Выбрана VIP-доставка" : mode === "jenka" ? "Выбран Jenka Bar" : "Выбрано свидание";
  sendButtonNotification(action).catch(() => {});
}

deliveryMode.addEventListener("click", () => selectMode("delivery"));
jenkaMode.addEventListener("click", () => selectMode("jenka"));
dateMode.addEventListener("click", () => selectMode("date"));

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
  const modes = ["delivery", "jenka", "date"];
  const currentIndex = modes.indexOf(currentMode);
  const nextIndex = distanceX < 0 ? Math.min(currentIndex + 1, modes.length - 1) : Math.max(currentIndex - 1, 0);
  selectMode(modes[nextIndex]);
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
  const isCorrect = Number(questAnswer.value) === mathChallenge.answer;
  sendButtonNotification(isCorrect ? "Математика: верно" : "Математика: неверно").catch(() => {});
  if (isCorrect) {
    questMath.hidden = true;
    modalStep.textContent = "Квест · серия испытаний";
    modalTitle.textContent = "Проверим вашу решимость";
    modalText.textContent = "Ещё несколько лёгких заданий — и вы почти у цели.";
    extraQuest.start();
  }
  else {
    mathAttemptsLeft -= 1;
    if (mathAttemptsLeft <= 0) return showTransferImpossible();
    mathFeedback.textContent = `Неверно. Попробуйте ещё раз.`;
    mathAttempts.textContent = `Осталось попыток: ${mathAttemptsLeft}`;
    questMath.reset();
    questAnswer.focus();
  }
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

orderButton.addEventListener("click", async () => {
  if (!await account.ensureAuthenticated()) return;
  if (currentMode === "delivery") openCourierModal();
  else openServicesModal();
});
courierSelect.addEventListener("click", () => {
  sendButtonNotification("Выбран курьер Жека").catch(() => {});
  closeCourierModal();
  openServicesModal();
});
courierBack.addEventListener("click", closeCourierModal);
courierModal.querySelector(".modal__backdrop").addEventListener("click", closeCourierModal);
servicesClose.addEventListener("click", closeServicesModal);
servicesModal.querySelector(".services-modal__backdrop").addEventListener("click", closeServicesModal);
serviceInputs.forEach((input) => input.addEventListener("change", updateServicesState));
entertainmentInputs.forEach((input) => input.addEventListener("change", updateServicesState));
dateInputs.forEach((input) => input.addEventListener("change", updateServicesState));
preferences.addEventListener("input", updateServicesState);

servicesForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (currentMode === "date") {
    const requiredGroups = [...document.querySelectorAll('.date-group[data-required-group]')];
    if (requiredGroups.some((group) => !group.querySelector("input:checked"))) return;
    pendingDateDetails = Object.fromEntries(requiredGroups.map((group) => [group.dataset.requiredGroup, group.querySelector("input:checked").value]));
    pendingServices = ["Свидание"];
    pendingPreferences = preferences.value.trim();
    closeServicesModal();
    openTimeModal();
    return;
  }
  const inputs = currentMode === "delivery" ? serviceInputs : entertainmentInputs;
  const selectedServices = inputs.filter((input) => input.checked).map((input) => input.value);
  if (!selectedServices.length && !preferences.value.trim()) return;

  pendingServices = selectedServices;
  pendingPreferences = preferences.value.trim();
  closeServicesModal();
  openTimeModal();
});

arrivalTime.addEventListener("input", updateTimeState);
dateTime.addEventListener("input", updateTimeState);
bookingDate.addEventListener("input", () => {
  updateTimeState();
  bookingWeather.update();
});
deliveryAddress.addEventListener("input", updateTimeState);

timeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if ((!pendingServices.length && !pendingPreferences) || timeSubmit.disabled) return;

  timeSubmit.disabled = true;
  timeSubmit.textContent = "Подтверждаем…";

  let resultStage = 4;
  try {
    const action = currentMode === "delivery" ? "Подтвердить время" : currentMode === "jenka" ? "Подтвердить бронирование" : "Подтвердить свидание";
    const response = await sendButtonNotification(action, {
      mode: currentMode,
      services: currentMode === "delivery" ? pendingServices : [],
      entertainments: currentMode === "jenka" ? pendingServices : [],
      preferences: pendingPreferences,
      deliveryTime: currentMode === "delivery" ? arrivalTime.value : "",
      bookingDate: currentMode !== "delivery" ? bookingDate.value : "",
      dateTime: currentMode === "date" ? dateTime.value : "",
      dateDetails: currentMode === "date" ? pendingDateDetails : {},
      address: currentMode === "delivery" ? deliveryAddress.value.trim() : "",
    });
    if (response.status === 204) {
      resultStage = currentMode === "delivery" ? 3 : currentMode === "jenka" ? 5 : 6;
      account.recordOrder({
        mode: currentMode,
        items: currentMode === "date" ? Object.values(pendingDateDetails) : [...pendingServices],
        preferences: pendingPreferences,
        time: currentMode === "delivery" ? arrivalTime.value : currentMode === "date" ? dateTime.value : "",
        date: currentMode === "delivery" ? "" : bookingDate.value,
        address: currentMode === "delivery" ? deliveryAddress.value.trim() : "",
      });
    }
  } catch {}

  closeTimeModal();
  servicesForm.reset();
  timeForm.reset();
  bookingWeather.reset();
  pendingServices = [];
  pendingPreferences = "";
  pendingDateDetails = {};
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
  else if (courierModal.classList.contains("is-open")) closeCourierModal();
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
