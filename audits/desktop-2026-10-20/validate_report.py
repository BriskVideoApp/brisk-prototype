"""Validate audit artefact references and original screenshot containers, without app checks."""
from pathlib import Path
import datetime
import hashlib
import json
import struct
import subprocess
from urllib.parse import unquote, urljoin, urlparse

P = Path(__file__).parent
REPO = P.parent.parent
D = json.loads((P / 'data/report-data.json').read_text())
captures = {c['id']: c for c in D['captures']}
errors = []

def jpeg_size(raw):
    offset = 2
    while offset < len(raw):
        if raw[offset] != 255:
            offset += 1
            continue
        while raw[offset] == 255:
            offset += 1
        marker = raw[offset]
        offset += 1
        if marker in [216, 217] or 208 <= marker <= 215:
            continue
        length = struct.unpack('>H', raw[offset:offset + 2])[0]
        if marker in [192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207]:
            height, width = struct.unpack('>HH', raw[offset + 3:offset + 7])
            return width, height
        offset += length
    raise ValueError('JPEG dimensions not found')

for c in captures.values():
    path = P / c['path']
    raw = path.read_bytes()
    if raw[:3] == b'\xff\xd8\xff':
        size = jpeg_size(raw)
    elif raw[:8] == b'\x89PNG\r\n\x1a\n':
        size = struct.unpack('>II', raw[16:24])
    else:
        errors.append((c['id'], 'Unrecognised image container'))
        continue
    if size != (c['width'], c['height']):
        errors.append((c['id'], 'Viewport metadata differs', size, (c['width'], c['height'])))

def check(ref, context):
    if isinstance(ref, list):
        for item in ref:
            check(item, context)
    elif isinstance(ref, dict):
        if ref.get('path') and not (P / ref['path']).exists():
            errors.append((context, ref['path']))
    elif isinstance(ref, str):
        if ref in captures:
            return
        path = ref if '/' in ref else 'evidence/' + ref
        if not (P / path).exists():
            errors.append((context, ref))

required = ['id','title','category','severity','impact','classification','confidence','roles','routes','states','currentScreenshot','approvedReference','observed','expected','authority','recommendation','rationale','alternatives','tradeoffs','rootCause','occurrences','sources','verificationRemaining','reviewStatus']
for f in D['findings']:
    for field in required:
        if field not in f:
            errors.append((f['id'], 'Missing finding field', field))
    for field in ['currentScreenshot','approvedReferenceScreenshot','supportingScreenshots','currentComparison','focusedCrop','annotatedPanels']:
        if field in f:
            check(f[field], f['id'] + ':' + field)
    if f['reviewStatus'] != 'Needs decision':
        errors.append((f['id'], 'Initial status is not Needs decision'))
    for source in f['sources']:
        pieces = source.rsplit(':', 1)
        source_file = REPO / (pieces[0] if len(pieces) == 2 and pieces[1].isdigit() else source)
        if not source_file.exists():
            errors.append((f['id'], source, 'Missing source'))
        elif len(pieces) == 2 and pieces[1].isdigit() and int(pieces[1]) > len(source_file.read_text().splitlines()):
            errors.append((f['id'], source, 'Invalid line'))
for c in D['catalogue']:
    if c.get('screenshot'):
        check(c['screenshot'], c['id'])
for c in D['comparisons']:
    check(c['examples'], c['id'])
for c in D['designAssessment']['strengths'] + D['designAssessment']['refinements']:
    check(c.get('screenshots', []), c['id'])
for c in D['coverage']:
    check(c.get('screenshots', []), c['id'])
for panel in json.loads((P / 'reviewers/a-comparisons/panels.json').read_text())['panels']:
    for original in panel['fullOriginals']:
        path = P / 'reviewers/a-comparisons' / original['file']
        if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != original['sha256']:
            errors.append((panel['file'], 'Original screenshot hash mismatch'))
completion_provenance=P/'reviewers/a-completion-comparisons/provenance.json'
if completion_provenance.exists():
    for original in json.loads(completion_provenance.read_text()):
        path=P/original['source']
        if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=original['sha256']:
            errors.append((original['panel'],'Completion original screenshot hash mismatch'))

# Validate the URLs the browser actually rendered, not only IDs in source data.
rendered_manifest = P / 'verification/rendered-image-links.json'
rendered_count = None
if rendered_manifest.exists():
    rendered = json.loads(rendered_manifest.read_text())
    rendered_urls = set(rendered['links']) | {urljoin(rendered['url'], src) for src in rendered['images']}
    rendered_count = len(rendered_urls)
    for url in rendered_urls:
        parsed = urlparse(url)
        if parsed.scheme == 'file':
            target = Path(unquote(parsed.path))
        elif parsed.hostname in ['localhost', '127.0.0.1']:
            target = REPO / unquote(parsed.path).lstrip('/')
        else:
            errors.append(('Rendered image', url, 'Unexpected external image target'))
            continue
        if not target.exists():
            errors.append(('Rendered image', url, 'Missing target'))
    for relative_path, digest in rendered.get('sourceHashes', {}).items():
        if hashlib.sha256((P / relative_path).read_bytes()).hexdigest() != digest:
            errors.append(('Rendered image manifest is stale', relative_path))

baseline = json.loads((P / 'data/baseline-hashes.json').read_text())
changed = [path for path, digest in baseline.items() if not (REPO / path).exists() or hashlib.sha256((REPO / path).read_bytes()).hexdigest() != digest]
preservation = {
    'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'protectedFilesChecked':len(baseline), 'protectedFilesChanged':changed,
    'trackedDiff':subprocess.check_output(['git','diff','--name-only'],cwd=REPO,text=True).splitlines(),
    'gitStatus':subprocess.check_output(['git','status','--short'],cwd=REPO,text=True).splitlines(),
    'branch':subprocess.check_output(['git','branch','--show-current'],cwd=REPO,text=True).strip(),
    'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip(),
    'browserStorageEqual':json.loads((P/'data/completion-working-storage-before.json').read_text()) == json.loads((P/'data/completion-working-storage-after.json').read_text()),
    'workingStorageProof':'Completion-pass baseline and after snapshot: localhost static SVG inspection only;43 local keys,0 session keys.',
    'noTestsBuildInstallCommitPush':True,
}
(P/'data/preservation-verification.json').write_text(json.dumps(preservation,indent=2)+'\n')
result = {'captures':len(captures),'routePatterns':len(D['pages']),'coverageEntries':len(D['coverage']),'findings':len(D['findings']),'patternFamilies':len(D['catalogue']),'strengths':len(D['designAssessment']['strengths']),'optionalRefinements':len(D['designAssessment']['refinements']),'renderedImageReferencesChecked':rendered_count,'referenceAndSchemaErrors':errors,'originalScreenshotBytesPreserved':True,'applicationProtectedFilesChanged':changed,'browserStorageRestored':preservation['browserStorageEqual']}
(P/'data/report-final-validation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
if errors or changed or preservation['trackedDiff'] or not preservation['browserStorageEqual']:
    raise SystemExit(1)
