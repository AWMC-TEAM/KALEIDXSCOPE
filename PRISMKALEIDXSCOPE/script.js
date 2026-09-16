// 棱镜塔（プリズムタワー）- 7sRef区域4 第27格（2000km）
// 使用集中配置
const { songs, gate } = SongsConfig.prism;
const PRISM_GATE_TRACK1_POOL = gate.track1;
const PRISM_GATE_TRACK2_POOL = gate.track2;
const PRISM_GATE_TRACK3_FIXED = gate.track3;

// 国行 2026/10/1 10:00:00（北京时间）开放
const OPEN_TIME = new Date('2026-10-01T10:00:00+08:00');
const STORAGE_KEY_PREFIX = 'prism-gate';

const noCoverSvg = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23ddd%22 width=%2280%22 height=%2280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2210%22%3E%E6%9A%82%E6%97%A0%E6%9B%B2%E7%BB%98%3C/text%3E%3C/svg%3E";

function escapeText(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(value) {
    return escapeText(value).replace(/"/g, '&quot;');
}

function getCoverUrl(song) {
    return song.cover || `https://assets.awmc.cc/covers/${song.id}.png`;
}

// ----- 塔内随机选曲 -----
let prismGateChallengeRun = [];

function randomPickPrismGateChallenge() {
    const t1 = PRISM_GATE_TRACK1_POOL[Math.floor(Math.random() * PRISM_GATE_TRACK1_POOL.length)];
    const t2 = PRISM_GATE_TRACK2_POOL[Math.floor(Math.random() * PRISM_GATE_TRACK2_POOL.length)];
    return [t1.id, t2.id, PRISM_GATE_TRACK3_FIXED.id];
}

function renderPrismGateChallengeRun() {
    const track1El = document.getElementById('gate-track1-songs');
    const track2El = document.getElementById('gate-track2-songs');
    const track3El = document.getElementById('gate-track3-songs');
    if (!track1El || !track2El || !track3El) return;

    const selected1 = prismGateChallengeRun[0] || null;
    const selected2 = prismGateChallengeRun[1] || null;

    function renderTrack(pool, selectedId) {
        return pool.map(s => {
            const isSelected = s.id === selectedId;
            return `
                <div class="gate-song-chip expandable ${isSelected ? 'selected' : ''}" data-id="${escapeAttr(s.id)}" data-umami-event="gate-chip-expand-prism" data-umami-event-song-id="${escapeAttr(s.id)}" data-umami-event-song-name="${escapeAttr(s.name)}">
                    <div class="gate-chip-cover" data-song-id="${escapeAttr(s.id)}" title="双击/长按查看乐曲详情">
                        <img src="${escapeAttr(getCoverUrl(s))}" alt="${escapeAttr(s.name)}" loading="lazy" onerror="this.onerror=null;this.src='${noCoverSvg}'">
                    </div>
                    <span class="gate-chip-name">${escapeText(s.name)}</span>
                </div>
            `;
        }).join('');
    }

    track1El.innerHTML = renderTrack(PRISM_GATE_TRACK1_POOL, selected1);
    track2El.innerHTML = renderTrack(PRISM_GATE_TRACK2_POOL, selected2);
    track3El.innerHTML = `
        <div class="gate-song-chip expandable selected" data-id="${escapeAttr(PRISM_GATE_TRACK3_FIXED.id)}" data-umami-event="gate-chip-expand-prism" data-umami-event-song-id="${escapeAttr(PRISM_GATE_TRACK3_FIXED.id)}" data-umami-event-song-name="${escapeAttr(PRISM_GATE_TRACK3_FIXED.name)}">
            <div class="gate-chip-cover" data-song-id="${escapeAttr(PRISM_GATE_TRACK3_FIXED.id)}" title="双击/长按查看乐曲详情">
                <img src="${escapeAttr(getCoverUrl(PRISM_GATE_TRACK3_FIXED))}" alt="${escapeAttr(PRISM_GATE_TRACK3_FIXED.name)}" loading="lazy" onerror="this.onerror=null;this.src='${noCoverSvg}'">
            </div>
            <span class="gate-chip-name">${escapeText(PRISM_GATE_TRACK3_FIXED.name)}</span>
        </div>
    `;
}

function initPrismGateChallengeSection() {
    const expanded = localStorage.getItem('prism-gate-challenge-expanded') !== 'false';
    const body = document.getElementById('gate-challenge-body');
    const toggle = document.getElementById('gate-challenge-toggle');
    const icon = toggle?.querySelector('.toggle-icon');
    const text = toggle?.querySelector('.toggle-text');
    function setExpanded(exp) {
        if (body) body.style.display = exp ? 'block' : 'none';
        if (toggle) toggle.setAttribute('aria-expanded', String(exp));
        if (icon) icon.textContent = exp ? '▲' : '▼';
        if (text) text.textContent = exp ? '收起' : '展开';
        localStorage.setItem('prism-gate-challenge-expanded', String(exp));
    }
    setExpanded(expanded);
    toggle?.addEventListener('click', () => {
        setExpanded(localStorage.getItem('prism-gate-challenge-expanded') === 'false');
    });
}

function initExpandClick() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('.expandable');
        const active = document.querySelector('.expandable.expanded');
        if (target) {
            if (active && active !== target) active.classList.remove('expanded');
            target.classList.toggle('expanded');
        } else if (active) {
            active.classList.remove('expanded');
        }
    });
}

