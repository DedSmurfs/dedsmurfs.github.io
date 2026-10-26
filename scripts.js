(() => {
    // ---------- SETTINGS (safe to tweak) ----------
    const SETTINGS = {
        cellSizeDesktop: 18,      // size of each character in pixels
        cellSizeMobile: 14,
        cursorRadius: 170,        // how far the cursor's effect reaches (pixels)
        pushStrength: 10,         // how far characters get nudged away from the cursor
        trailFade: 0.93,          // closer to 1 = longer glowing trail (0.8 – 0.97)
        waveSpeed: 1,             // speed of the idle background animation
        rippleSpeed: 7,           // how fast click/tap ripples expand
        loadingScreenDelay: 800,  // ms before the loading screen fades out
        backgroundColor: '#000000' // page background (your --black)
    };

    // Theme colours (from your style.css), as [R, G, B]
    const COLORS = {
        black: [1, 1, 1],           // #000000
        deepBlue: [35, 61, 77],     // #233D4D
        orange:   [254, 127, 45],   // #FE7F2D
        lavender: [234, 236, 240],  // #EAECF0
        olive:    [85, 107, 47]     // #556B2F
    };

    // Characters used for the idle background (dim -> bright)
    const RAMP = ' .,:;-=+*#%@';
    // Characters that flicker near the cursor
    const GLYPHS = '01<>{}[]/\\|+*#$%&@=~^';

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
    let heat = new Float32Array(0);   // glow level of each character cell
    const mouse = { x: 0, y: 0, active: false };
    let ripples = [];
    let touchTimer = null;

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

    // ---------- DRAWING ----------
    function draw(time) {
        const ts = reduceMotion ? 0 : (time / 1000) * SETTINGS.waveSpeed;

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

                // Idle background: slow rolling waves (0 to 1)
                const wave = 0.5
                    + 0.25 * Math.sin(c * 0.18 + ts * 0.9)
                    + 0.25 * Math.sin(r * 0.23 - ts * 0.7 + c * 0.05);

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

                if (h > 0.06) {
                    // Active (near cursor / ripple): orange -> lavender, flickering symbols
                    const ch = GLYPHS[(i * 7 + flicker * 3) % GLYPHS.length];
                    ctx.fillStyle = rgba(mix(COLORS.orange, COLORS.lavender, h * h), 0.35 + 0.65 * h);
                    ctx.fillText(ch, x, y);
                } else {
                    // Idle: dim blue/olive characters rolling in waves
                    const idx = Math.floor(wave * (RAMP.length - 1));
                    if (idx < 2) continue;   // skip blank / near-blank cells
                    const ch = RAMP[idx];
                    ctx.fillStyle = rgba(mix(COLORS.black, COLORS.olive, wave), 0.30 + 0.45 * wave);
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
