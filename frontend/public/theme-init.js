// Apply the saved/OS theme before first paint to avoid a light→dark flash.
// Kept as a file (not inline) so the Content-Security-Policy can forbid inline scripts.
(function () {
  try {
    var t = localStorage.getItem('medeasy_theme');
    if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.setAttribute('data-bs-theme', t);
  } catch (e) {
    /* storage unavailable: keep the default theme */
  }
})();
