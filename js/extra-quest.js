const STEPS = ["logic", "tiles", "odd", "captcha", "spark"];
const LOGIC_QUESTIONS = [
  { question: "На столе лежали четыре яблока. Вы взяли два. Сколько яблок теперь у вас?", options: ["2", "4", "6"], answer: "2" },
  { question: "Что становится больше, если его перевернуть вверх ногами?", options: ["Число 6", "Бокал", "Свеча"], answer: "Число 6" },
  { question: "У двух сестёр по одному брату. Сколько всего детей в семье?", options: ["3", "4", "2"], answer: "3" },
  { question: "Какой месяц короче всех?", options: ["Май", "Февраль", "Март"], answer: "Май" },
];
const ODD_SETS = [
  { prompt: "Что выбивается из настроения?", items: ["Свечи", "Вино", "Компас", "Музыка"], answer: "Компас" },
  { prompt: "Что здесь явно лишнее?", items: ["Роза", "Орхидея", "Тюльпан", "Отвёртка"], answer: "Отвёртка" },
  { prompt: "Найдите чужака среди планов на вечер", items: ["Кино", "Театр", "Ресторан", "Будильник"], answer: "Будильник" },
  { prompt: "Что не относится к музыке?", items: ["Ритм", "Мелодия", "Припев", "Термометр"], answer: "Термометр" },
];

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);
const pick = (items) => items[Math.floor(Math.random() * items.length)];

