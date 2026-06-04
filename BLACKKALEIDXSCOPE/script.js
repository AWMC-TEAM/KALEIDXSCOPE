// 使用集中配置
const { songs, gate } = SongsConfig.black;
const BLACK_GATE_TRACK1_POOL = gate.track1;
const BLACK_GATE_TRACK2_POOL = gate.track2;
const BLACK_GATE_TRACK3_FIXED = gate.track3;

const noCoverSvg = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23ddd%22 width=%2280%22 height=%2280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2210%22%3E%E6%9A%82%E6%97%A0%E6%9B%B2%E7%BB%98%3C/text%3E%3C/svg%3E";

// 区域开放时间 2026/04/28 10:00:00 (UTC+8 北京时间)
const OPEN_TIME = new Date('2026-04-28T10:00:00+08:00');

// 门条件切换：次日凌晨 4:00 北京时间
const BLACK_GATE_RESET_HOUR = 4;
// 完美挑战：每日凌晨 0:00 北京时间
const BLACK_PERFECT_RESET_HOUR = 0;

// 黑门 门曲阶段（倒计时用；end 为「下一段开始」的时刻）
const BLACK_GATE_PERIODS = [
    { start: '4.28', end: '5.1', type: 'master', life: 1 },
    { start: '5.1', end: '5.4', type: 'master', life: 10 },
    { start: '5.4', end: '5.7', type: 'master', life: 30 },
    { start: '5.7', end: '5.11', type: 'master', life: 50 },
    { start: '5.11', end: '5.18', type: 'expert', life: 100 },
    { start: '5.18', end: '12.31', type: 'basic', life: 999 }
];

const BLACK_PERFECT_PERIODS = [
    { start: '4.28', end: '5.5', type: 'master', life: 1 },
    { start: '5.5', end: '5.12', type: 'master', life: 10 },
    { start: '5.12', end: '5.19', type: 'expert', life: 50 },
    { start: '5.19', end: '5.26', type: 'basic', life: 100 },
    { start: '5.26', end: '12.31', type: 'basic', life: 300 }
];

function parsePeriodDate(str, year, resetHour) {
    const [m, d] = str.split('.').map(Number);
    return new Date(year, m - 1, d, resetHour, 0, 0);
}

function getCurrentPeriod(periods, year, resetHour) {
    const now = new Date();
    for (let i = 0; i < periods.length; i++) {
        const start = parsePeriodDate(periods[i].start, year, resetHour);
        const end = parsePeriodDate(periods[i].end, year, resetHour);
        if (now >= start && now < end) return { ...periods[i], index: i };
    }
    if (periods.length > 0) {
        const last = periods[periods.length - 1];
        const start = parsePeriodDate(last.start, year, resetHour);
        if (now >= start) return { ...last, index: periods.length - 1 };
    }
    return null;
}

function getNextConditionSwitch(periods, year, resetHour) {
    const period = getCurrentPeriod(periods, year, resetHour);
    if (!period || period.index >= periods.length - 1) return null;
    const nextPeriod = periods[period.index + 1];
    return parsePeriodDate(nextPeriod.start, year, resetHour);
}

function getPeriodStart(periods, year, index, resetHour) {
    return parsePeriodDate(periods[index].start, year, resetHour);
}

function formatSwitchDate(d, resetHour) {
    if (!d) return '';
    const hm = resetHour === 0 ? '00:00' : String(resetHour).padStart(2, '0') + ':00';
    return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
}

