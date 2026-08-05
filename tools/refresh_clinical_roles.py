#!/usr/bin/env python3
"""Rebuild the Live Clinical Roles page each week.

Source of record is the HealthJobsUK RSS feed, which syndicates live NHS Jobs
vacancies. It is public, has no key, and works from a GitHub runner — which
LinkedIn does not (see the note in clinical-hub-weekly/SKILL.md).

The feed carries only a title and a link, but the link path encodes everything
else: /job/UK/{county}/{town}/{employer}/{specialty}/{specialty}-v{id}. That is
where employer and location come from, so no field here is inferred.

Roles from job-alert emails (RCNi Nursing Jobs, and LinkedIn job alerts once Lou
turns them on) are merged in from clinical-roles-extra.json if it exists.

Safety rule, same as Stay Current: if the feed yields nothing the previous page
is left standing and the run exits non-zero. An empty region renders an honest
empty state rather than being padded out with roles from somewhere else.
"""

import json, os, re, sys, datetime
from urllib.parse import unquote
from urllib.request import Request, urlopen

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(HERE, 'clinical-roles.html')
DATA = os.path.join(HERE, 'clinical-roles-data.json')
EXTRA = os.path.join(HERE, 'clinical-roles-extra.json')

FEED = 'https://www.healthjobsuk.com/job_list/rss?JobSearch_re=NHSJobs'
UA = 'Mozilla/5.0 (compatible; ClinicalHubBot/1.0; +https://clinicalhub.elevateandthrive.uk)'
PER_GROUP = 8

# The Clinical Hub is for carers, care managers and nurses. Everything else in
# the feed — medical, estates, admin, AHP — is out of scope, so it is filtered
# out rather than shown and explained away.
WANT = re.compile(
    r'\b(nurse|nursing|nurse practitioner|matron|ward manager|sister|charge nurse|'
    r'health care assistant|healthcare assistant|hca|care assistant|support worker|'
    r'nursing associate|midwife|midwifery|health visitor|district nurse|'
    r'practice nurse|theatre practitioner|deputy ward manager|clinical lead|'
    r'care manager|registered manager|senior carer)\b', re.I)
# Titles that match WANT but are not a clinical post.
NOT_WANT = re.compile(r'\b(bank admin|receptionist|secretary|data|audit|volunteer)\b', re.I)

GROUPS = [
    ('nurse',   'Nursing roles',
     re.compile(r'\b(nurse|nursing|matron|ward manager|sister|charge nurse|'
                r'nursing associate|midwife|midwifery|health visitor)\b', re.I)),
    ('care',    'Care &amp; support roles',
     re.compile(r'\b(health ?care assistant|hca|care assistant|support worker|'
                r'senior carer)\b', re.I)),
    ('leader',  'Leadership &amp; management',
     re.compile(r'\b(manager|clinical lead|matron|head of|deputy ward manager)\b', re.I)),
]


def fetch(url):
    req = Request(url, headers={'User-Agent': UA, 'Accept': 'application/rss+xml, text/xml'})
    with urlopen(req, timeout=60) as r:
        return r.read().decode('utf-8', 'replace')


def unslug(s):
    return re.sub(r'\s+', ' ', unquote(s or '').replace('_', ' ')).strip()


def tidy_employer(name):
    """A handful of feed entries repeat the trust name either side of its
    initialism ("Northumbria Healthcare NHCT Northumbria Healthcare NHS
    Foundation Trust"). Collapse only that exact shape — anything looser risks
    mangling a legitimate name."""
    return re.sub(r'^(.+?) (?:NHCT|NHSFT|NHST|NHS FT) \1\b', r'\1', name).strip()


def parse_link(link):
    """Pull county, town and employer out of the job URL path."""
    m = re.search(r'/job/UK/([^/]+)/([^/]+)/([^/]+)/([^/]+)/', link)
    if not m:
        return None
    return {'county': unslug(m.group(1)), 'town': unslug(m.group(2)),
            'employer': tidy_employer(unslug(m.group(3))), 'specialty': unslug(m.group(4))}


def scrape():
    xml = fetch(FEED)
    out, seen = [], set()
    for block in re.findall(r'<item>(.*?)</item>', xml, re.S | re.I):
        t = re.search(r'<title>(.*?)</title>', block, re.S)
        l = re.search(r'<link>(.*?)</link>', block, re.S)
        if not t or not l:
            continue
        title = re.sub(r'<!\[CDATA\[|\]\]>', '', t.group(1)).strip()
        link = re.sub(r'<!\[CDATA\[|\]\]>', '', l.group(1)).strip()
        if not title or not link or link in seen:
            continue
        if not WANT.search(title) or NOT_WANT.search(title):
            continue
        meta = parse_link(link)
        if not meta:
            continue
        seen.add(link)
        out.append({'title': title, 'url': link.replace('http://', 'https://'),
                    'source': 'NHS Jobs', **meta})
    return out


