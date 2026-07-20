/* The Clinical Hub — cloud layer
   Magic-link sign-in + per-tool save/load against Supabase, straight from the browser.
   No server: the publishable key is safe in public because Row Level Security means
   a signed-in person can only ever touch their own rows.

   Usage in a tool page:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="hub-cloud.js"></script>
     await Hub.init();                       // restores session
     const saved = await Hub.load('revalidation');
     await Hub.save('revalidation', state);
*/
(function (global) {
  'use strict';

  var SUPABASE_URL = 'https://muxclovtzpgtjvjyahac.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_gxCQKDwQxZRCZxkfclN1_Q_yOMxqBnA';
  var BUCKET = 'evidence';

  var sb = null;
  var user = null;
  var listeners = [];

  function client() {
    if (!sb) {
      if (!global.supabase || !global.supabase.createClient) {
        throw new Error('supabase-js not loaded — add the CDN script before hub-cloud.js');
      }
      sb = global.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    return sb;
  }

  function notify() {
    listeners.forEach(function (fn) { try { fn(user); } catch (e) {} });
  }

  var Hub = {
    /* ---------------------------------------------------------- session */
    init: async function () {
      var c = client();
      var res = await c.auth.getSession();
      user = (res.data && res.data.session) ? res.data.session.user : null;
      c.auth.onAuthStateChange(function (_evt, session) {
        user = session ? session.user : null;
        notify();
      });
      notify();
      return user;
    },

    onChange: function (fn) { listeners.push(fn); if (user !== undefined) fn(user); },
    user: function () { return user; },
    signedIn: function () { return !!user; },

    /* Sends the magic link. No password, nothing to forget. */
    sendLink: async function (email, redirectTo) {
      var res = await client().auth.signInWithOtp({
        email: String(email || '').trim(),
        options: { emailRedirectTo: redirectTo || global.location.href }
      });
      if (res.error) throw res.error;
      return true;
    },

    signOut: async function () {
      await client().auth.signOut();
      user = null;
      notify();
    },

    /* ---------------------------------------------------------- per-tool data */
    load: async function (tool) {
      if (!user) return null;
      var res = await client().from('user_data')
        .select('data').eq('user_id', user.id).eq('tool', tool).maybeSingle();
      if (res.error) throw res.error;
      return res.data ? res.data.data : null;
    },

    save: async function (tool, data) {
      if (!user) return false;
      var res = await client().from('user_data')
        .upsert({ user_id: user.id, tool: tool, data: data }, { onConflict: 'user_id,tool' });
      if (res.error) throw res.error;
      return true;
    },

    /* ---------------------------------------------------------- evidence files */
    uploadEvidence: async function (file, meta) {
      if (!user) throw new Error('Sign in first');
      // Path must start with the user's id — the storage policies key off that folder.
      var safe = String(file.name || 'file').replace(/[^A-Za-z0-9._-]/g, '_');
      var path = user.id + '/' + Date.now() + '_' + safe;

      var up = await client().storage.from(BUCKET).upload(path, file, { upsert: false });
      if (up.error) throw up.error;

      var row = Object.assign({ user_id: user.id, storage_path: path }, meta || {});
      var ins = await client().from('evidence').insert(row).select().single();
      if (ins.error) throw ins.error;
      return ins.data;
    },

    listEvidence: async function () {
      if (!user) return [];
      var res = await client().from('evidence')
        .select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (res.error) throw res.error;
      return res.data || [];
    },

    /* Signed, time-limited link — the bucket is private, so files are never public. */
    evidenceUrl: async function (storagePath, seconds) {
      var res = await client().storage.from(BUCKET)
        .createSignedUrl(storagePath, seconds || 300);
      if (res.error) throw res.error;
      return res.data.signedUrl;
    },

    deleteEvidence: async function (id, storagePath) {
      if (storagePath) await client().storage.from(BUCKET).remove([storagePath]);
      var res = await client().from('evidence').delete().eq('id', id);
      if (res.error) throw res.error;
      return true;
    },

    /* ---------------------------------------------------------- GDPR */
    /* Subject access + portability: everything held, in one file. */
    downloadAllMyData: async function () {
      if (!user) throw new Error('Sign in first');
      var rows = await client().from('user_data').select('tool, data, updated_at').eq('user_id', user.id);
      var files = await client().from('evidence').select('*').eq('user_id', user.id);
      var payload = {
        exported_at: new Date().toISOString(),
        account: { id: user.id, email: user.email, created_at: user.created_at },
        tools: rows.data || [],
        evidence: files.data || [],
        note: 'This is everything The Clinical Hub holds about you.'
      };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'clinical-hub-my-data.json';
      document.body.appendChild(a); a.click(); a.remove();
      return payload;
    },

    /* Right to erasure. Files first (they don't cascade), then the account itself. */
    deleteMyAccount: async function () {
      if (!user) throw new Error('Sign in first');
      var files = await client().from('evidence').select('storage_path').eq('user_id', user.id);
      var paths = (files.data || []).map(function (r) { return r.storage_path; }).filter(Boolean);
      if (paths.length) await client().storage.from(BUCKET).remove(paths);

      var res = await client().rpc('delete_my_account');
      if (res.error) throw res.error;

      await client().auth.signOut();
      user = null; notify();
      return true;
    }
  };

  global.Hub = Hub;
})(window);