document.getElementById('gate-random').addEventListener('click', () => {
    prismGateChallengeRun = randomPickPrismGateChallenge();
    renderPrismGateChallengeRun();
    const body = document.getElementById('gate-challenge-body');
    if (body && body.style.display === 'none') {
        body.style.display = 'block';
        localStorage.setItem('prism-gate-challenge-expanded', 'true');
        const toggle = document.getElementById('gate-challenge-toggle');
        const icon = toggle?.querySelector('.toggle-icon');
        const text = toggle?.querySelector('.toggle-text');
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
        if (icon) icon.textContent = '▲';
        if (text) text.textContent = '收起';
    }
    if (typeof umami !== 'undefined') umami.track('gate-challenge-random-prism', { track1: prismGateChallengeRun[0], track2: prismGateChallengeRun[1] });
});

// ----- 区域开放倒计时（沿用红门实现） -----
function formatRemaining(ms, includeSeconds = false) {
    if (ms <= 0) return '即将开放';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return includeSeconds ? `${d} 天 ${h} 时 ${m} 分 ${s} 秒` : `${d} 天 ${h} 小时 ${m} 分`;
}

function updateCountdown() {
    const now = new Date();
    const section = document.getElementById('countdown-section');
    const titleEl = document.querySelector('#countdown-section .countdown-title');
    const noteEl = document.querySelector('#countdown-section .countdown-note');
    const displayEl = document.getElementById('countdown-display');
    const statusEl = document.getElementById('countdown-status');

    if (now >= OPEN_TIME) {
        if (section) section.classList.add('open');
        if (titleEl) titleEl.textContent = '区域已开放';
        if (noteEl) noteEl.style.display = 'none';
        if (displayEl) displayEl.style.display = 'none';
        if (statusEl) {
            statusEl.textContent = '✅ プリズムタワー（棱镜塔）已经开放！';
            statusEl.className = 'countdown-status open';
        }
        return;
    }

    const diff = OPEN_TIME - now;
    const daysEl = document.getElementById('countdown-days');
    const hoursEl = document.getElementById('countdown-hours');
    const minutesEl = document.getElementById('countdown-minutes');
    const secondsEl = document.getElementById('countdown-seconds');
    if (daysEl) daysEl.textContent = String(Math.floor(diff / 86400000)).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');

    if (section) section.classList.remove('open');
    if (titleEl) titleEl.textContent = '区域开放倒计时';
    if (noteEl) noteEl.style.display = '';
    if (displayEl) displayEl.style.display = '';
    if (statusEl) {
        statusEl.textContent = `⏳ 距离开放还有 ${formatRemaining(diff, true)}`;
        statusEl.className = 'countdown-status closed';
    }
}

// 初始化
renderPrismGateChallengeRun();
updateCountdown();
setInterval(updateCountdown, 1000);
initExpandClick();
initPrismGateChallengeSection();
if (typeof SongDetail !== 'undefined') SongDetail.init();
if (typeof SongDisplay !== 'undefined') SongDisplay.initDisplaySettings('prism');
