const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sourcePath = path.join(__dirname, '../gate-scene.js');

// Removing progress clamping, radial separation, or the reduced-motion guard must fail these tests.
test('scene implementation exists', () => {
    assert.ok(fs.existsSync(sourcePath), 'shared scene implementation is missing');
});

function loadScene() {
    return require(sourcePath);
}

test('scroll progress is bounded and safe for short documents', () => {
    const { getProgress } = loadScene();
    assert.equal(getProgress(0, 3000, 1000), 0);
    assert.equal(getProgress(1000, 3000, 1000), 0.5);
    assert.equal(getProgress(4000, 3000, 1000), 1);
    assert.equal(getProgress(-30, 3000, 1000), 0);
    assert.equal(getProgress(20, 500, 1000), 0);
});

test('each gate produces finite triangular glass facets', () => {
    const { buildFacets } = loadScene();
    for (const theme of ['prism', 'hope', 'final']) {
        const facets = buildFacets(theme);
        assert.ok(facets.length >= 12);
        for (const facet of facets) {
            assert.equal(facet.points.length, 3);
            assert.ok(facet.points.flat().every(Number.isFinite));
        }
    }
});

test('facets separate progressively and reverse to their intact state', () => {
    const { buildFacets, getFacetPose } = loadScene();
    const facet = buildFacets('prism')[4];
    const start = getFacetPose(facet, 0, false);
    const middle = getFacetPose(facet, 0.5, false);
    const end = getFacetPose(facet, 1, false);
    assert.equal(start.x, 0);
    assert.equal(start.y, 0);
    assert.ok(Math.hypot(end.x, end.y) > Math.hypot(middle.x, middle.y));
    assert.deepEqual(getFacetPose(facet, 0, false), start);
});

test('reduced motion freezes fracture at the intact geometry', () => {
    const { buildFacets, getFacetPose } = loadScene();
    const facet = buildFacets('final')[2];
    assert.deepEqual(getFacetPose(facet, 1, true), getFacetPose(facet, 0, false));
});
