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


document.documentElement.addEventListener('mousedown', () => {
  Tone.start().then(() => {
    console.log('Audio context running');
  });
});

canvas.addEventListener('mousemove', (e) => {
  // adjustVolumeBasedOnVoronoi(e.clientX, e.clientY);
  adjustVolumesByProximity(e.clientX, e.clientY);
});

function adjustVolumesByProximity(x, y) {
  // Calculate distances for all circles
  const distances = circles.map((circle, index) => ({
    index,
    distance: Math.sqrt((x - circle.x) ** 2 + (y - circle.y) ** 2)
  }));

  // Sort distances to find the closest three circles
  distances.sort((a, b) => a.distance - b.distance);
  const closestThree = distances.slice(0, 3);

  // Reset the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);


  // Draw line from cursor to the closest three circles and adjust synths
  closestThree.forEach(({ index }) => {
    ctx.beginPath();
    ctx.moveTo(x, y); // Start at cursor position
    ctx.lineTo(circles[index].x, circles[index].y); // Draw line to circle center
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Deactivate synths not in the closest three, if they are playing
  synths.forEach((synth, index) => {
    if (!closestThree.some(circle => circle.index === index)) {
      if (isSynthPlaying[index]) {
        synth.triggerRelease();
        isSynthPlaying[index] = false;
      }
    }
  });

  // Redraw all circles
  circles.forEach(circle => {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 1)"; // Adjust the color and opacity as needed
    ctx.fill();
    ctx.strokeStyle = "#fff"; // White border for better visibility
    ctx.stroke();
  });    

  // Activate and adjust volume for the closest three synths
  closestThree.forEach(({ index, distance }) => {
    const volumeAdjustment = calculateVolumeAdjustment(distance, closestThree);
    if (!isSynthPlaying[index]) {
      synths[index].triggerAttack(scale[index]);
      isSynthPlaying[index] = true;
    }
    synths[index].volume.value = volumeAdjustment;
  });
}

function calculateVolumeAdjustment(distance, closestThree) {
  // Example normalization logic, replace with your exponential attenuation or other logic
  const maxDistance = Math.max(...closestThree.map(c => c.distance));
  const volume = 1 - (distance / maxDistance);
  return Tone.dbToGain(volume * -12); // Convert to decibels or another scale as needed
}

// Draw Voronoi diagram for visual debugging (optional)
function draw() {
  // ctx.clearRect(0, 0, canvas.width, canvas.height);
  // ctx.beginPath();
  // voronoi.render(ctx);
  // ctx.strokeStyle = "#000";
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
      // Example of a linear fade out over 1 second. Adjust as necessary for smoother fades.
      let currentVolume = synth.volume.value; // Get the current volume
      const fadeDuration = 1000; // Duration of the fade in milliseconds
      const fadeStepDuration = 500; // How often to step the fade (in milliseconds)
      const fadeSteps = fadeDuration / fadeStepDuration;
      const volumeStep = currentVolume / fadeSteps; // Volume decrease per step
      
      const fadeInterval = setInterval(() => {
        currentVolume -= volumeStep;
        synth.volume.value = currentVolume;
        
        if (currentVolume <= Tone.dbToGain(-500)) {
          clearInterval(fadeInterval);
          synth.triggerRelease(); // Stop the synth if volume is low enough
          isSynthPlaying[index] = false;
        }
      }, fadeStepDuration);
    }
  });
}


draw();

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
