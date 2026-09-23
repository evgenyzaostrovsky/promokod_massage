export function initAmbientAudio(button) {
  let context;
  let master;
  let timer;
  let playing = false;
  let step = 0;

  function tone(frequency, start, duration, volume, type = "sine") {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  function scheduleBeat() {
    if (!playing || context.state !== "running") return;
    const now = context.currentTime + 0.04;
    const bass = [73.42, 87.31, 65.41, 82.41][Math.floor(step / 4) % 4];
    tone(bass, now, 0.42, 0.055, "sine");
    if (step % 2 === 0) tone(220, now + 0.02, 0.08, 0.012, "triangle");
    if (step % 4 === 3) tone(bass * 2, now + 0.12, 0.28, 0.018, "sine");
    step = (step + 1) % 16;
  }

  async function start() {
    if (!context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.65;
      master.connect(context.destination);
    }
    await context.resume();
    if (playing) return;
    playing = true;
    button.classList.add("is-playing");
    button.setAttribute("aria-pressed", "true");
    button.setAttribute("aria-label", "Выключить музыку");
    scheduleBeat();
    timer = window.setInterval(scheduleBeat, 360);
  }

  function stop() {
    playing = false;
    window.clearInterval(timer);
    button.classList.remove("is-playing");
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", "Включить музыку");
  }

  button.addEventListener("click", () => playing ? stop() : start().catch(() => {}));
  start().catch(() => {});
  const unlock = (event) => {
    if (button.contains(event.target)) return;
    if (!playing) start().catch(() => {});
  };
  document.addEventListener("pointerdown", unlock, { once: true });
}
