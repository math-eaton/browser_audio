import * as Tone from 'tone';
import { Delaunay } from 'd3-delaunay';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight

const circles = [];
const synths = [];
const isSynthPlaying = [];
const scale = ["G2", "A2", "C2", "D2", "F2", "G2", "A2", "G3", "A3", "C3", "D3", "F3", "G3", "A3", "C4", "D4", "F4"];

// limiter set to -20 dB
const limiter = new Tone.Limiter(-10).toDestination();

let inactivityTimer;
const inactivityThreshold = 2000; // 2 seconds of inactivity for example

document.documentElement.addEventListener('mousedown', () => {
  if (Tone.context.state !== 'running') {
    Tone.start().then(() => {
      console.log('Audio context running');
    });
  }
});

// Initialize synths and circles
for (let i = 0; i < 17; i++) {
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
  }).connect(limiter); // Connect directly to the limiter upon creation
  synths.push(synth);
  isSynthPlaying.push(false);
}

// Initialize Voronoi diagram
const points = circles.map(circle => [circle.x, circle.y]);
const delaunay = Delaunay.from(points);
const voronoi = delaunay.voronoi([0, 0, canvas.width, canvas.height]);


document.documentElement.addEventListener('mousedown', () => {
  Tone.start().then(() => {
    console.log('Audio context running');
  });
});


function calculateVolumeAdjustment(distance, nearestNode) {
  // Example normalization logic, replace with your exponential attenuation or other logic
  const maxDistance = Math.max(...nearestNode.map(c => c.distance));
  const volume = 1 - (distance / maxDistance);
  return Tone.dbToGain(volume * -12); // Convert to decibels or another scale as needed
}


canvas.addEventListener('mousemove', (e) => {
  // adjustVolumeBasedOnVoronoi(e.clientX, e.clientY);
  adjustVolumesByProximity(e.clientX, e.clientY);
});

let volumeLevels = []
// let baseVolume = []
let mousePositions = [];

function adjustVolumesByProximity(x, y) {
  const now = Date.now();
  mousePositions.unshift({ x, y, time: now, opacity: 1 }); // Record new mouse position with timestamp
  if (mousePositions.length > 24) {
      mousePositions.pop(); // Keep the array size limited to 24
  }

  // Adjust synth volumes based on the proximity of the mouse to the circles
  circles.forEach((circle, index) => {
      const distanceToCursor = Math.sqrt((circle.x - x) ** 2 + (circle.y - y) ** 2);
      let maxRadius = 10 * Math.pow(1.5, 9); // Assuming this is the outermost circle radius
      const normalizedDistance = Math.min(distanceToCursor / maxRadius, 1); // Normalize distance

      if (Tone.context.state === 'running') {
          if (!isSynthPlaying[index]) {
              synths[index].triggerAttack(scale[index % scale.length], Tone.now());
              isSynthPlaying[index] = true;
          }
          // Adjust volume based on proximity
          const volume = -((1 - Math.sqrt(1 - normalizedDistance)) * 48); // Example volume adjustment
          synths[index].volume.rampTo(volume, 0.1);
      } else if (isSynthPlaying[index]) {
          synths[index].triggerRelease();
          isSynthPlaying[index] = false;
      }
  });
}


// Draw Voronoi diagram for visual debugging (optional)
function draw() {
  // ctx.clearRect(0, 0, canvas.width, canvas.height);
  // ctx.beginPath();
  // voronoi.render(ctx);
  // ctx.strokeStyle = "white";
  // ctx.stroke();

  // Draw circles on top of the Voronoi diagram
  circles.forEach(circle => {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, 4, 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(0, 0, 0, 1)";  //circles
    ctx.fill();
    ctx.strokeStyle = "#fff"; // White border for better visibility
    ctx.stroke();
  });
  
}

canvas.addEventListener('mousemove', (e) => {
  // adjustVolumeBasedOnVoronoi(e.clientX, e.clientY);
  adjustVolumesByProximity(e.clientX, e.clientY);
  // Optionally, redraw Voronoi and circles if dynamic visual feedback is desired
  // drawVoronoiAndCircles();
  
  // Reset the inactivity timer on mouse move
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(fadeVolumes, inactivityThreshold);
});


function fadeVolumes() {
  synths.forEach((synth, index) => {
    if (isSynthPlaying[index]) {
      // Define the target volume to fade out to, e.g., -Infinity for complete silence
      const targetVolume = -Infinity; // Tone.js handles -Infinity as silence
      const fadeDuration = 1; // Duration of the fade in seconds

      // Start the volume ramp towards the target volume over the specified duration
      synth.volume.rampTo(targetVolume, fadeDuration);

      // After the fade is complete, stop the synth
      setTimeout(() => {
        synth.triggerRelease();
        isSynthPlaying[index] = false;
      }, fadeDuration * 1000); // Convert fadeDuration to milliseconds for setTimeout
    }
  });
}

synths.forEach(synth => {
  synth.connect(limiter); // Connect each synth to the limiter instead of directly to the destination
  console.log("limiter activated")
});

function animate() {
  const now = Date.now();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // This factor controls the decay of past circle copies.
  // A value less than 1.0 causes quicker fading for past copies.
  const pastOpacityDecayFactor = 0.7; // Adjust this to make past copies fade faster or slower

  mousePositions.forEach((pos, index) => {
      let ageInSeconds = (now - pos.time) / 1000;
      let baseOpacity = Math.max(1 - ageInSeconds / 3, 0); // Base fading based on age

      // Determine if this is the most recent position
      let isMostRecentPosition = index === 0;

      let radius = 10;
      for (let i = 0; i < scale.length; i++) {
          // Apply a different decay factor for past copies
          let decayFactor = isMostRecentPosition ? 0.8 : pastOpacityDecayFactor;
          let circleOpacity = Math.pow(decayFactor, i) * baseOpacity;

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${circleOpacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          radius *= 1.25; // Increase radius for the next circle
      }
  });

  circles.forEach(circle => {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.stroke();
  });

  mousePositions = mousePositions.filter(pos => (now - pos.time) / 1000 <= 5.5);

  requestAnimationFrame(animate);
}

// Start the animation loop
animate();



draw();


function meter(){

// Setup Tone.Meter to monitor the master output
const meter = new Tone.Meter();
Tone.Destination.connect(meter);

// Initialize the VU meter canvas
const vuCanvas = document.getElementById('vuMeter');
const vuCtx = vuCanvas.getContext('2d');
vuCanvas.height = window.innerHeight; // Set height dynamically based on the window size

function drawVUMeter() {
  requestAnimationFrame(drawVUMeter);

  // Clear the canvas
  vuCtx.clearRect(0, 0, vuCanvas.width, vuCanvas.height);

  // Get the volume level from the meter, converting it to a positive value
  const level = Math.abs(meter.getValue());

  // Map the level to the height of the canvas. You might need to adjust this scaling.
  const height = level * vuCanvas.height;

  // Draw the meter
  vuCtx.fillStyle = 'green';
  vuCtx.fillRect(0, vuCanvas.height - height, vuCanvas.width, height);
}

drawVUMeter(); // Start the drawing loop
}