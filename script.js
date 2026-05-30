// 主页交互脚本 - 通用卡片交互

document.addEventListener('DOMContentLoaded', function() {
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

    // 加载动画
    const doors = document.querySelectorAll('.door-card');
    doors.forEach((door, index) => {
        door.style.opacity = '0';
        door.style.transform = 'translateY(30px)';
        setTimeout(() => {
            door.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            door.style.opacity = '1';
            door.style.transform = 'translateY(0)';
        }, index * 100);
    });
});
