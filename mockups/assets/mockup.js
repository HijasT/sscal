/* Minimal interactivity for the static mockups: theme, slider readout, single-select groups.
   Everything else on the pages is static markup. */
(function () {
  var root = document.documentElement

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  }
  function syncToggle() {
    var btn = document.getElementById('theme-toggle')
    if (!btn) return
    var dark = currentTheme() === 'dark'
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme')
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false')
  }
  var toggle = document.getElementById('theme-toggle')
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark'
      root.setAttribute('data-theme', next)
      try { localStorage.setItem('mockup_theme', next) } catch (e) {}
      syncToggle()
    })
    syncToggle()
  }

  // Pool split slider: updates the P1/P2 readout and the worked-example line.
  document.querySelectorAll('input[type="range"][data-split]').forEach(function (r) {
    function update() {
      var p1 = Number(r.value)
      var scope = r.closest('[data-split-scope]') || document
      scope.querySelectorAll('[data-p1]').forEach(function (n) { n.textContent = 'P1 ' + p1 + '%' })
      scope.querySelectorAll('[data-p2]').forEach(function (n) { n.textContent = 'P2 ' + (100 - p1) + '%' })
    }
    r.addEventListener('input', update)
    update()
  })

  // Single-select groups: Men/Women, category chips, % / AED unit toggles.
  document.querySelectorAll('[data-single]').forEach(function (group) {
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('button[aria-pressed]')
      if (!btn || !group.contains(btn)) return
      group.querySelectorAll('button[aria-pressed]').forEach(function (b) { b.setAttribute('aria-pressed', 'false') })
      btn.setAttribute('aria-pressed', 'true')
    })
  })

  // Settings switch.
  document.querySelectorAll('button[role="switch"]').forEach(function (s) {
    s.addEventListener('click', function () {
      s.setAttribute('aria-checked', s.getAttribute('aria-checked') === 'true' ? 'false' : 'true')
    })
  })

  // Mutually exclusive filter checkboxes (Blood tests only / Non-invasive).
  document.querySelectorAll('[data-exclusive]').forEach(function (group) {
    group.addEventListener('change', function (e) {
      if (!e.target.checked) return
      group.querySelectorAll('input[type="checkbox"]').forEach(function (c) { if (c !== e.target) c.checked = false })
    })
  })
})()

// Expand/collapse buttons (aria-expanded + aria-controls), e.g. package "Details".
;(function () {
  document.querySelectorAll('button[aria-controls][aria-expanded]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.getElementById(btn.getAttribute('aria-controls'))
      var wasOpen = btn.getAttribute('aria-expanded') === 'true'
      btn.setAttribute('aria-expanded', String(!wasOpen))
      if (target) target.hidden = wasOpen
      var label = btn.querySelector('[data-open]')
      if (label) label.textContent = wasOpen ? label.getAttribute('data-closed') : label.getAttribute('data-open')
      var pkg = btn.closest('.pkg')
      if (pkg) pkg.classList.toggle('open', !wasOpen)
    })
  })
})()
