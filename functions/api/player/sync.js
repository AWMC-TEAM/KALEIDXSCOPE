const UPSTREAM_URL = 'https://api.wmc.pub/v1/user/music';
const MAX_BODY_BYTES = 32 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 250;
const RATE_WINDOW_MS = 10_000;
const MAX_REQUESTS_PER_WINDOW = 2;
const UPSTREAM_RETRYABLE_STATUSES = new Set([502, 503, 504]);

const buckets = globalThis.__kaleidxscopeSyncBuckets || (globalThis.__kaleidxscopeSyncBuckets = new Map());

function json(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            ...headers
        }
    });
}

function getClientKey(context) {
    return context.clientIp || context.request.headers.get('CF-Connecting-IP') || context.request.headers.get('X-Forwarded-For') || 'unknown';
}

function checkLocalRateLimit(key) {
    const now = Date.now();
    const current = buckets.get(key) || { startedAt: now, count: 0 };
    if (now - current.startedAt >= RATE_WINDOW_MS) {
        current.startedAt = now;
        current.count = 0;
    }
    current.count += 1;
    buckets.set(key, current);
    if (buckets.size > 2000) {
        for (const [entryKey, entry] of buckets) {
            if (now - entry.startedAt >= RATE_WINDOW_MS * 2) buckets.delete(entryKey);
        }
    }
    return current.count <= MAX_REQUESTS_PER_WINDOW;
}

function parseMaybeJson(value) {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function unwrapPayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    const candidates = [payload.businessData, payload.data, payload.returnMessage, payload.msg];
    for (const candidate of candidates) {
        const parsed = parseMaybeJson(candidate);
        if (parsed && typeof parsed === 'object') return parsed;
    }
    return payload;
}

function flattenRecords(payload) {
    const root = unwrapPayload(payload);
    if (Array.isArray(root)) return root;
    if (Array.isArray(root.records)) {
        return root.records.flatMap(item => Array.isArray(item) ? item : [item]);
    }
    if (Array.isArray(root.userMusicList)) {
        return root.userMusicList.flatMap(group => {
            if (Array.isArray(group?.userMusicDetailList)) return group.userMusicDetailList;
            return group ? [group] : [];
        });
    }
    if (Array.isArray(root.userMusicDetailList)) return root.userMusicDetailList;
    return [];
}

function numberOrNull(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function normalizeRecord(record) {
    if (!record || typeof record !== 'object') return null;
    const musicId = record.musicId ?? record.music_id ?? record.songId ?? record.song_id;
    if (musicId === null || musicId === undefined || musicId === '') return null;
    const playCount = numberOrNull(record.playCount ?? record.play_count) ?? 1;
    return {
        musicId: String(musicId),
        level: numberOrNull(record.level ?? record.levelIndex ?? record.level_index),
        playCount,
        achievement: numberOrNull(record.achievement ?? record.achievements),
        scoreRank: numberOrNull(record.scoreRank ?? record.score_rank),
        comboStatus: numberOrNull(record.comboStatus ?? record.combo_status),
        syncStatus: numberOrNull(record.syncStatus ?? record.sync_status),
        deluxscoreMax: numberOrNull(record.deluxscoreMax ?? record.dxScore ?? record.dx_score)
    };
}

function normalizeResponse(payload) {
    const records = flattenRecords(payload).map(normalizeRecord).filter(Boolean);
    const deduped = new Map();
    records.forEach(record => {
        const key = `${record.musicId}:${record.level ?? ''}`;
        const existing = deduped.get(key);
        if (!existing || (record.playCount ?? 0) >= (existing.playCount ?? 0)) deduped.set(key, record);
    });
    const normalized = [...deduped.values()];
    return {
        records: normalized,
        playedSongIds: [...new Set(normalized.filter(record => (record.playCount ?? 0) > 0).map(record => record.musicId))],
        recordCount: normalized.length
    };
}

function isValidQrCode(value) {
    return typeof value === 'string' && value.length >= 20 && value.length <= 4096 && !/\s/.test(value);
}

async function fetchUpstream(token, sessionCookie, qrcode) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const headers = {
            'User-Agent': 'Kaleidxscope/1.0.0',
            'Content-Type': 'application/json',
            Accept: '*/*',
            Authorization: `Bearer ${token}`
        };
        if (sessionCookie) headers.Cookie = sessionCookie;
        const response = await fetch(UPSTREAM_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({ qrcode }),
            signal: controller.signal
        });
        const text = await response.text();
        let payload;
        try {
            payload = JSON.parse(text);
        } catch {
            payload = null;
        }
        return { response, payload };
    } finally {
        clearTimeout(timer);
    }
}

export async function onRequestPost(context) {
    const { request, env = {} } = context;
    if (!checkLocalRateLimit(getClientKey(context))) {
        return json({ error: '请求过于频繁，请稍后再试' }, 429, { 'Retry-After': '10' });
    }

    const token = env.WMC_API_TOKEN;
    if (!token) return json({ error: '服务端未配置 WMC_API_TOKEN' }, 503);
    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > MAX_BODY_BYTES) return json({ error: '请求体过大' }, 413);

    let body;
    try {
        const raw = await request.text();
        if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: '请求体过大' }, 413);
        body = JSON.parse(raw);
    } catch {
        return json({ error: '请求格式必须是 JSON' }, 400);
    }
    const qrcode = typeof body?.qrcode === 'string' ? body.qrcode.trim() : '';
    if (!isValidQrCode(qrcode)) return json({ error: 'QRCODE 格式无效' }, 400);

    try {
        let result = await fetchUpstream(token, env.WMC_SESSION_COOKIE, qrcode);
        if (result.response.status === 429 || UPSTREAM_RETRYABLE_STATUSES.has(result.response.status)) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            result = await fetchUpstream(token, env.WMC_SESSION_COOKIE, qrcode);
        }
        if (!result.response.ok) {
            if (UPSTREAM_RETRYABLE_STATUSES.has(result.response.status)) {
                return json({ error: '成绩服务暂时繁忙，请稍后重试' }, 503, { 'Retry-After': '10' });
            }
            return json({ error: `成绩服务返回 HTTP ${result.response.status}` }, result.response.status === 429 ? 429 : 502);
        }
        const normalized = normalizeResponse(result.payload);
        if (!normalized.recordCount) return json({ error: '成绩服务没有返回可识别的乐曲记录' }, 502);
        return json({ ...normalized, syncedAt: new Date().toISOString() });
    } catch (error) {
        const message = error?.name === 'AbortError' ? '成绩服务请求超时' : '成绩服务暂时不可用';
        return json({ error: message }, 502);
    }
}
