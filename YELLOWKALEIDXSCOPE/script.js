// 黄门 - 七彩区域
// 使用集中配置
const { songs: KEY_SONGS, gate } = SongsConfig.yellow;
const GATE_TRACK1_POOL = gate.track1;
const GATE_TRACK2_POOL = gate.track2;
const GATE_TRACK3_FIXED = gate.track3;

// 区域开放时间 2026/06/10 10:00:00 (UTC+8 北京时间) — 预测时间
const OPEN_TIME = new Date('2026-06-10T10:00:00+08:00');

// 门条件切换：次日凌晨 4:00 北京时间（与青/白/紫/黑门一致）
const RESET_HOUR = 4;

// 黄门各阶段（倒计时用；end 为「下一段开始日」）
const YELLOW_GATE_PERIODS = [
    { start: '6.10', end: '6.13', type: 'master', life: 1 },   // 6.10–6.12
    { start: '6.13', end: '6.16', type: 'master', life: 10 },  // 6.13–6.15
    { start: '6.16', end: '6.19', type: 'master', life: 30 },  // 6.16–6.18
    { start: '6.19', end: '6.23', type: 'master', life: 50 },  // 6.19–6.22
    { start: '6.23', end: '6.30', type: 'expert', life: 100 }, // 6.23–6.29
    { start: '6.30', end: '12.31', type: 'basic', life: 999 }  // 6.30–后续
];

const noCoverSvg = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23ddd%22 width=%2280%22 height=%2280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2210%22%3E%E6%9A%82%E6%97%A0%E6%9B%B2%E7%BB%98%3C/text%3E%3C/svg%3E";

function parseScheduleDate(str, year) {
    const [m, d] = str.split('.').map(Number);
    return new Date(year, m - 1, d, RESET_HOUR, 0, 0);
}

function getCurrentPeriod(periods, year) {
    const now = new Date();
    for (let i = 0; i < periods.length; i++) {
        const start = parseScheduleDate(periods[i].start, year);
        const end = parseScheduleDate(periods[i].end, year);
        if (now >= start && now < end) return { ...periods[i], index: i };
    }
    if (periods.length > 0) {
        const last = periods[periods.length - 1];
        const start = parseScheduleDate(last.start, year);
        if (now >= start) return { ...last, index: periods.length - 1 };
    }
    return null;
}

function getNextConditionSwitch(periods, year) {
    const period = getCurrentPeriod(periods, year);
    if (!period || period.index >= periods.length - 1) return null;
    const nextPeriod = periods[period.index + 1];
    return parseScheduleDate(nextPeriod.start, year);
}

function getPeriodStart(periods, year, index) {
    return parseScheduleDate(periods[index].start, year);
}

