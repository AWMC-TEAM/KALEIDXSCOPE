// 黄门 - 七彩区域
// 使用集中配置
const { songs: KEY_SONGS, gate } = SongsConfig.yellow;
const GATE_TRACK1_POOL = gate.track1;
const GATE_TRACK2_POOL = gate.track2;
const GATE_TRACK3_FIXED = gate.track3;

const noCoverSvg = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22%3E%3Crect fill=%22%23ddd%22 width=%2280%22 height=%2280%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2210%22%3E%E6%9A%82%E6%97%A0%E6%9B%B2%E7%BB%98%3C/text%3E%3C/svg%3E";

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
        : `<div class="key-gacha-cover" data-song-id="${escapeAttr(song.id)}" title="双击/长按查看乐曲详情"><img src="https://assets.awmc.team/covers/${escapeAttr(song.id)}.png" alt="${escapeAttr(song.name)}" onerror="this.src='${noCoverSvg}'"></div>`;

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
            : `<div class="song-cover" data-song-id="${escapeAttr(song.id)}" title="双击/长按查看乐曲详情"><img src="https://assets.awmc.team/covers/${escapeAttr(song.id)}.png" alt="${escapeAttr(song.name)}" onerror="this.src='${noCoverSvg}'"></div>`;
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
                : `<div class="gate-chip-cover" data-song-id="${escapeAttr(s.id)}" title="双击/长按查看乐曲详情"><img src="https://assets.awmc.team/covers/${escapeAttr(s.id)}.png" alt="${escapeAttr(s.name)}" onerror="this.src='${noCoverSvg}'"></div>`;
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
                : `<div class="gate-chip-cover" data-song-id="${escapeAttr(t3.id)}" title="双击/长按查看乐曲详情"><img src="https://assets.awmc.team/covers/${escapeAttr(t3.id)}.png" alt="${escapeAttr(t3.name)}" onerror="this.src='${noCoverSvg}'"></div>`}
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
