import * as Tone from 'tone';
import * as THREE from 'three';
import { MapControls } from '/node_modules/three/examples/jsm/controls/MapControls.js';

const params = {
    color: '#000000'
  };


  
  

// Set up the basic Three.js scene components
const scene = new THREE.Scene();
scene.background = new THREE.Color( params.color );

// Get the existing canvas element
const canvas = document.getElementById('canvas');

// Initialize the renderer with the existing canvas
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
// renderer.setClearColor( 0x000000, 1 );

// Set the size of the renderer to match the canvas size
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio); // For high DPI screens
document.body.appendChild(renderer.domElement);

// Set up the orthographic camera
const aspectRatio = window.innerWidth / window.innerHeight;
const cameraWidth = 1000; // Adjust the size based on your scene's scale
const cameraHeight = cameraWidth / aspectRatio;
const camera = new THREE.OrthographicCamera(cameraWidth / -2, cameraWidth / 2, cameraHeight / 2, cameraHeight / -2, 1, 1000);

// Position the camera to look down from the top
camera.position.set(0, 0, 100); // Adjust the z position based on your scene's scale
camera.lookAt(scene.position); // Ensure the camera is looking at the center of the scene

// Set up orbit controls
const controls = new MapControls(camera, renderer.domElement);
controls.enableDamping = true; // Optional, but this gives a nice inertia to the controls
controls.dampingFactor = 0.3;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2; // Limit the controls to top-down view

// Adjust the renderer
renderer.setClearColor(0xffffff, 1); // Optional: Change the background color and opacity


// Create a group for circular nodes
const circularNodesGroup = new THREE.Group();
scene.add(circularNodesGroup);

// Variables for audio functionality
const synths = [];
const isSynthPlaying = [];
const scale = ["G2", "A2", "C2", "D2", "F2", "G2", "A2", "G3", "A3", "C3", "D3", "F3", "G3", "A3", "C4", "D4", "F4"];
const limiter = new Tone.Limiter(-10).toDestination();

// Initialize circular nodes
for (let i = 0; i < 15; i++) {
  const geometry = new THREE.CircleGeometry(6, 32); // Assuming radius of 2 for each node
  const material = new THREE.MeshBasicMaterial({ 
    
    color: 0xffffff,
    wireframe: true,
    alphaHash: true,
    opacity: 0.85 

});


  // Example of initially starting synths
  synths.forEach((synth, index) => {
    if (!isSynthPlaying[index]) {
      synth.triggerAttack(scale[index % scale.length], '8n', Tone.now());
      isSynthPlaying[index] = true;
    }
  });


  const circle = new THREE.Mesh(geometry, material);

  circle.position.x = Math.random() * window.innerWidth - window.innerWidth / 2;
  circle.position.y = Math.random() * window.innerHeight - window.innerHeight / 2;
  circle.position.z = 0;

  circularNodesGroup.add(circle);

  // Initialize synths
  const synth = new Tone.Synth({
    envelope: {
      attack: 0.5,
      decay: 0.5,
      sustain: 0.8,
      release: 1,
    },
  }).connect(limiter);
  synths.push(synth);
  isSynthPlaying.push(false);
}

// Function to create concentric circles and lines connecting to nodes
let concentricCircles;
let lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
let mouseVector = new THREE.Vector2();