function formatSwitchDate(d) {
    if (!d) return '';
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(RESET_HOUR).padStart(2, '0')}:00`;
}

function updateYellowScheduleCountdown() {
    const year = 2026;
    const now = new Date();
    const period = getCurrentPeriod(YELLOW_GATE_PERIODS, year);
    const nextSwitch = getNextConditionSwitch(YELLOW_GATE_PERIODS, year);
    const fmt = (ms) => {
        if (ms <= 0) return '即将切换';
        const d = Math.floor(ms / 86400000);
        const h = Math.floor((ms % 86400000) / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        return `${d} 天 ${h} 小时 ${m} 分`;
    };

    const fillEl = document.getElementById('yellow-gate-fill');
    const textEl = document.getElementById('yellow-gate-countdown-text');
    const periodEl = document.getElementById('yellow-gate-period');

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

    const nextPhase = YELLOW_GATE_PERIODS[period.index + 1];
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

    const periodStart = getPeriodStart(YELLOW_GATE_PERIODS, year, period.index);
    const totalMs = nextSwitch - periodStart;
    const elapsed = now - periodStart;
    const remaining = nextSwitch - now;
    const progress = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
    if (fillEl) {
        fillEl.style.width = progress + '%';
        fillEl.className = 'countdown-fill countdown-fill--' + period.type;
    }
    if (textEl) {
        textEl.textContent = `下次切换：${formatSwitchDate(nextSwitch)} · 剩余 ${fmt(remaining)}`;
        textEl.className = 'countdown-text countdown-text--' + period.type;
    }
}

function getHpMarkersFromPeriods(periods) {
    const markers = {};
    periods.forEach((p) => {
        const [, d] = p.start.split('.').map(Number);
        markers[d] = { type: p.type, life: p.life };
    });
    return markers;
}

function getActivePeriodForDay(day, periods) {
    for (let i = periods.length - 1; i >= 0; i--) {
        const [, startD] = periods[i].start.split('.').map(Number);
        if (day >= startD) return periods[i];
    }
    return null;
}

function renderYellowHpCalendar() {
    const container = document.getElementById('yellow-hp-calendar');
    if (!container) return;

    const year = 2026;
    const month = 5; // June (0-indexed)
    const markers = getHpMarkersFromPeriods(YELLOW_GATE_PERIODS);
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    const weeks = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let day = 1;
    while (day <= daysInMonth) {
        const monday = day;
        const row = { monday, days: [] };
        for (let offset = 1; offset <= 6 && day + offset <= daysInMonth; offset++) {
            row.days.push(day + offset);
        }
        weeks.push(row);
        day += 7;
    }

    function renderHpLabel(marker) {
        if (!marker) return '';
        if (marker.type === 'master') {
            return `<span class="hp-value hp-value--master">${marker.life}血</span>`;
        }
        return `<span class="hp-value hp-value--${marker.type}">${marker.life}</span>`;
    }

    function renderCell(dayNum, isMondayCol) {
        if (!dayNum) return '<td class="hp-cell hp-cell--empty"></td>';
        const marker = markers[dayNum];
        const activePeriod = getActivePeriodForDay(dayNum, YELLOW_GATE_PERIODS);
        const isToday = isCurrentMonth && today.getDate() === dayNum;
        const classes = [
            'hp-cell',
            isMondayCol ? 'hp-cell--mon' : '',
            marker ? `hp-cell--marker hp-cell--${marker.type}` : '',
            activePeriod ? `hp-cell--period-${activePeriod.type}` : '',
            isToday ? 'hp-cell--today' : ''
        ].filter(Boolean).join(' ');
        return `<td class="${classes}"><span class="hp-day">${dayNum}</span>${renderHpLabel(marker)}</td>`;
    }

    const header = `
        <thead>
            <tr>
                <th class="hp-month">6月</th>
                <th>二</th><th>三</th><th>四</th><th>五</th><th>六</th><th>七</th>
            </tr>
        </thead>
    `;

    const body = weeks.map((week) => {
        const cells = [renderCell(week.monday, true)];
        for (let i = 0; i < 6; i++) {
            cells.push(renderCell(week.days[i] || null, false));
        }
        return `<tr>${cells.join('')}</tr>`;
    }).join('');

    container.innerHTML = `<table class="hp-calendar-table">${header}<tbody>${body}</tbody></table>`;
}

function applyYellowScheduleView() {
    const view = localStorage.getItem('yellow-gate-schedule-view') || 'countdown';
    const countdownView = document.getElementById('countdown-view');
    const calendarView = document.getElementById('calendar-view');
    const btnCountdown = document.getElementById('view-countdown');
    const btnCalendar = document.getElementById('view-calendar');
    const isCalendar = view === 'calendar';
    if (countdownView) countdownView.style.display = isCalendar ? 'none' : 'block';
    if (calendarView) calendarView.style.display = isCalendar ? 'block' : 'none';
    if (btnCountdown) btnCountdown.classList.toggle('active', !isCalendar);
    if (btnCalendar) btnCalendar.classList.toggle('active', isCalendar);
}

function initYellowScheduleView() {
    renderYellowHpCalendar();
    applyYellowScheduleView();
    document.getElementById('view-countdown')?.addEventListener('click', () => {
        localStorage.setItem('yellow-gate-schedule-view', 'countdown');
        applyYellowScheduleView();
    });
    document.getElementById('view-calendar')?.addEventListener('click', () => {
        localStorage.setItem('yellow-gate-schedule-view', 'calendar');
        applyYellowScheduleView();
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
    const disclaimerEl = document.querySelector('#countdown-section .countdown-disclaimer');

    if (now >= OPEN_TIME) {
        if (section) section.classList.add('open');
        if (titleEl) titleEl.textContent = '区域已开放';
        if (noteEl) noteEl.style.display = 'none';
        if (displayEl) displayEl.style.display = 'none';
        if (disclaimerEl) disclaimerEl.style.display = 'none';
        if (statusEl) {
            statusEl.textContent = '✅ 区域已开放！';
            statusEl.className = 'countdown-status open';
        }
        return;
    }

    const diff = OPEN_TIME - now;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

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
    if (disclaimerEl) disclaimerEl.style.display = '';
    if (statusEl) {
        statusEl.textContent = '⏳ 区域尚未开放（时间为预测）';
        statusEl.className = 'countdown-status closed';
    }
}

function isUnreleased(song) {
    return !song || !song.id || song.id === '0';
}

function escapeAttr(s) {
    return String(s == null ? '' : s).replace(/"/g, '&quot;');
}

function escapeText(s) {
    return String(s == null ? '' : s).replace(/</g, '&lt;');
}

// ----- 钥匙抽卡 -----
let keyGachaResult = null; // { index, song }

function loadKeyGacha() {
    try {
        const raw = localStorage.getItem('maimai-yellow-gate-key-gacha');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.index === 'number' && parsed.index >= 0 && parsed.index < KEY_SONGS.length) {
                return { index: parsed.index, song: KEY_SONGS[parsed.index] };
            }
        }
    } catch (e) { /* ignore */ }
    return null;
}

function saveKeyGacha(result) {
    if (result == null) {
        localStorage.removeItem('maimai-yellow-gate-key-gacha');
    } else {
        localStorage.setItem('maimai-yellow-gate-key-gacha', JSON.stringify({ index: result.index }));
    }
}

function doKeyGacha() {
    const idx = Math.floor(Math.random() * KEY_SONGS.length);
    keyGachaResult = { index: idx, song: KEY_SONGS[idx] };
    saveKeyGacha(keyGachaResult);
    renderKeyGachaResult();
    if (typeof umami !== 'undefined') {
        umami.track('key-gacha-yellow', { song_id: keyGachaResult.song.id, song_name: keyGachaResult.song.name });
    }
}

function renderKeyGachaResult() {
    const placeholder = document.getElementById('key-gacha-placeholder');
    const wrap = document.getElementById('key-gacha-card-wrap');
    if (!placeholder || !wrap) return;

    if (!keyGachaResult) {
        placeholder.style.display = 'block';
        wrap.innerHTML = '';
        return;
    }

    placeholder.style.display = 'none';
    const song = keyGachaResult.song;
    const unreleased = isUnreleased(song);
    const coverHtml = unreleased
        ? `<div class="key-gacha-cover key-gacha-cover--unreleased"><span>未收录</span></div>`
        : `<div class="key-gacha-cover" data-song-id="${escapeAttr(song.id)}" title="双击/长按查看乐曲详情"><img src="https://assets.awmc.cc/covers/${escapeAttr(song.id)}.png" alt="${escapeAttr(song.name)}" onerror="this.src='${noCoverSvg}'"></div>`;

    const unreleasedNotice = unreleased
        ? `<div class="key-gacha-unreleased-notice">⚠️ 该曲目尚未收录，曲绘与定数信息将在游戏更新后补充。本次抽卡有效，可正常游玩。</div>`
        : '';

    wrap.innerHTML = `
        <div class="key-gacha-card animate-pop ${unreleased ? 'key-gacha-card--unreleased' : ''}">
            <div class="key-gacha-card-label">🎉 本次推荐</div>
            ${coverHtml}
            <div class="key-gacha-card-info">
                <div class="key-gacha-name">${escapeText(song.name)}</div>
                <div class="key-gacha-details" data-song-id="${escapeAttr(song.id)}"></div>
                ${unreleasedNotice}
            </div>
        </div>
    `;
    const detailsEl = wrap.querySelector('.key-gacha-details');
    if (detailsEl && !unreleased) updateSongDetailsInCard(detailsEl, song);
    else if (detailsEl) detailsEl.innerHTML = '<span class="song-detail-tag song-detail-tag--unreleased">尚未收录</span>';
}

function clearKeyGacha() {
    keyGachaResult = null;
    saveKeyGacha(null);
    renderKeyGachaResult();
}

// ----- 钥匙曲目池渲染 -----
function updateSongDetailsInCard(container, fallbackSong) {
    if (typeof SongDisplay === 'undefined') return;
    const songId = container?.dataset?.songId;
    if (!songId || songId === '0') {
        container.innerHTML = '';
        return;
    }
    SongDisplay.getMusicDataThen(songId, fallbackSong || { id: songId, name: '-' }, (info) => {
        const fields = SongDisplay.getDisplayFields();
        container.innerHTML = SongDisplay.renderSongDetailsHtml(fields, info);
    });
}

function renderKeySongsPool() {
    const list = document.getElementById('songs-list');
    if (!list) return;

    list.innerHTML = KEY_SONGS.map((song, i) => {
        const unreleased = isUnreleased(song);
        const isHit = keyGachaResult && keyGachaResult.index === i;
        const coverHtml = unreleased
            ? `<div class="song-cover song-cover--unreleased"><span>未收录</span></div>`
            : `<div class="song-cover" data-song-id="${escapeAttr(song.id)}" title="双击/长按查看乐曲详情"><img src="https://assets.awmc.cc/covers/${escapeAttr(song.id)}.png" alt="${escapeAttr(song.name)}" onerror="this.src='${noCoverSvg}'"></div>`;
        return `
            <div class="pool-song-card ${isHit ? 'gacha-hit' : ''} ${unreleased ? 'unreleased' : ''}" data-index="${i}">
                ${coverHtml}
                <div class="song-info">
                    <div class="song-name">${escapeText(song.name)}${unreleased ? ' <span class="unreleased-badge">未收录</span>' : ''}</div>
                    <div class="song-details" data-song-id="${escapeAttr(song.id)}"></div>
                </div>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.song-details[data-song-id]').forEach(el => {
        const idx = el.closest('.pool-song-card')?.dataset.index;
        const fallback = idx != null ? KEY_SONGS[Number(idx)] : null;
        updateSongDetailsInCard(el, fallback);
    });
}

