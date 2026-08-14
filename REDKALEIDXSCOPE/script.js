// 红门 - 龙之区域 4
// 使用集中配置
const { songs, gate } = SongsConfig.red;
const RED_GATE_TRACK1_POOL = gate.track1;
const RED_GATE_TRACK2_POOL = gate.track2;
const RED_GATE_TRACK3_FIXED = gate.track3;

// 区域开放时间 2026/08/05 10:00:00 (UTC+8 北京时间)
const OPEN_TIME = new Date('2026-08-05T10:00:00+08:00');
const STORAGE_KEY = 'maimai-red-gate-key-progress';

// 门条件切换：次日凌晨 4:00 北京时间
const RED_GATE_RESET_HOUR = 4;
// 完美挑战：每日凌晨 4:00 北京时间（与门条件切换一致）
const RED_PERFECT_RESET_HOUR = 4;

// 红门 门曲阶段（end 为「下一段开始」的时刻）
const RED_GATE_PERIODS = [
    { start: '8.5', end: '8.8', type: 'master', life: 1 },
    { start: '8.8', end: '8.11', type: 'master', life: 10 },
    { start: '8.11', end: '8.14', type: 'master', life: 30 },
    { start: '8.14', end: '8.18', type: 'master', life: 50 },
    { start: '8.18', end: '8.25', type: 'expert', life: 100 },
    { start: '8.25', end: '12.31', type: 'basic', life: 999 }
];

// 完美挑战（忙シー日）：1日→2日→4日→7日→后续（参照黄门节奏）
const RED_PERFECT_PERIODS = [
    { start: '8.5', end: '8.6', type: 'master', life: 1 },
    { start: '8.6', end: '8.8', type: 'master', life: 10 },
    { start: '8.8', end: '8.12', type: 'expert', life: 50 },
    { start: '8.12', end: '8.19', type: 'basic', life: 100 },
    { start: '8.19', end: '12.31', type: 'basic', life: 300 }
];

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