function createConcentricCircles() {
    if (concentricCircles) {
      scene.remove(concentricCircles);
      concentricCircles = null;
    }
  
    concentricCircles = new THREE.Group();
  
    const maxCircles = 20; // Total number of concentric circles
    let radius = 10; // Starting radius for the smallest circle
    const opacityDecrement = 1 / maxCircles; // Decrease in opacity for each subsequent circle
  
    for (let i = 0; i < maxCircles; i++) {
      // Create a circle outline manually
      const points = [];
      const segments = 64; // Number of segments to approximate a circle
      for (let j = 0; j <= segments; j++) {
        // Calculate angle for this segment
        const theta = (j / segments) * Math.PI * 2;
        // Calculate x and y position using polar coordinates to cartesian coordinates conversion
        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);
        points.push(new THREE.Vector3(x, y, 0));
      }
  
      // Create a geometry and line material for the circle outline
      const circleGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const circleMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1 - (i * opacityDecrement) // Progressively more transparent
      });
  
      // Create the circle outline and add it to the group
      const circleOutline = new THREE.LineLoop(circleGeometry, circleMaterial);
      concentricCircles.add(circleOutline);
  
      radius *= 1.2; // Increment the radius for the next circle
    }
  
    scene.add(concentricCircles);
  }
  
// Function to adjust volumes and draw lines based on mouse position
function adjustVolumesAndDrawLines(event) {
    // Convert mouse position to Three.js vector
    mouseVector.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseVector.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
    // Adjust concentric circles position based on mouse position
    createConcentricCircles();
    concentricCircles.position.x = mouseVector.x * window.innerWidth / 2;
    concentricCircles.position.y = mouseVector.y * window.innerHeight / 2;
  
    // Calculate distances, adjust volumes, and draw lines
    circularNodesGroup.children.forEach((node, index) => {
      const nodePosition = new THREE.Vector2(node.position.x, node.position.y);
      const mousePosition = new THREE.Vector2(concentricCircles.position.x, concentricCircles.position.y);
      const distance = nodePosition.distanceTo(mousePosition);
  
      // Assuming maxRadius is the radius of the outermost concentric circle
      let maxRadius = 10 * Math.pow(1.2, 9); // Adjust based on your concentric circles setup
      const isWithinRange = distance <= maxRadius;
  
      // Adjust synth volume based on distance
      if (isWithinRange && Tone.context.state === 'running') {
        if (!isSynthPlaying[index]) {
          synths[index].triggerAttack(scale[index % scale.length], Tone.now());
          isSynthPlaying[index] = true;
        }
        const volumeAdjustment = calculateVolumeAdjustment(distance, maxRadius);
        synths[index].volume.value = volumeAdjustment;
      } else if (isSynthPlaying[index]) {
        synths[index].triggerRelease();
        isSynthPlaying[index] = false;
      }
  
      // Optionally, draw lines from mouse to nodes within range
      if (isWithinRange) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(node.position.x, node.position.y, 0), new THREE.Vector3(concentricCircles.position.x, concentricCircles.position.y, 0)]);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
  
        // Remove the line after drawing it for the next frame
        setTimeout(() => scene.remove(line), 16); // Approximate time for 60fps frame update
      }
    });
  }
  
  // Calculate volume adjustment based on distance
  function calculateVolumeAdjustment(distance, maxRadius) {
    // Ensure distance does not exceed maxRadius
    const clampedDistance = Math.min(distance, maxRadius);
    
    // Normalize distance (0 at center, 1 at edge)
    const normalizedDistance = clampedDistance / maxRadius;
    
    // Use an inverse relationship for volume (high at center, low at edge)
    // No need for cosine in this simpler case, just linear interpolation can work, but inversely
    const volume = 1 - normalizedDistance; // 1 at center, 0 at edge
    
    // If you need a more dramatic volume curve, you can adjust the exponentiation
    // const volume = Math.pow(1 - normalizedDistance, 2); // Example for a sharper curve
    
    // For Tone.js, let's directly use the linear scale value, assuming volume.value accepts it
    // Convert this linear scale to a suitable range if needed
    return volume; // Direct linear scale; adjust if decibels needed
  }
        
// Event listener for mouse movement
document.addEventListener('mousemove', adjustVolumesAndDrawLines);

// Assuming you start with a base radius and scale it up for each concentric circle
let baseRadius = 10; // Starting radius for the smallest circle
let scalingFactor = 1.4; // The factor by which each subsequent circle's radius increases
let numberOfCircles = 10; // Total number of concentric circles
const maxVolumeDb = -16; // Example value, adjust based on your needs