// ----- 门内随机选曲 -----
let gateChallengeRun = []; // [{trackIndex, poolIndex}]

function randomPickGateChallenge() {
    const i1 = Math.floor(Math.random() * GATE_TRACK1_POOL.length);
    const i2 = Math.floor(Math.random() * GATE_TRACK2_POOL.length);
    return [i1, i2];
}

function renderGateChallengeRun() {
    const track1El = document.getElementById('gate-track1-songs');
    const track2El = document.getElementById('gate-track2-songs');
    const track3El = document.getElementById('gate-track3-songs');
    if (!track1El || !track2El || !track3El) return;

    const sel1 = gateChallengeRun[0];
    const sel2 = gateChallengeRun[1];

    function renderTrack(pool, selectedIndex) {
        return pool.map((s, i) => {
            const isSelected = i === selectedIndex;
            const unreleased = isUnreleased(s);
            const coverHtml = unreleased
                ? `<div class="gate-chip-cover gate-chip-cover--unreleased"><span>未收录</span></div>`
                : `<div class="gate-chip-cover" data-song-id="${escapeAttr(s.id)}" title="双击/长按查看乐曲详情"><img src="https://assets.awmc.cc/covers/${escapeAttr(s.id)}.png" alt="${escapeAttr(s.name)}" onerror="this.src='${noCoverSvg}'"></div>`;
            return `
                <div class="gate-song-chip expandable ${isSelected ? 'selected' : ''} ${unreleased ? 'unreleased' : ''}" data-pool-index="${i}" data-umami-event="gate-chip-expand-yellow" data-umami-event-song-id="${escapeAttr(s.id)}" data-umami-event-song-name="${escapeAttr(s.name)}">
                    ${coverHtml}
                    <span class="gate-chip-name">${escapeText(s.name)}${unreleased ? ' <span class="unreleased-badge">未收录</span>' : ''}</span>
                </div>
            `;
        }).join('');
    }

    track1El.innerHTML = renderTrack(GATE_TRACK1_POOL, sel1);
    track2El.innerHTML = renderTrack(GATE_TRACK2_POOL, sel2);
    const t3 = GATE_TRACK3_FIXED;
    const t3Unreleased = isUnreleased(t3);
    track3El.innerHTML = `
        <div class="gate-song-chip expandable selected ${t3Unreleased ? 'unreleased' : ''}" data-umami-event="gate-chip-expand-yellow" data-umami-event-song-id="${escapeAttr(t3.id)}" data-umami-event-song-name="${escapeAttr(t3.name)}">
            ${t3Unreleased
                ? `<div class="gate-chip-cover gate-chip-cover--unreleased"><span>未收录</span></div>`
                : `<div class="gate-chip-cover" data-song-id="${escapeAttr(t3.id)}" title="双击/长按查看乐曲详情"><img src="https://assets.awmc.cc/covers/${escapeAttr(t3.id)}.png" alt="${escapeAttr(t3.name)}" onerror="this.src='${noCoverSvg}'"></div>`}
            <span class="gate-chip-name">${escapeText(t3.name)}${t3Unreleased ? ' <span class="unreleased-badge">未收录</span>' : ''}</span>
        </div>
    `;
}

