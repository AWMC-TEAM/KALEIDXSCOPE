// 使用集中配置
const { songs, gate } = SongsConfig.blue;
const BLUE_GATE_TRACK1_POOL = gate.track1;
const BLUE_GATE_TRACK2_POOL = gate.track2;
const BLUE_GATE_TRACK3_FIXED = gate.track3;

// 曲绘加载失败时显示的占位图（暂无曲绘）
const noCoverSvg = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23ddd%22 width=%2280%22 height=%2280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2210%22%3E%E6%9A%82%E6%97%A0%E6%9B%B2%E7%BB%98%3C/text%3E%3C/svg%3E";

// 条件切换时间：次日凌晨 4:00 北京时间 (UTC+8)
const RESET_HOUR = 4;

// 青门/天空街 各阶段定义：{ start: 'M.D', end: 'M.D', type: 'master'|'expert'|'basic', life: number }
const BLUE_GATE_PERIODS = [
    { start: '2.1', end: '2.5', type: 'master', life: 50 },
    { start: '2.5', end: '2.12', type: 'expert', life: 100 },
    { start: '2.12', end: '12.31', type: 'basic', life: 999 }
];
const SKY_PERFECT_PERIODS = [
    { start: '1.30', end: '2.6', type: 'master', life: 10 },
    { start: '2.6', end: '2.13', type: 'expert', life: 50 },
    { start: '2.13', end: '2.20', type: 'basic', life: 100 },
    { start: '2.20', end: '12.31', type: 'basic', life: 300 }
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

// 根据阶段定义计算下一个条件切换时间（次日 4:00）
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

function updateCountdown() {
    const year = 2026;
    const now = new Date();
    
    const bluePeriod = getCurrentPeriod(BLUE_GATE_PERIODS, year);
    const skyPeriod = getCurrentPeriod(SKY_PERFECT_PERIODS, year);
    
    const blueNextSwitch = getNextConditionSwitch(BLUE_GATE_PERIODS, year);
    const skyNextSwitch = getNextConditionSwitch(SKY_PERFECT_PERIODS, year);
    
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
        document.getElementById('blue-gate-fill'),
        document.getElementById('blue-gate-countdown-text'),
        document.getElementById('blue-gate-period'),
        bluePeriod,
        blueNextSwitch,
        BLUE_GATE_PERIODS
    );
    
    renderBlock(
        document.getElementById('sky-perfect-fill'),
        document.getElementById('sky-perfect-countdown-text'),
        document.getElementById('sky-perfect-period'),
        skyPeriod,
        skyNextSwitch,
        SKY_PERFECT_PERIODS
    );
}

function initScheduleView() {
    const view = localStorage.getItem('blue-gate-schedule-view') || 'countdown';
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
        localStorage.setItem('blue-gate-schedule-view', 'countdown');
        initScheduleView();
    });
    btnTimeline?.addEventListener('click', () => {
        localStorage.setItem('blue-gate-schedule-view', 'timeline');
        initScheduleView();
    });
}

// 从本地存储加载完成状态
function loadProgress() {
    const saved = localStorage.getItem('maimai-blue-gate-progress');
    if (saved) {
        return JSON.parse(saved);
    }
    return {};
}

// 保存进度到本地存储
function saveProgress(progress) {
    localStorage.setItem('maimai-blue-gate-progress', JSON.stringify(progress));
}

// 初始化
let progress = loadProgress();
let showRemainingOnly = false;

function updateSongDetailsInCard(container) {
    if (typeof SongDisplay === 'undefined') return;
    const songId = container?.dataset?.songId;
    if (!songId) return;
    const fallback = songs.find(s => s.id === songId) || BLUE_GATE_TRACK1_POOL.find(s => s.id === songId) || BLUE_GATE_TRACK2_POOL.find(s => s.id === songId) || { id: songId, name: '-' };
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
        songsList.innerHTML = '<div class="empty-message">🎉 恭喜！所有曲目都已完成！</div>';
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
                    data-umami-event="checkbox-song-toggle-blue"
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
    if (typeof umami !== 'undefined') umami.track('checkbox-song-toggle-blue', { song_id: songId });
}

