/* KALEIDXSCOPE 开场动画：单一时间轴驱动画布、文字分镜与 Web Audio 合成音乐 / 音效（无外部音频文件） */
(function () {
    'use strict';

    const BEAT = 0.45; // 133⅓ BPM，所有分镜都对齐节拍
    const at = (b) => b * BEAT;
    const END_BEAT = 112;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const GATES = [
        { name: '蓝色之门', jp: '青の扉', img: 'blue.png', area: '青春区域', num: 29, unit: '首曲目', desc: '29 首青春区域曲目 · 逐首点亮进度', colors: ['#38bdf8', '#0ea5e9', '#a5f3fc'] },
        { name: '白色之门', jp: '白の扉', img: 'white.png', area: '天界区域 8 · 背景「Latent Kingdom」', num: 1100, unit: 'km', desc: '奏音 / 大国奏音曲目池 · 1PC 内完成全部 TRACK', colors: ['#f8fafc', '#c7d2fe', '#e2e8f0'] },
        { name: '紫色之门', jp: '紫の扉', img: 'purple.png', area: 'BLACK ROSE 区域 10', num: 800, unit: 'km', desc: '言ノ葉Project 曲目 · 门曲 有明 / Ariake', colors: ['#a855f7', '#7c3aed', '#f0abfc'] },
        { name: '黑色之门', jp: '黒の扉', img: 'black.png', area: 'メトロポリス区域 9 · 1400km', num: 11, unit: '首 KOP 钥匙曲', desc: '完美挑战 雨露霜雪 · 门曲 宙天', colors: ['#94a3b8', '#475569', '#e2e8f0'] },
        { name: '黄色之门', jp: '黄の扉', img: 'yellow.png', area: '七彩区域', num: 12, unit: '选 1 · 抽卡', desc: '钥匙「抽卡」：12 首中随机一首 · 门曲 Åntinomiε', colors: ['#facc15', '#f59e0b', '#fef08a'], gacha: true },
        { name: '红色之门', jp: '紅の扉', img: 'red.png', area: '龙之区域 4 · 1200km', num: 10, unit: '首钥匙曲', desc: '完美挑战 忙シー日 · 门曲 FLΛME/FRΦST', colors: ['#ef4444', '#dc2626', '#fca5a5'] },
    ];

    const CHAPTERS = [
        { name: '序章', b: 0 },
        ...GATES.map((gate, index) => ({ name: gate.name, b: 16 + index * 8 })),
        { name: '棱镜塔', b: 64 },
        { name: 'ERROR', b: 76 },
        { name: '希望之门', b: 84 },
        { name: '最终相', b: 96 },
        { name: '终幕', b: END_BEAT },
    ];

    const DOORS = [
        ['蓝色之门', '../BLUEKALEIDXSCOPE/index.html', 'blue.png'],
        ['白色之门', '../WHITEKALEIDXSCOPE/index.html', 'white.png'],
        ['紫色之门', '../PURPLEKALEIDXSCOPE/index.html', 'purple.png'],
        ['黑色之门', '../BLACKKALEIDXSCOPE/index.html', 'black.png'],
        ['黄色之门', '../YELLOWKALEIDXSCOPE/index.html', 'yellow.png'],
        ['红色之门', '../REDKALEIDXSCOPE/index.html', 'red.png'],
        ['棱镜塔', '../PRISMKALEIDXSCOPE/index.html', 'prism_tower.png'],
        ['希望之门', '../HOPKALEIDXSCOPE/index.html', 'hope.png'],
        ['最终相', '../FINALKALEIDXSCOPE/index.html', 'final.png'],
        ['■■■の扉', '../ERRORKALEIDXSCOPE/index.html', null],
    ];

    const $ = (selector, root = document) => root.querySelector(selector);
    const body = document.body;
    const canvas = $('#cv');
    const g = canvas.getContext('2d');
    const wedge = document.createElement('canvas');
    const wg = wedge.getContext('2d');

    /* ================= 文字拆分 ================= */
    function split(el) {
        const text = el.textContent;
        el.textContent = '';
        el.setAttribute('aria-label', text);
        [...text].forEach((char, index) => {
            const span = document.createElement('span');
            span.className = 'ch';
            span.setAttribute('aria-hidden', 'true');
            span.textContent = char === ' ' ? ' ' : char;
            span.style.setProperty('--i', index);
            span.style.setProperty('--r', `${(index % 2 ? -1 : 1) * (6 + (index * 7) % 14)}deg`);
            span.style.setProperty('--sx', `${(Math.sin(index * 2.3) * 60).toFixed(0)}vw`);
            span.style.setProperty('--sy', `${(Math.cos(index * 1.7) * 50).toFixed(0)}vh`);
            span.style.setProperty('--sr', `${(index % 2 ? 1 : -1) * (90 + index * 40)}deg`);
            el.appendChild(span);
        });
    }
    document.querySelectorAll('[data-split]').forEach(split);

    const doorGrid = $('.door-grid');
    DOORS.forEach(([name, href, img], index) => {
        const link = document.createElement('a');
        link.href = href;
        link.style.setProperty('--i', index);
        link.setAttribute('aria-label', name);
        link.innerHTML = img
            ? `<img src="../KALEIDXSCOPE_PNG/${img}" alt="${name}" loading="lazy">`
            : `<span class="err">${name}</span>`;
        doorGrid.appendChild(link);
    });
    doorGrid.style.gridTemplateColumns = 'repeat(5, minmax(0, 1fr))';
    if (window.innerWidth < 640) doorGrid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';

    /* ================= 音频引擎 ================= */
    let A = null;
    let master, verbIn, dlyIn, noiseBuf;
    let bus = null; // 每次跳转都会换一组输出，旧声音淡出
    let muted = false;

    function initAudio() {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        try { A = new Ctx(); } catch (error) { A = null; return; }

        const comp = A.createDynamicsCompressor();
        comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4;
        comp.attack.value = 0.004; comp.release.value = 0.2;
        master = A.createGain();
        master.gain.value = 0.8;
        master.connect(comp).connect(A.destination);

        // 卷积混响：程序生成的衰减噪声
        const len = Math.floor(A.sampleRate * 3);
        const ir = A.createBuffer(2, len, A.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const data = ir.getChannelData(ch);
            for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
        }
        const verb = A.createConvolver();
        verb.buffer = ir;
        verbIn = A.createGain(); verbIn.gain.value = 0.55;
        verbIn.connect(verb).connect(master);

        // 3/4 拍乒乓延迟
        const dl = A.createDelay(2), dr = A.createDelay(2), fb = A.createGain();
        const pl = A.createStereoPanner ? A.createStereoPanner() : A.createGain();
        const pr = A.createStereoPanner ? A.createStereoPanner() : A.createGain();
        if (pl.pan) { pl.pan.value = -0.7; pr.pan.value = 0.7; }
        dl.delayTime.value = BEAT * 0.75; dr.delayTime.value = BEAT * 0.75; fb.gain.value = 0.38;
        dlyIn = A.createGain(); dlyIn.gain.value = 0.5;
        dlyIn.connect(dl); dl.connect(pl).connect(master); dl.connect(dr); dr.connect(pr).connect(master); dr.connect(fb).connect(dl);

        noiseBuf = A.createBuffer(1, A.sampleRate * 2, A.sampleRate);
        const nd = noiseBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        newBus();
    }

    function newBus() {
        if (!A) return;
        const now = A.currentTime;
        if (bus) {
            const old = bus;
            [old.dry, old.verb, old.dly].forEach((node) => {
                node.gain.setTargetAtTime(0, now, 0.03);
            });
            setTimeout(() => [old.dry, old.verb, old.dly].forEach((node) => node.disconnect()), 600);
        }
        bus = { dry: A.createGain(), verb: A.createGain(), dly: A.createGain() };
        bus.dry.connect(master); bus.verb.connect(verbIn); bus.dly.connect(dlyIn);
    }

    function out(node, verb = 0, dly = 0, pan = 0) {
        let tail = node;
        if (pan && A.createStereoPanner) {
            const p = A.createStereoPanner();
            p.pan.value = Math.max(-1, Math.min(1, pan));
            node.connect(p);
            tail = p;
        }
        tail.connect(bus.dry);
        if (verb) { const s = A.createGain(); s.gain.value = verb; tail.connect(s).connect(bus.verb); }
        if (dly) { const s = A.createGain(); s.gain.value = dly; tail.connect(s).connect(bus.dly); }
    }

    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

    function env(param, t, peak, attack, decay, floor = 0.0001) {
        param.setValueAtTime(0.0001, t);
        param.exponentialRampToValueAtTime(peak, t + attack);
        param.exponentialRampToValueAtTime(floor, t + attack + decay);
    }

    function noise(t, dur) {
        const src = A.createBufferSource();
        src.buffer = noiseBuf;
        src.loop = true;
        src.start(t, Math.random() * 1.5);
        src.stop(t + dur + 0.05);
        return src;
    }

    function filter(type, freq, q = 0.7) {
        const f = A.createBiquadFilter();
        f.type = type; f.frequency.value = freq; f.Q.value = q;
        return f;
    }

    const SFX = {
        kick(t, gain = 0.9) {
            const o = A.createOscillator(), v = A.createGain();
            o.frequency.setValueAtTime(165, t);
            o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
            env(v.gain, t, gain, 0.003, 0.42);
            o.connect(v); out(v);
            o.start(t); o.stop(t + 0.5);
        },
        snare(t, gain = 0.45) {
            const n = noise(t, 0.25), bp = filter('bandpass', 1900, 0.8), v = A.createGain();
            env(v.gain, t, gain, 0.002, 0.18);
            n.connect(bp).connect(v); out(v, 0.25);
            const o = A.createOscillator(), ov = A.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.1);
            env(ov.gain, t, gain * 0.6, 0.002, 0.1);
            o.connect(ov); out(ov);
            o.start(t); o.stop(t + 0.2);
        },
        hat(t, gain = 0.1, open = false) {
            const n = noise(t, open ? 0.3 : 0.08), hp = filter('highpass', 7600), v = A.createGain();
            env(v.gain, t, gain, 0.001, open ? 0.24 : 0.045);
            n.connect(hp).connect(v); out(v, 0.05, 0, 0.25);
        },
        crash(t, gain = 0.3) {
            const n = noise(t, 2.2), hp = filter('highpass', 4200), v = A.createGain();
            env(v.gain, t, gain, 0.003, 2);
            n.connect(hp).connect(v); out(v, 0.4);
        },
        bass(t, midi, dur, gain = 0.26) {
            const o = A.createOscillator(), lp = filter('lowpass', 420, 4), v = A.createGain();
            o.type = 'sawtooth'; o.frequency.value = mtof(midi);
            lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(260, t + dur);
            v.gain.setValueAtTime(0.0001, t);
            v.gain.exponentialRampToValueAtTime(gain, t + 0.006);
            v.gain.exponentialRampToValueAtTime(gain * 0.5, t + dur * 0.6);
            v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(lp).connect(v); out(v);
            o.start(t); o.stop(t + dur + 0.02);
        },
        pluck(t, midi, gain = 0.08, pan = 0) {
            const o = A.createOscillator(), lp = filter('lowpass', 3200, 6), v = A.createGain();
            o.type = 'square'; o.frequency.value = mtof(midi);
            lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.2);
            env(v.gain, t, gain, 0.003, 0.24);
            o.connect(lp).connect(v); out(v, 0.3, 0.35, pan);
            o.start(t); o.stop(t + 0.3);
        },
        pad(t, chord, dur, gain = 0.05, bright = 1100) {
            const v = A.createGain(), lp = filter('lowpass', bright, 0.6);
            v.gain.setValueAtTime(0.0001, t);
            v.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.7, dur * 0.3));
            v.gain.setValueAtTime(gain, t + dur * 0.8);
            v.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.6);
            lp.connect(v); out(v, 0.6);
            chord.forEach((midi) => [-9, 9].forEach((cents) => {
                const o = A.createOscillator();
                o.type = 'sawtooth'; o.frequency.value = mtof(midi); o.detune.value = cents;
                o.connect(lp); o.start(t); o.stop(t + dur + 0.7);
            }));
        },
        bell(t, freq, gain = 0.12, dur = 2.6, pan = 0) {
            const c = A.createOscillator(), m = A.createOscillator(), mg = A.createGain(), v = A.createGain();
            c.frequency.value = freq; m.frequency.value = freq * 3.5;
            mg.gain.setValueAtTime(freq * 2.2, t); mg.gain.exponentialRampToValueAtTime(1, t + dur * 0.7);
            m.connect(mg).connect(c.frequency);
            env(v.gain, t, gain, 0.003, dur);
            c.connect(v); out(v, 0.6, 0.25, pan);
            const h = A.createOscillator(), hv = A.createGain();
            h.frequency.value = freq * 2; env(hv.gain, t, gain * 0.35, 0.003, dur * 0.5);
            h.connect(hv); out(hv, 0.5, 0, pan);
            [c, m, h].forEach((o) => { o.start(t); o.stop(t + dur + 0.1); });
        },
        whoosh(t, dur = 0.9, gain = 0.32, rising = true) {
            const n = noise(t, dur), bp = filter('bandpass', 400, 1.6), v = A.createGain();
            const [f0, f1] = rising ? [300, 6000] : [6000, 300];
            bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
            v.gain.setValueAtTime(0.0001, t);
            v.gain.exponentialRampToValueAtTime(gain, t + dur * 0.7);
            v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            n.connect(bp).connect(v);
            if (A.createStereoPanner) {
                const p = A.createStereoPanner();
                p.pan.setValueAtTime(-0.8, t); p.pan.linearRampToValueAtTime(0.8, t + dur);
                v.connect(p); p.connect(bus.dry);
                const s = A.createGain(); s.gain.value = 0.3; p.connect(s).connect(bus.verb);
            } else out(v, 0.3);
        },
        riser(t, dur, gain = 0.22) {
            const n = noise(t, dur), hp = filter('highpass', 200, 2), v = A.createGain();
            hp.frequency.setValueAtTime(200, t); hp.frequency.exponentialRampToValueAtTime(7000, t + dur);
            v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(gain, t + dur);
            v.gain.setValueAtTime(0.0001, t + dur + 0.01);
            n.connect(hp).connect(v); out(v, 0.4);
            const o = A.createOscillator(), lp = filter('lowpass', 2400), ov = A.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(880, t + dur);
            ov.gain.setValueAtTime(0.0001, t); ov.gain.exponentialRampToValueAtTime(gain * 0.3, t + dur);
            ov.gain.setValueAtTime(0.0001, t + dur + 0.01);
            o.connect(lp).connect(ov); out(ov, 0.3);
            o.start(t); o.stop(t + dur + 0.05);
        },
        impact(t, gain = 1) {
            const o = A.createOscillator(), v = A.createGain();
            o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(26, t + 1.4);
            env(v.gain, t, gain * 0.95, 0.004, 1.8);
            o.connect(v); out(v, 0.2);
            o.start(t); o.stop(t + 2);
            const n = noise(t, 1), lp = filter('lowpass', 1600), nv = A.createGain();
            lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(200, t + 0.8);
            env(nv.gain, t, gain * 0.6, 0.002, 0.9);
            n.connect(lp).connect(nv); out(nv, 0.8);
            SFX.crash(t, gain * 0.22);
        },
        shatter(t) {
            const n = noise(t, 0.5), hp = filter('highpass', 2600), v = A.createGain();
            env(v.gain, t, 0.55, 0.001, 0.3);
            n.connect(hp).connect(v); out(v, 0.5);
            for (let i = 0; i < 38; i++) {
                const dt = Math.pow(Math.random(), 1.6) * 0.9;
                const o = A.createOscillator(), ov = A.createGain();
                o.type = i % 3 ? 'sine' : 'triangle';
                o.frequency.value = 2200 + Math.random() * 6200;
                env(ov.gain, t + dt, 0.03 + Math.random() * 0.06, 0.001, 0.12 + Math.random() * 0.35);
                o.connect(ov); out(ov, 0.55, 0.1, Math.random() * 2 - 1);
                o.start(t + dt); o.stop(t + dt + 0.6);
            }
            SFX.impact(t, 0.7);
        },
        glitch(t, dur, gain = 0.1) {
            const o = A.createOscillator(), v = A.createGain(), shaper = A.createWaveShaper();
            const curve = new Float32Array(256);
            for (let i = 0; i < 256; i++) curve[i] = Math.round(((i / 128) - 1) * 4) / 4; // 粗糙量化 → 数码碎音
            shaper.curve = curve;
            o.type = 'square';
            v.gain.setValueAtTime(0, t);
            let step = t;
            while (step < t + dur) {
                const len = 0.02 + Math.random() * 0.05;
                o.frequency.setValueAtTime(60 + Math.random() * Math.random() * 2400, step);
                v.gain.setValueAtTime(Math.random() < 0.7 ? gain : 0, step);
                step += len;
            }
            v.gain.setValueAtTime(0, t + dur);
            o.connect(shaper).connect(v); out(v, 0.1, 0.2, Math.random() * 1.4 - 0.7);
            o.start(t); o.stop(t + dur + 0.05);
            const n = noise(t, dur), nv = A.createGain(), bp = filter('bandpass', 1200 + Math.random() * 3000, 3);
            nv.gain.setValueAtTime(0, t);
            for (let s = t; s < t + dur; s += 0.04) nv.gain.setValueAtTime(Math.random() < 0.35 ? gain * 1.4 : 0, s);
            nv.gain.setValueAtTime(0, t + dur);
            n.connect(bp).connect(nv); out(nv);
        },
        drone(t, dur, gain = 0.12) {
            const v = A.createGain(), lp = filter('lowpass', 380, 3);
            lp.frequency.setValueAtTime(200, t); lp.frequency.linearRampToValueAtTime(900, t + dur);
            v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(gain, t + 0.15);
            v.gain.setValueAtTime(gain, t + dur - 0.1); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            lp.connect(v); out(v, 0.3);
            [41, 41.6, 53.3].forEach((midi) => {
                const o = A.createOscillator();
                o.type = 'sawtooth'; o.frequency.value = mtof(midi);
                o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
            });
        },
        swell(t, dur, gain = 0.3) {
            const n = noise(t, dur), lp = filter('lowpass', 300), v = A.createGain();
            lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(9000, t + dur);
            v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(gain, t + dur);
            v.gain.setValueAtTime(0.0001, t + dur + 0.005);
            n.connect(lp).connect(v); out(v, 0.3);
        },
    };

    /* ================= 音序器 ================= */
    const AM = [57, 60, 64], F = [53, 57, 60], C = [48, 52, 55, 60], G = [55, 59, 62], EM = [52, 55, 59];
    const GATE_PROG = [F, G, EM, AM];
    const ARP = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 5, 4, 2, 1, 3];
    const GATE_BELL = [72, 74, 76, 79, 81, 84]; // 每扇门一个上行五声音阶钟声

    function chordAt(b) {
        if (b < 16) return AM;
        if (b < 64) return GATE_PROG[Math.floor((b - 16) / 4) % 4];
        if (b < 68) return C;
        if (b < 72) return G;
        if (b < 84) return AM;
        if (b < 88) return F;
        if (b < 92) return G;
        if (b < 96) return C;
        if (b < 100) return AM;
        if (b < 104) return F;
        if (b < 108) return F;
        return G;
    }
    const arpNote = (chord, i) => chord[i % 3] + 12 * Math.floor(i / 3) + 12;
    const rnd = (seed) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

    function step(s, t) {
        const b = s / 4, sub = s % 4, bi = Math.floor(b);
        const chord = chordAt(b);
        const root = chord[0] - 12;
        const pan = Math.sin(s * 0.7) * 0.6;

        if (b < 16) {
            if (s === 0) { SFX.pad(t, AM, at(12), 0.045, 700); SFX.riser(t + at(4), at(8)); SFX.drone(t, at(12), 0.05); }
            if (b >= 4 && b < 12 && sub % 2 === 0) SFX.pluck(t, arpNote(AM, (s / 2) % 6) + 12, 0.02 + (b - 4) * 0.006, pan);
            if (b === 12) SFX.pad(t, [45, 57, 60, 64, 69], at(4), 0.05, 1600);
            if (b >= 12) {
                SFX.pluck(t, arpNote(AM, ARP[s % 16]), 0.05, pan);
                if (sub === 0) SFX.bass(t, 33, BEAT * 0.9);
            }
            if (b >= 15) SFX.snare(t, 0.12 + sub * 0.06);
            return;
        }
        if (b < 72) {
            const late = b >= 40;
            if (sub === 0) SFX.kick(t);
            if (sub === 2) SFX.hat(t, 0.11, bi % 4 === 3);
            if (late && sub % 2 === 1) SFX.hat(t, 0.045);
            if (sub === 0 && bi % 2 === 1) SFX.snare(t);
            if (sub % 2 === 0) SFX.bass(t, root, BEAT * 0.45);
            SFX.pluck(t, arpNote(chord, ARP[s % 16]), late ? 0.06 : 0.05, pan);
            if (sub === 0 && (bi - 16) % 4 === 0) SFX.pad(t, chord, at(4), 0.03);
            if (b >= 70) SFX.snare(t, 0.15 + (b - 70) * 0.12); // 碎裂前的鼓点填充
            return;
        }
        if (b < 76) {
            if (s === 288) SFX.pad(t, [45, 57, 60, 64, 71], at(4), 0.05, 2400);
            if (sub === 0 && rnd(s) < 0.5) SFX.bell(t, mtof(arpNote(AM, Math.floor(rnd(s + 9) * 6)) + 12), 0.04, 1.4, pan);
            return;
        }
        if (b < 84) {
            if (s === 304) SFX.drone(t, at(8));
            if (rnd(s) < 0.22) SFX.glitch(t, 0.05 + rnd(s + 3) * 0.2, 0.07);
            if (rnd(s + 1) < 0.12) SFX.kick(t, 0.5);
            return;
        }
        if (b < 96) {
            if (sub === 0 && (bi - 84) % 4 === 0) SFX.pad(t, chord.concat(chord[0] + 12), at(4), 0.045, 1800);
            if (sub % 2 === 0) SFX.pluck(t, arpNote(chord, ARP[(s / 2) % 16]) + 12, 0.035, pan);
            if (b >= 88 && sub === 0 && bi % 2 === 0) SFX.kick(t, 0.6);
            if (b >= 92 && sub === 2) SFX.hat(t, 0.06);
            if (sub === 0 && bi % 4 === 0) SFX.bass(t, root, at(3.5), 0.18);
            return;
        }
        if (b < 104) {
            if (s === 384) { SFX.pad(t, AM, at(4), 0.04); SFX.riser(t, at(8), 0.26); }
            if (s === 400) SFX.pad(t, F, at(4), 0.05);
            if (s === 408) SFX.swell(t, at(2), 0.3);
            if (sub === 0) SFX.kick(t, 0.8);
            const roll = b < 100 ? sub % 2 === 0 : true;
            if (roll) SFX.snare(t, 0.1 + (b - 96) * 0.04);
            SFX.pluck(t, arpNote(chord, ARP[s % 16]), 0.04 + (b - 96) * 0.004, pan);
            return;
        }
        if (b < END_BEAT) {
            if (sub === 0) SFX.kick(t, 1);
            if (sub === 0 && bi % 2 === 1) SFX.snare(t, 0.5);
            SFX.hat(t, sub === 2 ? 0.12 : 0.05, sub === 2 && bi % 2 === 1);
            SFX.bass(t, root, BEAT * 0.22, 0.28);
            SFX.pluck(t, arpNote(chord, ARP[s % 16]), 0.06, pan);
            SFX.pluck(t, arpNote(chord, ARP[(s + 8) % 16]) + 12, 0.03, -pan);
            if (sub === 0 && bi % 4 === 0) SFX.pad(t, chord.concat(chord[0] + 12), at(4), 0.04, 2600);
            return;
        }
        if (s === END_BEAT * 4) {
            SFX.pad(t, [36, 48, 52, 55, 60, 64, 67], 6, 0.05, 2200);
            SFX.bass(t, 24, 4, 0.3);
            [72, 76, 79, 84, 88, 91].forEach((midi, index) => SFX.bell(t + index * 0.11, mtof(midi), 0.06, 4, (index / 2.5) - 1));
        }
    }

    /* ================= 时钟 ================= */
    let t0 = 0, fakeNow = 0, lastPerf = 0, paused = false, started = false;
    function now() { return A ? A.currentTime : fakeNow; }
    function tick() {
        const perf = performance.now() / 1000;
        if (!A && started && !paused) fakeNow += Math.min(0.1, perf - lastPerf);
        lastPerf = perf;
    }
    const time = () => now() - t0;

    const LOOK = 0.18;
    let nextStep = 0;
    let cueIndex = 0, cueAudioIndex = 0;

    /* ================= 视觉状态 ================= */
    let W = 0, H = 0, DPR = 1, R = 0;
    const hex2rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const pal = [[56, 189, 248], [168, 85, 247], [250, 204, 21]].map((c) => c.slice());
    let palTarget = pal.map((c) => c.slice());
    const look = { intensity: 0.15, targetIntensity: 0.15, speed: 0.3, segments: 12, rainbow: 0, rainbowTarget: 0, rot: 0 };
    let mode = 'intro';
    let shake = 0;
    const particles = [];
    const rings = [];
    let facets = [];
    let counter = null;

    function setPalette(colors) { palTarget = colors.map(hex2rgb); }

    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, 1.5);
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
        R = Math.ceil(Math.hypot(W, H) / 2) + 4;
        wedge.width = Math.ceil(R * DPR * 0.5); wedge.height = Math.ceil(R * DPR * 0.5);
        doorGrid.style.gridTemplateColumns = W < 640 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))';
    }
    window.addEventListener('resize', resize);
    resize();

    function rgba(c, a) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
    function colorFor(i, t) {
        if (look.rainbow > 0.5) return `hsl(${(i * 47 + t * 60) % 360}, 95%, 65%)`;
        return null;
    }

    function burst(n, speed = 6, colors = pal, life = 1.4) {
        const count = reducedMotion ? Math.floor(n / 4) : n;
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2, v = speed * (0.3 + Math.random());
            particles.push({ x: W / 2, y: H / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: 1 + Math.random() * 3, c: colors[i % colors.length], drag: 0.965 });
        }
    }
    function converge(n, colors = pal, dur = 1.2) {
        const count = reducedMotion ? Math.floor(n / 4) : n;
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2, d = R * (0.7 + Math.random() * 0.5);
            const x = W / 2 + Math.cos(a) * d, y = H / 2 + Math.sin(a) * d;
            const frames = dur * 60 * (0.7 + Math.random() * 0.6);
            particles.push({ x, y, vx: (W / 2 - x) / frames, vy: (H / 2 - y) / frames, life: frames / 60, max: frames / 60, size: 1 + Math.random() * 2.2, c: colors[i % colors.length], drag: 1, streak: true });
        }
    }

    function buildFacets() {
        const outer = Array.from({ length: 6 }, (_, i) => { const a = i * Math.PI / 3 - Math.PI / 2; return [Math.cos(a), Math.sin(a)]; });
        const inner = outer.map(([x, y]) => [x * 0.48, y * 0.48]);
        const list = [];
        for (let i = 0; i < 6; i++) {
            const n = (i + 1) % 6;
            list.push([outer[i], outer[n], inner[i]], [outer[n], inner[n], inner[i]], [inner[i], inner[n], [0, 0]]);
        }
        return list.map((pts, i) => {
            const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
            const len = Math.hypot(cx, cy) || 1;
            return { pts, cx, cy, dx: cx / len, dy: cy / len, dist: 2 + (i % 5) * 0.8, spin: (i % 2 ? 1 : -1) * (1 + (i % 4) * 0.8), hue: i * 20 };
        });
    }

    function doShake(amount) { if (!reducedMotion) shake = Math.max(shake, amount); }
    function flash() {
        const el = $('#flash');
        el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    }
    function setAccent(hex) {
        document.documentElement.style.setProperty('--accent', hex);
    }

    /* ================= 分镜 ================= */
    let currentScene = null;
    function showScene(id) {
        document.querySelectorAll('.scene').forEach((el) => {
            if (el.id !== id) el.classList.remove('on', 'out', 'shattered');
        });
        const el = $('#' + id);
        el.classList.remove('on', 'out', 'shattered');
        void el.offsetWidth; // 重新触发 CSS 动画
        el.classList.add('on');
        currentScene = el;
        return el;
    }
    function outScene() { if (currentScene) currentScene.classList.add('out'); }

    const ENTER = {
        intro() {
            mode = 'intro';
            body.classList.remove('is-error');
            showScene('s-intro');
            setPalette(['#38bdf8', '#a855f7', '#facc15']);
            setAccent('#a855f7');
            look.targetIntensity = 0.12; look.speed = 0.25; look.segments = 12; look.rainbowTarget = 0;
        },
        gate(index) {
            mode = 'gate';
            body.classList.remove('is-error');
            const gate = GATES[index];
            const el = showScene('s-gate');
            $('.gate-no', el).textContent = `GATE 0${index + 1} / 06`;
            $('.gate-img', el).src = `../KALEIDXSCOPE_PNG/${gate.img}`;
            $('.gate-img', el).alt = gate.name;
            const name = $('.gate-name', el);
            name.textContent = gate.name; split(name);
            $('.gate-jp', el).textContent = gate.jp;
            $('.gate-area', el).textContent = gate.area;
            $('.gate-unit', el).textContent = gate.unit;
            $('.gate-desc', el).textContent = gate.desc;
            $('.gate-num', el).textContent = '0';
            counter = { el: $('.gate-num', el), from: time() + 1, dur: 1.3, to: gate.num, gacha: !!gate.gacha };
            setPalette(gate.colors);
            setAccent(gate.colors[0]);
            look.targetIntensity = 0.55 + index * 0.06; look.speed = 0.5 + index * 0.08;
            look.segments = [8, 10, 12, 6, 14, 12][index]; look.rainbowTarget = 0;
            burst(140, 9, gate.colors.map(hex2rgb));
        },
        prism() {
            mode = 'prism';
            body.classList.remove('is-error');
            showScene('s-prism');
            setPalette(['#22d3ee', '#a78bfa', '#f472b6']);
            setAccent('#22d3ee');
            look.targetIntensity = 0.5; look.speed = 0.4; look.segments = 6; look.rainbowTarget = 1;
            facets = buildFacets();
        },
        error() {
            mode = 'error';
            body.classList.add('is-error');
            showScene('s-error');
            setPalette(['#ff00ff', '#00ffff', '#7c3aed']);
            setAccent('#ff00ff');
            look.targetIntensity = 0.45; look.speed = 1.4; look.segments = 5; look.rainbowTarget = 0;
        },
        hope() {
            mode = 'hope';
            body.classList.remove('is-error');
            showScene('s-hope');
            setPalette(['#fbbf24', '#f59e0b', '#fff7d6']);
            setAccent('#f59e0b');
            look.targetIntensity = 0.4; look.speed = 0.22; look.segments = 16; look.rainbowTarget = 0;
            burst(220, 5, ['#fbbf24', '#fff7d6', '#fde68a'].map(hex2rgb), 2.2);
        },
        final() {
            mode = 'final';
            body.classList.remove('is-error');
            showScene('s-final');
            setPalette(['#a855f7', '#38bdf8', '#f8fafc']);
            setAccent('#a855f7');
            look.targetIntensity = 0.25; look.speed = 0.9; look.segments = 12; look.rainbowTarget = 0;
            rings.length = 0;
        },
        end() {
            mode = 'end';
            body.classList.remove('is-error');
            showScene('s-end');
            setAccent('#a855f7');
            look.targetIntensity = 0.32; look.speed = 0.12; look.segments = 12; look.rainbowTarget = 1;
            const bar = $('#fill'); if (bar) bar.style.width = '100%';
        },
    };

    // 时间轴：v = 画面，a = 精确对齐 AudioContext 时间的音效
    const CUES = [
        { b: 0, v: () => ENTER.intro() },
        { b: 0, v: () => converge(120, pal, 2) },
        { b: 4, a: (t) => SFX.whoosh(t, 1.4, 0.18) },
        { b: 8, v: () => converge(260, pal, 1.9) },
        { b: 12, a: (t) => SFX.impact(t), v: () => { flash(); doShake(18); burst(320, 13, ['#38bdf8', '#f8fafc', '#a855f7', '#facc15', '#ef4444'].map(hex2rgb), 1.8); look.targetIntensity = 0.45; look.rainbowTarget = 1; } },
        { b: 15, a: (t) => SFX.whoosh(t, at(1), 0.3), v: () => outScene() },
    ];
    GATES.forEach((gate, index) => {
        const b = 16 + index * 8;
        CUES.push(
            { b, a: (t) => { SFX.bell(t, mtof(GATE_BELL[index]), 0.13); SFX.bell(t + 0.02, mtof(GATE_BELL[index] + 7), 0.05); SFX.crash(t, 0.12); }, v: () => { ENTER.gate(index); flash(); doShake(6); } },
            { b: b + 2.2, a: (t) => { for (let i = 0; i < 5; i++) SFX.pluck(t + i * 0.06, GATE_BELL[index] + [0, 4, 7, 12, 16][i] - 12, 0.03); } },
            { b: b + 7.3, a: (t) => SFX.whoosh(t, at(0.7), 0.26), v: () => outScene() },
        );
    });
    CUES.push(
        { b: 64, a: (t) => { SFX.impact(t, 0.8); SFX.bell(t, mtof(84), 0.1, 3); }, v: () => { ENTER.prism(); flash(); doShake(10); } },
        { b: 72, a: (t) => SFX.shatter(t), v: () => { currentScene && currentScene.classList.add('shattered'); flash(); doShake(22); burst(380, 15, [[255, 255, 255], [125, 211, 252], [244, 114, 182], [250, 204, 21]], 1.6); } },
        { b: 75.4, a: (t) => SFX.glitch(t, 0.3, 0.12), v: () => outScene() },
        { b: 76, a: (t) => SFX.glitch(t, 0.45, 0.14), v: () => { ENTER.error(); doShake(14); } },
        { b: 80, a: (t) => SFX.glitch(t, 0.35, 0.12), v: () => doShake(12) },
        { b: 83, a: (t) => SFX.swell(t, at(1), 0.35) },
        { b: 84, a: (t) => { SFX.impact(t, 0.55); [77, 81, 84, 88].forEach((m, i) => SFX.bell(t + i * 0.09, mtof(m), 0.07, 3.5, i / 2 - 0.75)); }, v: () => { ENTER.hope(); flash(); } },
        { b: 95.3, a: (t) => SFX.whoosh(t, at(0.7), 0.25), v: () => outScene() },
        { b: 96, v: () => { ENTER.final(); converge(300, pal, 3.4); } },
        { b: 100, v: () => converge(400, [[255, 255, 255], [168, 85, 247], [56, 189, 248]], 1.7) },
        { b: 104, a: (t) => { SFX.impact(t, 1.15); SFX.shatter(t + 0.01); }, v: () => {
            flash(); doShake(30);
            burst(520, 18, ['#38bdf8', '#f8fafc', '#a855f7', '#94a3b8', '#facc15', '#ef4444'].map(hex2rgb), 2);
            for (let i = 0; i < 5; i++) rings.push({ born: time() + i * 0.12, life: 1.6 });
            look.targetIntensity = 0.9; look.rainbowTarget = 1; look.segments = 16; look.speed = 1.2;
        } },
        { b: 108, a: (t) => SFX.crash(t, 0.25), v: () => { burst(160, 10, pal, 1.2); for (let i = 0; i < 3; i++) rings.push({ born: time() + i * 0.1, life: 1.3 }); } },
        { b: 111.3, v: () => outScene() },
        { b: END_BEAT, a: (t) => SFX.impact(t, 0.6), v: () => { ENTER.end(); flash(); burst(260, 8, ['#38bdf8', '#f8fafc', '#a855f7', '#facc15', '#ef4444'].map(hex2rgb), 2.6); } },
    );
    CUES.sort((x, y) => x.b - y.b);

    /* ================= 渲染 ================= */
    function drawWedge(t) {
        const ww = wedge.width, wh = wedge.height;
        const step = Math.PI / look.segments;
        wg.setTransform(1, 0, 0, 1, 0, 0);
        wg.clearRect(0, 0, ww, wh);
        wg.globalCompositeOperation = 'lighter';
        const n = 16;
        for (let i = 0; i < n; i++) {
            const k = i / n;
            const r = ((k + t * look.speed * 0.08) % 1) * ww;
            const a = step * (0.5 + 0.45 * Math.sin(t * (0.4 + k) + i * 1.9));
            const x = Math.cos(a) * r, y = Math.sin(a) * r;
            const size = (6 + (i % 5) * 7) * DPR * 0.5 * (0.6 + 0.4 * Math.sin(t * 1.3 + i));
            const fade = Math.sin(Math.PI * ((k + t * look.speed * 0.08) % 1));
            const c = pal[i % 3];
            const alpha = Math.max(0, fade) * 0.75;
            wg.fillStyle = colorFor(i, t) || rgba(c, alpha);
            wg.globalAlpha = look.rainbow > 0.5 ? alpha : 1;
            wg.save();
            wg.translate(x, y);
            wg.rotate(t * (i % 2 ? 0.8 : -0.6) + i);
            wg.beginPath();
            const kind = i % 4;
            if (kind === 0) wg.arc(0, 0, size, 0, Math.PI * 2);
            else if (kind === 1) { wg.moveTo(0, -size * 1.4); wg.lineTo(size, 0); wg.lineTo(0, size * 1.4); wg.lineTo(-size, 0); }
            else if (kind === 2) { wg.moveTo(0, -size); wg.lineTo(size * 0.9, size * 0.7); wg.lineTo(-size * 0.9, size * 0.7); }
            else { wg.rect(-size * 0.3, -size * 1.6, size * 0.6, size * 3.2); }
            wg.closePath();
            wg.fill();
            wg.restore();
        }
        wg.globalAlpha = 1;
        // 光束
        wg.strokeStyle = rgba(pal[2], 0.35);
        wg.lineWidth = 1.2 * DPR * 0.5;
        wg.beginPath();
        for (let i = 0; i < 4; i++) {
            const a = step * (i / 4) + Math.sin(t * 0.7 + i) * step * 0.2;
            wg.moveTo(0, 0); wg.lineTo(Math.cos(a) * ww, Math.sin(a) * ww);
        }
        wg.stroke();
    }

    function drawKaleidoscope(t) {
        drawWedge(t);
        const n = look.segments;
        const step = (Math.PI * 2) / (n * 2);
        g.save();
        g.translate(W / 2, H / 2);
        g.rotate(look.rot);
        g.globalAlpha = look.intensity;
        g.globalCompositeOperation = 'lighter';
        const scale = R / wedge.width;
        for (let i = 0; i < n * 2; i++) {
            g.save();
            g.rotate(i * step);
            if (i % 2) { g.rotate(step); g.scale(1, -1); }
            g.beginPath();
            g.moveTo(0, 0);
            g.arc(0, 0, R, -0.002, step + 0.002);
            g.closePath();
            g.clip();
            g.scale(scale, scale);
            g.drawImage(wedge, 0, 0);
            g.restore();
        }
        g.restore();
    }

    function drawCenterGlow(t) {
        const r = Math.min(W, H) * (0.35 + 0.05 * Math.sin(t * 2));
        const grad = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
        // 浅色调（白门）时压低中心光，避免盖住文字
        const lum = (pal[0][0] + pal[0][1] + pal[0][2]) / 765;
        grad.addColorStop(0, rgba(pal[0], (0.35 * look.intensity + 0.05) * (lum > 0.85 ? 0.45 : 1)));
        grad.addColorStop(1, rgba(pal[0], 0));
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = grad;
        g.fillRect(0, 0, W, H);
    }

    function drawPrism(t) {
        const local = t - at(64);
        const S = Math.min(W, H) * 0.24;
        const assemble = Math.min(1, local / 1.4);
        const ease = 1 - Math.pow(1 - assemble, 3);
        const frac = Math.max(0, (t - at(72)) / 1.6);
        g.save();
        g.translate(W / 2, H / 2);
        g.rotate(local * 0.25);
        g.globalCompositeOperation = 'lighter';
        facets.forEach((f, i) => {
            const fly = (1 - ease) * 4 + frac * f.dist;
            const fade = Math.max(0, 1 - frac * 0.8);
            if (fade <= 0) return;
            g.save();
            g.translate(f.dx * fly * S, f.dy * fly * S);
            g.rotate(f.spin * ((1 - ease) + frac));
            g.beginPath();
            f.pts.forEach(([x, y], k) => (k ? g.lineTo(x * S, y * S) : g.moveTo(x * S, y * S)));
            g.closePath();
            g.fillStyle = `hsla(${(f.hue + t * 80) % 360}, 95%, 62%, ${0.18 * fade})`;
            g.strokeStyle = `rgba(255,255,255,${0.7 * fade})`;
            g.lineWidth = 1.4;
            g.fill(); g.stroke();
            g.restore();
        });
        // 折射光谱：白光入射，七色射出
        if (frac === 0 && local > 1) {
            const a = Math.min(1, (local - 1) / 0.8);
            g.rotate(-local * 0.25);
            g.strokeStyle = `rgba(255,255,255,${0.6 * a})`; g.lineWidth = 3;
            g.beginPath(); g.moveTo(-W, 0); g.lineTo(0, 0); g.stroke();
            for (let k = 0; k < 7; k++) {
                const ang = -0.28 + k * 0.09;
                g.strokeStyle = `hsla(${k * 45}, 100%, 62%, ${0.55 * a})`; g.lineWidth = 4;
                g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(ang) * W, Math.sin(ang) * W); g.stroke();
            }
        }
        g.restore();
    }

    function drawRays(t) {
        const local = t - at(84);
        const a = Math.min(1, local / 1.5) * (local > at(11) ? Math.max(0, 1 - (local - at(11)) / 0.5) : 1);
        g.save();
        g.translate(W / 2, H / 2);
        g.rotate(local * 0.08);
        g.globalCompositeOperation = 'lighter';
        const n = 24;
        for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2;
            const w = 0.03 + 0.02 * Math.sin(t * 1.5 + i);
            const grad = g.createLinearGradient(0, 0, Math.cos(ang) * R, Math.sin(ang) * R);
            grad.addColorStop(0, `rgba(255,236,170,${0.32 * a})`);
            grad.addColorStop(1, 'rgba(255,200,80,0)');
            g.fillStyle = grad;
            g.beginPath(); g.moveTo(0, 0);
            g.arc(0, 0, R, ang - w, ang + w);
            g.closePath(); g.fill();
        }
        g.restore();
    }

    function drawFinal(t) {
        const local = t - at(96);
        if (local < at(8)) {
            // 汇聚环
            g.save(); g.translate(W / 2, H / 2); g.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 6; i++) {
                const p = ((local * 0.5 + i / 6) % 1);
                const r = R * (1 - p);
                g.strokeStyle = `hsla(${i * 60 + local * 40}, 95%, 65%, ${0.5 * p})`;
                g.lineWidth = 2 + p * 4;
                g.beginPath();
                for (let k = 0; k <= 6; k++) {
                    const a = (k / 6) * Math.PI * 2 + local * (i % 2 ? 0.5 : -0.5);
                    const x = Math.cos(a) * r, y = Math.sin(a) * r;
                    k ? g.lineTo(x, y) : g.moveTo(x, y);
                }
                g.stroke();
            }
            g.restore();
        }
    }

    function drawRings(t) {
        g.save(); g.translate(W / 2, H / 2); g.globalCompositeOperation = 'lighter';
        for (let i = rings.length - 1; i >= 0; i--) {
            const ring = rings[i];
            const p = (t - ring.born) / ring.life;
            if (p < 0) continue;
            if (p > 1) { rings.splice(i, 1); continue; }
            const r = R * (1 - Math.pow(1 - p, 3));
            g.strokeStyle = `hsla(${(i * 70 + t * 90) % 360}, 100%, 70%, ${1 - p})`;
            g.lineWidth = 10 * (1 - p) + 1;
            g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
        }
        g.restore();
    }

    function drawParticles(dt) {
        g.globalCompositeOperation = 'lighter';
        const f = dt * 60;
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= dt;
            if (p.life <= 0) { particles.splice(i, 1); continue; }
            const px = p.x, py = p.y;
            p.x += p.vx * f; p.y += p.vy * f;
            p.vx *= Math.pow(p.drag, f); p.vy *= Math.pow(p.drag, f);
            const a = Math.min(1, p.life / p.max * 1.6);
            if (p.streak) {
                g.strokeStyle = rgba(p.c, a);
                g.lineWidth = p.size;
                g.beginPath(); g.moveTo(px - p.vx * 4, py - p.vy * 4); g.lineTo(p.x, p.y); g.stroke();
            } else {
                g.fillStyle = rgba(p.c, a);
                g.beginPath(); g.arc(p.x, p.y, p.size * (0.5 + a), 0, Math.PI * 2); g.fill();
            }
        }
        if (particles.length > 2400) particles.splice(0, particles.length - 2400);
    }

    function glitchPost() {
        const cw = canvas.width, ch = canvas.height;
        const strips = 3 + Math.floor(Math.random() * 6);
        g.save();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = 'source-over';
        for (let i = 0; i < strips; i++) {
            const y = Math.random() * ch, h = 4 + Math.random() * 50 * DPR;
            const dx = (Math.random() - 0.5) * 120 * DPR;
            g.drawImage(canvas, 0, y, cw, h, dx, y, cw, h);
        }
        if (Math.random() < 0.3) {
            g.fillStyle = Math.random() < 0.5 ? 'rgba(255,0,255,0.12)' : 'rgba(0,255,255,0.12)';
            g.fillRect(0, Math.random() * ch, cw, Math.random() * 80 * DPR);
        }
        g.restore();
    }

    function updateCounter(t) {
        if (!counter) return;
        const p = (t - counter.from) / counter.dur;
        if (p < 0) return;
        const e = 1 - Math.pow(1 - Math.min(1, p), 3);
        if (counter.gacha && p < 1) counter.el.textContent = String(1 + Math.floor(Math.random() * 12));
        else if (counter.gacha) counter.el.textContent = '?';
        else counter.el.textContent = String(Math.round(counter.to * e));
        if (p >= 1) counter = null;
    }

    /* ================= HUD ================= */
    const chapterEl = $('#chapter'), fillEl = $('#fill'), barEl = $('#bar'), ticksEl = $('#ticks');
    CHAPTERS.forEach((chapter) => {
        const tick = document.createElement('i');
        tick.style.left = `${(chapter.b / END_BEAT) * 100}%`;
        tick.title = chapter.name;
        ticksEl.appendChild(tick);
    });
    function chapterIndexAt(b) {
        let idx = 0;
        CHAPTERS.forEach((chapter, i) => { if (b >= chapter.b) idx = i; });
        return idx;
    }

    /* ================= 主循环 ================= */
    let lastT = 0;
    function frame() {
        tick();
        const t = started ? time() : performance.now() / 1000;
        const dt = Math.max(0, Math.min(0.05, t - lastT));
        lastT = t;

        if (started && !paused) {
            // 调度音乐与音效（提前 LOOK 秒，用 AudioContext 精确时间）
            if (A) {
                while (nextStep * BEAT / 4 < t + LOOK && nextStep <= END_BEAT * 4) {
                    const st = t0 + nextStep * BEAT / 4;
                    if (st >= now() - 0.02) step(nextStep, st);
                    nextStep++;
                }
                while (cueAudioIndex < CUES.length && at(CUES[cueAudioIndex].b) < t + LOOK) {
                    const cue = CUES[cueAudioIndex++];
                    const st = t0 + at(cue.b);
                    if (cue.a && st >= now() - 0.05) cue.a(st);
                }
            }
            while (cueIndex < CUES.length && at(CUES[cueIndex].b) <= t) {
                const cue = CUES[cueIndex++];
                if (cue.v) cue.v();
            }
            const b = t / BEAT;
            const ci = chapterIndexAt(b);
            chapterEl.textContent = CHAPTERS[ci].name;
            const pct = Math.min(100, (b / END_BEAT) * 100);
            fillEl.style.width = `${pct}%`;
            barEl.setAttribute('aria-valuenow', pct.toFixed(0));
        }

        // 平滑过渡调色板与参数
        const k = 1 - Math.pow(0.02, dt);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pal[i][j] += (palTarget[i][j] - pal[i][j]) * k;
        look.intensity += (look.targetIntensity - look.intensity) * k;
        look.rainbow += (look.rainbowTarget - look.rainbow) * k;
        // 节拍脉冲
        const beatPhase = ((t / BEAT) % 1);
        const pulse = started && mode !== 'intro' && mode !== 'end' ? Math.pow(1 - beatPhase, 4) * 0.25 : 0;
        if (!paused) look.rot += dt * look.speed * 0.25 * (mode === 'error' ? -3 : 1);

        // 背景拖影
        g.setTransform(DPR, 0, 0, DPR, 0, 0);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = mode === 'error' ? 'rgba(5,0,12,0.5)' : 'rgba(5,4,12,0.32)';
        g.fillRect(0, 0, W, H);

        let sx = 0, sy = 0;
        if (shake > 0.2) { sx = (Math.random() - 0.5) * shake; sy = (Math.random() - 0.5) * shake; shake *= Math.pow(0.88, dt * 60); } else shake = 0;
        g.setTransform(DPR, 0, 0, DPR, sx * DPR, sy * DPR);

        const saved = look.intensity;
        look.intensity = Math.min(1, saved + pulse);
        drawKaleidoscope(t);
        look.intensity = saved;
        drawCenterGlow(t);
        if (started) {
            if (mode === 'prism') drawPrism(t);
            if (mode === 'hope') drawRays(t);
            if (mode === 'final') drawFinal(t);
            drawRings(t);
            updateCounter(t);
        }
        drawParticles(paused ? 0 : dt);
        if (mode === 'error' && started && !paused && Math.random() < 0.7) glitchPost();

        $('#wash').style.opacity = (0.1 + pulse * 0.6 + (mode === 'hope' ? 0.12 : 0)).toFixed(3);
        requestAnimationFrame(frame);
    }

    /* ================= 控制 ================= */
    function start() {
        if (started) return;
        initAudio();
        if (A && A.state === 'suspended') A.resume();
        started = true;
        lastPerf = performance.now() / 1000;
        t0 = now() + 0.1;
        lastT = 0;
        body.classList.add('playing');
        nudgeIdle();
    }

    function seek(b) {
        if (!started) return;
        const target = at(b);
        if (A) newBus();
        t0 = now() - target;
        nextStep = Math.ceil(b * 4);
        cueIndex = cueAudioIndex = CUES.findIndex((cue) => cue.b >= b);
        if (cueIndex < 0) cueIndex = cueAudioIndex = CUES.length;
        particles.length = 0; rings.length = 0; counter = null;
        // 直接进入目标章节画面
        if (b >= END_BEAT) {
            ENTER.end();
            if (A) { SFX.impact(now() + 0.02, 0.5); step(END_BEAT * 4, now() + 0.03); }
            cueIndex = cueAudioIndex = CUES.length;
            nextStep = END_BEAT * 4 + 1;
        }
        lastT = target;
    }

    function setPaused(value) {
        if (!started || paused === value) return;
        paused = value;
        body.classList.toggle('paused', paused);
        const btn = $('[data-action="pause"]');
        btn.textContent = paused ? '▶' : '❚❚';
        btn.title = paused ? '继续（空格）' : '暂停（空格）';
        if (A) (paused ? A.suspend() : A.resume());
    }

    function setMuted(value) {
        muted = value;
        const btn = $('[data-action="mute"]');
        btn.classList.toggle('off', muted);
        btn.title = muted ? '取消静音（M）' : '静音（M）';
        if (A) master.gain.setTargetAtTime(muted ? 0 : 0.8, A.currentTime, 0.05);
    }

    function jumpChapter(dir) {
        const b = time() / BEAT;
        const ci = chapterIndexAt(b);
        let next = ci + dir;
        if (dir < 0 && b - CHAPTERS[ci].b > 2) next = ci; // 章节开头附近再按才回到上一章
        next = Math.max(0, Math.min(CHAPTERS.length - 1, next));
        setPaused(false);
        seek(CHAPTERS[next].b);
    }

    document.addEventListener('click', (event) => {
        const el = event.target.closest('[data-action]');
        if (!el) return;
        const action = el.dataset.action;
        if (action === 'start') start();
        if (action === 'pause') setPaused(!paused);
        if (action === 'mute') setMuted(!muted);
        if (action === 'skip') { setPaused(false); seek(END_BEAT); }
        if (action === 'replay') { setPaused(false); seek(0); }
    });

    barEl.addEventListener('click', (event) => {
        const rect = barEl.getBoundingClientRect();
        const b = ((event.clientX - rect.left) / rect.width) * END_BEAT;
        // 吸附到最近的章节起点，保证分镜完整
        let best = CHAPTERS[0];
        CHAPTERS.forEach((chapter) => { if (chapter.b <= b + 2) best = chapter; });
        setPaused(false);
        seek(best.b);
    });

    document.addEventListener('keydown', (event) => {
        if (event.target.closest && event.target.closest('a, input')) return;
        if (!started) {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); start(); }
            return;
        }
        if (event.key === ' ') { event.preventDefault(); setPaused(!paused); }
        else if (event.key === 'm' || event.key === 'M') setMuted(!muted);
        else if (event.key === 'ArrowRight') jumpChapter(1);
        else if (event.key === 'ArrowLeft') jumpChapter(-1);
        else if (event.key === 'Escape') { setPaused(false); seek(END_BEAT); }
        nudgeIdle();
    });

    // 鼠标静止时隐藏控制条
    let idleTimer = 0;
    function nudgeIdle() {
        body.classList.remove('idle');
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => { if (!paused) body.classList.add('idle'); }, 2600);
    }
    ['mousemove', 'touchstart', 'pointerdown'].forEach((type) => document.addEventListener(type, nudgeIdle, { passive: true }));

    // 切到后台时自动暂停，避免音画错位
    document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });

    requestAnimationFrame(frame);
})();
