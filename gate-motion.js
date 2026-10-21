/* Kaleidoscope motion layer: iris transitions, reveals, light-follow cards and prism bursts.
   Everything here is decorative or a shortcut; the guides work identically without it. */
(function () {
    'use strict';
    const SPECTRUM = [43, 338, 277, 217, 184, 153];
    const GLYPHS = '区会縺壊譁化欠損繧零遘相荳界▒░▓#%&@';

    // Particle physics stays pure so it can be tested without a DOM.
    function createShards(x, y, count, power, random = Math.random) {
        return Array.from({ length: count }, (_, index) => {
            const angle = random() * Math.PI * 2;
            const speed = power * (0.35 + random() * 0.65);
            return {
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - power * 0.35,
                size: 4 + random() * 7,
                spin: (random() - 0.5) * 0.4,
                rotation: random() * Math.PI,
                hue: SPECTRUM[index % SPECTRUM.length] + (random() - 0.5) * 18,
                life: 1,
                decay: 0.012 + random() * 0.012,
                sides: index % 3 === 0 ? 4 : 3,
            };
        });
    }

    function stepShards(shards, dt) {
        const frames = dt / 16.67;
        return shards.filter((shard) => {
            shard.vx *= Math.pow(0.97, frames);
            shard.vy = shard.vy * Math.pow(0.97, frames) + 0.32 * frames;
            shard.x += shard.vx * frames;
            shard.y += shard.vy * frames;
            shard.rotation += shard.spin * frames;
            shard.life -= shard.decay * frames;
            return shard.life > 0;
        });
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = { createShards, stepShards };
    if (typeof document === 'undefined') return;

    const body = document.body;
    const root = document.documentElement;
    if (!body.classList.contains('gate-experience')) {
        delete root.dataset.kxIris;
        return;
    }
    const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const still = () => motionMedia.matches || body.dataset.motion === 'paused';
    const make = (tag, className) => {
        const element = document.createElement(tag);
        element.className = className;
        return element;
    };
    body.classList.add('kx-motion');

    /* ---------- Iris curtain: opens on arrival, closes on internal navigation ---------- */
    const iris = make('div', 'kx-iris');
    iris.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 12; index++) {
        const blade = make('span', 'kx-blade');
        blade.style.setProperty('--i', index);
        blade.style.setProperty('--h', SPECTRUM[index % SPECTRUM.length] + (index > 5 ? 12 : 0));
        iris.append(blade);
    }
    const core = make('div', 'kx-iris-core');
    core.innerHTML = '<svg viewBox="-50 -50 100 100"><polygon points="0,-42 36.4,-21 36.4,21 0,42 -36.4,21 -36.4,-21"/><polygon points="0,-24 20.8,12 -20.8,12"/><polygon points="0,24 -20.8,-12 20.8,-12"/></svg><span>KALEIDXSCOPE</span>';
    iris.append(core);
    body.append(iris);

    const arrival = root.dataset.kxIris;
    delete root.dataset.kxIris;
    let heroStarted = false;
    function startHero() {
        if (heroStarted) return;
        heroStarted = true;
        body.classList.add('kx-ready');
    }
    function openIris(delay) {
        iris.classList.add(arrival === 'full' ? 'is-full' : 'is-quick');
        requestAnimationFrame(() => requestAnimationFrame(() => {
            setTimeout(() => {
                iris.classList.add('is-open');
                setTimeout(startHero, 260);
                // Hide the spent curtain so it never intercepts paint or hit-testing.
                setTimeout(() => { if (iris.classList.contains('is-open')) iris.classList.add('is-idle'); }, 1500);
            }, delay);
        }));
    }
    if (arrival && !still()) {
        try { sessionStorage.setItem('kx-intro', '1'); } catch { /* Optional. */ }
        openIris(arrival === 'full' ? 1150 : 40);
    } else {
        iris.classList.add('is-open', 'is-idle');
        requestAnimationFrame(startHero);
    }

    function navigateThroughIris(href) {
        try { sessionStorage.setItem('kx-iris', 'closed'); } catch { /* Optional. */ }
        iris.classList.remove('is-idle', 'is-full', 'is-quick');
        iris.classList.add('is-closing');
        // Force the open pose to paint before transitioning back to closed.
        void iris.offsetWidth;
        iris.classList.remove('is-open');
        setTimeout(() => { window.location.href = href; }, 500);
    }
    document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a[href]');
        if (!link || link.target === '_blank' || link.hasAttribute('download') || still()) return;
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin || !/\.html$|\/$/.test(url.pathname)) return;
        if (url.pathname === window.location.pathname && url.hash) return;
        event.preventDefault();
        if (link.classList.contains('gate-door')) burst(event.clientX, event.clientY, 26, 9);
        navigateThroughIris(url.href);
    });
    // Returning via the back/forward cache must not leave the curtain closed.
    window.addEventListener('pageshow', (event) => {
        if (!event.persisted) return;
        iris.classList.remove('is-closing');
        iris.classList.add('is-open', 'is-idle');
    });

    /* ---------- Hero: per-character rise with a spectral light sweep ---------- */
    const display = document.querySelector('.gate-display');
    if (display) {
        let order = 0;
        display.querySelectorAll('span').forEach((line) => {
            const text = line.textContent;
            line.textContent = '';
            [...text].forEach((character) => {
                const char = make('span', 'kx-char');
                char.textContent = character;
                char.dataset.char = character;
                char.style.setProperty('--d', order++);
                line.append(char);
            });
        });
        if (body.dataset.gate === 'error') {
            // The broken gate decodes its title from noise instead of rising cleanly.
            const chars = [...display.querySelectorAll('.kx-char')];
            const decode = () => {
                if (still()) return;
                let tick = 0;
                const timer = setInterval(() => {
                    tick++;
                    chars.forEach((char, index) => {
                        const settled = tick > 6 + index * 2;
                        char.textContent = settled ? char.dataset.char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
                    });
                    if (tick > 8 + chars.length * 2) clearInterval(timer);
                }, 55);
            };
            const waitForReady = setInterval(() => {
                if (body.classList.contains('kx-ready')) { clearInterval(waitForReady); decode(); }
            }, 50);
        }
    }
    document.querySelectorAll('.gate-hero > :not(.gate-display)').forEach((element, index) => {
        element.classList.add('kx-hero-item');
        element.style.setProperty('--d', index);
    });

    /* ---------- Scroll reveal for every panel and card present at load ---------- */
    const revealSelector = [
        '.gate-section-marker', '.gate-door', '.countdown-section', '.schedule-section', '.requirements-section',
        '.gate-challenge-section', '.reference-section', '.remaining-section', '.stat-card', '.controls',
        '.song-detail-hint', '.filter-section', '.song-card', '.panel', '.info-section', '.community-section',
        '.gate-continuation', '.background-notice', '.run-song-card', '.pool-song-card',
    ].join(',');
    if ('IntersectionObserver' in window && !still()) {
        const observer = new IntersectionObserver((entries) => {
            let batch = 0;
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.style.setProperty('--kx-delay', `${Math.min(batch++, 8) * 55}ms`);
                entry.target.classList.add('kx-in');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -6% 0px' });
        document.querySelectorAll(revealSelector).forEach((element) => {
            if (element.closest('.modal, .song-display-settings-modal, .kx-iris')) return;
            element.classList.add('kx-reveal');
            observer.observe(element);
        });
        // Elements whose reveal finished drop the hook so later re-renders are never hidden.
        document.addEventListener('animationend', (event) => {
            if (event.animationName === 'kx-reveal') event.target.classList.remove('kx-reveal', 'kx-in');
        });
    }

    /* ---------- Light-follow spotlight and holographic tilt ---------- */
    const litSelector = '.gate-door, .song-card, .run-song-card, .pool-song-card, .stat-card, .gate-song-chip, .reference-item, .remaining-item, .gate-continuation a, .gate-hero-art, .activation-card';
    let lit = null;
    document.addEventListener('pointermove', (event) => {
        if (!finePointer.matches || still()) return;
        const target = event.target.closest?.(litSelector);
        if (lit && lit !== target) {
            lit.classList.remove('kx-lit');
            lit.style.removeProperty('--kx-rx');
            lit.style.removeProperty('--kx-ry');
        }
        lit = target;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        target.classList.add('kx-lit');
        target.style.setProperty('--kx-mx', `${(x * 100).toFixed(1)}%`);
        target.style.setProperty('--kx-my', `${(y * 100).toFixed(1)}%`);
        target.style.setProperty('--kx-rx', `${((0.5 - y) * 10).toFixed(2)}deg`);
        target.style.setProperty('--kx-ry', `${((x - 0.5) * 12).toFixed(2)}deg`);
    }, { passive: true });
    document.addEventListener('pointerleave', () => lit?.classList.remove('kx-lit'));

    /* ---------- Prism burst overlay ---------- */
    const canvas = make('canvas', 'kx-burst');
    canvas.setAttribute('aria-hidden', 'true');
    body.append(canvas);
    const context = canvas.getContext('2d');
    let shards = [];
    let frame = 0;
    let last = 0;
    function sizeCanvas() {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(window.innerWidth * ratio);
        canvas.height = Math.round(window.innerHeight * ratio);
        context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function render(time) {
        const dt = last ? Math.min(time - last, 48) : 16.67;
        last = time;
        shards = stepShards(shards, dt);
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
        const darkScene = body.dataset.appearance === 'dark';
        shards.forEach((shard) => {
            context.save();
            context.translate(shard.x, shard.y);
            context.rotate(shard.rotation);
            context.globalAlpha = Math.min(1, shard.life * 1.6);
            context.beginPath();
            for (let side = 0; side < shard.sides; side++) {
                const angle = side * Math.PI * 2 / shard.sides;
                const radius = shard.sides === 4 && side % 2 ? shard.size * 0.45 : shard.size;
                context[side ? 'lineTo' : 'moveTo'](Math.cos(angle) * radius, Math.sin(angle) * radius);
            }
            context.closePath();
            context.fillStyle = `hsla(${shard.hue}, 82%, ${darkScene ? 70 : 62}%, .85)`;
            context.fill();
            context.strokeStyle = 'rgba(255,255,255,.8)';
            context.lineWidth = 0.8;
            context.stroke();
            context.restore();
        });
        if (shards.length) frame = requestAnimationFrame(render);
        else { frame = 0; last = 0; context.clearRect(0, 0, window.innerWidth, window.innerHeight); }
    }
    function burst(x, y, count = 22, power = 7) {
        if (!context || still()) return;
        if (!frame) sizeCanvas();
        shards = shards.concat(createShards(x, y, count, power)).slice(-260);
        if (!frame) frame = requestAnimationFrame(render);
    }
    window.addEventListener('resize', () => { if (frame) sizeCanvas(); }, { passive: true });
    window.KaleidxBurst = burst;

    const centerOf = (element) => {
        const rect = element.getBoundingClientRect();
        return [rect.left + rect.width / 2, rect.top + rect.height / 2];
    };
    // Capture phase: page scripts re-render the list on change, detaching the checkbox.
    document.addEventListener('change', (event) => {
        const input = event.target;
        if (input.type === 'checkbox' && input.checked && input.closest('.song-card, .run-song-card, .pool-song-card, .song-checkbox')) {
            burst(...centerOf(input), 18, 6);
        }
    }, true);
    document.addEventListener('click', (event) => {
        const button = event.target.closest('button[id*="random"], button[id*="gacha"], button[id*="draw"], .gacha-btn');
        if (button) burst(...centerOf(button), 30, 8);
    }, true);

    /* ---------- Whole-card tap target: tapping a song card toggles its checkbox ---------- */
    document.addEventListener('click', (event) => {
        const card = event.target.closest('.song-card, .run-song-card');
        if (!card || event.target.closest('input, label, a, button, select, textarea, .song-cover, .gate-chip-cover, .remaining-cover-wrap')) return;
        if (String(window.getSelection?.() || '').trim()) return;
        const checkbox = card.querySelector('input[type="checkbox"]');
        if (checkbox && !checkbox.disabled) checkbox.click();
    });

    /* ---------- Stat numbers pop when they change; a full clear earns a cascade ---------- */
    const percent = document.getElementById('progress-percent');
    let lastPercent = percent?.textContent;
    const statObserver = new MutationObserver((records) => {
        const seen = new Set();
        records.forEach((record) => {
            const number = record.target.nodeType === 1 ? record.target : record.target.parentElement;
            if (!number || seen.has(number)) return;
            seen.add(number);
            number.classList.remove('kx-pop');
            void number.offsetWidth;
            number.classList.add('kx-pop');
        });
        if (percent && percent.textContent !== lastPercent) {
            if (percent.textContent.trim() === '100%' && lastPercent !== undefined) {
                const [x, y] = centerOf(percent);
                burst(x, y, 70, 13);
                setTimeout(() => burst(window.innerWidth * 0.25, window.innerHeight * 0.4, 40, 11), 180);
                setTimeout(() => burst(window.innerWidth * 0.75, window.innerHeight * 0.4, 40, 11), 320);
            }
            lastPercent = percent.textContent;
        }
    });
    document.querySelectorAll('.stat-number').forEach((number) => statObserver.observe(number, { childList: true, characterData: true, subtree: true }));

    /* ---------- Back-to-top ring that doubles as a reading-progress meter ---------- */
    const top = make('button', 'kx-top');
    top.type = 'button';
    top.setAttribute('aria-label', '回到顶部');
    top.innerHTML = '<span aria-hidden="true">↑</span>';
    body.append(top);
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: still() ? 'auto' : 'smooth' }));
    const toggleTop = () => top.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.9);
    window.addEventListener('scroll', toggleTop, { passive: true });
    toggleTop();
})();