// 更新统计信息
function updateStats() {
    const completed = Object.values(progress).filter(Boolean).length;
    const remaining = songs.length - completed;
    const percent = Math.round((completed / songs.length) * 100);

    document.getElementById('completed-count').textContent = completed;
    document.getElementById('remaining-count').textContent = remaining;
    document.getElementById('progress-percent').textContent = percent + '%';
}

// 门中随机选曲状态（不持久化，仅本次会话）
let blueGateChallengeRun = [];

// 门中随机选曲：1曲目随机、2曲目随机、3曲目固定
function randomPickBlueGateChallenge() {
    const t1 = BLUE_GATE_TRACK1_POOL[Math.floor(Math.random() * BLUE_GATE_TRACK1_POOL.length)];
    const t2 = BLUE_GATE_TRACK2_POOL[Math.floor(Math.random() * BLUE_GATE_TRACK2_POOL.length)];
    return [t1.id, t2.id, BLUE_GATE_TRACK3_FIXED.id];
}

// 渲染门中选曲：展示所有曲目（含曲绘），选中时高亮
function renderBlueGateChallengeRun() {
    const track1El = document.getElementById('gate-track1-songs');
    const track2El = document.getElementById('gate-track2-songs');
    const track3El = document.getElementById('gate-track3-songs');
    if (!track1El || !track2El || !track3El) return;

    const selected1 = blueGateChallengeRun[0] || null;
    const selected2 = blueGateChallengeRun[1] || null;

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

    track1El.innerHTML = renderTrack(BLUE_GATE_TRACK1_POOL, selected1);
    track2El.innerHTML = renderTrack(BLUE_GATE_TRACK2_POOL, selected2);
    track3El.innerHTML = `
        <div class="gate-song-chip expandable selected" data-id="${BLUE_GATE_TRACK3_FIXED.id}">
            <div class="gate-chip-cover" data-song-id="${BLUE_GATE_TRACK3_FIXED.id}" title="双击/长按查看乐曲详情">
                <img src="https://assets.awmc.cc/covers/${BLUE_GATE_TRACK3_FIXED.id}.png" alt="${BLUE_GATE_TRACK3_FIXED.name}" onerror="this.src='${noCoverSvg}'">
            </div>
            <span class="gate-chip-name">${BLUE_GATE_TRACK3_FIXED.name}</span>
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
function initBlueGateChallengeSection() {
    const expanded = localStorage.getItem('blue-gate-challenge-expanded') === 'true';
    const body = document.getElementById('gate-challenge-body');
    const toggle = document.getElementById('gate-challenge-toggle');
    const icon = toggle?.querySelector('.toggle-icon');
    const text = toggle?.querySelector('.toggle-text');

    function setExpanded(exp) {
        if (body) body.style.display = exp ? 'block' : 'none';
        if (toggle) toggle.setAttribute('aria-expanded', String(exp));
        if (icon) icon.textContent = exp ? '▲' : '▼';
        if (text) text.textContent = exp ? '收起' : '展开';
        localStorage.setItem('blue-gate-challenge-expanded', String(exp));
    }

    setExpanded(expanded);

    toggle?.addEventListener('click', () => {
        const cur = localStorage.getItem('blue-gate-challenge-expanded') === 'true';
        setExpanded(!cur);
    });
}

function updateRemainingList() {
    const remainingList = document.getElementById('remaining-list');
    const remainingSongs = songs.filter(s => !progress[s.id]);

    if (remainingSongs.length === 0) {
        remainingList.innerHTML = '<div class="empty-message">🎉 所有曲目都已完成！您应该会在结算时看到钥匙。</div>';
        return;
    }

    remainingList.innerHTML = remainingSongs.map(song => `
        <div class="remaining-item">
            <div class="remaining-cover-wrap" data-song-id="${song.id}" title="双击/长按查看乐曲详情">
                <img src="https://assets.awmc.cc/covers/${song.id}.png" alt="暂无曲绘" class="remaining-cover" onerror="this.onerror=null;this.src='${noCoverSvg}'">
            </div>
            <div class="remaining-info" data-song-id="${song.id}"><strong>${(song.name || '').replace(/</g, '&lt;')}</strong></div>
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

// 仅显示未完成
document.getElementById('show-remaining').addEventListener('click', () => {
    showRemainingOnly = true;
    document.getElementById('filter-checkbox').checked = true;
    renderSongs();
});

// 显示全部
document.getElementById('show-all').addEventListener('click', () => {
    showRemainingOnly = false;
    document.getElementById('filter-checkbox').checked = false;
    renderSongs();
});

// 筛选复选框
document.getElementById('filter-checkbox').addEventListener('change', (e) => {
    showRemainingOnly = e.target.checked;
    renderSongs();
});

// 重置进度
document.getElementById('reset').addEventListener('click', () => {
    if (confirm('确定要重置所有进度吗？此操作不可撤销。')) {
        progress = {};
        saveProgress(progress);
        updateStats();
        renderSongs();
        updateRemainingList();
    }
});

// 导出为Base64
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

// 打开导入模态框
document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'flex';
    document.getElementById('import-data').value = '';
    document.getElementById('import-error').style.display = 'none';
});

