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
const limiter = new Tone.Limiter(-30).toDestination();

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

canvas.addEventListener('mousemove', (e) => {
  // adjustVolumeBasedOnVoronoi(e.clientX, e.clientY);
  adjustVolumesByProximity(e.clientX, e.clientY);
});

let volumeLevels = []
// let baseVolume = []


// function adjustVolumesByProximity(x, y) {
//   // Calculate distances for all circles
//   const distances = circles.map((circle, index) => ({
//     index,
//     distance: Math.sqrt((x - circle.x) ** 2 + (y - circle.y) ** 2)
//   }));

//   // Reset the canvas
//   ctx.clearRect(0, 0, canvas.width, canvas.height);

//   volumeLevels = [];

//   // Draw concentric circles around the mouse cursor
//   let radius = 20; // Starting radius for the smallest circle
//   let opacity = 1; // Starting opacity for the most opaque circle
//   let baseVolume = 12; // Reset baseVolume for each call


//   for (let i = 0; i < 7; i++) {
//     ctx.beginPath();
//     ctx.arc(x, y, radius, 0, Math.PI * 2);
//     ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
//     ctx.lineWidth = 1;
//     ctx.stroke();

//     // Store the radius and corresponding volume level
//     volumeLevels.push({ radius, volume: baseVolume });

//     radius *= 1.5; // Increase radius for the next circle
//     opacity *= 0.8; // Decrease opacity for the next circle
//     baseVolume -= 0.24; // Decrease volume level for the next zone
//   }

//   // Adjust synths based on proximity and concentric circle zone
//   circles.forEach((circle, index) => {
//     const distanceToCursor = Math.sqrt((circle.x - x) ** 2 + (circle.y - y) ** 2);
//     const zone = volumeLevels.find(vl => distanceToCursor <= vl.radius);
  
//     if (zone && Tone.context.state === 'running') {
//       const volumeAdjustment = Math.log1p(zone.radius - distanceToCursor) / Math.log1p(zone.radius) * (zone.volume - 48);
//       if (!isSynthPlaying[index]) {
//         synths[index].triggerAttack(scale[index % scale.length], Tone.now());
//         isSynthPlaying[index] = true;
//       }
//       // Smoothly transition volume
//       synths[index].volume.rampTo(volumeAdjustment, 0.1); // Smooth transition over n seconds
//     } else if (isSynthPlaying[index]) {
//       synths[index].triggerRelease();
//       isSynthPlaying[index] = false;
//     }
//   });

//   // Redraw all circles for visual feedback
//   circles.forEach(circle => {
//     ctx.beginPath();
//     ctx.arc(circle.x, circle.y, 4, 0, Math.PI * 2);
//     ctx.fillStyle = "rgba(0, 0, 0, 1)";
//     ctx.fill();
//     ctx.strokeStyle = "#fff";
//     ctx.stroke();
//   });
// }

function adjustVolumesByProximity(x, y) {
  // Reset the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calculate distances for all circles and sort them
  let distances = circles.map((circle, index) => ({
    index,
    distance: Math.sqrt((x - circle.x) ** 2 + (y - circle.y) ** 2)
  }));



  // Determine the outermost concentric circle's radius
  let radius = 10; // Starting radius for the smallest circle
  let maxRadius = radius; // Initialize maxRadius with the starting radius
  let opacity = 1; // Starting opacity for the most opaque circle
  for (let i = 0; i < 10; i++) {
    if (i == 9) { // On the last iteration, calculate the outermost radius
      maxRadius = radius;
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    radius *= 1.4; // Increase for the next circle
    opacity *= 0.85; // Decrease for the next circle
  }

  // Filter nodes within the outermost concentric circle and sort by closeness
  distances = distances.filter(d => d.distance <= maxRadius).sort((a, b) => a.distance - b.distance);

  // Draw lines to these nodes with varying opacity
  distances.forEach((d, i) => {
    const lineOpacity = 1 - (0.666 * i / (distances.length - 1)); // Calculate opacity
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(circles[d.index].x, circles[d.index].y);
    ctx.strokeStyle = `rgba(255, 255, 255, ${lineOpacity})`; // Use calculated opacity
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Adjust synths based on continuous distance rather than discrete zones
  circles.forEach((circle, index) => {
    const distanceToCursor = Math.sqrt((circle.x - x) ** 2 + (circle.y - y) ** 2);
    const normalizedDistance = Math.min(distanceToCursor / maxRadius, 1); // Normalize distance to [0, 1]

    if (Tone.context.state === 'running') {
      if (!isSynthPlaying[index]) {
        synths[index].triggerAttack(scale[index % scale.length], Tone.now());
        isSynthPlaying[index] = true;
      }
      const volume = -((1 - Math.sqrt(1 - normalizedDistance)) * 48); // Scale volume between 0 and -48 dB
      synths[index].volume.rampTo(volume, 0.1); // Smooth transition to the calculated volume
    } else if (isSynthPlaying[index]) {
      synths[index].triggerRelease();
      isSynthPlaying[index] = false;
    }
  });

  // Redraw all circles for visual feedback
  circles.forEach(circle => {
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.stroke();
  });
}


function calculateVolumeAdjustment(distance, nearestNode) {
  // Example normalization logic, replace with your exponential attenuation or other logic
  const maxDistance = Math.max(...nearestNode.map(c => c.distance));
  const volume = 1 - (distance / maxDistance);
  return Tone.dbToGain(volume * -12); // Convert to decibels or another scale as needed
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

synths.forEach(synth => {
  synth.connect(limiter); // Connect each synth to the limiter instead of directly to the destination
  console.log("limiter activated")
});


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