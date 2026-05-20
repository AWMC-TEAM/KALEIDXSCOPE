/**
 * 乐曲展示模块 - 用户可自定义展示字段，优先从 MusicData 获取
 * 难度可选 BASIC / ADVANCED / EXPERT / MASTER
 */
(function (global) {
    const STORAGE_KEY = 'maimai-song-display-fields';
    const DIFFICULTY_STORAGE_KEY = 'maimai-song-display-difficulty';
    const DEFAULT_FIELDS = ['id', 'version', 'difficulty'];
    const FIELD_OPTIONS = [
        { key: 'id', label: '乐曲 ID' },
        { key: 'version', label: '稼动版本' },
        { key: 'difficulty', label: '难度' },
        { key: 'genre', label: '流派' },
        { key: 'bpm', label: 'BPM' },
        { key: 'artist', label: '曲师' }
    ];
    const DIFFICULTY_OPTIONS = [
        { key: 'basic', label: 'BASIC', index: 0 },
        { key: 'advanced', label: 'ADVANCED', index: 1 },
        { key: 'expert', label: 'EXPERT', index: 2 },
        { key: 'master', label: 'MASTER', index: 3 }
    ];

    function getDisplayFields() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr) && arr.length > 0) return arr;
            }
        } catch (e) { /* ignore */ }
        return [...DEFAULT_FIELDS];
    }

    function setDisplayFields(fields) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
    }

    function getDifficultyLevel() {
        try {
            const raw = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
            if (raw && DIFFICULTY_OPTIONS.some(o => o.key === raw)) return raw;
        } catch (e) { /* ignore */ }
        return 'expert';
    }

    function setDifficultyLevel(level) {
        localStorage.setItem(DIFFICULTY_STORAGE_KEY, level);
    }

    function getDxQueryDiffFromLevel(levelKey) {
        // v.awmc.cc diff 对应：2 Basic、3 Advance、4 Expert、5 Master
        const map = {
            basic: 2,
            advanced: 3,
            expert: 4,
            master: 5
        };
        return map[levelKey] ?? 4;
    }

    function updateAwmcConfirmLinks() {
        if (typeof document === 'undefined') return;
        const diff = getDxQueryDiffFromLevel(getDifficultyLevel());
        const anchors = document.querySelectorAll('a[href^="https://v.awmc.cc/?song="], a[href*="v.awmc.cc/?song="]');
        anchors.forEach(a => {
            const href = a.getAttribute('href');
            if (!href) return;
            try {
                const url = new URL(href);
                if (url.hostname !== 'v.awmc.cc') return;
                if (!url.searchParams.has('song')) return;
                url.searchParams.set('diff', String(diff));
                a.href = url.toString();
            } catch (e) {
                // ignore invalid URLs
            }
        });
    }

    function getDifficultyAt(song, diffIndex) {
        if (!song) return null;
        const ds = song.ds || [];
        const level = song.level || [];
        const d = ds[diffIndex];
        const lv = level[diffIndex];
        if (d != null) return { ds: d, level: lv != null ? lv : String(Math.floor(d)) };
        return null;
    }

    function getExpertDifficulty(song) {
        const opt = DIFFICULTY_OPTIONS.find(o => o.key === getDifficultyLevel()) || DIFFICULTY_OPTIONS[2];
        return getDifficultyAt(song, opt.index);
    }

    function getSongDisplayInfo(song, fallbackName) {
        if (!song) return { name: fallbackName || '-', fields: {} };
        const info = song.basic_info || {};
        const diffKey = getDifficultyLevel();
        const opt = DIFFICULTY_OPTIONS.find(o => o.key === diffKey) || DIFFICULTY_OPTIONS[2];
        const diff = getDifficultyAt(song, opt.index);
        return {
            name: song.title || info.title || fallbackName || '-',
            fields: {
                id: song.id,
                version: info.from || '-',
                difficulty: diff ? `[${diff.level}] ${diff.ds}` : '-',
                genre: info.genre || '-',
                bpm: info.bpm ?? '-',
                artist: info.artist || '-'
            }
        };
    }

    function escapeHtml(s) {
        if (s == null) return '';
        const div = document.createElement('div');
        div.textContent = String(s);
        return div.innerHTML;
    }

    function renderSongDetailsHtml(fields, displayInfo) {
        const labels = { id: 'ID', version: '版本', difficulty: '难度', genre: '流派', bpm: 'BPM', artist: '曲师' };
        const diffLabel = DIFFICULTY_OPTIONS.find(o => o.key === getDifficultyLevel())?.label || 'EXPERT';
        if (labels.difficulty === '难度') labels.difficulty = `难度 (${diffLabel})`;
        return fields
            .filter(k => FIELD_OPTIONS.some(o => o.key === k))
            .map(k => {
                const v = displayInfo.fields[k];
                const label = labels[k] || k;
                return `<span class="song-detail-tag song-detail-tag--${k}">${escapeHtml(label)}: ${escapeHtml(v)}</span>`;
            })
            .join('');
    }

    function initDisplaySettings(umamiPrefix) {
        const btn = document.getElementById('song-display-settings-btn');
        const modal = document.getElementById('song-display-settings-modal');
        if (!btn || !modal) return;

        // 页面加载时就同步一次，避免初始 diff 与本地设置不一致
        updateAwmcConfirmLinks();
        window.addEventListener('song-display-changed', updateAwmcConfirmLinks);

        function ensureDifficultyRow() {
            let row = modal.querySelector('.song-display-settings-difficulty');
            if (!row) {
                row = document.createElement('div');
                row.className = 'song-display-settings-difficulty';
                row.innerHTML = `
                    <label class="song-display-settings-difficulty-label">难度选择：</label>
                    <select class="song-display-settings-difficulty-select">
                        ${DIFFICULTY_OPTIONS.map(o => `<option value="${o.key}">${escapeHtml(o.label)}</option>`).join('')}
                    </select>
                `;
                modal.querySelector('.song-display-settings-list')?.insertAdjacentElement('afterend', row);
            }
            row.querySelector('select').value = getDifficultyLevel();
            return row;
        }

        function renderCheckboxes() {
            const container = modal.querySelector('.song-display-settings-list');
            if (!container) return;
            const fields = getDisplayFields();
            container.innerHTML = FIELD_OPTIONS.map(o => `
                <label class="song-display-settings-item">
                    <input type="checkbox" value="${o.key}" ${fields.includes(o.key) ? 'checked' : ''}>
                    <span>${escapeHtml(o.label)}</span>
                </label>
            `).join('');
            ensureDifficultyRow();
        }

        btn.addEventListener('click', () => {
            renderCheckboxes();
            modal.style.display = 'flex';
            if (typeof umami !== 'undefined') umami.track('song-display-settings-open', { door: umamiPrefix || 'global' });
        });

        modal.querySelector('.song-display-settings-close')?.addEventListener('click', () => {
            modal.style.display = 'none';
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        modal.querySelector('.song-display-settings-save')?.addEventListener('click', () => {
            const checked = [...modal.querySelectorAll('.song-display-settings-list input:checked')]
                .map(el => el.value);
            const diffSelect = modal.querySelector('.song-display-settings-difficulty-select');
            if (checked.length > 0) {
                setDisplayFields(checked);
                if (diffSelect) setDifficultyLevel(diffSelect.value);
                modal.style.display = 'none';
                window.dispatchEvent(new CustomEvent('song-display-changed'));
                if (typeof umami !== 'undefined') umami.track('song-display-settings-save', { door: umamiPrefix || 'global', fields: checked.join(','), difficulty: diffSelect?.value });
            } else {
                alert('请至少选择一项展示内容');
            }
        });
    }

    global.SongDisplay = {
        getDisplayFields,
        setDisplayFields,
        getDifficultyLevel,
        setDifficultyLevel,
        FIELD_OPTIONS,
        DIFFICULTY_OPTIONS,
        getExpertDifficulty,
        getSongDisplayInfo,
        renderSongDetailsHtml,
        initDisplaySettings,
        getMusicDataThen: (songId, fallback, cb) => {
            if (typeof MusicData === 'undefined') {
                cb(getSongDisplayInfo(null, fallback?.name));
                return;
            }
            MusicData.getSongById(songId).then(song => {
                cb(getSongDisplayInfo(song, fallback?.name));
            }).catch(() => cb(getSongDisplayInfo(null, fallback?.name)));
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
