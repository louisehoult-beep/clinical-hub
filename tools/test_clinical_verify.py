#!/usr/bin/env python3
"""Proves clinical_verify.py still catches what it was built to catch.

A gate nobody has tried to break is a gate nobody knows the shape of. Each case
below is a real failure this Hub has had, or the failure the check exists to
stop, applied to a copy of the live files.

Run:  python3 site/tools/test_clinical_verify.py
"""

import copy
import datetime
import importlib.util
import json
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location(
    'clinical_verify', os.path.join(HERE, 'clinical_verify.py'))
cv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cv)

SITE = os.path.dirname(HERE)
LIVE_REGISTRY = json.load(open(os.path.join(SITE, 'sources-registry.json'), encoding='utf-8'))
LIVE_STAY = json.load(open(os.path.join(SITE, 'stay-current-data.json'), encoding='utf-8'))

passed = failed = 0


def run(registry, stay):
    """Run the gate over two in-memory documents. Returns (fails, warns)."""
    d = tempfile.mkdtemp()
    rp, sp = os.path.join(d, 'r.json'), os.path.join(d, 's.json')
    json.dump(registry, open(rp, 'w', encoding='utf-8'))
    json.dump(stay, open(sp, 'w', encoding='utf-8'))
    cv.fails, cv.warns = [], []
    cv.REGISTRY, cv.STAY = rp, sp
    cv.main()
    return list(cv.fails), list(cv.warns)


def expect(name, registry, stay, should_fail, matching=None):
    global passed, failed
    f, _ = run(registry, stay)
    blob = ' '.join(m for _, m in f).lower()
    ok = bool(f) == should_fail and (matching is None or matching.lower() in blob)
    if ok:
        passed += 1
        print('  ok    %s' % name)
    else:
        failed += 1
        print('  FAIL  %s' % name)
        print('        expected %s%s, got %d failure(s): %s'
              % ('a failure' if should_fail else 'a clean run',
                 (' mentioning %r' % matching) if matching else '',
                 len(f), '; '.join(m[:110] for _, m in f) or '(none)'))


def sources(reg):
    for panel in reg['panels']:
        for src in panel['sources']:
            yield src


def find(reg, sid):
    return next(s for s in sources(reg) if s['id'] == sid)


print('clinical_verify.py — the cases it exists for\n')

# The files as published must pass, or every case below proves nothing.
expect('the live files pass', copy.deepcopy(LIVE_REGISTRY), copy.deepcopy(LIVE_STAY),
       should_fail=False)

# THE REAL INCIDENT (28/08/2026): the RCN listing was scraped and published on
# Stay Current with no registry entry at all.
r = copy.deepcopy(LIVE_REGISTRY)
for panel in r['panels']:
    panel['sources'] = [s for s in panel['sources'] if s['id'] != 'rcn-news']
expect('a scraped source missing from the registry', r, copy.deepcopy(LIVE_STAY),
       should_fail=True, matching='no registry source claims')

# The mirror image: the registry claims something live that nothing refreshes.
r = copy.deepcopy(LIVE_REGISTRY)
find(r, 'nice-news')['scraperKey'] = 'nursingtimes'
expect('a live registry source no scraper implements', r, copy.deepcopy(LIVE_STAY),
       should_fail=True, matching='does not implement')

# "live" with nothing behind it is an unverifiable claim.
r = copy.deepcopy(LIVE_REGISTRY)
del find(r, 'cqc-news')['scraperKey']
expect('a live source naming no scraper', r, copy.deepcopy(LIVE_STAY),
       should_fail=True, matching='names no scraperkey')

# A source that has fallen out of the page entirely — the refresher carries the
# previous items, so nothing else would say so.
s = copy.deepcopy(LIVE_STAY)
s['items'] = [i for i in s['items'] if i['src'] != 'cqc']
expect('a live source with nothing on the page', copy.deepcopy(LIVE_REGISTRY), s,
       should_fail=True, matching='nothing from them is on the page')

# An item published under a source the registry does not admit to watching.
s = copy.deepcopy(LIVE_STAY)
s['items'][0] = dict(s['items'][0], src='nursingtimes', label='Nursing Times')
expect('an item from an unregistered source', copy.deepcopy(LIVE_REGISTRY), s,
       should_fail=True, matching='which no live registry source claims')

# A refresher that stopped a month ago.
s = copy.deepcopy(LIVE_STAY)
s['refreshed'] = (datetime.date.today() - datetime.timedelta(days=30)).isoformat()
expect('a month-old refresh', copy.deepcopy(LIVE_REGISTRY), s,
       should_fail=True, matching='refresher that has stopped')

# A date that has not happened yet — the parser reading a "next event" block.
s = copy.deepcopy(LIVE_STAY)
s['items'][0] = dict(s['items'][0],
                     iso=(datetime.date.today() + datetime.timedelta(days=30)).isoformat())
expect('an item dated in the future', copy.deepcopy(LIVE_REGISTRY), s,
       should_fail=True, matching='has not happened yet')

# The same story twice.
s = copy.deepcopy(LIVE_STAY)
s['items'].append(dict(s['items'][0]))
expect('the same link published twice', copy.deepcopy(LIVE_REGISTRY), s,
       should_fail=True, matching='same link')

# A blank page is a break, not an empty state.
s = copy.deepcopy(LIVE_STAY)
s['items'] = []
expect('an empty page', copy.deepcopy(LIVE_REGISTRY), s,
       should_fail=True, matching='blank stay current')

# One id meaning two things.
r = copy.deepcopy(LIVE_REGISTRY)
r['panels'][0]['sources'].append(dict(find(r, 'nmc-news'), name='A second NMC entry'))
expect('a duplicate source id', r, copy.deepcopy(LIVE_STAY),
       should_fail=True, matching='used twice')

# A source with no working link is not one click away from anything.
r = copy.deepcopy(LIVE_REGISTRY)
find(r, 'nmc-ftp')['url'] = 'www.nmc.org.uk/about-us'
expect('a source url that is not https', r, copy.deepcopy(LIVE_STAY),
       should_fail=True, matching='real https link')

# The deliberate NHS Employers cross-listing must NOT be read as a fault.
r = copy.deepcopy(LIVE_REGISTRY)
expect('a documented cross-listing still passes', r, copy.deepcopy(LIVE_STAY),
       should_fail=False)

# Two different scrapers reading one page, however, is one source counted twice.
r = copy.deepcopy(LIVE_REGISTRY)
find(r, 'nhsemployers-home')['scraperKey'] = 'nice'
expect('one url read by two scrapers', r, copy.deepcopy(LIVE_STAY),
       should_fail=True, matching='one page read twice')

print('\n%d passed, %d failed' % (passed, failed))
sys.exit(1 if failed else 0)