export function createExtraQuest({ root, onComplete, onFail, onProgress }) {
  let stepIndex = 0;
  let attempts = 3;
  let captcha = "";
  let tiles = [];
  let tileMovesLeft = 10;
  let logic;
  let oddSet;
  let sparkTarget = 6;

  const button = (label) => `<button class="quest-choice" type="button" data-value="${label}">${label}</button>`;
  const attemptsText = () => `<small class="quest-attempts">Осталось попыток: ${attempts}</small>`;

  function renderLogic() {
    root.innerHTML = `<p class="modal__step">Квест · логика</p><h3>Небольшая хитрость</h3><p>${logic.question}</p><div class="quest-choices">${shuffle(logic.options).map(button).join("")}</div><p class="quest-feedback" aria-live="polite"></p>${attemptsText()}`;
  }

  function createTiles() {
    tiles = [1, 2, 3, 4, 5, 0];
    let empty = 5;
    let previous = -1;
    const shuffleMoves = 3 + Math.floor(Math.random() * 4);
    for (let move = 0; move < shuffleMoves; move += 1) {
      const candidates = [empty - 3, empty + 3, empty - 1, empty + 1].filter((index) => index >= 0 && index <= 5 && index !== previous && (Math.abs(index - empty) === 3 || Math.floor(index / 3) === Math.floor(empty / 3)));
      const next = pick(candidates);
      [tiles[empty], tiles[next]] = [tiles[next], tiles[empty]];
      previous = empty;
      empty = next;
    }
    tileMovesLeft = 10;
  }

  function renderTiles() {
    root.innerHTML = `<p class="modal__step">Квест · мини-пятнашки</p><h3>Расставьте по порядку</h3><p>Нажимайте на фигуру рядом с пустой клеткой.</p><div class="mini-tiles" role="group" aria-label="Пятнашки"></div><p class="quest-feedback">Ходов осталось: ${tileMovesLeft}</p>${attemptsText()}`;
    const board = root.querySelector(".mini-tiles");
    tiles.forEach((value, index) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = `mini-tile${value ? "" : " is-empty"}`;
      tile.textContent = value || "";
      tile.disabled = !value;
      tile.addEventListener("click", () => moveTile(index));
      board.append(tile);
    });
  }

  function renderOdd() {
    root.innerHTML = `<p class="modal__step">Квест · найдите лишнее</p><h3>${oddSet.prompt}</h3><div class="quest-choices quest-choices--wide">${shuffle(oddSet.items).map(button).join("")}</div><p class="quest-feedback" aria-live="polite"></p>${attemptsText()}`;
  }

  function renderCaptcha() {
    root.innerHTML = `<p class="modal__step">Квест · почти человек</p><h3>Введите код</h3><div class="captcha-code" aria-label="Код капчи">${[...captcha].map((char, index) => `<span style="--tilt:${index % 2 ? 7 : -6}deg">${char}</span>`).join("")}</div><form class="captcha-form"><input type="text" inputmode="text" maxlength="5" autocomplete="off" aria-label="Введите код с картинки" required /><button class="button button--primary" type="submit">Проверить</button></form><p class="quest-feedback" aria-live="polite"></p>${attemptsText()}`;
  }

  function renderSpark() {
    root.innerHTML = `<p class="modal__step">Квест · финальный разогрев</p><h3>Разожгите искру</h3><p>Нажимайте на сердце, пока оно не вспыхнет.</p><button class="spark-button" type="button" aria-label="Разжечь искру">♡</button>`;
    let hits = 0;
    root.querySelector(".spark-button").addEventListener("click", (event) => {
      hits += 1;
      event.currentTarget.style.setProperty("--heat", hits / sparkTarget);
      event.currentTarget.textContent = hits >= sparkTarget ? "♥" : "♡";
      if (hits >= sparkTarget) window.setTimeout(next, 350);
    });
  }

  function useAttempt(message, rerender) {
    attempts -= 1;
    if (attempts <= 0) return onFail?.();
    rerender();
    root.querySelector(".quest-feedback").textContent = `${message} Осталось попыток: ${attempts}.`;
  }

  function moveTile(index) {
    const empty = tiles.indexOf(0);
    const sameRow = Math.floor(index / 3) === Math.floor(empty / 3);
    if (!((sameRow && Math.abs(index - empty) === 1) || Math.abs(index - empty) === 3)) return;
    [tiles[index], tiles[empty]] = [tiles[empty], tiles[index]];
    tileMovesLeft -= 1;
    if (tiles.join(",") === "1,2,3,4,5,0") return window.setTimeout(next, 250);
    if (tileMovesLeft <= 0) return useAttempt("Ходы закончились.", () => { createTiles(); renderTiles(); });
    renderTiles();
  }

  function prepareStep() {
    attempts = 3;
    const step = STEPS[stepIndex];
    if (step === "logic") logic = pick(LOGIC_QUESTIONS);
    if (step === "tiles") createTiles();
    if (step === "odd") oddSet = pick(ODD_SETS);
    if (step === "captcha") captcha = Math.random().toString(36).slice(2, 7).toUpperCase();
    if (step === "spark") sparkTarget = 5 + Math.floor(Math.random() * 5);
  }

  function next() {
    onProgress?.(STEPS[stepIndex]);
    stepIndex += 1;
    if (stepIndex >= STEPS.length) return onComplete();
    prepareStep();
    render();
  }

  function render() {
    ({ logic: renderLogic, tiles: renderTiles, odd: renderOdd, captcha: renderCaptcha, spark: renderSpark })[STEPS[stepIndex]]();
  }

  root.addEventListener("click", (event) => {
    const choice = event.target.closest(".quest-choice");
    if (!choice) return;
    const answer = STEPS[stepIndex] === "logic" ? logic.answer : oddSet.answer;
    if (choice.dataset.value === answer) next();
    else useAttempt("Неверный ответ.", render);
  });

  root.addEventListener("submit", (event) => {
    if (!event.target.matches(".captcha-form")) return;
    event.preventDefault();
    const value = event.target.querySelector("input").value.trim().toUpperCase();
    if (value === captcha) next();
    else useAttempt("Код не совпал.", renderCaptcha);
  });

  return {
    start() {
      stepIndex = 0;
      prepareStep();
      root.hidden = false;
      render();
    },
    hide() {
      root.hidden = true;
      root.replaceChildren();
    },
  };
}