function parsePeriodDate(str, year, resetHour) {
    const [m, d] = str.split('.').map(Number);
    // 门血量 / 条件切换按 UTC+8（北京时间）计算：游戏每日 04:00 重置
    return new Date(`${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(resetHour).padStart(2, '0')}:00:00+08:00`);
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

function formatRemaining(ms, includeSeconds = false) {
    if (ms <= 0) return '即将切换';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return includeSeconds ? `${d} 天 ${h} 时 ${m} 分 ${s} 秒` : `${d} 天 ${h} 小时 ${m} 分`;
}

function renderScheduleBlock(fillEl, textEl, periodEl, periods, resetHour) {
    const year = 2026;
    const now = new Date();
    const period = getCurrentPeriod(periods, year, resetHour);
    const nextSwitch = getNextConditionSwitch(periods, year, resetHour);

    if (!period) {
        if (periodEl) {
            periodEl.textContent = '活动尚未开始';
            periodEl.className = 'countdown-period-info countdown-period-info--pending';
            periodEl.style.display = '';
        }
        if (fillEl) fillEl.style.width = '0%';
        if (textEl) textEl.textContent = '开放后启用挑战条件';
        return;
    }

    if (!nextSwitch) {
        if (periodEl) {
            periodEl.textContent = `当前阶段：${period.type.toUpperCase()} LIFE ${period.life}`;
            periodEl.className = 'countdown-period-info countdown-period-info--' + period.type;
            periodEl.style.display = '';
        }
        if (fillEl) {
            fillEl.style.width = '100%';
            fillEl.className = 'countdown-fill countdown-fill--' + period.type;
        }
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
        textEl.textContent = `下次切换：${formatSwitchDate(nextSwitch, resetHour)} · 剩余 ${formatRemaining(remaining)}`;
        textEl.className = 'countdown-text countdown-text--' + period.type;
    }
}

function updateScheduleCountdown() {
    renderScheduleBlock(
        document.getElementById('red-perfect-fill'),
        document.getElementById('red-perfect-countdown-text'),
        document.getElementById('red-perfect-period'),
        RED_PERFECT_PERIODS,
        RED_PERFECT_RESET_HOUR
    );
    renderScheduleBlock(
        document.getElementById('red-gate-fill'),
        document.getElementById('red-gate-countdown-text'),
        document.getElementById('red-gate-period'),
        RED_GATE_PERIODS,
        RED_GATE_RESET_HOUR
    );
}

function applyRedScheduleView() {
    const view = localStorage.getItem('red-gate-schedule-view') || 'countdown';
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

function initRedScheduleView() {
    applyRedScheduleView();
    document.getElementById('view-countdown')?.addEventListener('click', () => {
        localStorage.setItem('red-gate-schedule-view', 'countdown');
        applyRedScheduleView();
    });
    document.getElementById('view-timeline')?.addEventListener('click', () => {
        localStorage.setItem('red-gate-schedule-view', 'timeline');
        applyRedScheduleView();
    });
}

// ----- 区域开放倒计时 -----
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
            statusEl.textContent = '✅ 红色之门已经开放！';
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

// ----- 进度存取 -----
function loadProgress() {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (Array.isArray(parsed)) {
            // 旧版数组格式迁移：索引 -> 曲目 id
            const migrated = {};
            parsed.forEach(index => {
                const song = songs[Number(index)];
                if (song) migrated[song.id] = true;
            });
            return migrated;
        }
        if (parsed && typeof parsed === 'object') {
            return Object.fromEntries(songs.map(song => [song.id, parsed[song.id] === true]));
        }
    } catch (_) { /* ignore invalid local data */ }
    return {};
}

function saveProgress() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

let progress = loadProgress();
let showRemainingOnly = false;

function updateSongDetailsInCard(container, fallbackSong) {
    if (typeof SongDisplay === 'undefined') return;
    const songId = container?.dataset?.songId;
    if (!songId) return;
    const fallback = fallbackSong
        || songs.find(s => s.id === songId)
        || gate.track1.find(s => s.id === songId)
        || gate.track2.find(s => s.id === songId)
        || { id: songId, name: '-' };
    SongDisplay.getMusicDataThen(fallback.detailId || songId, fallback, (info) => {
        if (info?.fields) info.fields.id = fallback.id;
        container.innerHTML = SongDisplay.renderSongDetailsHtml(SongDisplay.getDisplayFields(), info);
    });
}

function renderSongs() {
    const list = document.getElementById('songs-list');
    const visibleSongs = showRemainingOnly ? songs.filter(song => !progress[song.id]) : songs;

    if (!visibleSongs.length) {
        list.innerHTML = '<div class="empty-message">🎉 恭喜！全部红门钥匙曲目都已完成！</div>';
        return;
    }

    list.innerHTML = visibleSongs.map(song => `
        <div class="song-card ${progress[song.id] ? 'completed' : ''}">
            <div class="song-cover" data-song-id="${escapeAttr(song.detailId || song.id)}" title="双击/长按查看乐曲详情">
                <img src="${escapeAttr(getCoverUrl(song))}" alt="${escapeAttr(song.name)}" loading="lazy" onerror="this.onerror=null;this.src='${noCoverSvg}'">
            </div>
            <label class="song-checkbox">
                <input type="checkbox" data-song-id="${escapeAttr(song.id)}"
                    data-umami-event="checkbox-song-toggle-red"
                    data-umami-event-song-id="${escapeAttr(song.id)}"
                    data-umami-event-song-name="${escapeAttr(song.name)}"
                    ${progress[song.id] ? 'checked' : ''} aria-label="标记 ${escapeAttr(song.name)} 为已完成">
                <span class="checkmark"></span>
            </label>
            <div class="song-info">
                <div class="song-name">${escapeText(song.name)}</div>
                <div class="song-details" data-song-id="${escapeAttr(song.id)}"></div>
            </div>
        </div>`).join('');

    list.querySelectorAll('.song-checkbox input').forEach(input => {
        input.addEventListener('change', () => toggleSong(input.dataset.songId));
    });
    list.querySelectorAll('.song-details[data-song-id]').forEach(container => {
        updateSongDetailsInCard(container, songs.find(song => song.id === container.dataset.songId));
    });
}

function toggleSong(songId) {
    progress[songId] = !progress[songId];
    saveProgress();
    updateStats();
    renderSongs();
    updateRemainingList();
    if (typeof umami !== 'undefined') umami.track('checkbox-song-toggle-red', { song_id: songId });
}

function updateStats() {
    const completed = songs.filter(song => progress[song.id]).length;
    const remaining = songs.length - completed;
    document.getElementById('completed-count').textContent = completed;
    document.getElementById('remaining-count').textContent = remaining;
    document.getElementById('progress-percent').textContent = `${Math.round((completed / songs.length) * 100)}%`;
}

function updateRemainingList() {
    const list = document.getElementById('remaining-list');
    const remaining = songs.filter(song => !progress[song.id]);
    if (!remaining.length) {
        list.innerHTML = '<div class="empty-message">🎉 所有钥匙曲目都已完成！您应该会在结算时看到钥匙。</div>';
        return;
    }
    list.innerHTML = remaining.map(song => `
        <div class="remaining-item">
            <div class="remaining-cover-wrap" data-song-id="${escapeAttr(song.detailId || song.id)}" title="双击/长按查看乐曲详情"><img src="${escapeAttr(getCoverUrl(song))}" alt="${escapeAttr(song.name)}" class="remaining-cover" loading="lazy" onerror="this.onerror=null;this.src='${noCoverSvg}'"></div>
            <div class="remaining-info" data-song-id="${escapeAttr(song.id)}"><strong>${escapeText(song.name)}</strong></div>
        </div>`).join('');
    list.querySelectorAll('.remaining-info[data-song-id]').forEach(container => {
        const song = songs.find(item => item.id === container.dataset.songId);
        SongDisplay?.getMusicDataThen(song.detailId || song.id, song, info => {
            if (info?.fields) info.fields.id = song.id;
            const tags = SongDisplay.renderSongDetailsHtml(SongDisplay.getDisplayFields(), info);
            container.innerHTML = `<strong>${escapeText(info.name || song.name)}</strong>${tags ? `<div class="remaining-tags">${tags}</div>` : ''}`;
        });
    });
}

// ----- 门内随机选曲 -----
let redGateChallengeRun = [];

function randomPickRedGateChallenge() {
    const t1 = RED_GATE_TRACK1_POOL[Math.floor(Math.random() * RED_GATE_TRACK1_POOL.length)];
    const t2 = RED_GATE_TRACK2_POOL[Math.floor(Math.random() * RED_GATE_TRACK2_POOL.length)];
    return [t1.id, t2.id, RED_GATE_TRACK3_FIXED.id];
}

function renderRedGateChallengeRun() {
    const track1El = document.getElementById('gate-track1-songs');
    const track2El = document.getElementById('gate-track2-songs');
    const track3El = document.getElementById('gate-track3-songs');
    if (!track1El || !track2El || !track3El) return;

    const selected1 = redGateChallengeRun[0] || null;
    const selected2 = redGateChallengeRun[1] || null;

    function renderTrack(pool, selectedId) {
        return pool.map(s => {
            const isSelected = s.id === selectedId;
            return `
                <div class="gate-song-chip expandable ${isSelected ? 'selected' : ''}" data-id="${escapeAttr(s.id)}" data-umami-event="gate-chip-expand-red" data-umami-event-song-id="${escapeAttr(s.id)}" data-umami-event-song-name="${escapeAttr(s.name)}">
                    <div class="gate-chip-cover" data-song-id="${escapeAttr(s.id)}" title="双击/长按查看乐曲详情">
                        <img src="${escapeAttr(getCoverUrl(s))}" alt="${escapeAttr(s.name)}" loading="lazy" onerror="this.onerror=null;this.src='${noCoverSvg}'">
                    </div>
                    <span class="gate-chip-name">${escapeText(s.name)}</span>
                </div>
            `;
        }).join('');
    }

    track1El.innerHTML = renderTrack(RED_GATE_TRACK1_POOL, selected1);
    track2El.innerHTML = renderTrack(RED_GATE_TRACK2_POOL, selected2);
    track3El.innerHTML = `
        <div class="gate-song-chip expandable selected" data-id="${escapeAttr(RED_GATE_TRACK3_FIXED.id)}" data-umami-event="gate-chip-expand-red" data-umami-event-song-id="${escapeAttr(RED_GATE_TRACK3_FIXED.id)}" data-umami-event-song-name="${escapeAttr(RED_GATE_TRACK3_FIXED.name)}">
            <div class="gate-chip-cover" data-song-id="${escapeAttr(RED_GATE_TRACK3_FIXED.id)}" title="双击/长按查看乐曲详情">
                <img src="${escapeAttr(getCoverUrl(RED_GATE_TRACK3_FIXED))}" alt="${escapeAttr(RED_GATE_TRACK3_FIXED.name)}" loading="lazy" onerror="this.onerror=null;this.src='${noCoverSvg}'">
            </div>
            <span class="gate-chip-name">${escapeText(RED_GATE_TRACK3_FIXED.name)}</span>
        </div>
    `;
}

function initRedGateChallengeSection() {
    const expanded = localStorage.getItem('red-gate-challenge-expanded') === 'true';
    const body = document.getElementById('gate-challenge-body');
    const toggle = document.getElementById('gate-challenge-toggle');
    const icon = toggle?.querySelector('.toggle-icon');
    const text = toggle?.querySelector('.toggle-text');
    function setExpanded(exp) {
        if (body) body.style.display = exp ? 'block' : 'none';
        if (toggle) toggle.setAttribute('aria-expanded', String(exp));
        if (icon) icon.textContent = exp ? '▲' : '▼';
        if (text) text.textContent = exp ? '收起' : '展开';
        localStorage.setItem('red-gate-challenge-expanded', String(exp));
    }
    setExpanded(expanded);
    toggle?.addEventListener('click', () => {
        setExpanded(localStorage.getItem('red-gate-challenge-expanded') !== 'true');
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

// ----- 事件绑定 -----
function setRemainingFilter(enabled) {
    showRemainingOnly = enabled;
    document.getElementById('filter-checkbox').checked = enabled;
    renderSongs();
}

document.getElementById('show-remaining').addEventListener('click', () => {
    setRemainingFilter(true);
    if (typeof umami !== 'undefined') umami.track('button-show-remaining-red');
});
document.getElementById('show-all').addEventListener('click', () => {
    setRemainingFilter(false);
    if (typeof umami !== 'undefined') umami.track('button-show-all-red');
});
document.getElementById('filter-checkbox').addEventListener('change', (e) => {
    setRemainingFilter(e.target.checked);
    if (typeof umami !== 'undefined') umami.track('checkbox-filter-red', { checked: e.target.checked });
});

document.getElementById('gate-random').addEventListener('click', () => {
    redGateChallengeRun = randomPickRedGateChallenge();
    renderRedGateChallengeRun();
    const body = document.getElementById('gate-challenge-body');
    if (body && body.style.display === 'none') {
        body.style.display = 'block';
        localStorage.setItem('red-gate-challenge-expanded', 'true');
        const toggle = document.getElementById('gate-challenge-toggle');
        const icon = toggle?.querySelector('.toggle-icon');
        const text = toggle?.querySelector('.toggle-text');
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
        if (icon) icon.textContent = '▲';
        if (text) text.textContent = '收起';
    }
    if (typeof umami !== 'undefined') umami.track('gate-challenge-random-red', { track1: redGateChallengeRun[0], track2: redGateChallengeRun[1] });
});

document.getElementById('reset').addEventListener('click', () => {
    if (confirm('确定要重置所有红门进度吗？此操作不可恢复。')) {
        progress = {};
        saveProgress();
        updateStats();
        renderSongs();
        updateRemainingList();
        if (typeof umami !== 'undefined') umami.track('red-gate-reset-confirmed');
    }
});

document.getElementById('export-base64').addEventListener('click', () => {
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(progress))));
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(data).then(
            () => alert('已复制到剪贴板'),
            () => prompt('请手动复制以下 Base64 数据：', data)
        );
    } else {
        prompt('请手动复制以下 Base64 数据：', data);
    }
    if (typeof umami !== 'undefined') umami.track('button-export-base64-red');
});

