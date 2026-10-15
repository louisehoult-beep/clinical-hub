#!/usr/bin/env python3
"""Cutover: turn every Clinical Hub page into a redirect to its Hub equivalent.

Run ONLY with Lou's go-ahead (it changes the live public site on the next push).
The data files (stay-current-data.json, clinical-roles-*.json) stay put: the Hub's
Today and Jobs pages fetch them from this host.  Originals stay in git history.
Usage:  python3 tools/retire_pages.py          # dry run, lists the map
        python3 tools/retire_pages.py --write  # writes stubs + self-removing sw.js
"""
import os, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H = 'https://medsalesintelligencehub.co.uk'
M = {'index': '/clinical-hub/', 'stay-current': '/medical-sales-hub/clinical/',
     'clinical-roles': '/medical-sales-hub/clinical-jobs/', 'careers': '/medical-sales-hub/clinical-jobs/',
     'revalidation': '/medical-sales-hub/clinical-portfolio/', 'care-passport': '/medical-sales-hub/clinical-portfolio/',
     'cv-tailor': '/medical-sales-hub/clinical-cv/', 'cv-mistake': '/medical-sales-hub/clinical-cv/',
     'courses': '/medical-sales-hub/clinical-training/',
     'webinars': '/medical-sales-hub/clinical-listen-watch/', 'podcasts': '/medical-sales-hub/clinical-listen-watch/',
     'conferences': '/medical-sales-hub/clinical-listen-watch/',
     'resources': '/medical-sales-hub/clinical-resources/', 'career-wins': '/medical-sales-hub/clinical-resources/',
     'clinical-currency': '/medical-sales-hub/clinical-resources/', 'offers': '/medical-sales-hub/clinical-resources/',
     'whats-next': '/medical-sales-hub/clinical-to-commercial-routes/',
     'beyond-the-bedside': '/medical-sales-hub/clinical-to-commercial-routes/'}
T = '''<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><title>The Clinical Hub has moved</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="clinical-hub-retired" content="1">
<meta name="robots" content="noindex">
<link rel="canonical" href="%(u)s">
<meta http-equiv="refresh" content="0; url=%(u)s">
<script>location.replace(%(u)r);</script>
<style>body{font-family:system-ui,sans-serif;background:#0B1C33;color:#F5F1E8;margin:0;padding:48px 20px;text-align:center}a{color:#E0BE8E}</style>
</head><body><p>The Clinical Hub now lives on the Medical Sales Intelligence Hub.</p>
<p><a href="%(u)s">Continue to the new page</a></p></body></html>
'''
SW = ("self.addEventListener('install',e=>self.skipWaiting());\n"
      "self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.map(x=>caches.delete(x))))"
      ".then(()=>self.registration.unregister())));\n")
on_disk = {f[:-5] for f in os.listdir(HERE) if f.endswith('.html')}
assert on_disk == set(M), on_disk ^ set(M)
for k, v in sorted(M.items()):
    print('%-20s -> %s%s' % (k + '.html', H, v))
    if '--write' in sys.argv:
        open(os.path.join(HERE, k + '.html'), 'w').write(T % {'u': H + v})
if '--write' in sys.argv:
    open(os.path.join(HERE, 'sw.js'), 'w').write(SW)
    print('stubs written')
