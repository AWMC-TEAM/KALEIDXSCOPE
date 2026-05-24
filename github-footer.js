// ============================================================
// 站点全局配置 —— 以后只改这里，所有页面自动跟着变
// ============================================================
var SITE_CONFIG = {
    // 版本号 / 最后更新日期（同时替换 HTML 中的 __APP_VERSION__ 和 __LAST_UPDATE__）
    version: '2026-05-24',

    // 备案号显示的域名关键字（只在该域名下显示备案号，留空则所有域名都显示）
    beianDomain: 'awmc.team',

    // ICP 备案号
    icp: {
        text: '晋ICP备2025069504号-7',
        url: 'https://beian.miit.gov.cn/',
        icon: 'https://www.mc5173.cn/logo.png'
    },

    // 公安备案号
    police: {
        text: '晋公网安备14070302000140号',
        code: '14070302000140',
        url: 'https://beian.mps.gov.cn/#/query/webSearch?code=14070302000140'
    }
};

// ============================================================
// 以下为执行逻辑，一般不需要修改
// ============================================================

// 1. 替换 HTML 中的占位符（__APP_VERSION__、__LAST_UPDATE__）
(function () {
    var version = SITE_CONFIG.version;

    // 替换 title 中的占位符
    if (document.title.indexOf('__APP_VERSION__') >= 0) {
        document.title = document.title.replace(/__APP_VERSION__/g, version);
    }

    // 替换页脚 .github-footer-update 中的占位符（兼容两种占位符）
    var updateEls = document.querySelectorAll('.github-footer-update');
    updateEls.forEach(function (el) {
        el.textContent = el.textContent
            .replace(/__APP_VERSION__/g, version)
            .replace(/__LAST_UPDATE__/g, version);
    });
})();

// 2. 在指定域名下注入备案号底栏
(function () {
    if (SITE_CONFIG.beianDomain && location.hostname.indexOf(SITE_CONFIG.beianDomain) === -1) return;

    var policeIcon = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath fill=%22%23d81e06%22 d=%22M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v4.7c0 4.83-3.13 9.37-7 10.75-3.87-1.38-7-5.92-7-10.75V6.3l7-3.12zM12 7a2 2 0 00-2 2c0 .74.4 1.38 1 1.72V14h2v-3.28c.6-.34 1-.98 1-1.72a2 2 0 00-2-2z%22/%3E%3C/svg%3E';

    var footer = document.createElement('div');
    footer.className = 'beian-footer';
    var icpIconHtml = SITE_CONFIG.icp.icon
        ? '<img class="beian-icp-icon" src="' + SITE_CONFIG.icp.icon + '" alt="ICP 备案">'
        : '';
    footer.innerHTML =
        '<a href="' + SITE_CONFIG.icp.url + '" target="_blank" rel="noopener noreferrer">' +
            icpIconHtml +
            SITE_CONFIG.icp.text +
        '</a>' +
        '<span class="beian-divider">|</span>' +
        '<a href="' + SITE_CONFIG.police.url + '" target="_blank" rel="noopener noreferrer">' +
            '<img class="beian-police-icon" src="' + policeIcon + '" alt="公安备案">' +
            SITE_CONFIG.police.text +
        '</a>';

    document.body.appendChild(footer);
})();
