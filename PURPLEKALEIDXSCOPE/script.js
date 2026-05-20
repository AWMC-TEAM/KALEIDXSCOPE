// 使用集中配置
const { songs, gate } = SongsConfig.purple;
const PURPLE_GATE_TRACK1_POOL = gate.track1;
const PURPLE_GATE_TRACK2_POOL = gate.track2;
const PURPLE_GATE_TRACK3_FIXED = gate.track3;
const songsById = Object.fromEntries(songs.map(s => [s.id, s]));

// 区域开放时间 2026/03/25 10:00:00 (UTC+8 北京时间)
const OPEN_TIME = new Date('2026-03-25T10:00:00+08:00');

// 万花筒条件切换：次日凌晨 4:00 北京时间（与青/白门一致）
const RESET_HOUR = 4;

// 紫门万花筒各阶段（倒计时用；区间含尾日，切换点为次日凌晨 4:00 → end 为「下一段开始日」）
const PURPLE_KALEIDO_PERIODS = [
    { start: '3.25', end: '3.28', type: 'master', life: 1 },   // 3.25–3.27
    { start: '3.28', end: '3.31', type: 'master', life: 10 },  // 3.28–3.30
    { start: '3.31', end: '4.3', type: 'master', life: 30 },   // 3.31–4.2
    { start: '4.3', end: '4.7', type: 'master', life: 50 },    // 4.3–4.6
    { start: '4.7', end: '4.15', type: 'expert', life: 100 }, // 4.7–4.14
    { start: '4.15', end: '12.31', type: 'basic', life: 999 } // 4.15–后续
];

function parsePurpleScheduleDate(str, year) {
    const [m, d] = str.split('.').map(Number);
    return new Date(year, m - 1, d, RESET_HOUR, 0, 0);
}

function getPurpleCurrentPeriod(periods, year) {
    const now = new Date();
    for (let i = 0; i < periods.length; i++) {
        const start = parsePurpleScheduleDate(periods[i].start, year);
        const end = parsePurpleScheduleDate(periods[i].end, year);
        if (now >= start && now < end) return { ...periods[i], index: i };
    }
    if (periods.length > 0) {
        const last = periods[periods.length - 1];
        const start = parsePurpleScheduleDate(last.start, year);
        if (now >= start) return { ...last, index: periods.length - 1 };
    }
    return null;
}

function getPurpleNextConditionSwitch(periods, year) {
    const now = new Date();
    const period = getPurpleCurrentPeriod(periods, year);
    if (!period || period.index >= periods.length - 1) return null;
    const nextPeriod = periods[period.index + 1];
    return parsePurpleScheduleDate(nextPeriod.start, year);
}

function getPurplePeriodStart(periods, year, index) {
    return parsePurpleScheduleDate(periods[index].start, year);
}

