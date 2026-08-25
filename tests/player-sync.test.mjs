import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/player/sync.js';

test('maps repeated upstream gateway failures to a retryable 503', async () => {
    const originalFetch = globalThis.fetch;
    let attempts = 0;
    globalThis.fetch = async () => {
        attempts += 1;
        return new Response('upstream unavailable', { status: 504 });
    };

    try {
        const request = new Request('https://example.test/api/player/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrcode: 'q'.repeat(20) })
        });
        const response = await onRequestPost({ request, env: { WMC_API_TOKEN: 'test-token' }, clientIp: 'test' });

        assert.equal(attempts, 2);
        assert.equal(response.status, 503);
        assert.equal(response.headers.get('Retry-After'), '10');
        assert.deepEqual(await response.json(), { error: '成绩服务暂时繁忙，请稍后重试' });
    } finally {
        globalThis.fetch = originalFetch;
    }
});
