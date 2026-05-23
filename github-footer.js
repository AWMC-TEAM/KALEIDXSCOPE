// 本地开发时：若未替换 __LAST_UPDATE__，则显示 "-"
(function () {
    var el = document.querySelector('.github-footer-update');
    if (el && el.textContent.indexOf('__LAST_UPDATE__') >= 0) {
        el.textContent = '更新于 -';
    }
})();

// awmc.team 域名下显示备案号
(function () {
    if (location.hostname.indexOf('awmc.team') === -1) return;

    var footer = document.createElement('div');
    footer.className = 'beian-footer';
    footer.innerHTML =
        '<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">晋ICP备2025069504号-7</a>' +
        '<span class="beian-divider">|</span>' +
        '<a href="https://beian.mps.gov.cn/#/query/webSearch?code=14070302000140" target="_blank" rel="noopener noreferrer">' +
            '<img class="beian-police-icon" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath fill=%22%23d81e06%22 d=%22M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v4.7c0 4.83-3.13 9.37-7 10.75-3.87-1.38-7-5.92-7-10.75V6.3l7-3.12zM12 7a2 2 0 00-2 2c0 .74.4 1.38 1 1.72V14h2v-3.28c.6-.34 1-.98 1-1.72a2 2 0 00-2-2z%22/%3E%3C/svg%3E" alt="公安备案">' +
            '晋公网安备14070302000140号' +
        '</a>';

    document.body.appendChild(footer);
})();