function updatePurpleScheduleCountdown() {
    const year = 2026;
    const now = new Date();
    const period = getPurpleCurrentPeriod(PURPLE_KALEIDO_PERIODS, year);
    const nextSwitch = getPurpleNextConditionSwitch(PURPLE_KALEIDO_PERIODS, year);
    const fmt = (ms) => {
        if (ms <= 0) return '即将切换';
        const d = Math.floor(ms / 86400000);
        const h = Math.floor((ms % 86400000) / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return `${d} 天 ${h} 小时 ${m} 分`;
    };
    const fmtDate = (d) => {
        if (!d) return '';
        return `${d.getMonth() + 1}月${d.getDate()}日 04:00`;
    };

    const fillEl = document.getElementById('purple-kaleido-fill');
    const textEl = document.getElementById('purple-kaleido-countdown-text');
    const periodEl = document.getElementById('purple-kaleido-period');

    if (!period) {
        if (periodEl) {
            periodEl.textContent = '活动尚未开始或不在已公布阶段内';
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

    const nextPhase = PURPLE_KALEIDO_PERIODS[period.index + 1];
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

    const periodStart = getPurplePeriodStart(PURPLE_KALEIDO_PERIODS, year, period.index);
    const totalMs = nextSwitch - periodStart;
    const elapsed = now - periodStart;
    const remaining = nextSwitch - now;
    const progress = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
    if (fillEl) {
        fillEl.style.width = progress + '%';
        fillEl.className = 'countdown-fill countdown-fill--' + period.type;
    }
    if (textEl) {
        textEl.textContent = `下次切换：${fmtDate(nextSwitch)} · 剩余 ${fmt(remaining)}`;
        textEl.className = 'countdown-text countdown-text--' + period.type;
    }
}

let purpleScheduleToggleBound = false;

function applyPurpleScheduleView() {
    const view = localStorage.getItem('purple-gate-schedule-view') || 'countdown';
    const countdownView = document.getElementById('countdown-view');
    const timelineView = document.getElementById('timeline-view');
    const btnCountdown = document.getElementById('view-countdown');
    const btnTimeline = document.getElementById('view-timeline');
    if (view === 'timeline') {
        if (countdownView) countdownView.style.display = 'none';
        if (timelineView) timelineView.style.display = 'block';
        if (btnCountdown) btnCountdown.classList.remove('active');
        if (btnTimeline) btnTimeline.classList.add('active');
    } else {
        if (countdownView) countdownView.style.display = 'block';
        if (timelineView) timelineView.style.display = 'none';
        if (btnCountdown) btnCountdown.classList.add('active');
        if (btnTimeline) btnTimeline.classList.remove('active');
    }
}

function initPurpleScheduleView() {
    applyPurpleScheduleView();
    if (purpleScheduleToggleBound) return;
    purpleScheduleToggleBound = true;
    document.getElementById('view-countdown')?.addEventListener('click', () => {
        localStorage.setItem('purple-gate-schedule-view', 'countdown');
        applyPurpleScheduleView();
    });
    document.getElementById('view-timeline')?.addEventListener('click', () => {
        localStorage.setItem('purple-gate-schedule-view', 'timeline');
        applyPurpleScheduleView();
    });
}

const noCoverSvg = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23ddd%22 width=%2280%22 height=%2280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2210%22%3E%E6%9A%82%E6%97%A0%E6%9B%B2%E7%BB%98%3C/text%3E%3C/svg%3E";

function loadProgress() {
    const saved = localStorage.getItem('maimai-purple-gate-progress');
    const defaultSoloMulti = { solo: { run: [], completed: {} }, multi: { run: [], completed: {} } };
    if (saved) {
        try {
            const p = JSON.parse(saved);
            return {
                solo: p.solo && Array.isArray(p.solo.run) ? p.solo : { run: [], completed: {} },
                multi: p.multi && Array.isArray(p.multi.run) ? p.multi : { run: [], completed: {} }
            };
        } catch (e) {}
    }
    return defaultSoloMulti;
}

function saveProgress(progress) {
    localStorage.setItem('maimai-purple-gate-progress', JSON.stringify(progress));
}

let progress = loadProgress();

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

    document.getElementById('countdown-days').textContent = String(d).padStart(2, '0');
    document.getElementById('countdown-hours').textContent = String(h).padStart(2, '0');
    document.getElementById('countdown-minutes').textContent = String(m).padStart(2, '0');
    document.getElementById('countdown-seconds').textContent = String(s).padStart(2, '0');

    if (section) section.classList.remove('open');
    if (titleEl) titleEl.textContent = '区域开放倒计时';
    if (noteEl) noteEl.style.display = '';
    if (displayEl) displayEl.style.display = '';
    if (statusEl) {
        statusEl.textContent = '⏳ 区域尚未开放';
        statusEl.className = 'countdown-status closed';
    }
}

let purpleGateChallengeRun = [];

function randomPickPurpleGateChallenge() {
    const t1 = PURPLE_GATE_TRACK1_POOL[Math.floor(Math.random() * PURPLE_GATE_TRACK1_POOL.length)];
    const t2 = PURPLE_GATE_TRACK2_POOL[Math.floor(Math.random() * PURPLE_GATE_TRACK2_POOL.length)];
    return [t1.id, t2.id, PURPLE_GATE_TRACK3_FIXED.id];
}

function renderPurpleGateChallengeRun() {
    const track1El = document.getElementById('gate-track1-songs');
    const track2El = document.getElementById('gate-track2-songs');
    const track3El = document.getElementById('gate-track3-songs');
    if (!track1El || !track2El || !track3El) return;

    const selected1 = purpleGateChallengeRun[0] || null;
    const selected2 = purpleGateChallengeRun[1] || null;

    function renderTrack(pool, selectedId) {
        return pool.map(s => {
            const isSelected = s.id === selectedId;
            const coverUrl = `https://assets.awmc.cc/covers/${s.id}.png`;
            return `
                <div class="gate-song-chip expandable ${isSelected ? 'selected' : ''}" data-id="${s.id}">
                    <div class="gate-chip-cover" data-song-id="${s.id}" title="双击/长按查看乐曲详情">
                        <img src="${coverUrl}" alt="${s.name}" onerror="this.src='${noCoverSvg}'">
                    </div>
                    <span class="gate-chip-name">${s.name}</span>
                </div>
            `;
        }).join('');
    }

    track1El.innerHTML = renderTrack(PURPLE_GATE_TRACK1_POOL, selected1);
    track2El.innerHTML = renderTrack(PURPLE_GATE_TRACK2_POOL, selected2);
    track3El.innerHTML = `
        <div class="gate-song-chip expandable selected" data-id="${PURPLE_GATE_TRACK3_FIXED.id}">
            <div class="gate-chip-cover" data-song-id="${PURPLE_GATE_TRACK3_FIXED.id}" title="双击/长按查看乐曲详情">
                <img src="https://assets.awmc.cc/covers/${PURPLE_GATE_TRACK3_FIXED.id}.png" alt="${PURPLE_GATE_TRACK3_FIXED.name}" onerror="this.src='${noCoverSvg}'">
            </div>
            <span class="gate-chip-name">${PURPLE_GATE_TRACK3_FIXED.name}</span>
        </div>
    `;
}

function initPurpleGateChallengeSection() {
    const expanded = localStorage.getItem('purple-gate-challenge-expanded') === 'true';
    const body = document.getElementById('gate-challenge-body');
    const toggle = document.getElementById('gate-challenge-toggle');
    const icon = toggle?.querySelector('.toggle-icon');
    const text = toggle?.querySelector('.toggle-text');

    function setExpanded(exp) {
        if (body) body.style.display = exp ? 'block' : 'none';
        if (toggle) toggle.setAttribute('aria-expanded', String(exp));
        if (icon) icon.textContent = exp ? '▲' : '▼';
        if (text) text.textContent = exp ? '收起' : '展开';
        localStorage.setItem('purple-gate-challenge-expanded', String(exp));
    }

    setExpanded(expanded);

    toggle?.addEventListener('click', () => {
        const cur = localStorage.getItem('purple-gate-challenge-expanded') === 'true';
        setExpanded(!cur);
    });
}

// 从 28 首钥匙曲目中随机抽取
function randomPickPurple(n) {
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n).map(s => s.id);
}

// 检查模式是否完成
function isSoloComplete() {
    const run = progress.solo.run;
    if (run.length !== 3) return false;
    return run.every(id => progress.solo.completed[id]);
}

function isMultiComplete() {
    const run = progress.multi.run;
    if (run.length !== 4) return false;
    return run.every(id => progress.multi.completed[id]);
}

// 更新完成状态显示
function updateCompletionStatus() {
    const msgEl = document.getElementById('completion-message');
    if (!msgEl) return;

    const soloDone = isSoloComplete();
    const multiDone = isMultiComplete();

    if (soloDone || multiDone) {
        const parts = [];
        if (soloDone) parts.push('单人游戏');
        if (multiDone) parts.push('双人游戏');
        msgEl.textContent = `🎉 恭喜！已完成：${parts.join('、')}，解锁条件达成！`;
        msgEl.className = 'completion-message done';
    } else {
        msgEl.textContent = '完成单人游戏（3首）或双人游戏（4首）即可达成解锁条件';
        msgEl.className = 'completion-message';
    }
}

// 随机推荐 - 单人
function doSoloRandom() {
    if (!progress.solo) progress.solo = { run: [], completed: {} };
    progress.solo.run = randomPickPurple(3);
    progress.solo.completed = {};
    saveProgress(progress);
    renderSoloRun();
    updateCompletionStatus();
}

// 随机推荐 - 双人
function doMultiRandom() {
    if (!progress.multi) progress.multi = { run: [], completed: {} };
    progress.multi.run = randomPickPurple(4);
    progress.multi.completed = {};
    saveProgress(progress);
    renderMultiRun();
    updateCompletionStatus();
}

// 添加到单人（最多3首，不可重复）
function addToSolo(songId) {
    if (!progress.solo) progress.solo = { run: [], completed: {} };
    const run = progress.solo.run;
    if (run.includes(songId)) {
        alert('该曲目已在单人游玩列表中');
        return;
    }
    if (run.length >= 3) {
        alert('单人游玩列表已满（最多3首），请先清空或使用随机推荐重新选择');
        return;
    }
    progress.solo.run.push(songId);
    saveProgress(progress);
    renderSoloRun();
    updateCompletionStatus();
}

// 添加到双人（最多4首，不可重复）
function addToMulti(songId) {
    if (!progress.multi) progress.multi = { run: [], completed: {} };
    const run = progress.multi.run;
    if (run.includes(songId)) {
        alert('该曲目已在双人游玩列表中');
        return;
    }
    if (run.length >= 4) {
        alert('双人游玩列表已满（最多4首），请先清空或使用随机推荐重新选择');
        return;
    }
    progress.multi.run.push(songId);
    saveProgress(progress);
    renderMultiRun();
    updateCompletionStatus();
}

function updatePurpleSongDetails(container, songId, fallback) {
    if (typeof SongDisplay === 'undefined') return;
    SongDisplay.getMusicDataThen(songId, fallback, (info) => {
        const fields = SongDisplay.getDisplayFields();
        container.innerHTML = SongDisplay.renderSongDetailsHtml(fields, info);
    });
}

function removeFromRun(mode, songId) {
    if (!progress[mode]) return;
    progress[mode].run = progress[mode].run.filter(id => id !== songId);
    delete progress[mode].completed[songId];
    saveProgress(progress);
    if (mode === 'solo') renderSoloRun();
    else renderMultiRun();
    updateCompletionStatus();
}

function toggleRunSong(mode, songId) {
    if (!progress[mode].completed[songId]) {
        progress[mode].completed[songId] = true;
    } else {
        progress[mode].completed[songId] = false;
    }
    saveProgress(progress);
    renderSoloRun();
    renderMultiRun();
    updateCompletionStatus();
}

// 渲染单人游玩曲目
function renderSoloRun() {
    const placeholder = document.getElementById('solo-placeholder');
    const list = document.getElementById('solo-run-list');
    if (!placeholder || !list) return;
    const run = (progress.solo && progress.solo.run) || [];
    if (run.length === 0) {
        placeholder.style.display = 'block';
        list.innerHTML = '';
        return;
    }
    placeholder.style.display = 'none';
    list.innerHTML = run.map(id => {
        const song = songsById[id] || { id, name: '-' };
        const done = (progress.solo && progress.solo.completed && progress.solo.completed[id]) || false;
        const coverUrl = `https://assets.awmc.cc/covers/${id}.png`;
        return `
            <div class="run-song-card ${done ? 'completed' : ''}" data-song-id="${id}" data-mode="solo">
                <div class="song-cover" data-song-id="${id}" title="双击/长按查看乐曲详情">
                    <img src="${coverUrl}" alt="${(song.name || '').replace(/"/g, '&quot;')}" onerror="this.src='${noCoverSvg}'">
                </div>
                <label class="song-checkbox">
                    <input type="checkbox" ${done ? 'checked' : ''} data-song-id="${id}" data-mode="solo" data-umami-event="run-toggle-solo-purple" data-umami-event-song-id="${id}">
                </label>
                <div class="song-info">
                    <div class="song-name">${(song.name || '-').replace(/</g, '&lt;')}</div>
                    <div class="song-details" data-song-id="${id}"></div>
                    <button class="btn-remove" data-remove="solo" data-song-id="${id}" data-umami-event="run-remove-solo-purple" data-umami-event-song-id="${id}" title="移除此曲目">×</button>
                </div>
            </div>
        `;
    }).join('');
    list.querySelectorAll('.song-details[data-song-id]').forEach(el => {
        updatePurpleSongDetails(el, el.dataset.songId, songsById[el.dataset.songId]);
    });
    list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => toggleRunSong('solo', cb.dataset.songId));
    });
    list.querySelectorAll('[data-remove="solo"]').forEach(btn => {
        btn.addEventListener('click', () => removeFromRun('solo', btn.dataset.songId));
    });
}