function updateScheduleCountdown() {
    const year = 2026;
    const now = new Date();
    const gatePeriod = getCurrentPeriod(BLACK_GATE_PERIODS, year, BLACK_GATE_RESET_HOUR);
    const perfectPeriod = getCurrentPeriod(BLACK_PERFECT_PERIODS, year, BLACK_PERFECT_RESET_HOUR);
    const gateNextSwitch = getNextConditionSwitch(BLACK_GATE_PERIODS, year, BLACK_GATE_RESET_HOUR);
    const perfectNextSwitch = getNextConditionSwitch(BLACK_PERFECT_PERIODS, year, BLACK_PERFECT_RESET_HOUR);
    const fmt = (ms) => {
        if (ms <= 0) return '即将切换';
        const d = Math.floor(ms / 86400000);
        const h = Math.floor((ms % 86400000) / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return `${d} 天 ${h} 小时 ${m} 分`;
    };

    function renderBlock(fillEl, textEl, periodEl, period, nextSwitch, periods, resetHour) {
        if (!period) {
            if (periodEl) {
                periodEl.textContent = '活动尚未开始';
                periodEl.className = 'countdown-period-info countdown-period-info--pending';
                periodEl.style.display = '';
            }
            if (fillEl) fillEl.style.width = '0%';
            if (textEl) textEl.textContent = '—';
            return;
        }
        if (!nextSwitch) {
            if (periodEl) {
                periodEl.textContent = `当前阶段：${period.type.toUpperCase()} LIFE ${period.life}`;
                periodEl.className = 'countdown-period-info countdown-period-info--' + period.type;
                periodEl.style.display = '';
            }
            if (fillEl) fillEl.style.width = '100%';
            if (textEl) {
                textEl.textContent = '当前为最终阶段，无下次切换';
                textEl.className = 'countdown-text countdown-text--final countdown-text--' + period.type;
            }
            return;
        }
        const nextPhase = periods[period.index + 1];
        if (periodEl) {
            periodEl.style.display = '';
            if (nextPhase) {
                periodEl.innerHTML =
                    `<span class="countdown-period-part countdown-period-info--${period.type}">当前阶段：${period.type.toUpperCase()} LIFE ${period.life}</span>` +
                    `<span class="countdown-period-sep"> · </span>` +
                    `<span class="countdown-period-part countdown-period-info--${nextPhase.type}">下个阶段：${nextPhase.type.toUpperCase()} LIFE ${nextPhase.life}</span>`;
                periodEl.className = 'countdown-period-info';
            } else {
                periodEl.textContent = `当前阶段：${period.type.toUpperCase()} LIFE ${period.life}`;
                periodEl.className = 'countdown-period-info countdown-period-info--' + period.type;
            }
        }
        const periodStart = getPeriodStart(periods, year, period.index, resetHour);
        const totalMs = nextSwitch - periodStart;
        const elapsed = now - periodStart;
        const remaining = nextSwitch - now;
        const progress = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
        if (fillEl) {
            fillEl.style.width = progress + '%';
            fillEl.className = 'countdown-fill countdown-fill--' + period.type;
        }
        if (textEl) {
            textEl.textContent = `下次切换：${formatSwitchDate(nextSwitch, resetHour)} · 剩余 ${fmt(remaining)}`;
            textEl.className = 'countdown-text countdown-text--' + period.type;
        }
    }

    renderBlock(
        document.getElementById('black-perfect-fill'),
        document.getElementById('black-perfect-countdown-text'),
        document.getElementById('black-perfect-period'),
        perfectPeriod,
        perfectNextSwitch,
        BLACK_PERFECT_PERIODS,
        BLACK_PERFECT_RESET_HOUR
    );
    renderBlock(
        document.getElementById('black-gate-fill'),
        document.getElementById('black-gate-countdown-text'),
        document.getElementById('black-gate-period'),
        gatePeriod,
        gateNextSwitch,
        BLACK_GATE_PERIODS,
        BLACK_GATE_RESET_HOUR
    );
}

function applyBlackScheduleView() {
    const view = localStorage.getItem('black-gate-schedule-view') || 'countdown';
    const countdownView = document.getElementById('countdown-view');
    const timelineView = document.getElementById('timeline-view');
    const btnCountdown = document.getElementById('view-countdown');
    const btnTimeline = document.getElementById('view-timeline');
    const isTimeline = view === 'timeline';
    if (countdownView) countdownView.style.display = isTimeline ? 'none' : 'block';
    if (timelineView) timelineView.style.display = isTimeline ? 'block' : 'none';
    if (btnCountdown) btnCountdown.classList.toggle('active', !isTimeline);
    if (btnTimeline) btnTimeline.classList.toggle('active', isTimeline);
}

function initBlackScheduleView() {
    const btnCountdown = document.getElementById('view-countdown');
    const btnTimeline = document.getElementById('view-timeline');
    applyBlackScheduleView();
    btnCountdown?.addEventListener('click', () => {
        localStorage.setItem('black-gate-schedule-view', 'countdown');
        applyBlackScheduleView();
    });
    btnTimeline?.addEventListener('click', () => {
        localStorage.setItem('black-gate-schedule-view', 'timeline');
        applyBlackScheduleView();
    });
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
            statusEl.textContent = '✅ 区域已开放！';
            statusEl.className = 'countdown-status open';
        }
        return;
    }

    const diff = OPEN_TIME - now;
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    const daysEl = document.getElementById('countdown-days');
    const hoursEl = document.getElementById('countdown-hours');
    const minutesEl = document.getElementById('countdown-minutes');
    const secondsEl = document.getElementById('countdown-seconds');
    if (daysEl) daysEl.textContent = String(d).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(h).padStart(2, '0');
    if (minutesEl) minutesEl.textContent = String(m).padStart(2, '0');
    if (secondsEl) secondsEl.textContent = String(s).padStart(2, '0');

    if (section) section.classList.remove('open');
    if (titleEl) titleEl.textContent = '区域开放倒计时';
    if (noteEl) noteEl.style.display = '';
    if (displayEl) displayEl.style.display = '';
    if (statusEl) {
        statusEl.textContent = '⏳ 区域尚未开放';
        statusEl.className = 'countdown-status closed';
    }
}

