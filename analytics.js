/* The Clinical Hub — analytics with UK-compliant consent.
   Added 27/08/2026.

   GA4 property G-EYXBJSYD34 — the Elevate & Thrive property, because
   clinicalhub.elevateandthrive.uk is a subdomain of elevateandthrive.uk.
   Segment Clinical Hub traffic in GA by hostname. If it ever earns its own
   property, change the ID here in one place; no data already collected is lost.

   Why a banner at all: PECR requires consent BEFORE analytics cookies are set,
   so Consent Mode defaults to denied and nothing is stored until someone
   chooses. This is the static-site equivalent of the CookieYes + hand-wired
   Consent Mode v2 setup on the two WordPress sites — same category mapping,
   no plugin, no cloud account.

   Deliberately backslash-free: the cookie is parsed with split/indexOf, never
   a regex, so nothing silently collapses if this is ever carried through a
   JavaScript string. See the note in Website-Snippets/ga4-consent-mode-header.html.
*/
(function () {
  'use strict';

  var GA_ID = 'G-EYXBJSYD34';
  var COOKIE = 'clinicalhub-consent';
  var PRIVACY = 'https://elevateandthrive.uk/privacy-policy/';
  var ONE_YEAR = 60 * 60 * 24 * 365;

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  /* 1. Denied by default, before the tag loads. Consent Mode requires this. */
  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 2000
  });

  function readChoice() {
    var jar = document.cookie.split(';');
    for (var i = 0; i < jar.length; i++) {
      var c = jar[i];
      while (c.charAt(0) === ' ') { c = c.substring(1); }
      if (c.indexOf(COOKIE + '=') === 0) { return c.substring(COOKIE.length + 1); }
    }
    return null;
  }

  function writeChoice(v) {
    document.cookie = COOKIE + '=' + v + ';path=/;max-age=' + ONE_YEAR + ';SameSite=Lax';
  }

  function apply(choice) {
    var granted = choice === 'accepted' ? 'granted' : 'denied';
    gtag('consent', 'update', {
      analytics_storage: granted,
      functionality_storage: granted,
      personalization_storage: granted,
      security_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  }

  /* 2. Load GA4. With consent denied it sends cookieless pings only, which is
        what keeps basic counts honest for people who decline. */
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', GA_ID, { anonymize_ip: true });

  /* 3. Banner — only if no choice has been made yet. */
  function banner() {
    var style = document.createElement('style');
    style.textContent =
      '#chConsent{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#0B1C33;color:#EDE7DC;' +
      'border-top:3px solid #C49B5C;padding:16px 18px;font-family:Raleway,-apple-system,Segoe UI,sans-serif;' +
      'box-shadow:0 -6px 24px rgba(11,28,51,.25);}' +
      '#chConsent .in{max-width:1080px;margin:0 auto;display:flex;gap:16px;align-items:center;flex-wrap:wrap;}' +
      '#chConsent p{margin:0;font-size:13.5px;line-height:1.55;color:#DBE3EE;flex:1 1 320px;}' +
      '#chConsent a{color:#E0BE8E;}' +
      '#chConsent .btns{display:flex;gap:9px;flex:0 0 auto;}' +
      '#chConsent button{font-family:inherit;font-size:14px;font-weight:700;border-radius:10px;padding:11px 20px;' +
      'cursor:pointer;border:1.5px solid transparent;}' +
      '#chConsent .ok{background:linear-gradient(180deg,#D4AF7A,#B8935A);color:#0B1C33;}' +
      '#chConsent .no{background:transparent;color:#DBE3EE;border-color:rgba(219,227,238,.35);}' +
      '@media(max-width:560px){#chConsent .btns{width:100%}#chConsent button{flex:1}}';
    document.head.appendChild(style);

    var bar = document.createElement('div');
    bar.id = 'chConsent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie choice');
    bar.innerHTML =
      '<div class="in"><p>We would like to count visits so we know which parts of the Hub are ' +
      'actually useful. Nothing is stored on your device unless you say yes, and we never use ' +
      'this for advertising. <a href="' + PRIVACY + '" target="_blank" rel="noopener">Privacy policy</a></p>' +
      '<div class="btns"><button type="button" class="no">No thanks</button>' +
      '<button type="button" class="ok">Allow</button></div></div>';
    document.body.appendChild(bar);

    function choose(v) { writeChoice(v); apply(v); bar.remove(); }
    bar.querySelector('.ok').addEventListener('click', function () { choose('accepted'); });
    bar.querySelector('.no').addEventListener('click', function () { choose('declined'); });
  }

  var existing = readChoice();
  if (existing) {
    apply(existing);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', banner);
  } else {
    banner();
  }
})();
