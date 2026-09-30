const test = require('node:test');
const assert = require('node:assert/strict');
const { gates } = require('../gate-site.js');
const { buildStar } = require('../gate-scene.js');
test('完整旅程包含十个独立门，包括错误门', () => {
    assert.equal(gates.length, 10);
    assert.equal(new Set(gates.map(gate => gate.path)).size, 10);
    assert.ok(gates.some(gate => gate.key === 'error'));
});
test('最终星光尖端为45度斜向而非十字', () => {
    const points = buildStar(100);
    assert.equal(points.length, 8);
    for (const [x, y] of points.filter((_, index) => index % 2 === 0)) {
        assert.ok(Math.abs(Math.abs(x) - Math.abs(y)) < 0.001);
        assert.ok(Math.abs(x) > 70);
    }
});
