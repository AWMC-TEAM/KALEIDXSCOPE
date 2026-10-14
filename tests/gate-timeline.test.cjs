// 国服时间表日期回归：EXPERT（红谱）边界必须与官方公告一致
// - 2026-10-14 公告：希望の扉 自 10.15 起放宽为 EXPERT LIFE 100；最终相（里门）自 10.16 起
// - 时间表按「门可挑战的第一个整天」起算：棱镜塔 10/1（版本更新日），
//   表门·希望の扉·里门 10/2（版本更新第二日），因此红灯比旧推算整体后移一天
// - 分段语义：段的起点 = 该条件生效日（每日 04:00 切换），终点 = 下一档生效前一天
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/** 解析某门时间表：返回 [{ start, end, label }]，end 为 null 表示「后续」 */
function parseTimeline(file) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const rows = [];
    for (const [, full] of html.matchAll(/data-full="([^"]+)"/g)) {
        const range = full.split('<br>')[0].trim();
        const parts = range.split('-');
        const start = parts[0].trim();
        const endRaw = (parts.length > 1 ? parts[1] : parts[0]).trim(); // 单日分段（如 10.6）首尾同日
        rows.push({
            month: start.split('.')[0],
            start: Number(start.split('.')[1]),
            end: endRaw === '后续' ? null : Number(endRaw.split('.')[1]),
            label: full,
        });
    }
    return rows;
}

const cases = [
    { file: 'HOPKALEIDXSCOPE/index.html', name: '希望の扉', expert: 15, first: 2 },
    { file: 'FINALKALEIDXSCOPE/index.html', name: '最终相（里门）', expert: 16, first: 2 },
    { file: 'PRISMKALEIDXSCOPE/index.html', name: '棱镜塔', expert: 14, first: 1 },
];

test('国服时间表：红谱边界与官方公告一致，分段连续且不跨月', () => {
    for (const { file, name, expert, first } of cases) {
        const rows = parseTimeline(file);
        assert.ok(rows.length >= 6, `${name}：未解析到完整时间表`);

        const expertRow = rows.find(row => /EXPERT/.test(row.label));
        const basicRow = rows.find(row => /BASIC/.test(row.label));
        assert.ok(expertRow && basicRow, `${name}：缺少 EXPERT / BASIC 分段`);

        // 官方公告的放宽节点：红谱 10.<expert>，绿谱（BASIC）再晚 7 天
        assert.deepEqual([expertRow.month, expertRow.start], ['10', expert], `${name}：EXPERT 起算日不符合公告`);
        assert.equal(basicRow.start, expert + 7, `${name}：BASIC 应比 EXPERT 晚 7 天`);

        // 表首第一段的起点 = 该门放宽计时起点；末段以「后续」收尾
        assert.equal(rows[0].start, first, `${name}：首段起点应为 10.${first}`);
        assert.equal(rows[rows.length - 1].end, null, `${name}：末段应以「后续」收尾`);

        // 分段首尾相接：第 N 段结束次日 = 第 N+1 段起点
        assert.equal(new Set(rows.map(row => row.month)).size, 1, `${name}：时间表不应跨月`);
        for (let i = 0; i < rows.length - 1; i++) {
            assert.equal(rows[i + 1].start, rows[i].end + 1, `${name}：第 ${i + 2} 段与上一段之间有空隙`);
        }

        // 红谱前一档必须是紫谱，且紫谱最后一天 = 红谱生效前一天
        const masters = rows.filter(row => /(MASTER|Re:MASTER)/.test(row.label));
        assert.equal(masters[masters.length - 1].end + 1, expertRow.start, `${name}：紫谱档末应紧接红灯起点`);
    }
});
