/* Prevent legacy markup from painting while the shared UI is being built. */
(function () {
    'use strict';
    const root = document.documentElement;
    root.dataset.gateBoot = 'pending';
    // Progressive enhancement must never leave a broken or no-script page hidden.
    window.gateBootTimeout = setTimeout(() => {
        delete root.dataset.gateBoot;
    }, 2500);
})();