// Calculate the radius of the outermost circle
let maxRadius = baseRadius * Math.pow(scalingFactor, numberOfCircles - 1);

function updateLinesAndCircles() {
  // Clear existing lines from the scene
  // Clear existing lines and stop all synths initially
  scene.children.slice().forEach(child => {
    if (child.type === 'Line') {
      scene.remove(child);
    }
  });
  
  synths.forEach((synth, index) => {
    if (isSynthPlaying[index]) {
      synths[index].triggerRelease();
      isSynthPlaying[index] = false;
    }
  });

  const mousePos3D = new THREE.Vector3(mouseVector.x * window.innerWidth / 2, mouseVector.y * window.innerHeight / 2, 0);
  let nodesWithinRange = [];

  circularNodesGroup.children.forEach((node, index) => {
    const distance = mousePos3D.distanceTo(node.position);
    if (distance <= maxRadius) {
      nodesWithinRange.push({ node, distance, index });
    }
  });

  // Sort and adjust volumes based on distance, then draw lines
  nodesWithinRange.sort((a, b) => a.distance - b.distance);

  const minOpacity = 0.333;
  const opacityIncrement = (1.0 - minOpacity) / (nodesWithinRange.length - 1 || 1);

  nodesWithinRange.forEach((entry, index) => {
    // Play sound and adjust volume based on proximity
    if (!isSynthPlaying[entry.index]) {
      synths[entry.index].triggerAttack(scale[entry.index % scale.length], Tone.now());
      isSynthPlaying[entry.index] = true;
    }
    // Adjust synth volume based on proximity and "equal power" curve
    const volumeAdjustment = calculateVolumeAdjustment(entry.distance, maxRadius);
    // Use rampTo for a smooth transition, specify the time over which to adjust
    synths[entry.index].volume.rampTo(volumeAdjustment * maxVolumeDb, 0.1); // Ramp over 0.1 seconds
    
    // Draw line with adjusted opacity
    const opacity = 1.0 - index * opacityIncrement;
    const points = [mousePos3D.clone(), entry.node.position.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: Math.max(opacity, minOpacity) });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
  });
}
     
let inactivityTimer;
const inactivityThreshold = 5000; // 5 seconds for example

canvas.addEventListener('mousemove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 2 - 1;
    const y = -(e.clientY - rect.top) / rect.height * 2 + 1;

    const mousePos3D = new THREE.Vector3();
    mousePos3D.set(x, y, 0.5); // Assuming a default depth of 0.5 for unprojection
    mousePos3D.unproject(camera); // Convert from screen to world coordinates

    adjustVolumesByProximity(mousePos3D); // Now passing a THREE.Vector3 object
});


function adjustVolumesByProximity(mousePos3D) {
    circularNodesGroup.children.forEach((node, index) => {
      // Calculate distance from node to mouse position
      const distanceToCursor = mousePos3D.distanceTo(node.position);
      const normalizedDistance = Math.min(distanceToCursor / maxRadius, 1); // Ensure the distance is normalized [0, 1]
  
      // Determine the volume based on distance (you may need to adjust the formula to fit your needs)
      const volume = 1 - normalizedDistance; // Simple linear mapping; adjust as needed
  
      // Ensure the volume is within a valid range for dB in Tone.js (e.g., -Infinity to 0 dB)
      const volumeDb = volume > 0 ? Tone.gainToDb(volume) : -Infinity;
  
      // Adjust the synth volume without retriggering the envelope
      if (isSynthPlaying[index]) {
        synths[index].volume.exponentialRampToValueAtTime(volumeDb, Tone.now() + 0.1);
      }
    });
  }
  
// Function to animate the scene
function animate() {
    requestAnimationFrame(animate);
    updateLinesAndCircles();
  
    // Update controls
    controls.update();
  
    renderer.render(scene, camera);
  }
  
animate();
