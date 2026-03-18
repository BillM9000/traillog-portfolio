// Pre-React theme init: set dark class + background before first paint
(function() {
  var isDark = localStorage.getItem('theme') === 'dark';
  document.body.style.background = isDark ? '#1A1F16' : '#FDFAF5';
  if (isDark) document.documentElement.classList.add('dark');
})();
