// 使用集中配置
const { songs, gate } = SongsConfig.white;
const songsById = Object.fromEntries(songs.map(s => [s.id, s]));
const GATE_TRACK1_POOL = gate.track1;
const GATE_TRACK2_POOL = gate.track2;
const GATE_TRACK3_FIXED = gate.track3;

// 区域开放时间 2026/02/10 07:00:00 (UTC+8 北京时间)
const OPEN_TIME = new Date('2026-02-10T07:00:00+08:00');

// 条件切换时间：次日凌晨 4:00 北京时间 (UTC+8)
const RESET_HOUR = 4;

// 白门 门冰灭（氷滅の135小節）各阶段：{ start: 'M.D', end: 'M.D', type: 'master'|'expert'|'basic', life: number }
const WHITE_GATE_PERIODS = [
    { start: '2.10', end: '2.13', type: 'master', life: 1 },
    { start: '2.13', end: '2.16', type: 'master', life: 10 },
    { start: '2.16', end: '2.19', type: 'master', life: 30 },
    { start: '2.19', end: '2.23', type: 'master', life: 50 },
    { start: '2.23', end: '3.2', type: 'expert', life: 100 },
    { start: '3.2', end: '12.31', type: 'basic', life: 999 }
];
// 白门 完美挑战（Deicide）各阶段
const WHITE_PERFECT_PERIODS = [
    { start: '2.10', end: '2.17', type: 'master', life: 1 },
    { start: '2.17', end: '2.24', type: 'master', life: 10 },
    { start: '2.24', end: '3.3', type: 'expert', life: 50 },
    { start: '3.3', end: '3.10', type: 'expert', life: 100 },
    { start: '3.10', end: '12.31', type: 'basic', life: 300 }
];

function parseDate(str, year) {
    const [m, d] = str.split('.').map(Number);
    return new Date(year, m - 1, d, RESET_HOUR, 0, 0);
}

function getCurrentPeriod(periods, year) {
    const now = new Date();
    for (let i = 0; i < periods.length; i++) {
        const start = parseDate(periods[i].start, year);
        const end = parseDate(periods[i].end, year);
        if (now >= start && now < end) return { ...periods[i], index: i };
    }
    if (periods.length > 0) {
        const last = periods[periods.length - 1];
        const start = parseDate(last.start, year);
        if (now >= start) return { ...last, index: periods.length - 1 };
    }
    return null;
}

function getNextConditionSwitch(periods, year) {
    const now = new Date();
    const period = getCurrentPeriod(periods, year);
    if (!period || period.index >= periods.length - 1) return null;
    const nextPeriod = periods[period.index + 1];
    return parseDate(nextPeriod.start, year);
}

function getPeriodStart(periods, year, index) {
    return parseDate(periods[index].start, year);
}

function updateScheduleCountdown() {
    const year = 2026;
    const now = new Date();
    const gatePeriod = getCurrentPeriod(WHITE_GATE_PERIODS, year);
    const perfectPeriod = getCurrentPeriod(WHITE_PERFECT_PERIODS, year);
    const gateNextSwitch = getNextConditionSwitch(WHITE_GATE_PERIODS, year);
    const perfectNextSwitch = getNextConditionSwitch(WHITE_PERFECT_PERIODS, year);
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
    function renderBlock(fillEl, textEl, periodEl, period, nextSwitch, periods) {
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
        const periodStart = getPeriodStart(periods, year, period.index);
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
    renderBlock(
        document.getElementById('white-gate-fill'),
        document.getElementById('white-gate-countdown-text'),
        document.getElementById('white-gate-period'),
        gatePeriod,
        gateNextSwitch,
        WHITE_GATE_PERIODS
    );
    renderBlock(
        document.getElementById('white-perfect-fill'),
        document.getElementById('white-perfect-countdown-text'),
        document.getElementById('white-perfect-period'),
        perfectPeriod,
        perfectNextSwitch,
        WHITE_PERFECT_PERIODS
    );
}

function initScheduleView() {
    const view = localStorage.getItem('white-gate-schedule-view') || 'countdown';
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
    btnCountdown?.addEventListener('click', () => {
        localStorage.setItem('white-gate-schedule-view', 'countdown');
        initScheduleView();
    });
    btnTimeline?.addEventListener('click', () => {
        localStorage.setItem('white-gate-schedule-view', 'timeline');
        initScheduleView();
    });
}

// 数据结构：{ solo: { run: [id1,id2,id3], completed: {} }, multi: { run: [], completed: {} } }
function loadProgress() {
    const saved = localStorage.getItem('maimai-white-gate-progress');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            // 兼容旧格式
            if (data.solo && data.multi) return data;
        } catch (e) {}
    }
    return {
        solo: { run: [], completed: {} },
        multi: { run: [], completed: {} }
    };
}