function loadProgress() {
    try {
        const raw = localStorage.getItem('maimai-black-gate-progress');
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function saveProgress(progress) {
    localStorage.setItem('maimai-black-gate-progress', JSON.stringify(progress));
}

let progress = loadProgress();
let showRemainingOnly = false;

function initBlackThemeToggle() {
    const saved = localStorage.getItem('black-gate-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved !== null ? saved === 'dark' : prefersDark;
    document.body.classList.toggle('theme-black', !isDark);
    document.getElementById('theme-toggle-black')?.addEventListener('click', () => {
        const cur = document.body.classList.contains('theme-black');
        document.body.classList.toggle('theme-black', !cur);
        localStorage.setItem('black-gate-theme', cur ? 'dark' : 'light');
    });
}

function updateSongDetailsInCard(container) {
    if (typeof SongDisplay === 'undefined') return;
    const songId = container?.dataset?.songId;
    if (!songId) return;
    const fallback = songs.find(s => s.id === songId) || gate.track1.find(s => s.id === songId) || gate.track2.find(s => s.id === songId) || { id: songId, name: '-' };
    SongDisplay.getMusicDataThen(songId, fallback, (info) => {
        const fields = SongDisplay.getDisplayFields();
        container.innerHTML = SongDisplay.renderSongDetailsHtml(fields, info);
    });
}

function renderSongs() {
    const songsList = document.getElementById('songs-list');
    songsList.innerHTML = '';

    const filteredSongs = showRemainingOnly ? songs.filter(s => !progress[s.id]) : songs;

    if (filteredSongs.length === 0) {
        songsList.innerHTML = '<div class="empty-message">🎉 恭喜！所有钥匙曲目都已完成！</div>';
        return;
    }

    filteredSongs.forEach(song => {
        const songCard = document.createElement('div');
        songCard.className = `song-card ${progress[song.id] ? 'completed' : ''}`;
        const coverUrl = `https://assets.awmc.cc/covers/${song.id}.png`;
        songCard.innerHTML = `
            <div class="song-cover" data-song-id="${song.id}" title="双击/长按查看乐曲详情">
                <img src="${coverUrl}" alt="暂无曲绘" onerror="this.onerror=null;this.src='${noCoverSvg}'">
            </div>
            <label class="song-checkbox">
                <input type="checkbox" data-song-id="${song.id}"
                    data-umami-event="checkbox-song-toggle-black"
                    data-umami-event-song-id="${song.id}"
                    data-umami-event-song-name="${(song.name || '').replace(/"/g, '&quot;')}"
                    ${progress[song.id] ? 'checked' : ''} onchange="toggleSong('${song.id}')">
                <span class="checkmark"></span>
            </label>
            <div class="song-info">
                <div class="song-name">${(song.name || '-').replace(/</g, '&lt;')}</div>
                <div class="song-details" data-song-id="${song.id}"></div>
            </div>
        `;
        songsList.appendChild(songCard);
        const detailsEl = songCard.querySelector('.song-details[data-song-id]');
        if (detailsEl) updateSongDetailsInCard(detailsEl);
    });
}

function toggleSong(songId) {
    progress[songId] = !progress[songId];
    saveProgress(progress);
    updateStats();
    renderSongs();
    updateRemainingList();
    if (typeof umami !== 'undefined') umami.track('checkbox-song-toggle-black', { song_id: songId });
}

function updateStats() {
    const completed = Object.values(progress).filter(Boolean).length;
    const remaining = songs.length - completed;
    const percent = Math.round((completed / songs.length) * 100);
    document.getElementById('completed-count').textContent = completed;
    document.getElementById('remaining-count').textContent = remaining;
    document.getElementById('progress-percent').textContent = percent + '%';
}

let blackGateChallengeRun = [];

function randomPickBlackGateChallenge() {
    const t1 = BLACK_GATE_TRACK1_POOL[Math.floor(Math.random() * BLACK_GATE_TRACK1_POOL.length)];
    const t2 = BLACK_GATE_TRACK2_POOL[Math.floor(Math.random() * BLACK_GATE_TRACK2_POOL.length)];
    return [t1.id, t2.id, BLACK_GATE_TRACK3_FIXED.id];
}

function renderBlackGateChallengeRun() {
    const track1El = document.getElementById('gate-track1-songs');
    const track2El = document.getElementById('gate-track2-songs');
    const track3El = document.getElementById('gate-track3-songs');
    if (!track1El || !track2El || !track3El) return;

    const selected1 = blackGateChallengeRun[0] || null;
    const selected2 = blackGateChallengeRun[1] || null;

    function renderTrack(pool, selectedId) {
        return pool.map(s => {
            const isSelected = s.id === selectedId;
            const coverUrl = `https://assets.awmc.cc/covers/${s.id}.png`;
            return `
                <div class="gate-song-chip expandable ${isSelected ? 'selected' : ''}" data-id="${s.id}" data-umami-event="gate-chip-expand-black" data-umami-event-song-id="${s.id}" data-umami-event-song-name="${(s.name || '').replace(/"/g, '&quot;')}">
                    <div class="gate-chip-cover" data-song-id="${s.id}" title="双击/长按查看乐曲详情">
                        <img src="${coverUrl}" alt="${(s.name || '').replace(/"/g, '&quot;')}" onerror="this.src='${noCoverSvg}'">
                    </div>
                    <span class="gate-chip-name">${(s.name || '').replace(/</g, '&lt;')}</span>
                </div>
            `;
        }).join('');
    }

    track1El.innerHTML = renderTrack(BLACK_GATE_TRACK1_POOL, selected1);
    track2El.innerHTML = renderTrack(BLACK_GATE_TRACK2_POOL, selected2);
    track3El.innerHTML = `
        <div class="gate-song-chip expandable selected" data-id="${BLACK_GATE_TRACK3_FIXED.id}" data-umami-event="gate-chip-expand-black" data-umami-event-song-id="${BLACK_GATE_TRACK3_FIXED.id}" data-umami-event-song-name="${(BLACK_GATE_TRACK3_FIXED.name || '').replace(/"/g, '&quot;')}">
            <div class="gate-chip-cover" data-song-id="${BLACK_GATE_TRACK3_FIXED.id}" title="双击/长按查看乐曲详情">
                <img src="https://assets.awmc.cc/covers/${BLACK_GATE_TRACK3_FIXED.id}.png" alt="${(BLACK_GATE_TRACK3_FIXED.name || '').replace(/"/g, '&quot;')}" onerror="this.src='${noCoverSvg}'">
            </div>
            <span class="gate-chip-name">${(BLACK_GATE_TRACK3_FIXED.name || '').replace(/</g, '&lt;')}</span>
        </div>
    `;
}

function initExpandClick() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('.expandable');
        const active = document.querySelector('.expandable.expanded');
        if (target) {
            if (active && active !== target) active.classList.remove('expanded');
            target.classList.toggle('expanded');
        } else if (active) active.classList.remove('expanded');
    });
}

