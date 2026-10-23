// DOM Elements
const canvas = document.getElementById('ascii-canvas');
const loadingScreen = document.getElementById('loading-screen');

// Characters for ASCII animations
const cursorChars = ['•', '○', '△', '✦', '<', '>', '{', '}', '@', '*', '+', '~'];
const backgroundChars = ['.', '·', ':', ';', '/', '\\', '|', '_', '`', '#'];

// Animation state
let lastMouseX = 0;
let lastMouseY = 0;
let cursorTrailTimer = null;
let animationFrameId = null;

// Get canvas dimensions
function getCanvasDimensions() {
    return { width: window.innerWidth, height: window.innerHeight };
}

// Resize handler
function resizeCanvas() {
    const dims = getCanvasDimensions();
    canvas.width = dims.width;
    canvas.height = dims.height;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Mouse movement handler - cursor trail effect
document.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    
    // Add cursor trail character periodically
    if (!cursorTrailTimer) {
        addCursorTrail();
        cursorTrailTimer = setTimeout(() => {
            cursorTrailTimer = null;
        }, 150);
    }

    // Add background character near cursor randomly
    if (Math.random() < 0.3) {
        addBackgroundCharacter();
    }
});

// Add cursor trail character with fade effect
function addCursorTrail() {
    const ctx = canvas.getContext('2d');
    const char = cursorChars[Math.floor(Math.random() * cursorChars.length)];
    
    ctx.font = '14px Fira Code, monospace';
    ctx.fillStyle = 'rgba(254, 127, 45, 0.3)';
    ctx.fillText(char, lastMouseX, lastMouseY);
}

// Add background character around cursor area
function addBackgroundCharacter() {
    const angle = Math.random() * Math.PI * 2;
    const radius = 80 + Math.random() * 120;
    const x = lastMouseX + Math.cos(angle) * radius;
    const y = lastMouseY + Math.sin(angle) * radius;
    
    const ctx = canvas.getContext('2d');
    const char = backgroundChars[Math.floor(Math.random() * backgroundChars.length)];
    
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(35, 61, 77, 0.1)';
    ctx.fillText(char, x, y);
}

// Animation loop for continuous cursor trail effect
function animate() {
    const ctx = canvas.getContext('2d');
    const dims = getCanvasDimensions();
    
    // Clear with slight fade for smooth trails
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.fillRect(0, 0, dims.width, dims.height);

    animationFrameId = requestAnimationFrame(animate);
}

// Start animations
animate();

// Handle loading screen
window.addEventListener('load', () => {
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.pointerEvents = 'none';
        }, 500);
    }, 800);
});

// Add typing effect for background words
const techWords = ['code', 'create', 'build', 'design', 'html', 'css', 'js', 'react'];
let wordIndex = 0;
let typeTimer = null;

function startTypingEffect() {
    clearInterval(typeTimer);
    
    const ctx = canvas.getContext('2d');
    
    function typeWord() {
        const currentWord = techWords[wordIndex % techWords.length];
        
        // Random position for the word
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        
        ctx.font = '12px monospace';
        ctx.fillStyle = 'rgba(38, 105, 217, 0.08)';
        ctx.fillText(currentWord, x, y);
        
        wordIndex++;
        
        // Random delay between words (1-3 seconds)
        typeTimer = setTimeout(typeWord, 1000 + Math.random() * 2000);
    }
    
    typeWord();
}

// Start typing effect after a delay
setTimeout(startTypingEffect, 1500);