function saveProgress(data) {
    localStorage.setItem('maimai-white-gate-progress', JSON.stringify(data));
}

let progress = loadProgress();

// 随机选取 n 首不重复曲目
function randomPick(n) {
    const shuffled = [...songs].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n).map(s => s.id);
}

// 门中随机选曲：1曲目随机、2曲目随机、3曲目固定
function randomPickGateChallenge() {
    const t1 = GATE_TRACK1_POOL[Math.floor(Math.random() * GATE_TRACK1_POOL.length)];
    const t2 = GATE_TRACK2_POOL[Math.floor(Math.random() * GATE_TRACK2_POOL.length)];
    return [t1.id, t2.id, GATE_TRACK3_FIXED.id];
}

// 倒计时更新
function updateCountdown() {
    const now = new Date();
    const section = document.getElementById('countdown-section');
    const titleEl = document.querySelector('.countdown-title');
    const noteEl = document.querySelector('.countdown-note');
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
    
    const days = document.getElementById('countdown-days');
    const hours = document.getElementById('countdown-hours');
    const minutes = document.getElementById('countdown-minutes');
    const seconds = document.getElementById('countdown-seconds');
    if (days) days.textContent = String(d).padStart(2, '0');
    if (hours) hours.textContent = String(h).padStart(2, '0');
    if (minutes) minutes.textContent = String(m).padStart(2, '0');
    if (seconds) seconds.textContent = String(s).padStart(2, '0');
    
    if (section) section.classList.remove('open');
    if (titleEl) titleEl.textContent = '区域开放倒计时';
    if (noteEl) noteEl.style.display = '';
    if (displayEl) displayEl.style.display = '';
    if (statusEl) {
        statusEl.textContent = '⏳ 区域尚未开放';
        statusEl.className = 'countdown-status closed';
    }
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
        if (multiDone) parts.push('多人游戏');
        msgEl.textContent = `🎉 恭喜！已完成：${parts.join('、')}，钥匙获取条件达成！`;
        msgEl.className = 'completion-message done';
    } else {
        msgEl.textContent = '完成单人游戏（3首）或多人游戏（4首）即可获取钥匙';
        msgEl.className = 'completion-message';
    }
}

