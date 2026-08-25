/* Browser-side score sync. Secrets stay in the EdgeOne function. */
(function (global) {
    const QR_STORAGE_KEY = 'kaleidxscope-player-qrcode';
    const KEY_STORAGE_KEY = 'kaleidxscope-player-key';
    const RECORDS_STORAGE_KEY = 'kaleidxscope-player-records';
    const SYNC_COOLDOWN_MS = 60 * 1000;
    const API_PATH = '/api/player/sync';

    let cachedRecords = loadRecords();
    let syncPromise = null;

    function bytesToBase64(bytes) {
        let binary = '';
        bytes.forEach(byte => { binary += String.fromCharCode(byte); });
        return btoa(binary);
    }

    function base64ToBytes(value) {
        const binary = atob(value);
        return Uint8Array.from(binary, char => char.charCodeAt(0));
    }

    function getStoredKeyBytes() {
        try {
            const existing = localStorage.getItem(KEY_STORAGE_KEY);
            if (existing) return base64ToBytes(existing);
            const bytes = crypto.getRandomValues(new Uint8Array(32));
            localStorage.setItem(KEY_STORAGE_KEY, bytesToBase64(bytes));
            return bytes;
        } catch {
            return null;
        }
    }

    async function encryptQrCode(value) {
        const keyBytes = getStoredKeyBytes();
        if (!keyBytes || !global.crypto?.subtle) return `plain:${btoa(encodeURIComponent(value))}`;
        const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value));
        return JSON.stringify({ iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)) });
    }

    async function decryptQrCode(value) {
        if (!value) return '';
        if (value.startsWith('plain:')) {
            try { return decodeURIComponent(atob(value.slice(6))); } catch { return ''; }
        }
        try {
            const envelope = JSON.parse(value);
            const keyBytes = getStoredKeyBytes();
            if (!keyBytes || !global.crypto?.subtle) return '';
            const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
            const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(envelope.iv) }, key, base64ToBytes(envelope.data));
            return new TextDecoder().decode(decrypted);
        } catch {
            return '';
        }
    }

    function loadRecords() {
        try {
            const value = JSON.parse(localStorage.getItem(RECORDS_STORAGE_KEY) || '{}');
            return Array.isArray(value.records) ? value : { records: [], playedSongIds: [], recordCount: 0, syncedAt: null };
        } catch {
            return { records: [], playedSongIds: [], recordCount: 0, syncedAt: null };
        }
    }

    function saveRecords(value) {
        cachedRecords = value;
        try { localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(value)); } catch { /* storage may be disabled */ }
    }

    function getPlayedSongIds() {
        return new Set((cachedRecords.playedSongIds || []).map(String));
    }

    function decoratePlayedSongs(root) {
        const played = getPlayedSongIds();
        const scope = root || document;
        const targets = new Map();
        scope.querySelectorAll?.('[data-song-id]').forEach(element => {
            const target = element.closest('.song-card, .pool-song-card, .run-song-card, .remaining-item, .reference-item, .song-item') || element;
            const isPlayed = played.has(String(element.dataset.songId));
            targets.set(target, Boolean(targets.get(target)) || isPlayed);
        });
        scope.querySelectorAll?.('.player-sync-played').forEach(element => {
            if (!targets.get(element)) element.classList.remove('player-sync-played');
        });
        targets.forEach((isPlayed, target) => {
            target.classList.toggle('player-sync-played', isPlayed);
        });
    }

    function hasCachedQrCode() {
        return Boolean(localStorage.getItem(QR_STORAGE_KEY));
    }

    function setStatus(text, state) {
        const status = document.getElementById('player-sync-status');
        if (!status) return;
        status.textContent = text;
        status.dataset.state = state || 'idle';
    }

    function formatSyncedAt(value) {
        if (!value) return '尚未同步';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '已同步';
        return `上次同步 ${date.toLocaleString('zh-CN', { hour12: false })}`;
    }

    function updateCachedStatus() {
        const count = cachedRecords.recordCount || cachedRecords.records?.length || 0;
        setStatus(count ? `${formatSyncedAt(cachedRecords.syncedAt)} · ${count} 条成绩` : '尚未同步', count ? 'ready' : 'idle');
        const clear = document.getElementById('player-sync-clear');
        if (clear) clear.hidden = !hasCachedQrCode();
    }

    function ensureModal() {
        if (document.getElementById('player-sync-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'player-sync-modal';
        modal.className = 'player-sync-modal';
        modal.hidden = true;
        modal.innerHTML = `
            <div class="player-sync-panel" role="dialog" aria-modal="true" aria-labelledby="player-sync-title">
                <div class="player-sync-panel-header">
                    <div>
                        <p class="player-sync-eyebrow">PLAYER DATA</p>
                        <h2 id="player-sync-title">同步游玩成绩</h2>
                    </div>
                    <button type="button" class="player-sync-close" id="player-sync-close" aria-label="关闭">×</button>
                </div>
                <p class="player-sync-help">输入舞萌｜中二中的玩家二维码。成功后会保存在此浏览器，下次无需重复输入。</p>
                <label class="player-sync-field">
                    <span>QRCODE</span>
                    <input id="player-sync-qrcode" type="password" autocomplete="off" spellcheck="false" placeholder="粘贴二维码内容">
                </label>
                <p id="player-sync-modal-status" class="player-sync-modal-status" role="status"></p>
                <div class="player-sync-actions">
                    <button type="button" class="btn btn-primary" id="player-sync-submit">开始同步</button>
                    <button type="button" class="btn btn-secondary" id="player-sync-clear">清除本机账号</button>
                </div>
                <p class="player-sync-security">二维码只用于向成绩服务请求数据，不会显示在页面、URL 或统计信息中。</p>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function openModal() {
        ensureModal();
        const modal = document.getElementById('player-sync-modal');
        const input = document.getElementById('player-sync-qrcode');
        const status = document.getElementById('player-sync-modal-status');
        modal.hidden = false;
        document.body.classList.add('player-sync-modal-open');
        if (input) input.value = '';
        if (status) status.textContent = hasCachedQrCode() ? '已保存二维码，直接同步即可；如需更换请先清除。' : '';
        if (hasCachedQrCode()) input?.setAttribute('placeholder', '已保存，输入新二维码可覆盖');
        input?.focus();
    }

    function closeModal() {
        const modal = document.getElementById('player-sync-modal');
        if (modal) modal.hidden = true;
        document.body.classList.remove('player-sync-modal-open');
    }

    async function getQrCode() {
        const inputValue = document.getElementById('player-sync-qrcode')?.value.trim();
        if (inputValue) return inputValue;
        return decryptQrCode(localStorage.getItem(QR_STORAGE_KEY));
    }

    async function sync() {
        if (syncPromise) return syncPromise;
        const lastSync = Number(localStorage.getItem('kaleidxscope-player-last-request') || 0);
        if (Date.now() - lastSync < SYNC_COOLDOWN_MS) {
            setStatus('刚刚同步过，请稍后再试', 'cooldown');
            return cachedRecords;
        }
        syncPromise = (async () => {
            const qrcode = await getQrCode();
            if (!qrcode) throw new Error('请先输入玩家 QRCODE');
            setStatus('正在同步成绩…', 'loading');
            const modalStatus = document.getElementById('player-sync-modal-status');
            if (modalStatus) modalStatus.textContent = '正在请求成绩服务，请稍候…';
            localStorage.setItem('kaleidxscope-player-last-request', String(Date.now()));
            const response = await fetch(API_PATH, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrcode })
            });
            let payload = {};
            try { payload = await response.json(); } catch { /* handled below */ }
            if (!response.ok) throw new Error(payload.error || `同步失败（${response.status}）`);
            const encrypted = await encryptQrCode(qrcode);
            localStorage.setItem(QR_STORAGE_KEY, encrypted);
            saveRecords(payload);
            updateCachedStatus();
            decoratePlayedSongs();
            global.dispatchEvent(new CustomEvent('player-records-updated', { detail: payload }));
            if (modalStatus) modalStatus.textContent = `同步完成，共 ${payload.recordCount || payload.records?.length || 0} 条成绩。`;
            return payload;
        })().catch(error => {
            setStatus(error.message || '同步失败', 'error');
            const modalStatus = document.getElementById('player-sync-modal-status');
            if (modalStatus) modalStatus.textContent = error.message || '同步失败';
            throw error;
        }).finally(() => { syncPromise = null; });
        return syncPromise;
    }

    function clearStoredAccount() {
        localStorage.removeItem(QR_STORAGE_KEY);
        localStorage.removeItem(KEY_STORAGE_KEY);
        localStorage.removeItem(RECORDS_STORAGE_KEY);
        localStorage.removeItem('kaleidxscope-player-last-request');
        cachedRecords = { records: [], playedSongIds: [], recordCount: 0, syncedAt: null };
        updateCachedStatus();
        decoratePlayedSongs();
        global.dispatchEvent(new CustomEvent('player-records-cleared'));
        const modalStatus = document.getElementById('player-sync-modal-status');
        if (modalStatus) modalStatus.textContent = '已清除本机账号和成绩缓存。';
    }

    function init() {
        ensureModal();
        updateCachedStatus();
        decoratePlayedSongs();
        document.getElementById('player-sync-btn')?.addEventListener('click', openModal);
        document.getElementById('player-sync-close')?.addEventListener('click', closeModal);
        document.getElementById('player-sync-modal')?.addEventListener('click', event => {
            if (event.target.id === 'player-sync-modal') closeModal();
        });
        document.getElementById('player-sync-submit')?.addEventListener('click', async () => {
            try { await sync(); } catch { /* status is rendered in the modal */ }
        });
        document.getElementById('player-sync-clear')?.addEventListener('click', () => {
            if (confirm('清除本机保存的二维码和成绩吗？')) clearStoredAccount();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeModal();
        });
        const observer = new MutationObserver(() => {
            requestAnimationFrame(() => decoratePlayedSongs());
        });
        observer.observe(document.body, { childList: true, subtree: true });
        global.dispatchEvent(new CustomEvent('player-records-updated', { detail: cachedRecords }));
    }

    global.PlayerSync = {
        getPlayedSongIds,
        getRecords: () => cachedRecords.records || [],
        decoratePlayedSongs,
        sync,
        clearStoredAccount
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})(window);
