/* Scroll-driven glass, shared by the three Stage 2 gates. No rendering dependency. */
(function () {
    'use strict';

    function getProgress(scroll, height, viewport) {
        const distance = height - viewport;
        return distance > 0 ? Math.max(0, Math.min(1, scroll / distance)) : 0;
    }

    function buildFacets(theme) {
        const outline = theme === 'prism'
            ? [[-0.12, -1], [0.45, -0.5], [0.32, 0.72], [0.04, 1], [-0.43, 0.5], [-0.34, -0.62]]
            : Array.from({ length: 6 }, (_, index) => {
                const angle = index * Math.PI / 3 - Math.PI / 2;
                return [Math.cos(angle) * 0.85, Math.sin(angle) * 0.85];
            });
        const inner = outline.map(([x, y]) => [x * 0.46, y * 0.46]);
        const facets = [];
        for (let index = 0; index < 6; index++) {
            const next = (index + 1) % 6;
            facets.push([outline[index], outline[next], inner[index]]);
            facets.push([outline[next], inner[next], inner[index]]);
            facets.push([inner[index], inner[next], [0, 0]]);
        }
        return facets.map((points, index) => {
            const center = points.reduce((sum, point) => [sum[0] + point[0] / 3, sum[1] + point[1] / 3], [0, 0]);
            const length = Math.hypot(...center) || 1;
            return {
                points, center, index,
                direction: [center[0] / length, center[1] / length],
                distance: 0.7 + (index % 5) * 0.22,
                spin: ((index % 2 ? 1 : -1) * (0.16 + (index % 4) * 0.12)),
            };
        });
    }

    function getFacetPose(facet, progress, reducedMotion) {
        const fracture = reducedMotion ? 0 : Math.pow(Math.max(0, Math.min(1, progress)), 1.25);
        return {
            x: facet.direction[0] * facet.distance * fracture,
            y: facet.direction[1] * facet.distance * fracture,
            rotation: facet.spin * fracture,
        };
    }

    function buildStar(radius) {
        return Array.from({ length: 8 }, (_, index) => {
            const angle = index * Math.PI / 4 - Math.PI / 4;
            const length = index % 2 ? radius * 0.22 : radius;
            return [Math.cos(angle) * length, Math.sin(angle) * length];
        });
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { getProgress, buildFacets, getFacetPose, buildStar };
    }
    if (typeof document === 'undefined') return;

    const body = document.body;
    const canvas = document.getElementById('gate-canvas');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const theme = body.dataset.gate;
    const facets = buildFacets(theme);
    const schemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    const themeButton = document.getElementById('gate-theme-toggle');
    const motionButton = document.getElementById('gate-motion-toggle');
    let mode = 'auto';
    try { mode = localStorage.getItem('kaleidxscope-appearance') || 'auto'; } catch { /* Storage is optional. */ }
    if (!['auto', 'light', 'dark'].includes(mode)) mode = 'auto';
    let paused = false;
    let width = 0;
    let height = 0;
    let currentProgress = 0;
    let targetProgress = 0;
    let frame = 0;
    let lastTime = 0;
    let dark = false;
    const progressElement = document.querySelector('.gate-scroll-progress');

    function reduced() { return paused || motionMedia.matches; }

    function applyAppearance() {
        dark = mode === 'dark' || (mode === 'auto' && schemeMedia.matches);
        body.dataset.appearance = dark ? 'dark' : 'light';
        themeButton.textContent = { auto: '外观：自动', light: '外观：浅色', dark: '外观：深色' }[mode];
        themeButton.setAttribute('aria-label', `当前${themeButton.textContent}，点击切换外观`);
        requestDraw();
    }

    function updateMotion() {
        body.dataset.motion = reduced() ? 'paused' : 'active';
        motionButton.textContent = reduced() ? '动效：静止' : '动效：开启';
        motionButton.setAttribute('aria-pressed', String(reduced()));
        if (reduced()) currentProgress = targetProgress;
        requestDraw();
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        const ratio = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.5 : 2);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        updateScroll();
    }

    function updateScroll() {
        targetProgress = getProgress(window.scrollY, document.documentElement.scrollHeight, height);
        body.style.setProperty('--gate-progress', targetProgress.toFixed(4));
        progressElement.style.transform = `scaleX(${targetProgress})`;
        requestDraw();
    }

    function requestDraw() {
        if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
    }

    function polygon(points) {
        context.beginPath();
        points.forEach(([x, y], index) => {
            if (index === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        });
        context.closePath();
    }

    function drawEmblem(theme, size, time, progress) {
        const tick = reduced() ? 0 : time / 1000;
        const ink = dark ? 'rgba(227,241,255,.85)' : 'rgba(37,70,99,.7)';
        const circle = (radius, color, line = 1) => {
            context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2);
            context.strokeStyle = color; context.lineWidth = line; context.stroke();
        };
        const ray = (angle, start, end, color, line = 1) => {
            context.beginPath(); context.moveTo(Math.cos(angle) * start, Math.sin(angle) * start);
            context.lineTo(Math.cos(angle) * end, Math.sin(angle) * end);
            context.strokeStyle = color; context.lineWidth = line; context.stroke();
        };
        context.save();
        if (theme === 'blue') {
            // Water caustics: expanding rings and gently travelling wave ribbons.
            for (let index = 0; index < 7; index++) {
                const phase = (tick * .08 + index / 7) % 1;
                circle(size * (.28 + phase * 1.3 + progress * .3), `rgba(65,173,234,${(1 - phase) * .45})`, 1.5);
            }
            for (let index = 0; index < 5; index++) {
                context.beginPath();
                for (let step = -40; step <= 40; step++) {
                    const x = step / 40 * size * 1.3;
                    const y = Math.sin(step / 8 + tick * .35 + index) * size * .09 + (index - 2) * size * .16;
                    if (step === -40) context.moveTo(x, y); else context.lineTo(x, y);
                }
                context.strokeStyle = 'rgba(80,176,229,.4)'; context.stroke();
            }
        } else if (theme === 'white') {
            // A sacred aperture opens into feather-like blades, not glass fragments.
            context.rotate(tick * .025);
            for (let index = 0; index < 16; index++) {
                context.save(); context.rotate(index * Math.PI / 8);
                context.translate(size * progress * .35, 0);
                context.beginPath(); context.moveTo(size * .22, 0);
                context.bezierCurveTo(size * .45, -size * .3, size * .9, -size * .25, size * 1.06, 0);
                context.bezierCurveTo(size * .7, size * .08, size * .44, size * .04, size * .22, 0);
                context.fillStyle = dark ? 'rgba(226,236,250,.12)' : 'rgba(155,180,205,.14)';
                context.fill(); context.strokeStyle = ink; context.lineWidth = .7; context.stroke(); context.restore();
            }
            circle(size * .17, ink); circle(size * 1.17, ink, .6);
        } else if (theme === 'red') {
            // Six angular blades unlock in counter-rotating layers, unlike the violet rose.
            for (let layer = 0; layer < 2; layer++) {
                context.save(); context.rotate((layer ? -1 : 1) * tick * .09 + layer * Math.PI / 6);
                for (let index = 0; index < 6; index++) {
                    context.save(); context.rotate(index * Math.PI / 3);
                    context.translate(size * progress * .28, 0);
                    polygon([[size * .18, 0], [size * .57, -size * .2], [size * (1 + progress * .2), -size * .04], [size * .64, size * .12]]);
                    const flame = context.createLinearGradient(0, 0, size, 0);
                    flame.addColorStop(0, 'rgba(255,73,112,.03)'); flame.addColorStop(1, 'rgba(255,108,120,.35)');
                    context.fillStyle = flame; context.fill(); context.strokeStyle = 'rgba(255,125,145,.85)';
                    context.lineWidth = 1.5; context.shadowColor = '#e74065'; context.shadowBlur = dark ? 12 : 0; context.stroke(); context.restore();
                }
                context.restore();
            }
            circle(size * .2, 'rgba(255,178,186,.9)', 2);
        } else if (theme === 'purple') {
            // Eight violet petals unfurl in three counter-rotating layers.
            const petals = 8;
            for (let layer = 0; layer < 3; layer++) {
                context.save(); context.rotate((layer % 2 ? -1 : 1) * tick * .04 + layer * .2 + progress * .45);
                for (let index = 0; index < petals; index++) {
                    context.save(); context.rotate(index * Math.PI * 2 / petals);
                    const radius = size * (.48 + layer * .2 + progress * layer * .13);
                    context.beginPath(); context.moveTo(0, 0);
                    context.bezierCurveTo(radius, -radius * .7, radius * 1.3, radius * .5, 0, 0);
                    context.strokeStyle = `rgba(166,112,232,${.7 - layer * .16})`;
                    context.lineWidth = 1.4; context.stroke(); context.restore();
                }
                context.restore();
            }
            circle(size * 1.12, ink, 1); circle(size * 1.2, ink, .6);
        } else if (theme === 'black') {
            // Eclipse: the darkness stays solid as an accretion ring bends around it.
            for (let index = 0; index < 6; index++) {
                context.save(); context.rotate(-.35 + Math.sin(tick * .15) * .05);
                context.beginPath(); context.ellipse(0, 0, size * (1.15 + index * .045), size * (.29 + index * .04), 0, 0, Math.PI * 2);
                context.strokeStyle = `rgba(153,154,210,${.5 - index * .06})`; context.lineWidth = 1; context.stroke(); context.restore();
            }
            const glow = context.createRadialGradient(0, 0, size * .53, 0, 0, size * .9);
            glow.addColorStop(0, 'rgba(167,169,231,.6)'); glow.addColorStop(1, 'rgba(128,133,213,0)');
            context.fillStyle = glow; context.beginPath(); context.arc(0, 0, size * .9, 0, Math.PI * 2); context.fill();
            context.beginPath(); context.arc(size * progress * .1, 0, size * .56, 0, Math.PI * 2);
            context.fillStyle = dark ? '#080b13' : '#293243'; context.fill();
        } else if (theme === 'yellow') {
            // A mechanical solar iris: only abstract rings, ticks and luminous sectors.
            circle(size * 1.06, 'rgba(222,183,42,.6)', 1);
            for (let layer = 0; layer < 3; layer++) {
                context.save(); context.rotate(tick * (layer % 2 ? -.07 : .05));
                for (let index = 0; index < 8; index++) {
                    const angle = index * Math.PI / 4;
                    context.beginPath();
                    context.arc(0, 0, size * (.44 + layer * .22 + progress * layer * .12), angle, angle + Math.PI * .17);
                    context.strokeStyle = `rgba(235,193,61,${.85 - layer * .18})`;
                    context.lineWidth = layer === 1 ? size * .055 : 2; context.stroke();
                }
                context.restore();
            }
            for (let index = 0; index < 48; index++) ray(index * Math.PI / 24, size * 1.1, size * (index % 4 ? 1.13 : 1.2), 'rgba(222,183,42,.65)', 1);
            context.save(); context.rotate(-tick * .06);
            polygon(Array.from({ length: 4 }, (_, i) => [Math.cos(i * Math.PI / 2) * size * .23, Math.sin(i * Math.PI / 2) * size * .23]));
            context.strokeStyle = 'rgba(245,211,114,.9)'; context.lineWidth = 2; context.stroke(); context.restore();
            circle(size * .08, 'rgba(245,211,114,.9)', 2);
        } else if (theme === 'hope') {
            // Navy trophy at the centre of the rainbow medal, with a crown and orbiting stars.
            const gradient = context.createLinearGradient(-size * .3, -size * .5, size * .3, size * .5);
            gradient.addColorStop(0, '#f288c9'); gradient.addColorStop(.5, '#a68be4'); gradient.addColorStop(1, '#48c7db');
            context.fillStyle = gradient;
            polygon([[-size * .28, -size * .3], [size * .28, -size * .3], [size * .2, size * .1], [size * .06, size * .23], [size * .06, size * .38], [size * .19, size * .44], [-size * .19, size * .44], [-size * .06, size * .38], [-size * .06, size * .23], [-size * .2, size * .1]]); context.fill();
            polygon([[-size * .18, -size * .42], [-size * .22, -size * .59], [-size * .08, -size * .52], [0, -size * .66], [size * .08, -size * .52], [size * .22, -size * .59], [size * .18, -size * .42]]); context.fill();
            for (const sign of [-1, 1]) { context.beginPath(); context.ellipse(sign * size * .29, -size * .12, size * .14, size * .2, sign * .4, 0, Math.PI * 2); context.strokeStyle = gradient; context.lineWidth = 3; context.stroke(); }
            for (let index = 0; index < 12; index++) {
                const angle = index * Math.PI / 6 + tick * .025;
                context.save(); context.translate(Math.cos(angle) * size * .8, Math.sin(angle) * size * .8); polygon(buildStar(size * .034)); context.fillStyle = gradient; context.fill(); context.restore();
            }
        } else if (theme === 'error') {
            // A fractured transmission portal, with corrupt glyphs instead of prism facets.
            const glyphs = ['区会', '縺壊', '譁化', '欠損', '繧零', '遘相', '荳界', '▒▒'];
            for (let row = 0; row < 12; row++) {
                const y = (row - 5.5) * size * .16;
                const shift = Math.sin(tick * .65 + row * 1.8) * size * (.06 + progress * .3);
                const left = -size * .82 + shift;
                const length = size * (1.64 - (row % 3) * .18);
                context.fillStyle = dark ? 'rgba(110,35,70,.18)' : 'rgba(165,68,113,.1)';
                context.fillRect(left, y, length, size * .13);
                context.strokeStyle = row % 2 ? 'rgba(230,90,145,.65)' : 'rgba(52,183,199,.5)';
                context.lineWidth = 1; context.strokeRect(left, y, length, size * .13);
                context.font = `${size * .065}px monospace`;
                context.fillStyle = dark ? 'rgba(224,173,197,.8)' : 'rgba(114,44,76,.85)';
                context.fillText(glyphs[row % glyphs.length] + ' / ' + ('00' + row.toString(16)).slice(-2) + ' / ░ ▒ ─', left + size * .04, y + size * .09);
            }
            context.save(); context.rotate(-.08);
            context.strokeStyle = 'rgba(229,88,140,.7)'; context.lineWidth = 2;
            context.strokeRect(-size * .98, -size * 1.09, size * 1.96, size * 2.18); context.restore();
            context.font = `${size * .11}px monospace`; context.fillStyle = ink;
            context.fillText('区会 / 接続不可', -size * .55, size * 1.22);
        }
        context.restore();
    }

    function draw(time) {
        frame = 0;
        const delta = lastTime ? Math.min(time - lastTime, 64) : 16;
        lastTime = time;
        currentProgress += (targetProgress - currentProgress) * (1 - Math.exp(-delta / 160));
        const fracture = reduced() ? 0 : currentProgress;
        context.clearRect(0, 0, width, height);
        const mobile = width < 760;
        const size = Math.min(mobile ? width * 0.42 : width * 0.21, height * 0.34, 310);
        const centerX = mobile ? width * 0.76 : width * 0.76;
        const centerY = mobile ? height * 0.34 : Math.min(height * 0.44, 410);
        const palette = { blue: 207, white: 215, purple: 272, black: 235, yellow: 48, red: 349, error: 320 };
        const hues = theme === 'prism' ? [184, 201, 231, 259, 190, 222]
            : palette[theme] !== undefined ? Array.from({ length: 6 }, (_, index) => palette[theme] + index * 4)
                : [43, 338, 277, 217, 184, 153];
        const drift = reduced() ? 0 : Math.sin(time / 4300) * 0.018;
        context.save();
        context.translate(centerX, centerY);
        context.rotate(theme === 'prism' ? 0.16 + drift : theme === 'final' ? 0 : drift);
        drawEmblem(theme, size, time, fracture);
        const glass = ['prism', 'home'].includes(theme);

        // Only crystalline scenes carry fracture geometry; other gates have their own emblems.
        if (glass) {
        // Architectural orbit lines, rather than another full-screen glow blob.
        context.save();
        context.rotate(-0.32);
        for (let index = 0; index < 3; index++) {
            context.beginPath();
            context.ellipse(0, 0, size * (1.28 + index * 0.24), size * (0.47 + index * 0.15), 0, 0, Math.PI * 2);
            context.strokeStyle = `hsla(${hues[index]}, ${dark ? 64 : 48}%, ${dark ? 72 : 42}%, ${dark ? 0.24 : 0.19})`;
            context.lineWidth = index === 0 ? 1.2 : 0.6;
            context.stroke();
        }
        context.restore();
        }

        if (theme === 'hope') {
            for (let index = 0; index < 6; index++) {
                context.beginPath();
                context.arc(0, 0, size * 0.98, index * Math.PI / 3, (index + 1) * Math.PI / 3 + 0.015);
                context.strokeStyle = `hsla(${hues[index]}, 74%, ${dark ? 70 : 50}%, 0.8)`;
                context.lineWidth = 3;
                context.stroke();
            }
            context.beginPath();
            context.arc(0, 0, size * 1.06, 0, Math.PI * 2);
            context.strokeStyle = dark ? 'rgba(211,226,255,.24)' : 'rgba(59,77,113,.24)';
            context.lineWidth = 0.8;
            context.stroke();
        }

        if (glass) facets.forEach((facet) => {
            const pose = getFacetPose(facet, theme === 'error' ? .25 + fracture * .75 : fracture, reduced());
            if (theme === 'error' && !reduced()) pose.x += Math.sin(time / 650 + facet.index * 2) * .045;
            context.save();
            context.translate(pose.x * size, pose.y * size);
            context.translate(facet.center[0] * size, facet.center[1] * size);
            context.rotate(pose.rotation);
            const points = facet.points.map(([x, y]) => [(x - facet.center[0]) * size, (y - facet.center[1]) * size]);
            const hue = hues[facet.index % hues.length];
            const gradient = context.createLinearGradient(-size * 0.6, -size, size * 0.8, size);
            gradient.addColorStop(0, `hsla(${hue}, 78%, ${dark ? 82 : 95}%, ${dark ? 0.75 : 0.9})`);
            gradient.addColorStop(0.38, `hsla(${hue}, 65%, ${dark ? 48 : 73}%, ${dark ? 0.22 : 0.38})`);
            gradient.addColorStop(0.7, `hsla(${hues[(facet.index + 2) % 6]}, 65%, ${dark ? 60 : 82}%, ${dark ? 0.36 : 0.56})`);
            gradient.addColorStop(1, `hsla(${hue}, 80%, ${dark ? 90 : 98}%, 0.88)`);
            polygon(points);
            context.fillStyle = gradient;
            context.fill();
            context.strokeStyle = dark ? 'rgba(211,240,255,.63)' : 'rgba(255,255,255,.92)';
            context.lineWidth = 1;
            context.stroke();
            // Thin spectral edge makes the fracture legible without high-intensity flashes.
            context.translate(1.6, -0.7);
            polygon(points);
            context.strokeStyle = `hsla(${hue}, 85%, ${dark ? 75 : 50}%, 0.32)`;
            context.lineWidth = 0.65;
            context.stroke();
            context.restore();
        });

        if (theme === 'final') {
            for (let ring = 0; ring < 4; ring++) {
                const radius = size * (.72 + ring * .16 + fracture * ring * .1);
                const points = Array.from({ length: 6 }, (_, i) => {
                    const angle = i * Math.PI / 3 - Math.PI / 2;
                    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
                });
                for (let i = 0; i < 6; i++) {
                    context.beginPath(); context.moveTo(...points[i]); context.lineTo(...points[(i + 1) % 6]);
                    context.strokeStyle = `hsla(${hues[i]}, 80%, ${dark ? 72 : 48}%, ${.85 - ring * .17})`;
                    context.lineWidth = ring === 2 ? 7 : 1.5; context.stroke();
                }
            }
            for (let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3 + (reduced() ? 0 : time / 15000);
                context.save(); context.translate(Math.cos(angle) * size * .98, Math.sin(angle) * size * .98);
                context.rotate(angle + Math.PI / 4); context.fillStyle = `hsl(${hues[i]}, 75%, 65%)`;
                context.fillRect(-size * .055, -size * .055, size * .11, size * .11); context.restore();
            }
            const star = size * (0.3 + fracture * 0.12);
            polygon(buildStar(star));
            context.shadowColor = '#d1f4ff';
            context.shadowBlur = 26;
            context.fillStyle = dark ? '#edfbff' : '#36536a';
            context.fill();
            context.shadowBlur = 0;
        }
        context.restore();

        // Sparse, deterministic dust. Mobile renders half as many particles.
        const count = mobile ? 12 : 24;
        for (let index = 0; index < count; index++) {
            const x = ((index * 239 + 71) % 997) / 997 * width;
            const y = ((index * 137 + 43) % 701) / 701 * height;
            context.fillStyle = `hsla(${hues[index % 6]}, 55%, ${dark ? 80 : 45}%, ${dark ? 0.3 : 0.18})`;
            context.fillRect(x, y + (reduced() ? 0 : Math.sin(time / 5000 + index) * 5), 1.4, 1.4);
        }
        // Idle frames stop when reduced motion is enabled or the tab is hidden.
        if (!reduced() || Math.abs(targetProgress - currentProgress) > 0.001) requestDraw();
    }

    themeButton.addEventListener('click', () => {
        mode = { auto: 'dark', dark: 'light', light: 'auto' }[mode];
        try { localStorage.setItem('kaleidxscope-appearance', mode); } catch { /* Continue without persistence. */ }
        applyAppearance();
    });
    motionButton.addEventListener('click', () => { paused = !paused; updateMotion(); });
    schemeMedia.addEventListener('change', applyAppearance);
    motionMedia.addEventListener('change', updateMotion);
    window.addEventListener('scroll', updateScroll, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
        else requestDraw();
    });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(updateScroll).observe(document.querySelector('.container'));
    applyAppearance();
    updateMotion();
    resize();
})();