// 渲染单人游玩曲目
function renderSoloRun() {
    const placeholder = document.getElementById('solo-placeholder');
    const list = document.getElementById('solo-run-list');
    if (!placeholder || !list) return;
    
    const run = progress.solo.run;
    const completed = progress.solo.completed;
    
    if (run.length === 0) {
        placeholder.style.display = 'block';
        list.innerHTML = '';
        return;
    }
    
    placeholder.style.display = 'none';
    list.innerHTML = run.map(id => {
        const song = songsById[id];
        if (!song) return '';
        const done = completed[id];
        const coverUrl = `https://assets.awmc.cc/covers/${id}.png`;
        return `
            <div class="run-song-card ${done ? 'completed' : ''}" data-song-id="${id}" data-mode="solo">
                <div class="song-cover" data-song-id="${id}" title="双击/长按查看乐曲详情">
                    <img src="${coverUrl}" alt="${(song.name || '').replace(/"/g, '&quot;')}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect fill=\'%23ddd\' width=\'200\' height=\'200\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\'%3E无曲绘%3C/text%3E%3C/svg%3E'">
                </div>
                <label class="song-checkbox">
                    <input type="checkbox" ${done ? 'checked' : ''} data-song-id="${id}" data-mode="solo" data-umami-event="run-toggle-solo-white" data-umami-event-song-id="${id}" data-umami-event-song-name="${(song.name || '').replace(/"/g, '&quot;')}">
                    <span class="checkmark"></span>
                </label>
                <div class="song-info">
                    <div class="song-name">${(song.name || '-').replace(/</g, '&lt;')}</div>
                    <div class="song-details" data-song-id="${id}"></div>
                    <button class="btn-remove" data-remove="solo" data-song-id="${id}" data-umami-event="run-remove-solo-white" data-umami-event-song-id="${id}" title="移除此曲目">×</button>
                </div>
            </div>
        `;
    }).join('');
    list.querySelectorAll('.song-details[data-song-id]').forEach(el => {
        updateWhiteSongDetails(el, el.dataset.songId, songsById[el.dataset.songId]);
    });
    list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => { toggleRunSong('solo', cb.dataset.songId); if (typeof umami !== 'undefined') umami.track('run-toggle-solo-white', { song_id: cb.dataset.songId }); });
    });
    list.querySelectorAll('[data-remove="solo"]').forEach(btn => {
        btn.addEventListener('click', () => { removeFromRun('solo', btn.dataset.songId); if (typeof umami !== 'undefined') umami.track('run-remove-solo-white', { song_id: btn.dataset.songId }); });
    });
}

// 渲染多人游玩曲目
function renderMultiRun() {
    const placeholder = document.getElementById('multi-placeholder');
    const list = document.getElementById('multi-run-list');
    if (!placeholder || !list) return;
    
    const run = progress.multi.run;
    const completed = progress.multi.completed;
    
    if (run.length === 0) {
        placeholder.style.display = 'block';
        list.innerHTML = '';
        return;
    }
    
    placeholder.style.display = 'none';
    list.innerHTML = run.map(id => {
        const song = songsById[id];
        if (!song) return '';
        const done = completed[id];
        const coverUrl = `https://assets.awmc.cc/covers/${id}.png`;
        return `
            <div class="run-song-card ${done ? 'completed' : ''}" data-song-id="${id}" data-mode="multi">
                <div class="song-cover" data-song-id="${id}" title="双击/长按查看乐曲详情">
                    <img src="${coverUrl}" alt="${(song.name || '').replace(/"/g, '&quot;')}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect fill=\'%23ddd\' width=\'200\' height=\'200\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\'%3E无曲绘%3C/text%3E%3C/svg%3E'">
                </div>
                <label class="song-checkbox">
                    <input type="checkbox" ${done ? 'checked' : ''} data-song-id="${id}" data-mode="multi" data-umami-event="run-toggle-multi-white" data-umami-event-song-id="${id}" data-umami-event-song-name="${(song.name || '').replace(/"/g, '&quot;')}">
                    <span class="checkmark"></span>
                </label>
                <div class="song-info">
                    <div class="song-name">${(song.name || '-').replace(/</g, '&lt;')}</div>
                    <div class="song-details" data-song-id="${id}"></div>
                    <button class="btn-remove" data-remove="multi" data-song-id="${id}" data-umami-event="run-remove-multi-white" data-umami-event-song-id="${id}" title="移除此曲目">×</button>
                </div>
            </div>
        `;
    }).join('');
    list.querySelectorAll('.song-details[data-song-id]').forEach(el => {
        updateWhiteSongDetails(el, el.dataset.songId, songsById[el.dataset.songId]);
    });
    list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => { toggleRunSong('multi', cb.dataset.songId); if (typeof umami !== 'undefined') umami.track('run-toggle-multi-white', { song_id: cb.dataset.songId }); });
    });
    list.querySelectorAll('[data-remove="multi"]').forEach(btn => {
        btn.addEventListener('click', () => { removeFromRun('multi', btn.dataset.songId); if (typeof umami !== 'undefined') umami.track('run-remove-multi-white', { song_id: btn.dataset.songId }); });
    });
}