function initBlackGateChallengeSection() {
    const expanded = localStorage.getItem('black-gate-challenge-expanded') === 'true';
    const body = document.getElementById('gate-challenge-body');
    const toggle = document.getElementById('gate-challenge-toggle');
    const icon = toggle?.querySelector('.toggle-icon');
    const text = toggle?.querySelector('.toggle-text');
    function setExpanded(exp) {
        if (body) body.style.display = exp ? 'block' : 'none';
        if (toggle) toggle.setAttribute('aria-expanded', String(exp));
        if (icon) icon.textContent = exp ? '▲' : '▼';
        if (text) text.textContent = exp ? '收起' : '展开';
        localStorage.setItem('black-gate-challenge-expanded', String(exp));
    }
    setExpanded(expanded);
    toggle?.addEventListener('click', () => {
        setExpanded(localStorage.getItem('black-gate-challenge-expanded') !== 'true');
    });
}

function updateRemainingList() {
    const remainingList = document.getElementById('remaining-list');
    const remainingSongs = songs.filter(s => !progress[s.id]);

    if (remainingSongs.length === 0) {
        remainingList.innerHTML = '<div class="empty-message">🎉 所有钥匙曲目都已完成！您应该会在结算时看到钥匙。</div>';
        return;
    }

    remainingList.innerHTML = remainingSongs.map(song => `
        <div class="remaining-item">
            <div class="remaining-cover-wrap" data-song-id="${song.id}" title="双击/长按查看乐曲详情">
                <img src="https://assets.awmc.cc/covers/${song.id}.png" alt="暂无曲绘" class="remaining-cover" onerror="this.onerror=null;this.src='${noCoverSvg}'">
            </div>
            <div class="remaining-info" data-song-id="${song.id}">
                <strong>${(song.name || '').replace(/</g, '&lt;')}</strong>
            </div>
        </div>
    `).join('');

    remainingList.querySelectorAll('.remaining-info[data-song-id]').forEach(el => {
        SongDisplay && SongDisplay.getMusicDataThen(el.dataset.songId, songs.find(s => s.id === el.dataset.songId), (info) => {
            const fields = SongDisplay.getDisplayFields();
            const tags = SongDisplay.renderSongDetailsHtml(fields, info);
            el.innerHTML = `<strong>${(info.name || '').replace(/</g, '&lt;')}</strong> ${tags ? ' · ' + tags : ''}`;
        });
    });
}

