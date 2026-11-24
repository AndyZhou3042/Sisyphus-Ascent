"use strict";

const gameAudio = (() => {
  const beat = 60 / 104;
  const subdivision = beat / 2;
  const roots = [38, 34, 36, 33];
  const riff = [0, 7, 12, 7, 3, 10, 12, 7];
  const effects = {
    jump: ["triangle", 175, 435, .14, .15],
    boost: ["sawtooth", 65, 190, .29, .085],
    land: ["sine", 115, 43, .13, .16],
    swing: ["triangle", 430, 90, .16, .19],
    impact: ["square", 156, 49, .12, .12],
    shot: ["triangle", 580, 205, .17, .105],
    hurt: ["sawtooth", 185, 58, .23, .11],
    fall: ["triangle", 260, 40, .42, .16],
  };
  const motifs = {
    checkpoint: [62, 65, 69],
    summit: [62, 65, 69, 74],
  };
  let context, master, music;
  let muted = false;
  let playing = false;
  let step = 0;
  let nextBeat = 0;
  const frequency = note => 440 * 2 ** ((note - 69) / 12);

  function unlock() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!context) {
      context = new Audio();
      master = context.createGain();
      music = context.createGain();
      master.gain.value = muted ? 0 : .64;
      music.gain.value = playing ? .55 : 0;
      music.connect(master);
      master.connect(context.destination);
    }
    if (context.state !== "running") context.resume().catch(() => {});
  }

  function tone(bus, at, wave, from, to, duration, volume, attack = .009) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(from, at);
    if (from !== to) oscillator.frequency.exponentialRampToValueAtTime(to, at + duration);
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(volume, at + attack);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(envelope);
    envelope.connect(bus);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
    oscillator.start(at);
    oscillator.stop(at + duration);
  }

  function effect(name) {
    if (!context || muted || context.state !== "running") return;
    const at = context.currentTime;
    if (motifs[name]) {
      motifs[name].forEach((note, i) => {
        const pitch = frequency(note);
        tone(master, at + i * .1, "triangle", pitch, pitch, .32, .2);
      });
      return;
    }
    tone(master, at, ...effects[name]);
  }

  function setPlaying(active) {
    playing = active;
    if (!context) return;
    music.gain.setTargetAtTime(active ? .55 : 0, context.currentTime, .04);
    if (active) nextBeat = Math.max(nextBeat, context.currentTime + .04);
  }

  function toggleMute() {
    muted = !muted;
    if (context) master.gain.setTargetAtTime(muted ? 0 : .64, context.currentTime, .025);
    return muted;
  }

  function tick() {
    if (!playing || !context || context.state !== "running") return;
    const now = context.currentTime;
    if (nextBeat < now) nextBeat = now + .02;
    while (nextBeat < now + .12) {
      const position = step % 8;
      const bar = Math.floor(step / 8) % roots.length;
      const bass = frequency(roots[bar]);
      if (position % 2 === 0) {
        tone(music, nextBeat, "sine", 128, 43, .18, .35);
        tone(music, nextBeat, "triangle", bass, bass, .26, .18);
      }
      const voice = frequency(roots[bar] + 24 + riff[position]);
      tone(music, nextBeat, "triangle", voice, voice, .36, position % 2 ? .05 : .105, .018);
      if (position === 0) {
        for (const interval of [0, bar === 0 || bar === 3 ? 3 : 4, 7]) {
          const pitch = frequency(roots[bar] + 12 + interval);
          tone(music, nextBeat, "sine", pitch, pitch, beat * 3.8, .095, .31);
        }
      }
      nextBeat += subdivision;
      step++;
    }
  }

  return {unlock, effect, setPlaying, toggleMute, tick};
})();