// 渲染双人游玩曲目
function renderMultiRun() {
    const placeholder = document.getElementById('multi-placeholder');
    const list = document.getElementById('multi-run-list');
    if (!placeholder || !list) return;
    const run = (progress.multi && progress.multi.run) || [];
    if (run.length === 0) {
        placeholder.style.display = 'block';
        list.innerHTML = '';
        return;
    }
    placeholder.style.display = 'none';
    list.innerHTML = run.map(id => {
        const song = songsById[id] || { id, name: '-' };
        const done = (progress.multi && progress.multi.completed && progress.multi.completed[id]) || false;
        const coverUrl = `https://assets.awmc.cc/covers/${id}.png`;
        return `
            <div class="run-song-card ${done ? 'completed' : ''}" data-song-id="${id}" data-mode="multi">
                <div class="song-cover" data-song-id="${id}" title="双击/长按查看乐曲详情">
                    <img src="${coverUrl}" alt="${(song.name || '').replace(/"/g, '&quot;')}" onerror="this.src='${noCoverSvg}'">
                </div>
                <label class="song-checkbox">
                    <input type="checkbox" ${done ? 'checked' : ''} data-song-id="${id}" data-mode="multi" data-umami-event="run-toggle-multi-purple" data-umami-event-song-id="${id}">
                </label>
                <div class="song-info">
                    <div class="song-name">${(song.name || '-').replace(/</g, '&lt;')}</div>
                    <div class="song-details" data-song-id="${id}"></div>
                    <button class="btn-remove" data-remove="multi" data-song-id="${id}" data-umami-event="run-remove-multi-purple" data-umami-event-song-id="${id}" title="移除此曲目">×</button>
                </div>
            </div>
        `;
    }).join('');
    list.querySelectorAll('.song-details[data-song-id]').forEach(el => {
        updatePurpleSongDetails(el, el.dataset.songId, songsById[el.dataset.songId]);
    });
    list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => toggleRunSong('multi', cb.dataset.songId));
    });
    list.querySelectorAll('[data-remove="multi"]').forEach(btn => {
        btn.addEventListener('click', () => removeFromRun('multi', btn.dataset.songId));
    });
}

