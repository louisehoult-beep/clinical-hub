/* The Clinical Hub — access gate
   Blocks the page behind a short registration / sign-in step before any content is usable.
   New visitors: name, email, workplace, area, specialty, role, professional registration.
   Returning members: email only (passwordless magic link via Supabase — same mechanism as sign-up).
   Requires supabase-js + hub-cloud.js loaded on the page before this file.
*/
(function () {
  'use strict';

  var PENDING_KEY = 'hubGatePendingProfile';
  var SUPABASE_URL = 'https://vbthumugbzyqndirmyns.supabase.co';

  var ROLES = ['Nurse', 'Midwife', 'Radiographer', 'Doctor', 'Carer', 'Care Manager', 'Nursing Associate', 'Allied Health Professional', 'Student', 'Other'];
  var REG_BODIES = ['NMC', 'GMC', 'HCPC', 'None / not applicable'];

  function options(list) {
    return list.map(function (o) { return '<option value="' + o + '">' + o + '</option>'; }).join('');
  }

  function reveal() {
    var style = document.getElementById('hubGatePreHide');
    if (style) style.remove();
    var overlay = document.getElementById('hubGateOverlay');
    if (overlay) overlay.remove();
  }

  function injectStyle() {
    var s = document.createElement('style');
    s.textContent =
      '#hubGateOverlay{position:fixed;inset:0;z-index:99999;background:rgba(20,24,29,.72);backdrop-filter:blur(3px);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:26px 14px;font-family:"Raleway",-apple-system,Segoe UI,sans-serif;}' +
      '.hg-card{background:#fff;max-width:420px;width:100%;border-radius:18px;padding:26px 22px 22px;box-shadow:0 20px 60px rgba(0,0,0,.35);margin:auto;}' +
      '.hg-eyebrow{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#1B8A6B;font-weight:700;margin-bottom:8px;}' +
      '.hg-msg{font-size:14px;line-height:1.55;color:#3D362E;margin:0 0 16px;}' +
      '.hg-tabs{display:flex;gap:6px;margin-bottom:14px;}' +
      '.hg-tab{flex:1;padding:9px;border-radius:9px;border:1.5px solid #DCE1E7;background:#fff;font-size:12.5px;font-weight:700;cursor:pointer;color:#3D362E;}' +
      '.hg-tab.on{background:#1B8A6B;border-color:#1B8A6B;color:#fff;}' +
      '.hg-form{display:flex;flex-direction:column;gap:9px;}' +
      '.hg-form input,.hg-form select{border:1.5px solid #DCE1E7;border-radius:10px;padding:11px 12px;font-size:14.5px;font-family:inherit;color:#1E1B18;background:#fbfaf8;}' +
      '.hg-btn{background:#1B8A6B;color:#fff;border:0;border-radius:10px;padding:13px;font-size:14.5px;font-weight:700;cursor:pointer;font-family:inherit;margin-top:4px;}' +
      '.hg-btn:hover{background:#146650;}' +
      '.hg-fine{font-size:11px;color:#8a8f96;line-height:1.5;margin:6px 0 0;}' +
      '.hg-sent{text-align:center;padding:10px 4px;}' +
      '.hg-tick{width:44px;height:44px;border-radius:50%;background:#e5efe5;color:#2F6B57;display:flex;align-items:center;justify-content:center;font-size:22px;margin:0 auto 12px;}' +
      '.hg-sent p{font-size:14px;line-height:1.6;color:#3D362E;}' +
      '.hg-error{margin-top:12px;background:#fdecec;border:1px solid #f3c8c8;color:#8a2b2b;border-radius:9px;padding:10px 12px;font-size:13px;}';
    document.head.appendChild(s);
  }

  function formToProfile(form) {
    var f = new FormData(form);
    return {
      full_name: (f.get('full_name') || '').trim(),
      email: (f.get('email') || '').trim().toLowerCase(),
      workplace: (f.get('workplace') || '').trim(),
      area: (f.get('area') || '').trim(),
      specialty: (f.get('specialty') || '').trim(),
      role: f.get('role') || '',
      reg_body: f.get('reg_body') || '',
      reg_number: (f.get('reg_number') || '').trim()
    };
  }

  function buildOverlay(mode) {
    var overlay = document.createElement('div');
    overlay.id = 'hubGateOverlay';
    overlay.innerHTML =
      '<div class="hg-card">' +
        '<div class="hg-eyebrow">The Clinical Hub</div>' +
        '<p class="hg-msg">The Clinical Hub is a free service for clinicians. To tailor it to the needs of the people using it, and to keep it a safe space for clinical staff, please confirm your clinical role.</p>' +

        (mode === 'profile-only' ? '' :
        '<div class="hg-tabs">' +
          '<button type="button" class="hg-tab on" data-tab="new">New here</button>' +
          '<button type="button" class="hg-tab" data-tab="member">Already a member</button>' +
        '</div>') +

        '<form id="hgNewForm" class="hg-form"' + (mode === 'profile-only' ? ' style="display:none"' : '') + '>' +
          '<input required name="full_name" placeholder="Full name" autocomplete="name">' +
          '<input required type="email" name="email" placeholder="Your email" autocomplete="email">' +
          '<input name="workplace" placeholder="Place of work">' +
          '<input name="area" placeholder="Geographical area (e.g. West Midlands)">' +
          '<input name="specialty" placeholder="Specialty (e.g. ICU, theatres, community)">' +
          '<select required name="role"><option value="">Role — select one</option>' + options(ROLES) + '</select>' +
          '<select name="reg_body">' + options(REG_BODIES) + '</select>' +
          '<input name="reg_number" placeholder="Registration number (if any)">' +
          '<button type="submit" class="hg-btn">Confirm &amp; send my sign-in link</button>' +
          '<p class="hg-fine">Free, always. We use this only to tailor the Hub and keep it clinical-only — never sold, never shared. We\'ll email you a one-click sign-in link, no password needed.</p>' +
        '</form>' +

        '<form id="hgLoginForm" class="hg-form" style="display:none">' +
          '<input required type="email" name="email" placeholder="Your email" autocomplete="email">' +
          '<button type="submit" class="hg-btn">Send my sign-in link</button>' +
          '<p class="hg-fine">We\'ll email you a one-click sign-in link — no password needed.</p>' +
        '</form>' +

        '<div id="hgSent" class="hg-sent" style="display:none">' +
          '<div class="hg-tick">&#10003;</div>' +
          '<p><b>Check your email</b><br>We\'ve sent a sign-in link to <span id="hgSentEmail"></span>. Click it to open the Hub.</p>' +
        '</div>' +

        '<form id="hgProfileForm" class="hg-form"' + (mode === 'profile-only' ? '' : ' style="display:none"') + '>' +
          (mode === 'profile-only' ? '<p class="hg-msg" style="margin-top:0">Welcome back — one quick step. Confirm your clinical role so the Hub stays tailored and safe for clinical staff.</p>' : '') +
          '<input required name="full_name" placeholder="Full name">' +
          '<input name="workplace" placeholder="Place of work">' +
          '<input name="area" placeholder="Geographical area">' +
          '<input name="specialty" placeholder="Specialty">' +
          '<select required name="role"><option value="">Role — select one</option>' + options(ROLES) + '</select>' +
          '<select name="reg_body">' + options(REG_BODIES) + '</select>' +
          '<input name="reg_number" placeholder="Registration number (if any)">' +
          '<button type="submit" class="hg-btn">Confirm &amp; open the Hub</button>' +
        '</form>' +

        '<div id="hgError" class="hg-error" style="display:none"></div>' +
      '</div>';
    document.body.appendChild(overlay);

    var tabs = overlay.querySelectorAll('.hg-tab');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { x.classList.remove('on'); });
        t.classList.add('on');
        var isNew = t.dataset.tab === 'new';
        overlay.querySelector('#hgNewForm').style.display = isNew ? 'flex' : 'none';
        overlay.querySelector('#hgLoginForm').style.display = isNew ? 'none' : 'flex';
        overlay.querySelector('#hgSent').style.display = 'none';
        overlay.querySelector('#hgError').style.display = 'none';
      });
    });

    function showError(msg) {
      var e = overlay.querySelector('#hgError');
      e.textContent = msg;
      e.style.display = 'block';
    }

    async function sendLink(email, pendingProfile) {
      if (pendingProfile) {
        try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(pendingProfile)); } catch (e) {}
      }
      await window.Hub.sendLink(email, window.location.href);
      overlay.querySelector('#hgNewForm').style.display = 'none';
      overlay.querySelector('#hgLoginForm').style.display = 'none';
      overlay.querySelector('#hgSentEmail').textContent = email;
      overlay.querySelector('#hgSent').style.display = 'block';
      overlay.querySelector('#hgError').style.display = 'none';
    }

    var newForm = overlay.querySelector('#hgNewForm');
    if (newForm) newForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var p = formToProfile(ev.target);
      if (!p.full_name || !p.email || !p.role) { showError('Please fill in your name, email and role.'); return; }
      if (p.email.indexOf('@') < 0) { showError("That email address doesn't look right."); return; }
      sendLink(p.email, p).catch(function (e) { showError((e && e.message) || 'Something went wrong sending the link — please try again.'); });
    });

    var loginForm = overlay.querySelector('#hgLoginForm');
    if (loginForm) loginForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var email = (new FormData(ev.target).get('email') || '').trim().toLowerCase();
      if (!email || email.indexOf('@') < 0) { showError("That email address doesn't look right."); return; }
      sendLink(email, null).catch(function (e) { showError((e && e.message) || 'Something went wrong sending the link — please try again.'); });
    });

    var profileForm = overlay.querySelector('#hgProfileForm');
    if (profileForm) profileForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var p = formToProfile(ev.target);
      if (!p.full_name || !p.role) { showError('Please fill in your name and role.'); return; }
      p.email = (window.Hub.user() && window.Hub.user().email) || p.email;
      window.Hub.save('profile', p).then(reveal).catch(function (e) { showError((e && e.message) || "Couldn't save your details — please try again."); });
    });
  }

  /* Fail open. If the backend is unreachable — project paused, outage, blocked network —
     we let people in rather than locking the whole Hub. The gate is a soft one anyway
     (the content is in the page source), so a closed door costs far more than an open one. */
  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) { setTimeout(function () { reject(new Error('hub-gate: backend timeout')); }, ms); })
    ]);
  }

  async function backendReachable() {
    try {
      await withTimeout(fetch(SUPABASE_URL + '/auth/v1/health', { mode: 'no-cors', cache: 'no-store' }), 6000);
      return true;
    } catch (e) { return false; }
  }

  async function start() {
    injectStyle();

    if (!window.Hub) { console.error('hub-gate.js: hub-cloud.js not loaded — opening ungated.'); reveal(); return; }

    if (!(await backendReachable())) {
      console.warn('hub-gate.js: backend unreachable — opening ungated so the Hub stays usable.');
      reveal();
      return;
    }

    var user;
    try { user = await withTimeout(window.Hub.init(), 10000); }
    catch (e) { console.warn('hub-gate.js: sign-in check failed — opening ungated.', e); reveal(); return; }

    if (user) {
      var profile = null;
      try { profile = await withTimeout(window.Hub.load('profile'), 10000); }
      catch (e) { console.warn('hub-gate.js: profile load failed — opening ungated.', e); reveal(); return; }

      if (profile && profile.role) { reveal(); return; }

      var pending = null;
      try { pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null'); } catch (e) {}
      if (pending && pending.email && user.email && pending.email.toLowerCase() === user.email.toLowerCase()) {
        try {
          await window.Hub.save('profile', pending);
          sessionStorage.removeItem(PENDING_KEY);
          reveal();
          return;
        } catch (e) { /* fall through to the manual profile form */ }
      }

      buildOverlay('profile-only');
      return;
    }

    buildOverlay('full');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
