/**
 * 乐曲详情模块 - 双击/长按曲绘查看详情
 * 支持桌面端双击、移动端长按（500ms）
 */
(function (global) {
    const LONG_PRESS_MS = 500;

    function getDxQueryDiffFromDisplaySetting() {
        // 与 song-display.js 的难度选择保持一致：basic/advanced/expert/master
        let levelKey = 'expert';
        try {
            const raw = localStorage.getItem('maimai-song-display-difficulty');
            if (raw === 'basic' || raw === 'advanced' || raw === 'expert' || raw === 'master') levelKey = raw;
        } catch (e) { /* ignore */ }
        const map = { basic: 2, advanced: 3, expert: 4, master: 5 };
        return map[levelKey] ?? 4;
    }

    function normalizeSongIdForAwmc(songId) {
        const n = Number(songId);
        if (!Number.isFinite(n)) return null;
        return n > 10000 ? (n - 10000) : n;
    }

    function buildAwmcPreviewUrl(songId) {
        const normalized = normalizeSongIdForAwmc(songId);
        if (normalized == null) return null;
        const diff = getDxQueryDiffFromDisplaySetting();
        const url = new URL('https://v.awmc.cc/');
        url.searchParams.set('song', String(normalized));
        url.searchParams.set('kind', 'dx');
        url.searchParams.set('diff', String(diff));
        return url.toString();
    }

    function escapeHtml(s) {
        if (s == null) return '';
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    function renderSongDetail(song) {
        const names = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:Master'];
        const colors = {
            'BASIC': '#7cb342',
            'ADVANCED': '#ff9800',
            'EXPERT': '#e53935',
            'MASTER': '#8e24aa',
            'Re:Master': 'rgb(200, 160, 225)'
        };
        const info = song.basic_info || {};
        const ds = song.ds || [];
        const level = song.level || [];

        const diffRows = ds.map((d, i) => {
            const diffName = names[i] || names[i];
            const lv = level[i] ?? String(Math.floor(d));
            const color = colors[diffName] || '#999';
            const textColor = diffName === 'Re:Master' ? '#333' : '#fff';
            return `<tr><td class="diff-name" style="background:${color};color:${textColor};font-weight:600">${diffName}</td><td>${escapeHtml(lv)}</td><td>${d}</td></tr>`;
        }).join('');

        return `
            <div class="song-detail-header">
                <h3 class="song-detail-title">${escapeHtml(song.title || info.title || '-')}</h3>
                ${song.type ? `<span class="song-detail-type">${escapeHtml(song.type)}</span>` : ''}
            </div>
            <table class="song-detail-diff-table">
                <thead><tr><th>难度</th><th>等级</th><th>定数</th></tr></thead>
                <tbody>${diffRows}</tbody>
            </table>
            <div class="song-detail-actions">
                <a class="btn btn-info btn-sm song-detail-awmc-link" href="${escapeHtml(buildAwmcPreviewUrl(song.id) || '')}" target="_blank" rel="noopener noreferrer" data-song-id="${escapeHtml(song.id)}">
                    铺面预览
                </a>
            </div>
            <div class="song-detail-meta">
                <p><strong>乐曲分类：</strong>${escapeHtml(info.genre || '-')}</p>
                <p><strong>BPM：</strong>${info.bpm ?? '-'}</p>
                ${info.artist ? `<p><strong>曲师：</strong>${escapeHtml(info.artist)}</p>` : ''}
                ${info.from ? `<p><strong>稼动版本：</strong>${escapeHtml(info.from)}</p>` : ''}
            </div>
        `;
    }

    let _currentSongDetailId = null;

    function showSongDetailModal(songId) {
        _currentSongDetailId = songId;
        const modal = document.getElementById('song-detail-modal');
        const loading = document.getElementById('song-detail-loading');
        const content = document.getElementById('song-detail-content');
        const errEl = document.getElementById('song-detail-error');
        if (!modal || !loading || !content || !errEl) return;

        modal.style.display = 'flex';
        loading.style.display = 'block';
        content.style.display = 'none';
        errEl.style.display = 'none';
        errEl.textContent = '';

        if (typeof MusicData === 'undefined') {
            errEl.textContent = '乐曲数据模块未加载';
            errEl.style.display = 'block';
            loading.style.display = 'none';
            return;
        }

        MusicData.getSongById(songId).then(song => {
            loading.style.display = 'none';
            if (!song) {
                errEl.textContent = '未找到该曲目信息（可能尚未收录或 ID 有误）';
                errEl.style.display = 'block';
                return;
            }
            content.innerHTML = renderSongDetail(song);
            content.style.display = 'block';
        }).catch(e => {
            loading.style.display = 'none';
            errEl.textContent = '加载失败：' + (e.message || '未知错误');
            errEl.style.display = 'block';
        });
    }

    function closeSongDetailModal() {
        const modal = document.getElementById('song-detail-modal');
        if (modal) modal.style.display = 'none';
    }

    function handleCoverActivate(cover) {
        if (cover && cover.dataset.songId) {
            if (typeof umami !== 'undefined') umami.track('song-detail-open', { song_id: cover.dataset.songId });
            showSongDetailModal(cover.dataset.songId);
        }
    }

    function initSongDetail() {
        let longPressTimer = null;

        // 当用户修改“设置展示信息”的难度时，若详情弹窗已打开则同步更新预览链接 diff
        window.addEventListener('song-display-changed', () => {
            const link = document.querySelector('#song-detail-content .song-detail-awmc-link');
            if (!link) return;
            const songId = link.getAttribute('data-song-id');
            const href = buildAwmcPreviewUrl(songId);
            if (href) link.href = href;
        });

        document.addEventListener('dblclick', (e) => {
            const cover = e.target.closest('.song-cover, .gate-chip-cover, .reference-cover, .remaining-cover-wrap');
            if (cover && cover.dataset.songId) {
                e.preventDefault();
                handleCoverActivate(cover);
            }
        });

        document.addEventListener('touchstart', (e) => {
            const cover = e.target.closest('.song-cover, .gate-chip-cover, .reference-cover, .remaining-cover-wrap');
            if (cover && cover.dataset.songId) {
                longPressTimer = setTimeout(() => {
                    longPressTimer = null;
                    e.preventDefault();
                    handleCoverActivate(cover);
                }, LONG_PRESS_MS);
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });

        document.addEventListener('touchcancel', () => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });

        document.getElementById('song-detail-close')?.addEventListener('click', closeSongDetailModal);
        document.getElementById('song-detail-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'song-detail-modal') closeSongDetailModal();
        });
        document.getElementById('song-detail-refresh')?.addEventListener('click', () => {
            if (typeof MusicData !== 'undefined') {
                MusicData.invalidateCache();
                if (_currentSongDetailId) showSongDetailModal(_currentSongDetailId);
                alert('已清除缓存，已重新拉取数据');
                if (typeof umami !== 'undefined') umami.track('song-detail-refresh');
            }
        });
    }

    global.SongDetail = {
        show: showSongDetailModal,
        close: closeSongDetailModal,
        init: initSongDetail
    };
})(typeof window !== 'undefined' ? window : globalThis);
