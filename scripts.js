// DOM Elements
 const canvas = document.getElementById('ascii-canvas');
 const loadingScreen = document.getElementById('loading-screen');
 
 // Characters for ASCII animations - MUCH MORE VISIBLE AND FUN
 const cursorChars = ['⚡', '✨', '🔥', '💫', '★', '☆', '♥', '♦', '♣', '♠', '→', '↗', '↘', '▓', '█', '░'];
 const backgroundChars = ['🚀', '💻', '⌨️', '💾', '🖥️', '🔧', '🛠️', '🎮', '🤖', '🐍', '🦄', '✨', '★', '♛'];
 
 // Animation state
 let lastMouseX = 0;
 let lastMouseY = 0;
 let cursorTrailTimer = null;
 let animationFrameId = null;
 let flashCounter = 0;

 function getCanvasDimensions() {
     return { width: window.innerWidth, height: window.innerHeight };
 }

 function resizeCanvas() {
     const dims = getCanvasDimensions();
     canvas.width = dims.width;
     canvas.height = dims.height;
 }

 window.addEventListener('resize', resizeCanvas);
 resizeCanvas();

 document.addEventListener('mousemove', (e) => {
     lastMouseX = e.clientX;
     lastMouseY = e.clientY;

     if (!cursorTrailTimer) {
         addCursorTrail();
         cursorTrailTimer = setTimeout(() => {
             cursorTrailTimer = null;
         }, 100);
     }

     if (Math.random() < 0.5) {
         addBackgroundCharacter();
     }
 });

 document.addEventListener('touchmove', (e) => {
     const touches = e.changedTouches;
     if (touches.length > 0) {
         const touch = touches[0];
         lastMouseX = touch.clientX;
         lastMouseY = touch.clientY;

         if (!cursorTrailTimer) {
             addCursorTrail();
             cursorTrailTimer = setTimeout(() => {
                 cursorTrailTimer = null;
             }, 150);
         }

         if (Math.random() < 0.6) {
             addBackgroundCharacter();
         }
     }
 }, { passive: true });

 function addCursorTrail() {
     const ctx = canvas.getContext('2d');
     const char = cursorChars[Math.floor(Math.random() * cursorChars.length)];

     ctx.font = (window.innerWidth < 768 ? '18px' : '24px') + ' Fira Code, monospace';
     ctx.fillStyle = 'rgba(254, 127, 45, 0.6)';

     if (window.innerWidth < 768) {
         ctx.shadowColor = 'rgba(254, 127, 45, 0.8)';
         ctx.shadowBlur = 10;
         ctx.shadowOffsetX = 3;
         ctx.shadowOffsetY = 3;
     }

     ctx.fillText(char, lastMouseX, lastMouseY);

     ctx.shadowColor = 'transparent';
     ctx.shadowBlur = 0;
 }

 function addBackgroundCharacter() {
     const angle = Math.random() * Math.PI * 2;
     const radius = 100 + Math.random() * 150;
     const x = lastMouseX + Math.cos(angle) * radius;
     const y = lastMouseY + Math.sin(angle) * radius;

     const ctx = canvas.getContext('2d');
     const char = backgroundChars[Math.floor(Math.random() * backgroundChars.length)];

     ctx.font = (window.innerWidth < 768 ? '16px' : '22px') + ' monospace';
     ctx.fillStyle = 'rgba(85, 107, 47, 0.45)';

     ctx.fillText(char, x, y);
 }

 function triggerFlash() {
     const ctx = canvas.getContext('2d');
     const x = Math.random() * canvas.width;
     const y = Math.random() * canvas.height;
     
     const flashChars = ['🌟', '✨', '⭐', '💥', '⚡', '✦', '○', '●'];
     const char = flashChars[Math.floor(Math.random() * flashChars.length)];

     ctx.font = (window.innerWidth < 768 ? '32px' : '48px') + ' monospace';
     ctx.fillStyle = '#FE7F2D';

     ctx.fillText(char, x, y);
 }

 function animate() {
     const ctx = canvas.getContext('2d');
     const dims = getCanvasDimensions();

     ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
     ctx.fillRect(0, 0, dims.width, dims.height);

     flashCounter++;
     if (flashCounter % 16 === 0) {
         triggerFlash();
     }

     animationFrameId = requestAnimationFrame(animate);
 }

 animate();

 window.addEventListener('load', () => {
     setTimeout(() => {
         loadingScreen.style.opacity = '0';
         setTimeout(() => {
             loadingScreen.style.pointerEvents = 'none';
         }, 500);
     }, 800);
 });

 const techWords = ['code', 'create', 'build', 'design', 'html', 'css', 'js', 'react',
                    'webpack', 'node', 'docker', 'linux', 'python', 'golang'];
 let wordIndex = 0;
 let typeTimer = null;

 function startTypingEffect() {
     clearInterval(typeTimer);
     
     const ctx = canvas.getContext('2d');

     function typeWord() {
         const currentWord = techWords[wordIndex % techWords.length];

         const x = Math.random() * canvas.width;
         const y = Math.random() * canvas.height;

         ctx.font = (window.innerWidth < 768 ? '16px' : '20px') + ' monospace';
         ctx.fillStyle = 'rgba(85, 107, 47, 0.7)';

         ctx.fillText(currentWord, x, y);

         wordIndex++;

         typeTimer = setTimeout(typeWord, 500 + Math.random() * 1500);
     }

     typeWord();
 }

setTimeout(startTypingEffect, 500);
