import * as Tone from 'tone';
import { Delaunay } from 'd3-delaunay';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const circles = [];
const synths = [];
const isSynthPlaying = [];
const scale = ["G3", "A3", "C4", "D4", "F4", "G4", "A4", "C5", "D5", "F5"];

let inactivityTimer;
const inactivityThreshold = 2000; // 2 seconds of inactivity for example

// Initialize synths and circles
for (let i = 0; i < 10; i++) {
  const x = Math.random() * canvas.width;
  const y = Math.random() * canvas.height;
  circles.push({ x, y });
  const synth = new Tone.Synth({
    envelope: {
      attack: 0.5,
      decay: 0.5,
      sustain: 0.8,
      release: 1,
    },
  }).toDestination();
  synths.push(synth);
  isSynthPlaying.push(false);
}

// Initialize Voronoi diagram
const points = circles.map(circle => [circle.x, circle.y]);
const delaunay = Delaunay.from(points);
const voronoi = delaunay.voronoi([0, 0, canvas.width, canvas.height]);

// Draw circles
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  circles.forEach((circle, i) => {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, 20, 0, Math.PI * 2);
    ctx.fill();
  });
}

function adjustVolumeBasedOnVoronoi(x, y) {
  const pointIndex = delaunay.find(x, y);
  circles.forEach((circle, i) => {
    const distance = Math.sqrt((x - circle.x) ** 2 + (y - circle.y) ** 2);
    const edgePoints = voronoi.cellPolygon(i);
    if (!edgePoints) return;
    const maxDistance = Math.max(...edgePoints.map(([px, py]) => Math.sqrt((px - x) ** 2 + (py - y) ** 2)));
    const volume = 1 - distance / maxDistance;
    synths[i].volume.value = Tone.dbToGain(Math.max(volume, -48) * -12);

    if (i === pointIndex && !isSynthPlaying[i]) {
      synths[i].triggerAttack(scale[i], '+0.1', 0.1);
      isSynthPlaying[i] = true;
    } else if (i !== pointIndex && isSynthPlaying[i]) {
      synths[i].triggerRelease();
      isSynthPlaying[i] = false;
    }
  });
}

document.documentElement.addEventListener('mousedown', () => {
  Tone.start().then(() => {
    console.log('Audio context running');
  });
});

canvas.addEventListener('mousemove', (e) => {
  adjustVolumeBasedOnVoronoi(e.clientX, e.clientY);
});

// Draw Voronoi diagram for visual debugging (optional)
function drawVoronoi() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  voronoi.render(ctx);
  ctx.strokeStyle = "#000";
  ctx.stroke();

  // Draw circles on top of the Voronoi diagram
  circles.forEach(circle => {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, 20, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; // Semi-transparent circles
    ctx.fill();
    ctx.strokeStyle = "#fff"; // White border for better visibility
    ctx.stroke();
  });
  
}

canvas.addEventListener('mousemove', (e) => {
  adjustVolumeBasedOnVoronoi(e.clientX, e.clientY);
  // Optionally, redraw Voronoi and circles if dynamic visual feedback is desired
  // drawVoronoiAndCircles();
  
  // Reset the inactivity timer on mouse move
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(fadeVolumes, inactivityThreshold);
});


function fadeVolumes() {
  synths.forEach((synth, index) => {
    if (isSynthPlaying[index]) {
      // Example of a linear fade out over 1 second. Adjust as necessary for smoother fades.
      let currentVolume = synth.volume.value; // Get the current volume
      const fadeDuration = 1000; // Duration of the fade in milliseconds
      const fadeStepDuration = 50; // How often to step the fade (in milliseconds)
      const fadeSteps = fadeDuration / fadeStepDuration;
      const volumeStep = currentVolume / fadeSteps; // Volume decrease per step
      
      const fadeInterval = setInterval(() => {
        currentVolume -= volumeStep;
        synth.volume.value = currentVolume;
        
        if (currentVolume <= Tone.dbToGain(-48)) {
          clearInterval(fadeInterval);
          synth.triggerRelease(); // Stop the synth if volume is low enough
          isSynthPlaying[index] = false;
        }
      }, fadeStepDuration);
    }
  });
}


drawVoronoi();