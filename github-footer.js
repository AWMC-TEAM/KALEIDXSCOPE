// 依赖 site-config.js 提供的 window.SITE_CONFIG

function applyAppVersion() {
    var config = window.SITE_CONFIG;
    var version = config && config.version;
    if (!version) return;

    document.querySelectorAll('[data-app-version]').forEach(function (el) {
        el.textContent = '更新于 ' + version;
    });

    document.querySelectorAll('.github-footer-update').forEach(function (el) {
        if (el.hasAttribute('data-app-version')) return;
        el.textContent = el.textContent
            .replace(/__APP_VERSION__/g, version)
            .replace(/__LAST_UPDATE__/g, version);
    });

    if (document.title.indexOf('__APP_VERSION__') >= 0) {
        document.title = document.title.replace(/__APP_VERSION__/g, version);
    }
}

function initBeianFooter() {
    var config = window.SITE_CONFIG;
    if (!config) return;
    if (config.beianDomain && location.hostname.indexOf(config.beianDomain) === -1) return;

    var policeIcon = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath fill=%22%23d81e06%22 d=%22M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v4.7c0 4.83-3.13 9.37-7 10.75-3.87-1.38-7-5.92-7-10.75V6.3l7-3.12zM12 7a2 2 0 00-2 2c0 .74.4 1.38 1 1.72V14h2v-3.28c.6-.34 1-.98 1-1.72a2 2 0 00-2-2z%22/%3E%3C/svg%3E';

    var footer = document.createElement('div');
    footer.className = 'beian-footer';
    var icpIconHtml = config.icp.icon
        ? '<img class="beian-icp-icon" src="' + config.icp.icon + '" alt="ICP 备案">'
        : '';
    footer.innerHTML =
        '<a href="' + config.icp.url + '" target="_blank" rel="noopener noreferrer">' +
            icpIconHtml +
            config.icp.text +
        '</a>' +
        '<span class="beian-divider">|</span>' +
        '<a href="' + config.police.url + '" target="_blank" rel="noopener noreferrer">' +
            '<img class="beian-police-icon" src="' + policeIcon + '" alt="公安备案">' +
            config.police.text +
        '</a>';

    document.body.appendChild(footer);
}

function initGithubFooter() {
    applyAppVersion();
    initBeianFooter();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGithubFooter);
} else {
    initGithubFooter();
}