// 切换游玩曲目完成状态
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

// 随机推荐 - 单人
function doSoloRandom() {
    progress.solo.run = randomPick(3);
    progress.solo.completed = {};
    saveProgress(progress);
    renderSoloRun();
    updateCompletionStatus();
}

// 随机推荐 - 多人
function doMultiRandom() {
    progress.multi.run = randomPick(4);
    progress.multi.completed = {};
    saveProgress(progress);
    renderMultiRun();
    updateCompletionStatus();
}

// 添加到单人（最多3首，不可重复）
function addToSolo(songId) {
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

// 添加到多人（最多4首，不可重复）
function addToMulti(songId) {
    const run = progress.multi.run;
    if (run.includes(songId)) {
        alert('该曲目已在多人游玩列表中');
        return;
    }
    if (run.length >= 4) {
        alert('多人游玩列表已满（最多4首），请先清空或使用随机推荐重新选择');
        return;
    }
    progress.multi.run.push(songId);
    saveProgress(progress);
    renderMultiRun();
    updateCompletionStatus();
}

// 门中随机选曲状态（不持久化，仅本次会话）
let gateChallengeRun = [];

// 渲染门中选曲：展示所有曲目（含曲绘），选中时高亮
function renderGateChallengeRun() {
    const track1El = document.getElementById('gate-track1-songs');
    const track2El = document.getElementById('gate-track2-songs');
    const track3El = document.getElementById('gate-track3-songs');
    if (!track1El || !track2El || !track3El) return;

    const selected1 = gateChallengeRun[0] || null;
    const selected2 = gateChallengeRun[1] || null;

    const noCoverSvg = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23ddd%22 width=%2280%22 height=%2280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%228%22%3E%E6%97%A0%E6%9B%B2%E7%BB%98%3C/text%3E%3C/svg%3E";

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

    track1El.innerHTML = renderTrack(GATE_TRACK1_POOL, selected1);
    track2El.innerHTML = renderTrack(GATE_TRACK2_POOL, selected2);
    track3El.innerHTML = `
        <div class="gate-song-chip expandable selected" data-id="${GATE_TRACK3_FIXED.id}">
            <div class="gate-chip-cover" data-song-id="${GATE_TRACK3_FIXED.id}" title="双击/长按查看乐曲详情">
                <img src="https://assets.awmc.cc/covers/${GATE_TRACK3_FIXED.id}.png" alt="${GATE_TRACK3_FIXED.name}" onerror="this.src='${noCoverSvg}'">
            </div>
            <span class="gate-chip-name">${GATE_TRACK3_FIXED.name}</span>
        </div>
    `;
}

// 点击展开：折叠其他，展开目标（时间表、抽卡选曲）
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

// 门中选曲折叠/展开（localStorage 记忆）
function initGateChallengeSection() {
    const expanded = localStorage.getItem('white-gate-challenge-expanded') === 'true';
    const body = document.getElementById('gate-challenge-body');
    const toggle = document.getElementById('gate-challenge-toggle');
    const icon = toggle?.querySelector('.toggle-icon');
    const text = toggle?.querySelector('.toggle-text');

    function setExpanded(exp) {
        if (body) body.style.display = exp ? 'block' : 'none';
        if (toggle) toggle.setAttribute('aria-expanded', String(exp));
        if (icon) icon.textContent = exp ? '▲' : '▼';
        if (text) text.textContent = exp ? '收起' : '展开';
        localStorage.setItem('white-gate-challenge-expanded', String(exp));
    }

    setExpanded(expanded);

    toggle?.addEventListener('click', () => {
        const cur = localStorage.getItem('white-gate-challenge-expanded') === 'true';
        setExpanded(!cur);
    });
}

function updateWhiteSongDetails(container, songId, fallback) {
    if (typeof SongDisplay === 'undefined') return;
    SongDisplay.getMusicDataThen(songId, fallback, (info) => {
        const fields = SongDisplay.getDisplayFields();
        container.innerHTML = SongDisplay.renderSongDetailsHtml(fields, info);
    });
}

function removeFromRun(mode, songId) {
    progress[mode].run = progress[mode].run.filter(id => id !== songId);
    delete progress[mode].completed[songId];
    saveProgress(progress);
    if (mode === 'solo') renderSoloRun();
    else renderMultiRun();
    updateCompletionStatus();
}

// 渲染曲目池（可添加到单人/多人）
function renderSongsPool() {
    const list = document.getElementById('songs-list');
    if (!list) return;
    
    list.innerHTML = songs.map(song => {
        const coverUrl = `https://assets.awmc.cc/covers/${song.id}.png`;
        return `
            <div class="pool-song-card" data-song-id="${song.id}">
                <div class="song-cover" data-song-id="${song.id}" title="双击/长按查看乐曲详情">
                    <img src="${coverUrl}" alt="${(song.name || '').replace(/"/g, '&quot;')}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect fill=\'%23ddd\' width=\'200\' height=\'200\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\'%3E无曲绘%3C/text%3E%3C/svg%3E'">
                </div>
                <div class="song-info">
                    <div class="song-name">${(song.name || '-').replace(/</g, '&lt;')}</div>
                    <div class="song-details" data-song-id="${song.id}"></div>
                    <div class="pool-actions">
                        <button class="btn btn-small btn-solo" data-add-solo="${song.id}" data-umami-event="pool-add-solo-white" data-umami-event-song-id="${song.id}" data-umami-event-song-name="${(song.name || '').replace(/"/g, '&quot;')}">添加到单人</button>
                        <button class="btn btn-small btn-multi" data-add-multi="${song.id}" data-umami-event="pool-add-multi-white" data-umami-event-song-id="${song.id}" data-umami-event-song-name="${(song.name || '').replace(/"/g, '&quot;')}">添加到多人</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    list.querySelectorAll('.song-details[data-song-id]').forEach(el => {
        updateWhiteSongDetails(el, el.dataset.songId, songs.find(s => s.id === el.dataset.songId));
    });
    list.querySelectorAll('[data-add-solo]').forEach(btn => {
        btn.addEventListener('click', () => { addToSolo(btn.dataset.addSolo); if (typeof umami !== 'undefined') umami.track('pool-add-solo-white', { song_id: btn.dataset.addSolo }); });
    });
    list.querySelectorAll('[data-add-multi]').forEach(btn => {
        btn.addEventListener('click', () => { addToMulti(btn.dataset.addMulti); if (typeof umami !== 'undefined') umami.track('pool-add-multi-white', { song_id: btn.dataset.addMulti }); });
    });
}

// 绑定事件
function initEventListeners() {
    const soloRandom = document.getElementById('solo-random');
    const multiRandom = document.getElementById('multi-random');
    const resetBtn = document.getElementById('reset');
    const exportBtn = document.getElementById('export-base64');
    const importBtn = document.getElementById('import-btn');
    const modalClose = document.getElementById('modal-close');
    const importCancel = document.getElementById('import-cancel');
    const importModal = document.getElementById('import-modal');
    const importConfirm = document.getElementById('import-confirm');

    if (soloRandom) soloRandom.addEventListener('click', doSoloRandom);
    if (multiRandom) multiRandom.addEventListener('click', doMultiRandom);

    const gateRandom = document.getElementById('gate-random');
    if (gateRandom) {
        gateRandom.addEventListener('click', () => {
            gateChallengeRun = randomPickGateChallenge();
            renderGateChallengeRun();
            const body = document.getElementById('gate-challenge-body');
            if (body && body.style.display === 'none') {
                body.style.display = 'block';
                localStorage.setItem('white-gate-challenge-expanded', 'true');
                const toggle = document.getElementById('gate-challenge-toggle');
                const icon = toggle?.querySelector('.toggle-icon');
                const text = toggle?.querySelector('.toggle-text');
                if (toggle) toggle.setAttribute('aria-expanded', 'true');
                if (icon) icon.textContent = '▲';
                if (text) text.textContent = '收起';
            }
        });
    }

    const soloClear = document.getElementById('solo-clear');
    const multiClear = document.getElementById('multi-clear');
    if (soloClear) soloClear.addEventListener('click', () => {
        progress.solo.run = [];
        progress.solo.completed = {};
        saveProgress(progress);
        renderSoloRun();
        updateCompletionStatus();
    });
    if (multiClear) multiClear.addEventListener('click', () => {
        progress.multi.run = [];
        progress.multi.completed = {};
        saveProgress(progress);
        renderMultiRun();
        updateCompletionStatus();
    });

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('确定要重置所有进度吗？此操作不可撤销。')) {
                progress = {
                    solo: { run: [], completed: {} },
                    multi: { run: [], completed: {} }
                };
                saveProgress(progress);
                renderSoloRun();
                renderMultiRun();
                updateCompletionStatus();
            }
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
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
    }

    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const modal = document.getElementById('import-modal');
            const importData = document.getElementById('import-data');
            const importError = document.getElementById('import-error');
            if (modal) modal.style.display = 'flex';
            if (importData) importData.value = '';
            if (importError) importError.style.display = 'none';
        });
    }

    if (modalClose) {
        modalClose.addEventListener('click', () => {
            const modal = document.getElementById('import-modal');
            if (modal) modal.style.display = 'none';
        });
    }

    if (importCancel) {
        importCancel.addEventListener('click', () => {
            const modal = document.getElementById('import-modal');
            if (modal) modal.style.display = 'none';
        });
    }

    if (importModal) {
        importModal.addEventListener('click', (e) => {
            if (e.target.id === 'import-modal') {
                importModal.style.display = 'none';
            }
        });
    }

    if (importConfirm) {
        importConfirm.addEventListener('click', () => {
            const importDataEl = document.getElementById('import-data');
            const errorDiv = document.getElementById('import-error');
            const importData = importDataEl ? importDataEl.value.trim() : '';
            
            if (!importData) {
                if (errorDiv) {
                    errorDiv.textContent = '请输入要导入的数据';
                    errorDiv.style.display = 'block';
                }
                return;
            }
            
            try {
                let data;
                if (importData.startsWith('{')) {
                    data = JSON.parse(importData);
                } else {
                    data = JSON.parse(decodeURIComponent(atob(importData)));
                }
                
                if (!data.solo || !data.multi) {
                    throw new Error('数据格式不正确');
                }
                
                if (confirm('确定要导入数据吗？这将覆盖当前的进度。')) {
                    progress = data;
                    saveProgress(progress);
                    renderSoloRun();
                    renderMultiRun();
                    updateCompletionStatus();
                    const modal = document.getElementById('import-modal');
                    if (modal) modal.style.display = 'none';
                    alert('导入成功！');
                }
            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = '导入失败：' + error.message;
                    errorDiv.style.display = 'block';
                }
            }
        });
    }
}

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

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    updateCountdown();
    setInterval(updateCountdown, 1000);
    initScheduleView();
    updateScheduleCountdown();
    setInterval(updateScheduleCountdown, 60000);
    renderSoloRun();
    renderMultiRun();
    renderSongsPool();
    renderGateChallengeRun();
    initGateChallengeSection();
    initExpandClick();
    updateCompletionStatus();
    initEventListeners();
    initDiagramZoom();
    if (typeof SongDetail !== 'undefined') SongDetail.init();
    if (typeof SongDisplay !== 'undefined') SongDisplay.initDisplaySettings('white');
    window.addEventListener('song-display-changed', () => { renderSoloRun(); renderMultiRun(); renderSongsPool(); });
});