document.getElementById('show-remaining').addEventListener('click', () => {
    showRemainingOnly = true;
    document.getElementById('filter-checkbox').checked = true;
    renderSongs();
    if (typeof umami !== 'undefined') umami.track('button-show-remaining-black');
});

document.getElementById('show-all').addEventListener('click', () => {
    showRemainingOnly = false;
    document.getElementById('filter-checkbox').checked = false;
    renderSongs();
    if (typeof umami !== 'undefined') umami.track('button-show-all-black');
});

document.getElementById('filter-checkbox').addEventListener('change', (e) => {
    showRemainingOnly = e.target.checked;
    renderSongs();
    if (typeof umami !== 'undefined') umami.track('checkbox-filter-black', { checked: e.target.checked });
});

document.getElementById('gate-random').addEventListener('click', () => {
    blackGateChallengeRun = randomPickBlackGateChallenge();
    renderBlackGateChallengeRun();
    if (typeof umami !== 'undefined') umami.track('gate-challenge-random-black', { track1: blackGateChallengeRun[0], track2: blackGateChallengeRun[1] });
});

document.getElementById('reset').addEventListener('click', () => {
    if (confirm('确定要重置所有进度吗？此操作不可恢复。')) {
        progress = {};
        saveProgress(progress);
        updateStats();
        renderSongs();
        updateRemainingList();
        if (typeof umami !== 'undefined') umami.track('black-gate-reset-confirmed');
    }
});

