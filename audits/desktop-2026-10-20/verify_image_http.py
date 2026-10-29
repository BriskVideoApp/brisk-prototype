"""Read-only HEAD checks for exact local report image URLs; audit artefacts only."""
from pathlib import Path
import json, concurrent.futures, urllib.request, datetime
from urllib.parse import urlparse, urljoin, quote
p=Path(__file__).parent
m=json.loads((p/'verification/rendered-image-links.json').read_text())
urls=sorted({quote(u,safe=':/%?#=&') for u in set(m['links'])|{urljoin(m['url'],s) for s in m['images']}})
assert all(urlparse(u).scheme=='http' and urlparse(u).hostname=='127.0.0.1' and urlparse(u).port==8765 for u in urls)
def check(url):
 try:
  with urllib.request.urlopen(urllib.request.Request(url,method='HEAD'),timeout=10) as r:
   return {'url':url,'status':r.status,'type':r.headers.get('Content-Type')}
 except Exception as e:return {'url':url,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex: results=list(ex.map(check,urls))
failed=[r for r in results if r.get('status')!=200 or not r.get('type','').startswith('image/')]
record={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'imageURLsChecked':len(results),'failures':failed,'results':results}
(p/'verification/image-http-verification.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'checked':len(results),'failures':len(failed),'firstFailure':failed[:1]},indent=2))
if failed:raise SystemExit(1)
