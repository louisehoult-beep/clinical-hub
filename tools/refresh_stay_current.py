#!/usr/bin/env python3
"""Rebuild the Stay Current list on The Clinical Hub from the official news pages.

None of the NMC, RCN or CQC publish an RSS feed, so this reads their news listing
pages and pulls out the item links. It deliberately keys off URL shape and anchor
text rather than CSS classes, because those change far more often.

Safety rule: if a source yields nothing, the previous items for that source are kept
and the run exits non-zero. A red run is a signal to fix the parser; it must never
leave Lou with a blank or half-empty page.
"""

import json, os, re, sys, datetime
from urllib.request import Request, urlopen

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(HERE, 'stay-current.html')
DATA = os.path.join(HERE, 'stay-current-data.json')
PER_SOURCE = 5
UA = 'Mozilla/5.0 (compatible; ClinicalHubBot/1.0; +https://clinicalhub.elevateandthrive.uk)'

SOURCES = [
    {'key': 'nmc', 'label': 'NMC',
     'listing': 'https://www.nmc.org.uk/news/news-and-updates/',
     'item': re.compile(r'^https://www\.nmc\.org\.uk/news/news-and-updates/[a-z0-9][a-z0-9\-]{15,}/$')},
    {'key': 'rcn', 'label': 'RCN',
     'listing': 'https://www.rcn.org.uk/news-and-events/news',
     'item': re.compile(r'^https://www\.rcn\.org\.uk/news-and-events/news/[a-z0-9][a-z0-9\-]{15,}$')},
    {'key': 'cqc', 'label': 'CQC',
     'listing': 'https://www.cqc.org.uk/news',
     'item': re.compile(r'^https://www\.cqc\.org\.uk/news/(?:releases/)?[a-z0-9][a-z0-9\-]{15,}$')},
]

MONTHS = {m.lower(): i for i, m in enumerate(
    ['January','February','March','April','May','June','July','August','September','October','November','December'], 1)}
SKIP_TITLES = re.compile(r'^(read more|find out more|news|more|latest news|see all|view all)$', re.I)


def fetch(url):
    req = Request(url, headers={'User-Agent': UA, 'Accept': 'text/html'})
    with urlopen(req, timeout=45) as r:
        raw = r.read()
    for enc in ('utf-8', 'latin-1'):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode('utf-8', 'replace')


def strip_tags(s):
    s = re.sub(r'<[^>]+>', ' ', s)
    s = (s.replace('&amp;', '&').replace('&nbsp;', ' ').replace('&#39;', "'")
          .replace('&rsquo;', "’").replace('&lsquo;', "‘")
          .replace('&quot;', '"').replace('&ndash;', '–').replace('&mdash;', '—'))
    return re.sub(r'\s+', ' ', s).strip()


def absolutise(href, base):
    if href.startswith('//'):
        return 'https:' + href
    if href.startswith('/'):
        return re.match(r'^(https://[^/]+)', base).group(1) + href
    return href


def find_date(html, pos):
    """Look for a date near the anchor. Returns (iso, 'DD Mon') or (None, '')."""
    window = html[max(0, pos - 600): pos + 900]
    m = re.search(r'datetime="(\d{4})-(\d{2})-(\d{2})', window)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    else:
        m = re.search(r'\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b', window)
        if m and m.group(2).lower()[:3] in [k[:3] for k in MONTHS]:
            d, y = int(m.group(1)), int(m.group(3))
            mo = next(v for k, v in MONTHS.items() if k.startswith(m.group(2).lower()[:3]))
        else:
            m = re.search(r'\b(\d{4})-(\d{2})-(\d{2})\b', window)
            if not m:
                return None, ''
            y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    try:
        dt = datetime.date(y, mo, d)
    except ValueError:
        return None, ''
    if dt > datetime.date.today() + datetime.timedelta(days=2):
        return None, ''
    return dt.isoformat(), dt.strftime('%d %b')


def scrape(source):
    html = fetch(source['listing'])
    out, seen = [], set()
    for m in re.finditer(r'<a\b[^>]*href="([^"#?]+)[^"]*"[^>]*>(.*?)</a>', html, re.S | re.I):
        url = absolutise(m.group(1), source['listing']).rstrip('/')
        probe = url + '/' if source['key'] == 'nmc' else url
        if not source['item'].match(probe):
            continue
        title = strip_tags(m.group(2))
        if len(title) < 20 or SKIP_TITLES.match(title) or probe in seen:
            continue
        seen.add(probe)
        iso, pretty = find_date(html, m.start())
        out.append({'url': probe, 'title': title, 'src': source['key'],
                    'label': source['label'], 'iso': iso, 'date': pretty})
    out.sort(key=lambda i: i['iso'] or '', reverse=True)
    return out[:PER_SOURCE]


def esc(s):
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;'))


def render(items):
    rows = []
    for it in items:
        rows.append(
            '\n    <a class="item" data-src="%s" href="%s" target="_blank" rel="noopener">'
            '\n      <div class="row1"><span class="date">%s</span><span class="src %s">%s</span></div>'
            '\n      <h3>%s <span class="arrow">&rarr;</span></h3>'
            '\n    </a>\n' % (it['src'], esc(it['url']), esc(it['date'] or ''), it['src'],
                              it['label'], esc(it['title'])))
    return ''.join(rows)


def main():
    previous = {}
    if os.path.exists(DATA):
        try:
            previous = json.load(open(DATA, encoding='utf-8'))
        except Exception:
            previous = {}
    prev_items = previous.get('items', [])

    collected, failed = [], []
    for s in SOURCES:
        try:
            got = scrape(s)
        except Exception as e:
            print('  %s: FETCH FAILED (%s)' % (s['label'], e))
            got = []
        if got:
            print('  %s: %d items' % (s['label'], len(got)))
            collected += got
        else:
            kept = [i for i in prev_items if i.get('src') == s['key']]
            print('  %s: nothing parsed, keeping %d previous item(s)' % (s['label'], len(kept)))
            failed.append(s['label'])
            collected += kept

    collected.sort(key=lambda i: i.get('iso') or '', reverse=True)
    if not collected:
        print('ERROR: nothing at all to write; leaving the page untouched.')
        return 1

    today = datetime.date.today()
    stamp = today.strftime('%d/%m/%Y')

    page = open(PAGE, encoding='utf-8').read()
    new_block = '<!-- AUTO:ITEMS:START -->%s    <!-- AUTO:ITEMS:END -->' % render(collected)
    page, n = re.subn(r'<!-- AUTO:ITEMS:START -->.*?<!-- AUTO:ITEMS:END -->',
                      lambda _m: new_block, page, flags=re.S)
    if n != 1:
        print('ERROR: could not find the AUTO:ITEMS markers in stay-current.html')
        return 1
    page = re.sub(r'(<meta name="stay-current-refreshed" content=")[^"]*(")',
                  lambda m: m.group(1) + stamp + m.group(2), page)
    open(PAGE, 'w', encoding='utf-8').write(page)

    json.dump({'refreshed': today.isoformat(), 'items': collected},
              open(DATA, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)

    print('Wrote %d items, refreshed %s' % (len(collected), stamp))
    if failed:
        print('::error::No items parsed from: %s. Page kept the previous entries; the parser needs a look.'
              % ', '.join(failed))
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
