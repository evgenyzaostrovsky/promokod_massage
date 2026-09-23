const STEPS = ["logic", "tiles", "odd", "captcha", "spark"];

export function createExtraQuest({ root, onComplete, onProgress }) {
  let stepIndex = 0;
  let captcha = "";
  let tiles = [1, 2, 3, 0, 4, 5];

  function button(label, value) {
    return `<button class="quest-choice" type="button" data-value="${value}">${label}</button>`;
  }

  function renderLogic() {
    root.innerHTML = `<p class="modal__step">Квест · логика</p><h3>Небольшая хитрость</h3><p>На столе лежали четыре яблока. Вы взяли два. Сколько яблок теперь у вас?</p><div class="quest-choices">${button("2", "2")}${button("4", "4")}${button("6", "6")}</div><p class="quest-feedback" aria-live="polite"></p>`;
  }

  function renderTiles() {
    root.innerHTML = `<p class="modal__step">Квест · мини-пятнашки</p><h3>Расставьте по порядку</h3><p>Нажимайте на фигуру рядом с пустой клеткой.</p><div class="mini-tiles" role="group" aria-label="Пятнашки"></div>`;
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
    root.innerHTML = `<p class="modal__step">Квест · найдите лишнее</p><h3>Что выбивается из настроения?</h3><div class="quest-choices quest-choices--wide">${button("Свечи", "candles")}${button("Вино", "wine")}${button("Компас", "compass")}${button("Музыка", "music")}</div><p class="quest-feedback" aria-live="polite"></p>`;
  }

  function renderCaptcha() {
    captcha = Math.random().toString(36).slice(2, 7).toUpperCase();
    root.innerHTML = `<p class="modal__step">Квест · почти человек</p><h3>Введите код</h3><div class="captcha-code" aria-label="Код капчи">${[...captcha].map((char, index) => `<span style="--tilt:${index % 2 ? 7 : -6}deg">${char}</span>`).join("")}</div><form class="captcha-form"><input type="text" inputmode="text" maxlength="5" autocomplete="off" aria-label="Введите код с картинки" required /><button class="button button--primary" type="submit">Проверить</button></form><p class="quest-feedback" aria-live="polite"></p>`;
  }

  function renderSpark() {
    root.innerHTML = `<p class="modal__step">Квест · финальный разогрев</p><h3>Разожгите искру</h3><p>Нажимайте на сердце, пока оно не вспыхнет.</p><button class="spark-button" type="button" aria-label="Разжечь искру">♡</button>`;
    let hits = 0;
    root.querySelector(".spark-button").addEventListener("click", (event) => {
      hits += 1;
      event.currentTarget.style.setProperty("--heat", hits / 6);
      event.currentTarget.textContent = hits >= 6 ? "♥" : "♡";
      if (hits >= 6) window.setTimeout(next, 350);
    });
  }

  function moveTile(index) {
    const empty = tiles.indexOf(0);
    const sameRow = Math.floor(index / 3) === Math.floor(empty / 3);
    if (!((sameRow && Math.abs(index - empty) === 1) || Math.abs(index - empty) === 3)) return;
    [tiles[index], tiles[empty]] = [tiles[empty], tiles[index]];
    if (tiles.join(",") === "1,2,3,4,5,0") return window.setTimeout(next, 250);
    renderTiles();
  }

  function next() {
    onProgress?.(STEPS[stepIndex]);
    stepIndex += 1;
    if (stepIndex >= STEPS.length) return onComplete();
    render();
  }

  function render() {
    const step = STEPS[stepIndex];
    ({ logic: renderLogic, tiles: renderTiles, odd: renderOdd, captcha: renderCaptcha, spark: renderSpark })[step]();
  }

  root.addEventListener("click", (event) => {
    const choice = event.target.closest(".quest-choice");
    if (!choice) return;
    const correct = STEPS[stepIndex] === "logic" ? "2" : "compass";
    if (choice.dataset.value === correct) next();
    else root.querySelector(".quest-feedback").textContent = "Хитро, но нет. Попробуйте ещё раз.";
  });
  root.addEventListener("submit", (event) => {
    if (!event.target.matches(".captcha-form")) return;
    event.preventDefault();
    const value = event.target.querySelector("input").value.trim().toUpperCase();
    if (value === captcha) next();
    else root.querySelector(".quest-feedback").textContent = "Код не совпал. Попробуйте внимательнее.";
  });

  return {
    start() {
      stepIndex = 0;
      tiles = [1, 2, 3, 0, 4, 5];
      root.hidden = false;
      render();
    },
    hide() {
      root.hidden = true;
      root.replaceChildren();
    },
  };
}