// 关闭模态框
document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'none';
});

document.getElementById('import-cancel').addEventListener('click', () => {
    document.getElementById('import-modal').style.display = 'none';
});

// 点击模态框外部关闭
document.getElementById('import-modal').addEventListener('click', (e) => {
    if (e.target.id === 'import-modal') {
        document.getElementById('import-modal').style.display = 'none';
    }
});

// 确认导入
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
        // 尝试解析为Base64
        if (importData.length > 0 && !importData.startsWith('{')) {
            try {
                const decoded = decodeURIComponent(atob(importData));
                importedProgress = JSON.parse(decoded);
            } catch (e) {
                throw new Error('Base64 解码失败，请检查数据格式');
            }
        } else {
            // 尝试解析为JSON
            importedProgress = JSON.parse(importData);
        }
        
        // 验证数据格式
        if (typeof importedProgress !== 'object' || Array.isArray(importedProgress)) {
            throw new Error('数据格式不正确，应为对象格式');
        }
        
        // 验证数据有效性（检查是否包含有效的歌曲ID）
        const validIds = songs.map(s => s.id);
        const importedIds = Object.keys(importedProgress);
        const invalidIds = importedIds.filter(id => !validIds.includes(id));
        
        if (invalidIds.length > 0 && importedIds.length > 0) {
            console.warn('发现无效的歌曲ID:', invalidIds);
        }
        
        // 确认导入
        if (confirm(`确定要导入数据吗？这将覆盖当前的进度。\n\n将导入 ${Object.keys(importedProgress).length} 个曲目的状态。`)) {
            progress = importedProgress;
            saveProgress(progress);
            updateStats();
            renderSongs();
            updateRemainingList();
            document.getElementById('import-modal').style.display = 'none';
            alert('导入成功！');
        }
        
    } catch (error) {
        errorDiv.textContent = '导入失败：' + error.message;
        errorDiv.style.display = 'block';
    }
});

// 门中抽卡按钮
const gateRandomBtn = document.getElementById('gate-random');
if (gateRandomBtn) {
    gateRandomBtn.addEventListener('click', () => {
        blueGateChallengeRun = randomPickBlueGateChallenge();
        renderBlueGateChallengeRun();
        const body = document.getElementById('gate-challenge-body');
        if (body && body.style.display === 'none') {
            body.style.display = 'block';
            localStorage.setItem('blue-gate-challenge-expanded', 'true');
            const toggle = document.getElementById('gate-challenge-toggle');
            const icon = toggle?.querySelector('.toggle-icon');
            const text = toggle?.querySelector('.toggle-text');
            if (toggle) toggle.setAttribute('aria-expanded', 'true');
            if (icon) icon.textContent = '▲';
            if (text) text.textContent = '收起';
        }
    });
}

// 初始化页面
updateStats();
renderSongs();
updateRemainingList();
renderBlueGateChallengeRun();
initBlueGateChallengeSection();
initExpandClick();
initScheduleView();
updateCountdown();
setInterval(updateCountdown, 1000);
if (typeof SongDetail !== 'undefined') SongDetail.init();
if (typeof SongDisplay !== 'undefined') SongDisplay.initDisplaySettings('blue');
window.addEventListener('song-display-changed', () => { renderSongs(); updateRemainingList(); });
