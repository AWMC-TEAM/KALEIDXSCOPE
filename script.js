// 主页交互脚本 - 仅倒计时判断 + 通用卡片交互

// 紫色之门开放时间（与 PURPLEKALEIDXSCOPE 页 OPEN_TIME 一致）
const PURPLE_OPEN_TIME = new Date('2026-03-25T10:00:00+08:00');
// 黑色之门开放时间（与 BLACKKALEIDXSCOPE 页 OPEN_TIME 一致）
const BLACK_OPEN_TIME = new Date('2026-04-28T10:00:00+08:00');
// 黄色之门开放时间（预测，与 YELLOWKALEIDXSCOPE 页 OPEN_TIME 一致）
const YELLOW_OPEN_TIME = new Date('2026-06-11T10:00:00+08:00');

document.addEventListener('DOMContentLoaded', function() {
    const purpleCard = document.getElementById('purple-door-card');
    const blackCard = document.getElementById('black-door-card');
    const yellowCard = document.getElementById('yellow-door-card');

    // 倒计时判断：到时间才显示门，未到则保持隐藏
    function applyIndexDoorOpenState() {
        const now = new Date();
        if (purpleCard && now >= PURPLE_OPEN_TIME) {
            purpleCard.classList.add('purple-revealed');
            purpleCard.classList.remove('purple-early-unlock');
        }
        if (blackCard && now >= BLACK_OPEN_TIME) {
            blackCard.classList.add('black-revealed');
            blackCard.classList.remove('black-early-unlock');
        }
        if (yellowCard && now >= YELLOW_OPEN_TIME) {
            yellowCard.classList.add('yellow-revealed');
            yellowCard.classList.remove('yellow-early-unlock');
        }
    }
    applyIndexDoorOpenState();
    setInterval(applyIndexDoorOpenState, 1000);

    // 通用：门卡片点击反馈 + 键盘可访问性
    const doorCards = document.querySelectorAll('.door-card:not(.coming-soon)');
    doorCards.forEach(card => {
        card.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => { this.style.transform = ''; }, 150);
        });

        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        const label = card.querySelector('img')?.alt || '点击进入解锁攻略';
        card.setAttribute('aria-label', label);

        card.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    // 加载动画（未解锁的紫/黑/黄门不参与）
    const doors = document.querySelectorAll('.door-card');
    doors.forEach((door, index) => {
        if (door.classList.contains('purple-door-card') && !door.classList.contains('purple-revealed')) return;
        if (door.classList.contains('black-door-card') && !door.classList.contains('black-revealed')) return;
        if (door.classList.contains('yellow-door-card') && !door.classList.contains('yellow-revealed')) return;
        door.style.opacity = '0';
        door.style.transform = 'translateY(30px)';
        setTimeout(() => {
            door.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            door.style.opacity = '1';
            door.style.transform = 'translateY(0)';
        }, index * 100);
    });
});
