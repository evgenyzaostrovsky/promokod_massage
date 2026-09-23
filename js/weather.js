export function initBookingWeather({ input, card, icon, title, details, getMode }) {
  let requestId = 0;

  async function update() {
    const date = input.value;
    const id = ++requestId;
    if (!date || getMode() !== "jenka") {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    card.classList.add("is-loading");
    icon.textContent = "◌";
    title.textContent = "Проверяем погоду…";
    details.textContent = "Волгоград";
    try {
      const response = await fetch(`/api/weather?date=${encodeURIComponent(date)}`);
      const data = await response.json();
      if (id !== requestId) return;
      if (response.status === 404) {
        icon.textContent = "📅";
        title.textContent = "Прогноз пока недоступен";
        details.textContent = "Он появится ближе к выбранной дате.";
        return;
      }
      if (!response.ok) throw new Error("Weather unavailable");
      icon.textContent = data.icon;
      title.textContent = `${data.description} · ${data.minTemperature}…${data.maxTemperature} °C`;
      details.textContent = `Вероятность осадков до ${data.precipitationProbability}% · Волгоград`;
    } catch {
      if (id !== requestId) return;
      icon.textContent = "—";
      title.textContent = "Не удалось загрузить прогноз";
      details.textContent = "Выбрать дату всё равно можно.";
    } finally {
      if (id === requestId) card.classList.remove("is-loading");
    }
  }

  function reset() {
    requestId += 1;
    card.hidden = true;
  }

  return { update, reset };
}