document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'flex';
    document.getElementById('import-error').style.display = 'none';
    if (typeof umami !== 'undefined') umami.track('button-import-red');
});
document.getElementById('modal-close').addEventListener('click', () => document.getElementById('import-modal').style.display = 'none');
document.getElementById('import-cancel').addEventListener('click', () => document.getElementById('import-modal').style.display = 'none');
document.getElementById('import-confirm').addEventListener('click', () => {
    const raw = document.getElementById('import-data').value.trim();
    const error = document.getElementById('import-error');
    if (!raw) {
        error.textContent = '请输入数据';
        error.style.display = 'block';
        return;
    }
    try {
        let decoded;
        if (raw.startsWith('{')) {
            decoded = JSON.parse(raw);
        } else {
            decoded = JSON.parse(decodeURIComponent(escape(atob(raw))));
        }
        if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new Error('数据格式错误');
        progress = Object.fromEntries(songs.map(song => [song.id, decoded[song.id] === true]));
        saveProgress();
        updateStats();
        renderSongs();
        updateRemainingList();
        document.getElementById('import-modal').style.display = 'none';
        if (typeof umami !== 'undefined') umami.track('red-gate-import-success');
        alert('导入成功！');
    } catch (err) {
        error.textContent = `导入失败：${err.message || '数据格式错误'}`;
        error.style.display = 'block';
    }
});

window.addEventListener('song-display-changed', () => {
    renderSongs();
    updateRemainingList();
});

// 初始化
initRedScheduleView();
updateScheduleCountdown();
setInterval(updateScheduleCountdown, 60000);

updateCountdown();
setInterval(updateCountdown, 1000);

updateStats();
renderSongs();
updateRemainingList();
renderRedGateChallengeRun();
initExpandClick();
initRedGateChallengeSection();
if (typeof SongDetail !== 'undefined') SongDetail.init();
if (typeof SongDisplay !== 'undefined') SongDisplay.initDisplaySettings('red');
