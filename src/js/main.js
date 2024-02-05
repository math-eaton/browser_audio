import * as Tone from 'tone';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const circles = [];
const synths = [];
const isSynthPlaying = []; // Array to track playing state
const scale = ["G3", "A3", "C4", "D4", "F4", "G4", "A4", "C5", "D5", "F5"];

// Initialize synths for each circle with smoother envelope settings
for (let i = 0; i < 10; i++) {
  const x = Math.random() * canvas.width;
  const y = Math.random() * canvas.height;
  circles.push({ x, y });
  const synth = new Tone.Synth({
    envelope: {
      attack: 0.5,
      decay: 0.5,
      sustain: 0.8,
      release: 1
    }
  }).toDestination();
  synths.push(synth);
  isSynthPlaying.push(false); // Initialize all synths as not playing
}

// Draw circles
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  circles.forEach((circle, i) => {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, 20, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Adjust sound based on cursor position
function adjustSound(x, y) {
  circles.forEach((circle, i) => {
    const distance = Math.sqrt((x - circle.x) ** 2 + (y - circle.y) ** 2);
    const volume = 1 - Math.min(distance / window.innerWidth, 1);
    synths[i].volume.value = Tone.dbToGain(volume * -12); // Adjust volume scaling

    if (distance < 50 && !isSynthPlaying[i]) { // If cursor is close and synth is not playing
      synths[i].triggerAttack(scale[i]);
      isSynthPlaying[i] = true;
    } else if ((distance >= 50 && isSynthPlaying[i]) || volume <= -48) { // If cursor moves away or volume is very low
      synths[i].triggerRelease();
      isSynthPlaying[i] = false;
    }
  });
}

document.documentElement.addEventListener('mousedown', () => {
  Tone.start().then(() => {
    console.log('Audio context is running');
  });
});

canvas.addEventListener('mousemove', (e) => {
  adjustSound(e.clientX, e.clientY);
});

draw();
