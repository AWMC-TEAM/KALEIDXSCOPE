/* Prevent legacy markup from painting while the shared UI is being built. */
(function () {
    'use strict';
    const root = document.documentElement;
    root.dataset.gateBoot = 'pending';
    // Decide on the iris curtain before first paint so the page never flashes underneath it.
    try {
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            || localStorage.getItem('kaleidxscope-motion') === 'paused';
        const arriving = sessionStorage.getItem('kx-iris') === 'closed';
        sessionStorage.removeItem('kx-iris');
        const home = !/[A-Z]KALEIDXSCOPE\//.test(window.location.pathname);
        const firstVisit = !sessionStorage.getItem('kx-intro');
        if (!still && (arriving || (home && firstVisit))) root.dataset.kxIris = arriving ? 'quick' : 'full';
    } catch { /* Storage is optional; skip the curtain. */ }
    // Progressive enhancement must never leave a broken or no-script page hidden.
    window.gateBootTimeout = setTimeout(() => {
        delete root.dataset.gateBoot;
    }, 2500);
})();