function initGateChallengeSection() {
    const expanded = localStorage.getItem('yellow-gate-challenge-expanded') === 'true';
    const body = document.getElementById('gate-challenge-body');
    const toggle = document.getElementById('gate-challenge-toggle');
    const icon = toggle?.querySelector('.toggle-icon');
    const text = toggle?.querySelector('.toggle-text');

    function setExpanded(exp) {
        if (body) body.style.display = exp ? 'block' : 'none';
        if (toggle) toggle.setAttribute('aria-expanded', String(exp));
        if (icon) icon.textContent = exp ? '▲' : '▼';
        if (text) text.textContent = exp ? '收起' : '展开';
        localStorage.setItem('yellow-gate-challenge-expanded', String(exp));
    }
    setExpanded(expanded);
    toggle?.addEventListener('click', () => {
        setExpanded(localStorage.getItem('yellow-gate-challenge-expanded') !== 'true');
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

// ----- 导入导出 -----
function getProgressSnapshot() {
    return {
        keyGachaIndex: keyGachaResult ? keyGachaResult.index : null
    };
}

function applyProgressSnapshot(data) {
    if (data && typeof data.keyGachaIndex === 'number' && data.keyGachaIndex >= 0 && data.keyGachaIndex < KEY_SONGS.length) {
        keyGachaResult = { index: data.keyGachaIndex, song: KEY_SONGS[data.keyGachaIndex] };
        saveKeyGacha(keyGachaResult);
    } else {
        keyGachaResult = null;
        saveKeyGacha(null);
    }
}

function initExportImport() {
    document.getElementById('export-base64')?.addEventListener('click', () => {
        const data = btoa(unescape(encodeURIComponent(JSON.stringify(getProgressSnapshot()))));
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(data).then(
                () => alert('已复制到剪贴板'),
                () => prompt('请手动复制以下 Base64 数据：', data)
            );
        } else {
            prompt('请手动复制以下 Base64 数据：', data);
        }
        if (typeof umami !== 'undefined') umami.track('button-export-base64-yellow');
    });

    document.getElementById('import-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('import-modal');
        const errEl = document.getElementById('import-error');
        const ta = document.getElementById('import-data');
        if (modal) modal.style.display = 'flex';
        if (errEl) errEl.style.display = 'none';
        if (ta) ta.value = '';
    });

    const closeModal = () => {
        const modal = document.getElementById('import-modal');
        if (modal) modal.style.display = 'none';
    };
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('import-cancel')?.addEventListener('click', closeModal);

    document.getElementById('import-confirm')?.addEventListener('click', () => {
        const raw = (document.getElementById('import-data')?.value || '').trim();
        const errEl = document.getElementById('import-error');
        if (!raw) {
            if (errEl) {
                errEl.textContent = '请输入数据';
                errEl.style.display = 'block';
            }
            return;
        }
        try {
            let decoded;
            if (raw.startsWith('{')) {
                decoded = JSON.parse(raw);
            } else {
                decoded = JSON.parse(decodeURIComponent(escape(atob(raw))));
            }
            applyProgressSnapshot(decoded);
            renderKeyGachaResult();
            renderKeySongsPool();
            closeModal();
            if (typeof umami !== 'undefined') umami.track('yellow-gate-import-success');
            alert('导入成功！');
        } catch (e) {
            if (errEl) {
                errEl.textContent = '导入失败：' + (e.message || '数据格式错误');
                errEl.style.display = 'block';
            }
        }
    });

    document.getElementById('reset')?.addEventListener('click', () => {
        if (confirm('确定要重置所有进度吗？此操作不可恢复。')) {
            keyGachaResult = null;
            saveKeyGacha(null);
            renderKeyGachaResult();
            renderKeySongsPool();
            if (typeof umami !== 'undefined') umami.track('yellow-gate-reset-confirmed');
        }
    });
}

function initEventListeners() {
    document.getElementById('key-gacha-random')?.addEventListener('click', doKeyGacha);
    document.getElementById('key-gacha-clear')?.addEventListener('click', clearKeyGacha);
    document.getElementById('gate-random')?.addEventListener('click', () => {
        gateChallengeRun = randomPickGateChallenge();
        renderGateChallengeRun();
        const body = document.getElementById('gate-challenge-body');
        if (body && body.style.display === 'none') {
            body.style.display = 'block';
            localStorage.setItem('yellow-gate-challenge-expanded', 'true');
            const toggle = document.getElementById('gate-challenge-toggle');
            const icon = toggle?.querySelector('.toggle-icon');
            const text = toggle?.querySelector('.toggle-text');
            if (toggle) toggle.setAttribute('aria-expanded', 'true');
            if (icon) icon.textContent = '▲';
            if (text) text.textContent = '收起';
        }
        if (typeof umami !== 'undefined') {
            umami.track('gate-challenge-random-yellow', {
                track1_index: gateChallengeRun[0],
                track2_index: gateChallengeRun[1]
            });
        }
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    updateCountdown();
    setInterval(updateCountdown, 1000);
    updateYellowScheduleCountdown();
    setInterval(updateYellowScheduleCountdown, 60000);
    initYellowScheduleView();
    keyGachaResult = loadKeyGacha();
    renderKeyGachaResult();
    renderKeySongsPool();
    renderGateChallengeRun();
    initGateChallengeSection();
    initExpandClick();
    initEventListeners();
    initExportImport();
    if (typeof SongDetail !== 'undefined') SongDetail.init();
    if (typeof SongDisplay !== 'undefined') SongDisplay.initDisplaySettings('yellow');
    window.addEventListener('song-display-changed', () => {
        renderKeyGachaResult();
        renderKeySongsPool();
    });
});