function renderSongsPool() {
    const list = document.getElementById('pool-songs-list');
    if (!list) return;
    list.innerHTML = songs.map(song => {
        const coverUrl = `https://assets.awmc.cc/covers/${song.id}.png`;
        return `
            <div class="pool-song-card" data-song-id="${song.id}">
                <div class="song-cover" data-song-id="${song.id}" title="双击/长按查看乐曲详情">
                    <img src="${coverUrl}" alt="${(song.name || '').replace(/"/g, '&quot;')}" onerror="this.src='${noCoverSvg}'">
                </div>
                <div class="song-info">
                    <div class="song-name">${(song.name || '-').replace(/</g, '&lt;')}</div>
                    <div class="song-details" data-song-id="${song.id}"></div>
                    <div class="pool-actions">
                        <button class="btn btn-small btn-solo" data-add-solo="${song.id}" data-umami-event="pool-add-solo-purple" data-umami-event-song-id="${song.id}" data-umami-event-song-name="${(song.name || '').replace(/"/g, '&quot;')}">添加到单人</button>
                        <button class="btn btn-small btn-multi" data-add-multi="${song.id}" data-umami-event="pool-add-multi-purple" data-umami-event-song-id="${song.id}" data-umami-event-song-name="${(song.name || '').replace(/"/g, '&quot;')}">添加到双人</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    list.querySelectorAll('.song-details[data-song-id]').forEach(el => {
        updatePurpleSongDetails(el, el.dataset.songId, songs.find(s => s.id === el.dataset.songId));
    });
    list.querySelectorAll('[data-add-solo]').forEach(btn => {
        btn.addEventListener('click', () => { addToSolo(btn.dataset.addSolo); if (typeof umami !== 'undefined') umami.track('pool-add-solo-purple', { song_id: btn.dataset.addSolo }); });
    });
    list.querySelectorAll('[data-add-multi]').forEach(btn => {
        btn.addEventListener('click', () => { addToMulti(btn.dataset.addMulti); if (typeof umami !== 'undefined') umami.track('pool-add-multi-purple', { song_id: btn.dataset.addMulti }); });
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

document.getElementById('reset').addEventListener('click', () => {
    if (confirm('确定要重置单人/双人列表吗？')) {
        progress = { solo: { run: [], completed: {} }, multi: { run: [], completed: {} } };
        saveProgress(progress);
        renderSoloRun();
        renderMultiRun();
        updateCompletionStatus();
    }
});

document.getElementById('export-base64').addEventListener('click', () => {
    const dataStr = JSON.stringify(progress);
    const base64 = btoa(encodeURIComponent(dataStr));
    const textarea = document.createElement('textarea');
    textarea.value = base64;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('Base64 数据已复制到剪贴板！\n\n' + base64);
});

document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'flex';
    document.getElementById('import-data').value = '';
    document.getElementById('import-error').style.display = 'none';
});

document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'none';
});

document.getElementById('import-cancel').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'none';
});

document.getElementById('import-modal').addEventListener('click', (e) => {
    if (e.target.id === 'import-modal') {
        document.getElementById('import-modal').style.display = 'none';
    }
});

document.getElementById('import-confirm').addEventListener('click', () => {
    const importData = document.getElementById('import-data').value.trim();
    const errorDiv = document.getElementById('import-error');

    if (!importData) {
        errorDiv.textContent = '请输入要导入的数据';
        errorDiv.style.display = 'block';
        return;
    }

    let importedProgress = {};
    try {
        if (importData.length > 0 && !importData.startsWith('{')) {
            importedProgress = JSON.parse(decodeURIComponent(atob(importData)));
        } else {
            importedProgress = JSON.parse(importData);
        }
        if (typeof importedProgress !== 'object' || Array.isArray(importedProgress)) {
            throw new Error('数据格式不正确');
        }
        if (confirm('确定要导入数据吗？这将覆盖当前的单人/双人列表。')) {
            progress = importedProgress;
            if (!progress.solo) progress.solo = { run: [], completed: {} };
            if (!progress.multi) progress.multi = { run: [], completed: {} };
            saveProgress(progress);
            renderSoloRun();
            renderMultiRun();
            updateCompletionStatus();
            document.getElementById('import-modal').style.display = 'none';
            alert('导入成功！');
        }
    } catch (error) {
        errorDiv.textContent = '导入失败：' + error.message;
        errorDiv.style.display = 'block';
    }
});

document.getElementById('solo-random')?.addEventListener('click', doSoloRandom);
document.getElementById('multi-random')?.addEventListener('click', doMultiRandom);
document.getElementById('solo-clear')?.addEventListener('click', () => {
    if (progress.solo) {
        progress.solo.run = [];
        progress.solo.completed = {};
        saveProgress(progress);
        renderSoloRun();
        updateCompletionStatus();
    }
});
document.getElementById('multi-clear')?.addEventListener('click', () => {
    if (progress.multi) {
        progress.multi.run = [];
        progress.multi.completed = {};
        saveProgress(progress);
        renderMultiRun();
        updateCompletionStatus();
    }
});

document.getElementById('gate-random').addEventListener('click', () => {
    purpleGateChallengeRun = randomPickPurpleGateChallenge();
    renderPurpleGateChallengeRun();
    if (typeof umami !== 'undefined') umami.track('gate-challenge-random-purple');
    const body = document.getElementById('gate-challenge-body');
    if (body && body.style.display === 'none') {
        body.style.display = 'block';
        localStorage.setItem('purple-gate-challenge-expanded', 'true');
        const toggle = document.getElementById('gate-challenge-toggle');
        const icon = toggle?.querySelector('.toggle-icon');
        const text = toggle?.querySelector('.toggle-text');
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
        if (icon) icon.textContent = '▲';
        if (text) text.textContent = '收起';
    }
});

function initDiagramZoom() {
    const img = document.getElementById('zoomable-diagram');
    const modal = document.getElementById('diagram-modal');
    const closeBtn = document.getElementById('diagram-modal-close');

    if (!img || !modal) return;

    img.addEventListener('click', () => {
        modal.style.display = 'flex';
        if (typeof umami !== 'undefined') umami.track('diagram-zoom-open');
    });

    const closeModal = () => {
        modal.style.display = 'none';
    };

    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('diagram-modal-body')) {
            closeModal();
        }
    });
}

updateCountdown();
setInterval(updateCountdown, 1000);
initPurpleScheduleView();
updatePurpleScheduleCountdown();
setInterval(updatePurpleScheduleCountdown, 60000);
renderSoloRun();
renderMultiRun();
renderSongsPool();
renderPurpleGateChallengeRun();
initPurpleGateChallengeSection();
initExpandClick();
initDiagramZoom();
updateCompletionStatus();
if (typeof SongDetail !== 'undefined') SongDetail.init();
if (typeof SongDisplay !== 'undefined') SongDisplay.initDisplaySettings('purple');
window.addEventListener('song-display-changed', () => { renderSoloRun(); renderMultiRun(); renderSongsPool(); });
