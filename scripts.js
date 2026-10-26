(() => {
    // ---------- SETTINGS (safe to tweak) ----------
    const SETTINGS = {
        cellSizeDesktop: 18,      // size of each character in pixels
        cellSizeMobile: 14,
        cursorRadius: 170,        // how far the cursor's effect reaches (pixels)
        pushStrength: 10,         // how far characters get nudged away from the cursor
        trailFade: 0.93,          // closer to 1 = longer glowing trail (0.8 – 0.97)
        rippleSpeed: 7,           // how fast click/tap ripples expand
        loadingScreenDelay: 800,  // ms before the loading screen fades out
        backgroundColor: '#000000', // page background (your --black)

        // Falling characters
        rainDensity: 0.35,        // share of columns with falling streams (0 – 1)
        rainSpeedMin: 5,          // slowest fall speed (rows per second)
        rainSpeedMax: 16,         // fastest fall speed (rows per second)
        rainLengthMin: 6,         // shortest trail (characters)
        rainLengthMax: 20,        // longest trail (characters)

        // Twinkling stars
        starDensity: 0.07,        // share of cells that are stars (0 – 1)
        twinkleSpeedMin: 0.6,     // slowest twinkle
        twinkleSpeedMax: 2.8      // fastest twinkle
    };

    // Theme colours (from your style.css), as [R, G, B]
    const COLORS = {
        black: [1, 1, 1],           // #000000
        deepBlue: [35, 61, 77],     // #233D4D
        orange:   [254, 127, 45],   // #FE7F2D
        lavender: [234, 236, 240],  // #EAECF0
        olive:    [85, 107, 47]     // #556B2F
    };

    // Characters that fall and flicker near the cursor
    const GLYPHS = '01<>{}[]/\\|+*#$%&@=~^';
    // Star shapes, dimmest to brightest
    const STARS = ['.', '+', '*'];

    // ---------- SETUP ----------
    const canvas = document.getElementById('ascii-canvas');
    const loadingScreen = document.getElementById('loading-screen');

    if (!canvas) {
        console.error('scripts.js: could not find <canvas id="ascii-canvas"> in your HTML.');
        return;
    }

    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Make sure the canvas fills the screen, sits behind your content,
    // and never blocks clicks (works even if the CSS doesn't say so)
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '-1';

    // Solid black page background. The canvas sits behind your content,
    // so the page itself has to be black and the body see-through.
    document.documentElement.style.backgroundColor = SETTINGS.backgroundColor;
    document.body.style.backgroundColor = 'transparent';

    let width = 0, height = 0, cell = 18, cols = 0, rows = 0;
    let heat = new Float32Array(0);        // glow level of each cell (cursor trail)
    let rain = new Float32Array(0);        // falling-stream brightness of each cell
    let starPhase = new Float32Array(0);   // random twinkle offset per cell
    let starSpeed = new Float32Array(0);   // random twinkle speed per cell (0 = not a star)
    let drops = [];                        // one falling stream per column
    const mouse = { x: 0, y: 0, active: false };
    let ripples = [];
    let touchTimer = null;
    let lastTime = 0;

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    // Start (or restart) a falling stream. "Waiting" streams sit above the
    // screen for a random time, so streams don't all start together.
    function resetDrop(drop, startOnScreen) {
        const active = Math.random() < SETTINGS.rainDensity;
        drop.speed = rand(SETTINGS.rainSpeedMin, SETTINGS.rainSpeedMax);
        drop.length = Math.floor(rand(SETTINGS.rainLengthMin, SETTINGS.rainLengthMax));
        if (startOnScreen) {
            drop.head = active ? rand(-rows * 0.5, rows) : -rand(rows, rows * 3);
        } else {
            drop.head = active ? -rand(0, rows * 0.4) : -rand(rows * 0.5, rows * 3);
        }
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        cell = width < 768 ? SETTINGS.cellSizeMobile : SETTINGS.cellSizeDesktop;

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        cols = Math.ceil(width / cell);
        rows = Math.ceil(height / cell);

        heat = new Float32Array(cols * rows);
        rain = new Float32Array(cols * rows);

        // Randomly choose which cells are stars, and how each one twinkles
        starPhase = new Float32Array(cols * rows);
        starSpeed = new Float32Array(cols * rows);
        for (let i = 0; i < cols * rows; i++) {
            if (Math.random() < SETTINGS.starDensity) {
                starPhase[i] = Math.random() * Math.PI * 2;
                starSpeed[i] = rand(SETTINGS.twinkleSpeedMin, SETTINGS.twinkleSpeedMax);
            }
        }

        // One falling stream per column
        drops = [];
        for (let c = 0; c < cols; c++) {
            const drop = { head: 0, speed: 0, length: 0 };
            resetDrop(drop, true);
            drops.push(drop);
        }
    }

    window.addEventListener('resize', resize);
    resize();

    // ---------- CURSOR / TOUCH ----------
    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
    });

    document.addEventListener('mouseleave', () => { mouse.active = false; });

    document.addEventListener('mousedown', (e) => addRipple(e.clientX, e.clientY));

    document.addEventListener('touchstart', (e) => {
        const t = e.touches[0];
        if (!t) return;
        mouse.x = t.clientX;
        mouse.y = t.clientY;
        mouse.active = true;
        addRipple(t.clientX, t.clientY);
        clearTimeout(touchTimer);
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        const t = e.touches[0];
        if (!t) return;
        mouse.x = t.clientX;
        mouse.y = t.clientY;
        mouse.active = true;
    }, { passive: true });

    document.addEventListener('touchend', () => {
        clearTimeout(touchTimer);
        touchTimer = setTimeout(() => { mouse.active = false; }, 400);
    }, { passive: true });

    function addRipple(x, y) {
        ripples.push({ x, y, radius: 0, life: 1 });
        if (ripples.length > 6) ripples.shift();
    }

    // ---------- HELPERS ----------
    function mix(a, b, t) {
        return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t
        ];
    }

    function rgba(c, a) {
        return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a.toFixed(2) + ')';
    }

    // ---------- UPDATE ----------
    // Moves the falling streams down and records how bright each cell is
    function updateRain(dt) {
        rain.fill(0);

        for (let c = 0; c < cols; c++) {
            const drop = drops[c];

            if (!reduceMotion) {
                drop.head += drop.speed * dt;
                // Once the whole trail has left the bottom, start a new stream
                if (drop.head - drop.length > rows) resetDrop(drop, false);
            }

            const headRow = Math.floor(drop.head);
            for (let k = 0; k < drop.length; k++) {
                const row = headRow - k;
                if (row < 0 || row >= rows) continue;
                // k = 0 is the bright head (1.0), fading to nothing at the tail
                rain[row * cols + c] = k === 0 ? 1.5 : 1 - k / drop.length;
            }
        }
    }

    // ---------- DRAWING ----------
    function draw(time) {
        const dt = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;
        const ts = reduceMotion ? 0 : time / 1000;

        updateRain(dt);

        ctx.clearRect(0, 0, width, height);
        ctx.font = cell + 'px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Update ripples
        for (const rp of ripples) {
            rp.radius += SETTINGS.rippleSpeed;
            rp.life -= 0.012;
        }
        ripples = ripples.filter(rp => rp.life > 0);

        const flicker = Math.floor(time / 120);   // changes ~8 times a second

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;
                let x = c * cell + cell / 2;
                let y = r * cell + cell / 2;

                // Cursor influence
                let influence = 0;
                if (mouse.active) {
                    const dx = x - mouse.x;
                    const dy = y - mouse.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < SETTINGS.cursorRadius) {
                        influence = 1 - dist / SETTINGS.cursorRadius;
                        // Nudge characters away from the cursor
                        if (dist > 0.1) {
                            const push = influence * influence * SETTINGS.pushStrength;
                            x += (dx / dist) * push;
                            y += (dy / dist) * push;
                        }
                    }
                }

                // Click / tap ripples
                let rippleBoost = 0;
                for (const rp of ripples) {
                    const rdx = x - rp.x;
                    const rdy = y - rp.y;
                    const d = Math.abs(Math.sqrt(rdx * rdx + rdy * rdy) - rp.radius);
                    if (d < cell * 2.5) {
                        rippleBoost = Math.max(rippleBoost, (1 - d / (cell * 2.5)) * rp.life);
                    }
                }

                // Glow lingers behind the cursor, then fades
                heat[i] = Math.max(heat[i] * SETTINGS.trailFade, influence, rippleBoost);
                const h = heat[i];
                const streak = rain[i];

                if (h > 0.06) {
                    // Near cursor / ripple: orange -> lavender, flickering symbols
                    const ch = GLYPHS[(i * 7 + flicker * 3) % GLYPHS.length];
                    ctx.fillStyle = rgba(mix(COLORS.orange, COLORS.lavender, h * h), 0.35 + 0.65 * h);
                    ctx.fillText(ch, x, y);

                } else if (streak > 0.04) {
                    // Falling stream: bright lavender head, olive tail fading out
                    const isHead = streak > 1;
                    // The head changes character every frame; the tail changes more slowly
                    const ch = GLYPHS[(i * 13 + (isHead ? flicker * 5 : (flicker >> 2))) % GLYPHS.length];
                    const color = isHead ? COLORS.lavender : mix(COLORS.black, COLORS.olive, Math.min(streak * 1.4, 1));
                    const alpha = isHead ? 0.9 : 0.15 + 0.6 * streak;
                    ctx.fillStyle = rgba(color, alpha);
                    ctx.fillText(ch, x, y);

                } else if (starSpeed[i] > 0) {
                    // Twinkling star: fades in and out, mostly dim, briefly bright
                    const wave = 0.5 + 0.5 * Math.sin(ts * starSpeed[i] + starPhase[i]);
                    const t = wave * wave * wave * wave;   // sharper peaks
                    if (t < 0.05) continue;
                    const ch = STARS[t > 0.7 ? 2 : (t > 0.3 ? 1 : 0)];
                    ctx.fillStyle = rgba(mix(COLORS.olive, COLORS.lavender, t), 0.15 + 0.85 * t);
                    ctx.fillText(ch, x, y);
                }
            }
        }
    }

    function loop(time) {
        draw(time);
        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);

    // ---------- LOADING SCREEN ----------
    function hideLoadingScreen() {
        if (!loadingScreen) return;
        setTimeout(() => {
            loadingScreen.style.transition = 'opacity 0.5s ease';
            loadingScreen.style.opacity = '0';
            setTimeout(() => { loadingScreen.style.pointerEvents = 'none'; }, 500);
        }, SETTINGS.loadingScreenDelay);
    }

    if (document.readyState === 'complete') {
        hideLoadingScreen();
    } else {
        window.addEventListener('load', hideLoadingScreen);
    }
})();
