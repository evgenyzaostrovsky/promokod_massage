const BPM = 72;
const BEAT = 60 / BPM;
const CHORDS = [
  [220, 261.63, 329.63, 493.88],
  [174.61, 220, 261.63, 329.63],
  [261.63, 329.63, 392, 493.88],
  [196, 246.94, 293.66, 392],
];

export function initAmbientAudio(button) {
  let context;
  let master;
  let dry;
  let reverb;
  let noiseBuffer;
  let scheduler;
  let playing = false;
  let beatIndex = 0;
  let nextBeatTime = 0;

  function createAudioGraph() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = 0.72;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 20;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.02;
    compressor.release.value = 0.35;
    dry = context.createGain();
    dry.gain.value = 0.82;
    reverb = context.createConvolver();
    const impulse = context.createBuffer(2, context.sampleRate * 2.2, context.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2.8);
    }
    reverb.buffer = impulse;
    const wet = context.createGain();
    wet.gain.value = 0.22;
    dry.connect(compressor);
    reverb.connect(wet).connect(compressor);
    compressor.connect(master).connect(context.destination);
    noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const noise = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noise.length; i += 1) noise[i] = Math.random() * 2 - 1;
    return true;
  }

  function connectWithSpace(node, amount = 0.2) {
    node.connect(dry);
    const send = context.createGain();
    send.gain.value = amount;
    node.connect(send).connect(reverb);
  }

  function pad(frequencies, start) {
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      oscillator.type = index % 2 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index % 2 ? 3 : -3;
      filter.type = "lowpass";
      filter.frequency.value = 850;
      filter.Q.value = 0.5;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.025, start + 0.7);
      gain.gain.setValueAtTime(0.025, start + BEAT * 3);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + BEAT * 4.2);
      oscillator.connect(filter).connect(gain);
      connectWithSpace(gain, 0.5);
      oscillator.start(start);
      oscillator.stop(start + BEAT * 4.3);
    });
  }

  function bass(frequency, start) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.985, start + 0.45);
    filter.type = "lowpass";
    filter.frequency.value = 240;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.62);
    oscillator.connect(filter).connect(gain).connect(dry);
    oscillator.start(start);
    oscillator.stop(start + 0.65);
  }

  function kick(start) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(105, start);
    oscillator.frequency.exponentialRampToValueAtTime(48, start + 0.14);
    gain.gain.setValueAtTime(0.18, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
    oscillator.connect(gain).connect(dry);
    oscillator.start(start);
    oscillator.stop(start + 0.3);
  }

  function shaker(start) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = 5200;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.018, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
    source.connect(filter).connect(gain).connect(dry);
    source.start(start);
    source.stop(start + 0.1);
  }

  function pluck(frequency, start) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.035, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.72);
    oscillator.connect(gain);
    connectWithSpace(gain, 0.75);
    oscillator.start(start);
    oscillator.stop(start + 0.75);
  }

  function scheduleBeat(index, start) {
    const chordIndex = Math.floor(index / 4) % CHORDS.length;
    const chord = CHORDS[chordIndex];
    if (index % 4 === 0) pad(chord, start);
    bass(chord[0] / 2, start);
    if (index % 2 === 0) kick(start);
    shaker(start + BEAT / 2);
    if (index % 4 === 2) pluck(chord[2] * 2, start + BEAT * 0.25);
  }

  function scheduleAhead() {
    if (!playing || context.state !== "running") return;
    while (nextBeatTime < context.currentTime + 0.3) {
      scheduleBeat(beatIndex, nextBeatTime);
      beatIndex = (beatIndex + 1) % 16;
      nextBeatTime += BEAT;
    }
  }

  async function start() {
    if (!context && !createAudioGraph()) return;
    await context.resume();
    if (playing) return;
    playing = true;
    beatIndex = 0;
    nextBeatTime = context.currentTime + 0.06;
    button.classList.add("is-playing");
    button.setAttribute("aria-pressed", "true");
    button.setAttribute("aria-label", "Выключить музыку");
    scheduleAhead();
    scheduler = window.setInterval(scheduleAhead, 80);
  }

  function stop() {
    playing = false;
    window.clearInterval(scheduler);
    button.classList.remove("is-playing");
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", "Включить музыку");
  }

  button.addEventListener("click", () => playing ? stop() : start().catch(() => {}));
  start().catch(() => {});
  document.addEventListener("pointerdown", (event) => {
    if (!button.contains(event.target) && !playing) start().catch(() => {});
  }, { once: true });
}
