/* The Clinical Hub — persistent nav and shared icon sprite.
   Added 27/08/2026.

   Same idea as the Medical Sales Hub's master-nav snippet: the nav lives in
   ONE file, every page gets it at runtime, and no page hardcodes the links.
   Change NAV below and every page changes.

   The sprite is injected here too, so a page only needs
   <svg class="ic"><use href="#ic-news"></use></svg> to draw an icon. All icons
   are 24x24, single stroke weight, stroke:currentColor — they inherit the
   colour of whatever they sit in, which emoji can never do.

   Order is nurse-first: a registered nurse is the main audience. */
(function () {
  'use strict';

  var NAV = [
    ['Today',      'stay-current.html'],
    ['Jobs',       'clinical-roles.html'],
    ['Careers',    'careers.html'],
    ['Your CV',    'cv-tailor.html'],
    ['Learn',      'courses.html'],
    ['Resources',  'resources.html']
  ];

  var ICONS = {
    'ic-news':      '<path d="M4 5h11v14H5a1 1 0 0 1-1-1V5z"/><path d="M15 8h4a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-4"/><path d="M7 8.5h5M7 12h5M7 15.5h3"/>',
    'ic-search':    '<circle cx="11" cy="11" r="6"/><path d="M15.5 15.5 20 20"/>',
    'ic-chart':     '<path d="M4 19h16"/><path d="M7 19V11M12 19V6M17 19v-5"/>',
    'ic-doc':       '<path d="M13 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8z"/><path d="M13 3v5h5"/><path d="M9 13h6M9 16.5h4"/>',
    'ic-idea':      '<path d="M9.5 17h5"/><path d="M10 20h4"/><path d="M12 3a5.5 5.5 0 0 0-3.2 9.97c.5.36.8.93.8 1.53h4.8c0-.6.3-1.17.8-1.53A5.5 5.5 0 0 0 12 3z"/>',
    'ic-book':      '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v13H5.5A1.5 1.5 0 0 0 4 18.5z"/><path d="M4 18.5A1.5 1.5 0 0 0 5.5 20H19v-3"/>',
    'ic-door':      '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h8"/><path d="M14 3l4 1.5v15L14 21z"/><circle cx="15.4" cy="12" r=".7" fill="currentColor" stroke="none"/>',
    'ic-growth':    '<path d="M12 20v-7"/><path d="M12 13C12 9 9 6.5 5 6.5c0 4 2.5 6.5 7 6.5z"/><path d="M12.6 12c0-3.3 2.4-5.5 5.9-5.5 0 3.4-2.2 5.5-5.9 5.5z"/>',
    'ic-trophy':    '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H5.5V7a3 3 0 0 0 3 3M16 5.5h2.5V7a3 3 0 0 1-3 3"/><path d="M12 13v3M9 20h6M10 16h4l.6 4h-5.2z"/>',
    'ic-cap':       '<path d="m12 4 9 4.5-9 4.5-9-4.5z"/><path d="M7 10.8V15c0 1.4 2.2 2.6 5 2.6s5-1.2 5-2.6v-4.2"/><path d="M20 9v5"/>',
    'ic-calendar':  '<rect x="4" y="5.5" width="16" height="14.5" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    'ic-audio':     '<path d="M5 14v-2a7 7 0 0 1 14 0v2"/><path d="M5 13h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM19 13h-2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1z"/>',
    'ic-screen':    '<rect x="3" y="5" width="18" height="11.5" rx="1.5"/><path d="M8.5 20h7M12 16.5V20"/>',
    'ic-steth':     '<path d="M6 4v5a4 4 0 0 0 8 0V4"/><path d="M4.6 4h2.2M13.2 4h2.2"/><path d="M10 13v2.2a4.3 4.3 0 0 0 8.6 0V15"/><circle cx="18.6" cy="13" r="2"/>',
    'ic-compass':   '<circle cx="12" cy="12" r="8.5"/><path d="m14.8 9.2-1.6 4.2-4.2 1.6 1.6-4.2z"/>',
    'ic-shield':    '<path d="M12 3.5 5.5 6v6c0 4 2.7 7.2 6.5 8.5 3.8-1.3 6.5-4.5 6.5-8.5V6z"/><path d="m9.3 12 1.9 1.9 3.5-3.6"/>',
    'ic-pin':       '<path d="M12 21s6.5-6 6.5-10.4A6.5 6.5 0 0 0 5.5 10.6C5.5 15 12 21 12 21z"/><circle cx="12" cy="10.4" r="2.4"/>',
    'ic-lock':      '<rect x="4.5" y="10.5" width="15" height="9.5" rx="1.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    'ic-check':     '<circle cx="12" cy="12" r="8.5"/><path d="m8.4 12.2 2.4 2.4 4.8-5"/>',
    'ic-mail':      '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="m3.9 6.4 8.1 6 8.1-6"/>',
    'ic-nurse':     '<circle cx="12" cy="8" r="3.6"/><path d="M12 5.4v5.2M9.4 8h5.2" stroke-width="1.2"/><path d="M4.5 20.5c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"/>'
  };

  function sprite() {
    if (document.getElementById('chIcons')) { return; }
    var parts = [];
    for (var k in ICONS) {
      if (Object.prototype.hasOwnProperty.call(ICONS, k)) {
        parts.push('<symbol id="' + k + '" viewBox="0 0 24 24" fill="none" ' +
          'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
          'stroke-linejoin="round">' + ICONS[k] + '</symbol>');
      }
    }
    var wrap = document.createElement('div');
    wrap.id = 'chIcons';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    wrap.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + parts.join('') + '</svg>';
    document.body.insertBefore(wrap, document.body.firstChild);
  }

  function here() {
    var p = window.location.pathname;
    var last = p.substring(p.lastIndexOf('/') + 1);
    return last === '' ? 'index.html' : last;
  }

  function nav() {
    if (document.querySelector('.ch-nav')) { return; }
    var current = here();
    var links = NAV.map(function (n) {
      var cur = n[1] === current ? ' aria-current="page"' : '';
      return '<li><a class="link" href="' + n[1] + '"' + cur + '>' + n[0] + '</a></li>';
    }).join('');

    var bar = document.createElement('nav');
    bar.className = 'ch-nav ch-band';
    bar.setAttribute('aria-label', 'Clinical Hub');
    bar.innerHTML =
      '<div class="ch-in">' +
        '<a class="brand" href="index.html">The Clinical Hub</a>' +
        '<ul>' + links + '</ul>' +
        '<span class="spacer"></span>' +
        '<a class="navcta" href="index.html#join">Newsletter</a>' +
      '</div>';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  function run() { sprite(); nav(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
