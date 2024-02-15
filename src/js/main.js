import * as Tone from 'tone';

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

document.addEventListener('DOMContentLoaded', function() {
  // Create a button element
  var btn = document.createElement('button');
  btn.id = 'audioContext';
  btn.innerText = 'CLICK TO CONTINUE'; 
  btn.classList.add('audioContextButton'); // Assign the class for styling

  // Append the button to the body
  document.body.appendChild(btn);

  // Add an event listener to the body
  document.body.addEventListener('click', function() {
      // Remove the button when the body is clicked
      var audioContextButton = document.getElementById('audioContext');
      if (audioContextButton) {
          audioContextButton.remove();
      }
  });
});


document.documentElement.addEventListener('mousedown', () => {
  if (Tone.context.state !== 'running') {
    Tone.start().then(() => {
      console.log('Audio context running');
    });
  }
});

// Initialize synths and circles
for (let i = 0; i < 15; i++) {
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


document.documentElement.addEventListener('mousedown', () => {
  Tone.start().then(() => {
    console.log('Audio context running');
  });
});



canvas.addEventListener('mousemove', (e) => {
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


function draw() {

  // Draw circles
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
  adjustVolumesByProximity(e.clientX, e.clientY);
  
  // Reset the inactivity timer on mouse move
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(fadeVolumes, inactivityThreshold);
});

// function to timeout amp envelope
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

  // Assuming the first position in mousePositions is the current mouse cursor position
  const currentMousePos = mousePositions.length > 0 ? mousePositions[0] : null;

  if (currentMousePos) {
      // Initialize variables for drawing concentric circles
      let radius = 10; // Starting radius for the smallest circle
      const scalingFactor = 1.4; // Increase radius by 40% for the next circle
      let opacity = 1; // Starting opacity for the most opaque circle
      const maxCircles = 10; // Number of concentric circles
      let maxRadius = radius * Math.pow(scalingFactor, maxCircles - 1); // Calculate the outermost radius

      // Draw concentric circles
      for (let i = 0; i < maxCircles; i++) {
          ctx.beginPath();
          ctx.arc(currentMousePos.x, currentMousePos.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          radius *= scalingFactor; // Increase radius for the next circle
          opacity *= 0.85; // Decrease opacity for the next circle
      }

      // Calculate distances from current mouse position to each circle
      let distances = circles.map((circle, index) => ({
          index,
          distance: Math.sqrt(Math.pow(currentMousePos.x - circle.x, 2) + Math.pow(currentMousePos.y - circle.y, 2)),
      })).filter(d => d.distance <= maxRadius) // Filter circles within the outermost radius
        .sort((a, b) => a.distance - b.distance); // Sort by closeness

      // Draw lines to circles within the outermost radius with descending opacity
      distances.forEach((d, i) => {
          const lineOpacity = 1 - (0.666 * i / (distances.length - 1)); // Calculate opacity
          ctx.beginPath();
          ctx.moveTo(currentMousePos.x, currentMousePos.y);
          ctx.lineTo(circles[d.index].x, circles[d.index].y);
          ctx.strokeStyle = `rgba(255, 255, 255, ${lineOpacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
      });
  }

  // Ensure synth-circles are always visible
  circles.forEach(circle => {
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.stroke();
  });

  mousePositions = mousePositions.filter(pos => (now - pos.time) / 1000 <= 5.5);

  requestAnimationFrame(animate); // Continue the loop
}



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