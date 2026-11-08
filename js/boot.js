/* Runs in <head>, before first paint, so the page renders for this screen straight away.
   Screen profile: sets on <html> data-screen (xs|sm|md|lg|xl|xxl), data-input (mouse|touch),
   data-orientation, and the --app-height CSS variable. Also applies the saved/device theme.
   Kept as a separate file (not inline) so the Content-Security-Policy can forbid inline scripts. */
(function (d, w) {
  var root = d.documentElement;

  function profile() {
    var width = w.innerWidth || root.clientWidth;
    var height = w.innerHeight || root.clientHeight;
    var screen = width < 480 ? 'xs' : width < 768 ? 'sm' : width < 1024 ? 'md' : width < 1440 ? 'lg' : width < 1920 ? 'xl' : 'xxl';
    var mouse = !!(w.matchMedia && w.matchMedia('(hover: hover) and (pointer: fine)').matches);
    root.setAttribute('data-screen', screen);
    root.setAttribute('data-input', mouse ? 'mouse' : 'touch');
    root.setAttribute('data-orientation', width >= height ? 'landscape' : 'portrait');
    root.style.setProperty('--app-height', height + 'px');
    return screen;
  }
  w.vinthraScreen = profile;
  profile();

  // Theme: the visitor's saved choice (kept only in their own browser), else the device setting.
  var theme;
  try {
    theme = localStorage.getItem('vinthra-theme');
    if (!theme) {
      var legacy = localStorage.getItem('vinthra-palette'); /* older saved choice */
      if (legacy) theme = legacy === 'career' ? 'light' : 'dark';
    }
  } catch (e) {}
  if (theme !== 'light' && theme !== 'dark') {
    theme = w.matchMedia && w.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  root.setAttribute('data-theme', theme);
  var meta = d.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0A0F1C' : '#F8FAFC');
})(document, window);
