const test = require('node:test');
const assert = require('node:assert/strict');
const { createShards, stepShards } = require('../gate-motion.js');

test('prism bursts spawn finite shards at the origin', () => {
    const shards = createShards(100, 200, 24, 8);
    assert.equal(shards.length, 24);
    for (const shard of shards) {
        assert.equal(shard.x, 100);
        assert.equal(shard.y, 200);
        assert.ok([shard.vx, shard.vy, shard.size, shard.hue].every(Number.isFinite));
    }
});

test('shards fall under gravity and expire so the overlay loop can stop', () => {
    let shards = createShards(0, 0, 10, 6, () => 0.5);
    const startVy = shards[0].vy;
    shards = stepShards(shards, 16.67);
    assert.ok(shards[0].vy > startVy * 0.97);
    for (let frame = 0; frame < 200 && shards.length; frame++) shards = stepShards(shards, 16.67);
    assert.equal(shards.length, 0);
});