document.getElementById('export-base64').addEventListener('click', () => {
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(progress))));
    navigator.clipboard.writeText(data).then(() => alert('已复制到剪贴板')).catch(() => prompt('请手动复制以下 Base64 数据：', data));
    if (typeof umami !== 'undefined') umami.track('button-export-base64-black');
});

document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'flex';
    document.getElementById('import-error').style.display = 'none';
    if (typeof umami !== 'undefined') umami.track('button-import-black');
});

document.getElementById('modal-close').addEventListener('click', () => document.getElementById('import-modal').style.display = 'none');
document.getElementById('import-cancel').addEventListener('click', () => document.getElementById('import-modal').style.display = 'none');

document.getElementById('import-confirm').addEventListener('click', () => {
    const raw = document.getElementById('import-data').value.trim();
    const errEl = document.getElementById('import-error');
    if (!raw) {
        errEl.textContent = '请输入数据';
        errEl.style.display = 'block';
        return;
    }
    try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(raw))));
        if (typeof decoded !== 'object') throw new Error('Invalid format');
        progress = decoded;
        saveProgress(progress);
        updateStats();
        renderSongs();
        updateRemainingList();
        document.getElementById('import-modal').style.display = 'none';
        if (typeof umami !== 'undefined') umami.track('black-gate-import-success');
    } catch (e) {
        errEl.textContent = '导入失败：' + (e.message || '数据格式错误');
        errEl.style.display = 'block';
    }
});

window.addEventListener('song-display-changed', () => {
    renderSongs();
    updateRemainingList();
});

function initDiagramZoom() {
    const diagram = document.getElementById('zoomable-diagram');
    const modal = document.getElementById('diagram-modal');
    const zoomedImg = document.getElementById('zoomed-diagram');
    const closeBtn = document.getElementById('diagram-modal-close');

    if (!diagram || !modal || !zoomedImg) return;

    diagram.addEventListener('click', () => {
        zoomedImg.src = diagram.src;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // 禁止背景滚动
    });

    const closeModal = () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    };

    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target === zoomedImg || e.target === closeBtn) {
            closeModal();
        }
    });
}

initBlackScheduleView();
updateScheduleCountdown();
setInterval(updateScheduleCountdown, 60000);

updateCountdown();
setInterval(updateCountdown, 1000);

updateStats();
renderSongs();
updateRemainingList();
renderBlackGateChallengeRun();
initBlackThemeToggle();
initExpandClick();
initBlackGateChallengeSection();
initDiagramZoom();
if (typeof SongDetail !== 'undefined') SongDetail.init();
if (typeof SongDisplay !== 'undefined') SongDisplay.initDisplaySettings('black');
