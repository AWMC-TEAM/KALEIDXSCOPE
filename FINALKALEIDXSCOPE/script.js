// 最终相 KALEIDXSCOPE（FINAL SEQUENCE）- 通关希望の扉（Phase #8）后直接解锁
// 使用集中配置：单曲 Xaleid◆scopiX（artist xi），仅 Re:MASTER

// 国行 2026/10/1 10:00:00（北京时间）开放
const OPEN_TIME = new Date('2026-10-01T10:00:00+08:00');

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
            statusEl.textContent = '✅ FINAL SEQUENCE · KALEIDXSCOPE 已经开放！';
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

// 初始化
initExpandClick();
updateCountdown();
setInterval(updateCountdown, 1000);
if (typeof SongDetail !== 'undefined') SongDetail.init();
if (typeof SongDisplay !== 'undefined') SongDisplay.initDisplaySettings('final');
