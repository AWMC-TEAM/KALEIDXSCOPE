/* Shared, progressively enhanced navigation. Guide content and its IDs stay intact. */
(function () {
    'use strict';
    const gates = [
        { key: 'blue', path: 'BLUEKALEIDXSCOPE', name: '青の扉', display: ['蒼の', '始まり。'], note: '青春ちほー', art: 'blue' },
        { key: 'white', path: 'WHITEKALEIDXSCOPE', name: '白の扉', display: ['白き', '祈り。'], note: '神々の領域', art: 'white' },
        { key: 'purple', path: 'PURPLEKALEIDXSCOPE', name: '紫の扉', display: ['紫の', '残響。'], note: '薔薇の記憶', art: 'purple' },
        { key: 'black', path: 'BLACKKALEIDXSCOPE', name: '黒の扉', display: ['黒の', '深淵。'], note: '静寂の向こうへ', art: 'black' },
        { key: 'yellow', path: 'YELLOWKALEIDXSCOPE', name: '黄の扉', display: ['光の', '遊び場。'], note: '七色の出会い', art: 'yellow' },
        { key: 'red', path: 'REDKALEIDXSCOPE', name: '紅の扉', display: ['紅の', '覚醒。'], note: '龍の領域', art: 'red' },
        { key: 'prism', path: 'PRISMKALEIDXSCOPE', name: 'プリズムタワー', display: ['光は、', '砕ける。'], note: '屈折から崩壊へ', art: 'prism_tower' },
        { key: 'error', path: 'ERRORKALEIDXSCOPE', name: '■■■の扉', display: ['世界が、', '壊れる。'], note: '位相不明・接続異常', art: null },
        { key: 'hope', path: 'HOPKALEIDXSCOPE', name: '希望の扉', display: ['それでも、', '希望を。'], note: '光を取り戻す', art: 'hope' },
        { key: 'final', path: 'FINALKALEIDXSCOPE', name: '最終の扉', display: ['すべての', '光を。'], note: '万華鏡の終着点', art: 'final' },
    ];
    if (typeof module !== 'undefined' && module.exports) module.exports = { gates };
    if (typeof document === 'undefined') return;
    const current = gates.find(gate => location.pathname.includes(`/${gate.path}/`));
    const home = !current;
    const prefix = home ? '' : '../';
    const body = document.body;
    const container = document.querySelector('.container');
    if (!container) return;
    body.classList.add('gate-experience', `theme-${current?.key || 'home'}`);
    body.dataset.gate = current?.key || 'home';
    const make = (tag, className, text) => {
        const element = document.createElement(tag);
        element.className = className;
        if (text) element.textContent = text;
        return element;
    };
    document.querySelector('.gate-atmosphere')?.remove();
    const atmosphere = make('div', 'gate-atmosphere');
    atmosphere.setAttribute('aria-hidden', 'true');
    atmosphere.innerHTML = '<div class="gate-grid"></div><canvas id="gate-canvas"></canvas>';
    body.prepend(atmosphere);
    if (!document.querySelector('.gate-scroll-progress')) body.prepend(make('div', 'gate-scroll-progress'));
    document.querySelector('.gate-topbar')?.remove();
    const bar = make('nav', 'gate-topbar');
    bar.setAttribute('aria-label', 'サイト設定');
    bar.innerHTML = `<a class="back-home-link" href="${prefix}index.html">${home ? '万華鏡 / KALEIDXSCOPE' : '← すべての扉'}</a><span class="gate-wordmark">光を辿る、ひとつの旅。</span><div class="gate-settings"><button id="gate-theme-toggle" type="button">外观：自动</button><button id="gate-motion-toggle" type="button" aria-pressed="false">动效：开启</button></div>`;
    container.prepend(bar);
    container.querySelector(':scope > .back-home-link')?.remove();
    let header = container.querySelector('header') || container.querySelector('.activity-banner');
    if (header) {
        const subtitles = [...header.querySelectorAll('.subtitle, .banner-subtitle')];
        const notice = header.querySelector('.background-notice');
        const oldTitle = header.querySelector('h1')?.textContent || '';
        header.replaceChildren();
        header.className = 'gate-hero';
        const eyebrow = make('p', 'gate-eyebrow', home ? '十の扉、一つの物語。' : `${String(gates.indexOf(current) + 1).padStart(2, '0')} / ${current.note}`);
        const display = make('p', 'gate-display');
        display.setAttribute('aria-hidden', 'true');
        const words = home ? ['光の先へ、', 'その先へ。'] : current.display;
        words.forEach((word, index) => display.append(make('span', index ? 'gate-display-outline' : '', word)));
        const title = make('h1', 'gate-hero-title', home ? 'KALEIDXSCOPE · 万華鏡の旅' : current.name);
        title.title = oldTitle;
        header.append(eyebrow, display, title);
        if (home) header.append(make('p', 'subtitle', '从六色之门出发，穿过碎裂的棱镜与异常的世界，寻找希望，抵达最终挑战。'));
        else subtitles.forEach(subtitle => header.append(subtitle));
        const bottom = make('div', 'gate-hero-bottom');
        bottom.innerHTML = `<a class="gate-explore" href="#gate-guide">${home ? '扉を選ぶ' : '攻略を読む'} <span>↓</span></a><span>${current?.key === 'error' ? '接続は不安定です。' : 'スクロールで、光がほどける。'}</span>`;
        header.append(bottom, make('span', 'gate-coordinate', home ? '始点 / すべてはここから' : '屈折 / 分解 / 再生'));
        if (current?.art) {
            const art = make('figure', 'gate-hero-art');
            art.innerHTML = `<img src="${prefix}KALEIDXSCOPE_PNG/${current.art}.png" alt="${current.name}" width="444" height="128"><figcaption>ゲーム内の扉 / ${current.name}</figcaption>`;
            header.append(art);
        }
        if (notice) header.after(notice);
    }
    document.querySelector('.gate-journey')?.remove();
    const journey = make('nav', 'gate-journey');
    journey.setAttribute('aria-label', 'すべての扉');
    gates.forEach((gate, index) => {
        const link = make('a', '', gate.name);
        link.href = `${prefix}${gate.path}/index.html`;
        link.dataset.gateLink = gate.key;
        link.prepend(make('span', '', String(index + 1).padStart(2, '0')));
        if (gate === current) link.setAttribute('aria-current', 'page');
        journey.append(link);
    });
    header?.after(journey);
    let marker = document.getElementById('gate-guide');
    if (!marker) {
        marker = make('div', 'gate-section-marker');
        marker.id = 'gate-guide';
        journey.after(marker);
    }
    marker.textContent = home ? '扉の一覧 / 十の光を巡る' : '解放の記録 / 攻略と進捗';
    if (home) {
        const grid = document.querySelector('.doors-grid');
        if (grid) {
            grid.replaceChildren();
            grid.className = 'gate-door-list';
            gates.forEach((gate, index) => {
                const row = make('a', 'gate-door');
                row.href = `${gate.path}/index.html`;
                row.dataset.color = gate.key;
                row.innerHTML = `<span class="gate-door-number">${String(index + 1).padStart(2, '0')}</span><span class="gate-door-text"><strong>${gate.name}</strong><small>${gate.note}</small></span>${gate.art ? `<img src="KALEIDXSCOPE_PNG/${gate.art}.png" alt="" loading="lazy" width="222" height="64">` : '<span class="gate-error-seal" aria-hidden="true">接続異常</span>'}<span class="gate-door-arrow" aria-hidden="true">↗</span>`;
                grid.append(row);
            });
        }
        document.querySelector('.doors-section > h2')?.remove();
    } else {
        const index = gates.indexOf(current);
        const continuation = make('nav', 'gate-continuation');
        continuation.setAttribute('aria-label', '旅を続ける');
        const previous = gates[index - 1];
        const next = gates[index + 1];
        continuation.innerHTML = `<a href="${previous ? `${prefix}${previous.path}/index.html` : `${prefix}index.html`}"><small>前の扉</small>${previous?.name || 'すべての扉'} ←</a><a href="${next ? `${prefix}${next.path}/index.html` : `${prefix}index.html`}"><small>${next ? '次の扉' : '旅の始まりへ'}</small>${next?.name || 'すべての扉'} →</a>`;
        container.append(continuation);
    }
    clearTimeout(window.gateBootTimeout);
    delete document.documentElement.dataset.gateBoot;
})();
