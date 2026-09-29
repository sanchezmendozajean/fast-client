// Point the download buttons straight at the installer of the latest GitHub release.
// If the API is unreachable (rate limit, offline), the buttons keep linking to the releases page.
(function () {
  var REPO = 'sanchezmendozajean/fast-client';

  function formatSize(bytes) {
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  }

  fetch('https://api.github.com/repos/' + REPO + '/releases/latest', {
    headers: { Accept: 'application/vnd.github+json' },
  })
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (release) {
      if (!release || !release.assets) return;
      var exe = release.assets.find(function (a) {
        return /\.exe$/i.test(a.name);
      });
      if (!exe) return;
      var version = String(release.tag_name || '').replace(/^v/, '');
      document.querySelectorAll('.js-download').forEach(function (a) {
        a.href = exe.browser_download_url;
      });
      document.querySelectorAll('.js-download-label').forEach(function (s) {
        s.textContent = 'Descargar v' + version;
      });
      document.querySelectorAll('.js-release-meta').forEach(function (p) {
        p.textContent = 'Windows 10 / 11 · 64 bits · ' + formatSize(exe.size);
      });
    })
    .catch(function () {
      /* keep the releases-page fallback */
    });
})();