def load_extra():
    """Roles staged from job-alert emails by the weekly Cowork task."""
    if not os.path.exists(EXTRA):
        return []
    try:
        payload = json.load(open(EXTRA, encoding='utf-8'))
    except Exception as e:
        print('  clinical-roles-extra.json unreadable (%s) — ignoring it.' % e)
        return []
    kept = []
    for r in payload.get('items', []):
        if r.get('title') and r.get('url'):
            r.setdefault('source', 'Job alert')
            r.setdefault('employer', '')
            r.setdefault('town', '')
            r.setdefault('county', '')
            kept.append(r)
    return kept


def esc(s):
    return (str(s).replace('&', '&amp;').replace('<', '&lt;')
            .replace('>', '&gt;').replace('"', '&quot;'))


def group_of(role):
    for key, _label, rx in GROUPS:
        if rx.search(role['title']):
            return key
    return 'nurse'


def render(roles):
    buckets = {k: [] for k, _l, _r in GROUPS}
    for r in roles:
        buckets[group_of(r)].append(r)

    out, shown = [], 0
    for key, label, _rx in GROUPS:
        items = buckets[key][:PER_GROUP]
        shown += len(items)
        out.append('\n    <section data-group="%s">\n      <div class="eb">Open now</div>'
                   '\n      <h2>%s</h2>' % (key, label))
        if not items:
            out.append('\n      <p class="empty">Nothing open in this category in '
                       'this week\'s listings. That is the honest position, not a '
                       'loading error — check again after Monday\'s refresh.</p>')
        for r in items:
            where = ', '.join([x for x in (r.get('town'), r.get('county')) if x])
            meta = ' · '.join([x for x in (r.get('employer'), where) if x])
            out.append(
                '\n      <a class="card" href="%s" target="_blank" rel="noopener">'
                '\n        <div class="ct"><span>%s</span><span class="arrow">&rarr;</span></div>'
                '\n        <div class="cd">%s</div>'
                '\n        <span class="badge">%s</span>'
                '\n      </a>' % (esc(r['url']), esc(r['title']),
                                  esc(meta) or 'Location on the listing',
                                  esc(r.get('source', 'NHS Jobs'))))
        out.append('\n    </section>\n')
    return ''.join(out), shown


def main():
    try:
        roles = scrape()
        print('  NHS Jobs (HealthJobsUK): %d matching role(s)' % len(roles))
    except Exception as e:
        print('  HealthJobsUK: FETCH FAILED (%s)' % e)
        roles = []

    extra = load_extra()
    if extra:
        print('  Job-alert emails: %d role(s)' % len(extra))
    roles += extra

    if not roles:
        print('ERROR: no roles from any source; leaving the page untouched.')
        return 1

    today = datetime.date.today()
    stamp = today.strftime('%d/%m/%Y')

    rendered, shown = render(roles)

    page = open(PAGE, encoding='utf-8').read()
    block = '<!-- AUTO:ROLES:START -->%s    <!-- AUTO:ROLES:END -->' % rendered
    page, n = re.subn(r'<!-- AUTO:ROLES:START -->.*?<!-- AUTO:ROLES:END -->',
                      lambda _m: block, page, flags=re.S)
    if n != 1:
        print('ERROR: could not find the AUTO:ROLES markers in clinical-roles.html')
        return 1
    page = re.sub(r'(<meta name="roles-refreshed" content=")[^"]*(")',
                  lambda m: m.group(1) + stamp + m.group(2), page)
    # Both numbers are published. The page shows a sample, and saying so is the
    # difference between a sample and a claim to be the whole market.
    page = re.sub(r'(<span id="roleShown">)[^<]*(</span>)',
                  lambda m: m.group(1) + str(shown) + m.group(2), page)
    page = re.sub(r'(<span id="roleCount">)[^<]*(</span>)',
                  lambda m: m.group(1) + '{:,}'.format(len(roles)) + m.group(2), page)
    open(PAGE, 'w', encoding='utf-8').write(page)

    json.dump({'refreshed': today.isoformat(), 'matched': len(roles),
               'shown': shown, 'items': roles},
              open(DATA, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)

    print('Matched %d role(s), showing %d, refreshed %s' % (len(roles), shown, stamp))
    return 0


if __name__ == '__main__':
    sys.exit(main())
