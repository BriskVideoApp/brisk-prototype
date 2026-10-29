"""Assemble the local audit artefact. Does not import or modify application code."""
from pathlib import Path
import copy
import csv
import hashlib
import json
import re

ROOT = Path(__file__).parent
REPO = ROOT.parent.parent

def read(path):
    return json.loads((ROOT / path).read_text())

def save(path, value):
    (ROOT / path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")

captures = read('data/captures.json')
for c in captures:
    c['path'] = 'evidence/' + c['id'] + '.jpg'
for registry in ['completion', 'a-completion', 'b-completion', 'c-completion']:
    path = ROOT / 'data' / (registry + '-captures.json')
    if not path.exists():
        continue
    for original in json.loads(path.read_text()):
        c = copy.deepcopy(original)
        c['path'] = c.get('file') or c.get('screenshot') or c.get('path')
        c['state'] = c.get('state') or c.get('caption', '')
        c['width'] = c.get('width') or c.get('viewport', {}).get('width')
        c['height'] = c.get('height') or c.get('viewport', {}).get('height')
        # Preserve logical viewport separately from the genuine image container.
        raw = (ROOT / c['path']).read_bytes()
        import struct
        if raw[:8] == b'\x89PNG\r\n\x1a\n':
            image_width, image_height = struct.unpack('>II', raw[16:24])
        else:
            offset = 2
            while offset < len(raw):
                if raw[offset] != 255:
                    offset += 1
                    continue
                while raw[offset] == 255:
                    offset += 1
                marker = raw[offset]
                offset += 1
                if marker in [216,217] or 208 <= marker <= 215:
                    continue
                length = struct.unpack('>H', raw[offset:offset+2])[0]
                if marker in [192,193,194,195,197,198,199,201,202,203,205,206,207]:
                    image_height, image_width = struct.unpack('>HH', raw[offset+3:offset+7])
                    break
                offset += length
        c['logicalViewport'] = {'width':c['width'], 'height':c['height']}
        if (image_width,image_height) != (c['width'],c['height']):
            c['captureExtentNote'] = 'Screenshot API retained only this visible image extent. Logical viewport is recorded separately; no hidden area is certified by the pixels.'
        c['width'], c['height'] = image_width,image_height
        captures.append(c)
capture_map = {c['id']: c for c in captures}

def evidence(ref):
    if not ref:
        return None
    if isinstance(ref, dict):
        return ref
    name = str(ref).removesuffix('.png').removesuffix('.jpg')
    if name in capture_map:
        return name
    if (ROOT / str(ref)).exists():
        return {'path': str(ref), 'title': Path(str(ref)).name}
    if (REPO / str(ref)).exists():
        return {'path':'../../' + str(ref), 'title':Path(str(ref)).name,
                'route':str(ref), 'role':'Reference asset',
                'state':'Approved visual reference. Historical pixels do not prove current behaviour.'}
    if (ROOT / 'evidence' / str(ref)).exists():
        return {'path': 'evidence/' + str(ref), 'title': name}
    return ref

a = read('reviewers/a.json')['findings']
b = read('reviewers/b.json')['findings']
active_a = {'A03', 'A05', 'A06', 'A07', 'A08', 'A10', 'A12', 'A13'}
findings = [copy.deepcopy(f) for f in a if f['id'] in active_a] + copy.deepcopy(b)
priority = ['A10', 'A12', 'B02', 'B01', 'B09', 'A07', 'A13', 'A05', 'B03', 'B12', 'B13', 'A03', 'A08', 'A06', 'B06', 'B07', 'B10', 'B11']
findings.sort(key=lambda f: priority.index(f['id']))

for f in findings:
    f['reviewStatus'] = 'Needs decision'
    f['implementationState'] = 'Unfixed in inspected baseline. No implementation authorised.'
    original_roles = f.get('roles', [])
    f['roles'] = list(dict.fromkeys(role for value in original_roles for role in ['Studio Staff', 'Studio Freelancer', 'Customer'] if str(value).startswith(role)))
    if original_roles != f['roles']:
        f['roleEvidenceScope'] = original_roles
    if isinstance(f.get('evidence'), dict):
        ev = f['evidence']
        f['currentScreenshot'] = evidence(ev.get('currentScreenshot'))
        f['approvedReference'] = ev.get('approvedReferenceStatement', 'No approved reference exists for this exact state.')
        f['supportingScreenshots'] = [evidence(x) for x in ev.get('additionalScreenshots', [])]
        if ev.get('currentCrop'):
            f['focusedCrop'] = evidence(ev['currentCrop'])
        # A current comparison is not silently relabelled as an approved reference.
        if ev.get('referenceScreenshot'):
            f['currentComparison'] = evidence(ev['referenceScreenshot'])
    else:
        refs = [evidence(x) for x in f.get('evidence', [])]
        f['currentScreenshot'] = refs[:2]
        f['supportingScreenshots'] = refs[2:]
    f.setdefault('approvedReference', 'No approved reference screenshot exists for this exact state. The written authority is listed.')
    f.setdefault('alternatives', ['Retain the current pattern if further evidence establishes a useful intentional difference; do not widen the change beyond the stated issue.'])
    f.setdefault('tradeoffs', ['Preserve current task scope, permissions, records and the surrounding approved composition.'])

by_id = {f['id']: f for f in findings}
team = by_id['B01']
a2 = next(f for f in a if f['id'] == 'A02')
team['title'] = 'Team person selection needs named, dependable checkbox controls'
team['category'] = 'Accessibility and design-system compliance'
team['observed'] += ' The same custom checkbox uses a small 24px selection label, a Unicode tick and incomplete DS focus treatment. This is one shared implementation, not a second independent finding.'
team['recommendation'] += ' Use the approved DS Checkbox and explicitly associate the full person name with the control. Keep rate/hour inputs independently operable and retain deselection.'
team['authority'] = list(dict.fromkeys(team['authority'] + a2['authority']))
team['sources'] = list(dict.fromkeys(team['sources'] + a2['sources']))
team['mergedCandidateIds'] = ['A02']
team['approvedReferenceScreenshot'] = 'D-R040-staff-1133'
team['approvedReference'] = 'Current Notifications uses the approved DS Checkbox. This is a component reference only; there is no approved Team-row replacement screenshot.'
team['supportingScreenshots'] += ['E144-client-access-editor']

# The strongest visual obstruction has interaction evidence alongside the initial state.
by_id['A10']['currentScreenshot'] = ['E044-media-inspector-hidden-close', 'E045-media-close-click-result']
by_id['A10']['confidence'] = 'High for observed Staff 1133px obstruction and pointer result; other role geometry source-supported'
by_id['A12']['currentScreenshot'] = ['BRIEF-deliverables-1133', 'BRIEF-summary-1133']
by_id['A12']['supportingScreenshots'] += ['E115-brief-duration-menu-1133', 'E116-brief-deliverables-collapsed-nav']
by_id['A05']['currentScreenshot'] = ['E103-notifications-root-navigation', 'E104-notifications-category-navigation']
by_id['A03']['observed'] += ' Lead measured the current Videos row badges: 10px white text on rgb(253,104,181), with unread-badge-pulse animation. Calculated contrast is approximately 2.68:1. This is a targeted readability check, not an accessibility conformance audit.'
by_id['A03']['supportingScreenshots'] += ['E117-video-unread-badges']
by_id['A07']['verificationRemaining'].append('Lead visually confirmed the captured overlap in D-R005-staff-1133. Later keyboard navigation produced clear-gap states E124/E125, so overlap is scroll-position dependent, not universal.')
by_id['A10']['observed'] = 'At 1133px, the fixed global header covers the inspector filename and Close control. The named Close control sits at x1089, y14 behind that header. A pointer activation opens Ask Brisk and leaves the inspector open (E045). After closing Ask Brisk, Escape from Filename also leaves the inspector open (E046); keyboard Enter on Close does close it. At 1440px, the multi-rail layout leaves roughly 220px for browsing beside the 360px inspector, squeezing cards and filters. Staff pointer behaviour is directly verified; other role geometry is source-supported.'
by_id['A10']['impact'] = 'At narrow desktop width, people lose the panel identity and visible exit. Trying to close it can open an unrelated panel. The wider docked layout also needs more deliberate space for browsing.'
by_id['A12']['confidence'] = 'High for captured closed-field truncation; the full Duration remains available when opened'
panels = read('reviewers/a-comparisons/panels.json')['panels']
for panel in panels:
    finding_id = 'B01' if panel['file'].startswith('B01') else panel['file'].split('-')[0]
    if finding_id not in by_id:
        continue
    originals = []
    contexts = []
    for original in panel['fullOriginals']:
        original_id = Path(original['file']).stem
        originals.append(original_id)
        context = capture_map.get(original_id, {})
        contexts.append(f"{context.get('width','?')}px · {context.get('state','state recorded on original')}")
    by_id[finding_id].setdefault('annotatedPanels', []).append({
        'path':'reviewers/a-comparisons/' + panel['file'], 'title':panel['title'],
        'route':' / '.join(dict.fromkeys(capture_map.get(x,{}).get('url','') for x in originals)),
        'role':'Studio Staff', 'state':'; '.join(contexts),
        'notes':panel['pixelPolicy'] + ' ' + panel['notes'],
        'originalCaptureIds':originals,
    })
by_id['B02']['reproSteps'] = [
    'In global Media Library, keyboard-focus Select Office-arrivals-camera-b.mov and press Space. The asset inspector opens instead of selection feedback (E010/E011). No file action was completed.',
    'In the existing Jess transcript, mute playback, focus Add comment for Interviewer at 00:08 and press Space. Playback starts at 00:08 without opening the comment composer (E073). Pause and restore mute state.',
    'Compare pointer selection with the normal selected toolbar. Verify the future fix preserves independent child actions and parent row activation.'
]

catalogue = read('reviewers/baseline-catalogue.json')['families']
for c in catalogue:
    c['approvedComponent'] = c.get('approvedPattern', c.get('approvedComponent'))
    c['sources'] = [source.strip() for source in c['canonicalSource'].split(';') if source.strip()] if c.get('canonicalSource') else c.get('sources', [])
    if c.get('screenshot'):
        c['screenshot'] = evidence(c['screenshot'])

coverage = read('data/coverage-register.json')
routes = read('reviewers/route-classification.json')
assessment = read('reviewers/design-assessment.json')
assessment['summary'] = assessment['overallAssessment']
assessment['refinements'] = assessment['optionalRefinements']
assessment['principles'] = assessment['crossAppPreservePrinciples']
for item in assessment['strengths'] + assessment['refinements']:
    item['screenshots'] = [evidence(x) for x in item.get('screenshots', [])]

checkpoints = read('reviewers/a-visual-checkpoints.json')['captures']
pages = []
for r in routes:
    entry = next(c for c in coverage if c['id'] == r['id'])
    checks = [x for x in checkpoints if x.get('routeId') == r['id']]
    default_shots = [x for x in captures if x['id'].startswith('D-' + r['id'] + '-')]
    ids = []
    for f in findings:
        actual = r['exampleUrl'].split('?')[0]
        if any(actual == route.split('?')[0] or (route.startswith('/media') and actual == '/media') for route in f.get('routes', [])):
            ids.append(f['id'])
    summary = [x['observed'] for x in checks if x.get('observed')]
    if not summary:
        summary = ['The current entry was inspected to the extent recorded in coverage. No additional composition judgement is promoted from a default screenshot alone.']
    pages.append({
        'title': r['id'] + ' · ' + r['surface'], 'route': r['route'], 'status': entry['status'],
        'roles': r['applicableRoles'], 'summary': summary,
        'gaps': [entry.get('remainingGap', '')] + [x['gaps'] for x in checks if x.get('gaps')],
        'findingIds': ids, 'screenshots': [x['id'] for x in default_shots],
    })

comparisons = [
    {'id':'COMPARE01','title':'Workspace headers share hierarchy; project and profile headers retain their purpose','summary':'Videos, People, Clients, Brand Kits and Expenses use the approved quiet title/search frame. Brief choice grids and contextual project headers have different tasks and should keep their own hierarchy. Contextual search width alone is not a defect.','examples':['E002-staff-videos-1440','D-R018-staff-1440','D-R008-staff-1440','D-R004-staff-1440'],'authority':'Docs/desktop-design-baseline.md - scoped workspace header decisions','recommendation':'Preserve the established composition; verify exceptional consumers rather than impose one universal header.'},
    {'id':'COMPARE02','title':'Named selection controls support distinct selection, assignment and invitation tasks','summary':'The Client access editor clearly names projects. Team selection recreates a checkbox without the associated person name. The two workflows should share dependable input behaviour while retaining their different action boundaries.','examples':['E004-team-role-editor-1440','E144-client-access-editor','D-R040-staff-1133'],'findingIds':['B01','B07'],'standard':'Approved DS Checkbox and Tabs semantics; do not turn selectable people into immediate assignment rows.'},
    {'id':'COMPARE03','title':'Focused dialogs are effective when custom footers retain a visible exit','summary':'Studio identity and font-role editors show a clear Cancel/Save pair. Invitation Access, logo download and invoice return override the footer and omit a direct whole-dialog exit. Keep Back separate from cancelling the workflow.','examples':['E102-studio-edit-name','E088-brand-font-roles','E029-invitation-client-access','E087-brand-logo-download','E096-invoice-send-back-empty'],'findingIds':['B12'],'standard':'EditingDialog and ConfirmationDialog explicit-exit contracts'},
    {'id':'COMPARE04','title':'Desktop space needs a deliberate lower bound','summary':'A larger screen can dock an inspector; narrow desktop must protect its header and the browsing area. Brief specification values must remain readable at rest. Collapsing navigation helps but does not resolve all short-value truncation.','examples':['E044-media-inspector-hidden-close','E011-media-keyboard-after','BRIEF-deliverables-1440','BRIEF-deliverables-1133','E116-brief-deliverables-collapsed-nav'],'findingIds':['A10','A12'],'recommendation':'Use the smallest responsive composition change that preserves task context and readable control width; do not shrink text or force every table column to fit.'},
    {'id':'COMPARE05','title':'Layering should communicate hierarchy and preserve content','summary':'White elevated surfaces and restrained status colours give Brisk a clear frame. Client colours are useful as actual palette content; tinting enclosing categories makes those panels compete. A sticky date should orient reading without covering messages.','examples':['D-R003-staff-1133','D-R005-staff-1133','E103-notifications-root-navigation'],'findingIds':['A06','A07'],'authority':'Approved white-only enclosing layers; normal-flow/readable content heuristic'},
    {'id':'COMPARE06','title':'Feedback should explain the current state consistently','summary':'An invoice currency mismatch clearly names the difference and requires a note. Brief summary helper text promises approval despite the existing guard disabling the action. Capacity details preserve totals but can better carry the overload meaning already visible in the directory.','examples':['E098-invoice-currency-mismatch','BRIEF-summary-1133','E031-people-capacity'],'findingIds':['B13','B11'],'recommendation':'Derive explanations from the same eligibility and capacity state as the action. Preserve financial and approval rules.'},
    {'id':'COMPARE07','title':'Rich panels need an explicit interaction contract','summary':'A normal Script action menu dismisses with Escape. The specialised Versions panel persists through Escape and outside clicks; the flow adjuster declares a modal while focus remains behind it. Their richer contents can remain, with a deliberate lifecycle.','examples':['E058-script-versions-1440','E062-script-actions-menu','E055-project-flow-panel-1133'],'findingIds':['B06','B09'],'standard':'Modal focus follows the declared modality. Version-panel persistence remains a design decision rather than an assumed DS violation.'},
]
for comparison in comparisons:
    comparison['examples'] = [evidence(x) for x in comparison['examples'] if (str(x).removesuffix('.png') in capture_map)]

decisions = [
    {'id':'DEC01','title':'Choose one cross-filter Media selection policy','context':'The selected count, sharing label and delete confirmation currently use different scopes. No unintended deletion was executed.','recommendation':'Keep selections across filters only if hidden selections are explicitly counted and every command describes its scope. Otherwise clear with clear feedback.','options':['Persist selection with an explicit hidden-selection summary and consistent actions','Limit selection to current results and clear visibly on filter changes'],'tradeoffs':'Persistent selection supports gathering files across folders; clearing is simpler but can discard deliberate work. Preserve scoped downloads and access.','findingIds':['B03']},
    {'id':'DEC02','title':'Agree the narrow desktop inspector composition','context':'The 1133px inspector hides its header; the 1440px multi-rail view can also squeeze browsing.','recommendation':'Keep the inspector under the global header and overlay or reduce rails before the browsing column loses a usable minimum.','options':['Contextual overlay below the global header','Dock with a deliberate collapsed-rail/minimum-content boundary'],'tradeoffs':'An overlay temporarily hides some browsing; collapsing rails changes navigation density. Preserve selected context and return focus.','findingIds':['A10']},
    {'id':'DEC03','title':'Decide whether Versions is a persistent panel or dismissible overlay','recommendation':'Use a dismissible overlay with Escape, outside dismissal and return focus for the current anchored treatment. If persistence is useful, make it a deliberate panel with a visible Close.','tradeoffs':'Persistent panels support repeated version comparison; an implicit persistence rule leaves the current overlay awkward to dismiss.','findingIds':['B06']},
    {'id':'DEC04','title':'Keep Brand Kit asset priority consistent across desktop widths','context':'At 1133px, media and documents move ahead of logos, colours and fonts. This may be intentional; no approved priority exception was found.','recommendation':'Preserve core identity assets first unless Tom explicitly prefers usage/content priority at narrower desktop.','options':['Identity assets remain first at both widths','Media/documents take priority at narrow desktop with a clear rationale'],'tradeoffs':'Changing order affects learned location and first-fold usefulness. A usability benefit has not been measured.','authority':'A11 is a decision note, not a proven task failure.'},
    {'id':'DEC05','title':'Clarify the permitted quiet selector variant','context':'Media Sort suppresses the resting border, while ordinary DS selection fields retain one. The chevron/value are visible and blue focus remains intact.','recommendation':'Resolve whether a compact quiet sort variant is approved before changing its styling. Preserve contextual widths.','options':['Use the ordinary bordered DS field','Approve and document a quiet sort variant with equivalent states'],'tradeoffs':'A quiet control reduces toolbar density but needs an explicit variant contract. This is not a proven discoverability failure.','authority':'A04 is a component-policy decision, not a keyboard-focus defect.'},
    {'id':'DEC06','title':'Review optional simplifications after the blockers','recommendation':'Prioritise compact folder grouping, calmer unread emphasis, stable asset priority and a more economical Client overview. Review each against the task rather than apply a universal card or border rule.','tradeoffs':'A more sophisticated appearance should preserve useful information, distinct actions, selection scope and established production language.','findingIds':['A03','A08','B10','B11']},
]

batches = [
    {'id':'1','title':'Restore visible, dependable controls','priority':'First','changes':['Repair inspector/header boundary','Protect nested button keyboard activation','Use named DS selection controls in Team','Resolve modal focus in flow adjustment'],'findingIds':['A10','B02','B01','B09'],'preserve':['Media/folder context and all file operations','Staff versus Freelancer selection, rates and assignment/invitation boundaries','Current optional production stages and pinned Media'],'risks':['A layer-only change can obscure global menus','Row key handling can accidentally disable parent keyboard activation'],'verification':['1440 and 1133, expanded and collapsed sidebar','Pointer/Enter/Space, initial focus, Escape decision and return focus','Applicable role variants with existing populated data; no record changes for this audit']},
    {'id':'2','title':'Protect reading and navigation context','priority':'Next','changes':['Give Brief fields readable minimums','Fix Brief step scroll/focus placement','Keep Chat dates clear of text','Preserve Studio settings navigation in notification descendants'],'findingIds':['A12','A13','A07','A05'],'preserve':['Approved Brief table order and choice-grid design','Long-table horizontal overflow where useful','Chat day grouping, timestamps and scroll behaviour'],'risks':['Over-eager scroll resets can lose useful position','Reducing padding alone can make controls cramped'],'verification':['Both desktop widths and existing long/short values','Tab/Shift+Tab, step navigation, menus and selected-value scanning','Several Chat scroll positions and thread layouts']},
    {'id':'3','title':'Make scope, exits and feedback explicit','priority':'After relevant decisions','changes':['Apply chosen Media selection policy','Restore explicit dialog exits','Align Brief helper with existing eligibility','Choose Versions lifecycle and complete Team tab semantics'],'findingIds':['B03','B12','B13','B06','B07'],'dependencies':['DEC01 selection scope','DEC03 Versions lifecycle'],'preserve':['Approval requirements and optional confirmation model','Back versus Cancel versus Send/Save/Approve distinctions'],'verification':['Before/result states, cancelled confirmation counts','Dirty local draft and Cancel/reopen preservation','Accessible names, keyboard action parity and focus return']},
    {'id':'4','title':'Refine emphasis, density and component craft','priority':'UI refinement after blockers','changes':['Review unread badge contrast, text size and motion','Separate compact folders from preview cards','Use approved enclosing surfaces in Brand Kits','Clarify empty Staff suggestions and capacity overload in details'],'findingIds':['A03','A08','A06','B10','B11'],'dependencies':['Tom reviews optional design-assessment refinements and selector/asset-priority decisions'],'preserve':['Client artwork, actual colour swatches and thumbnail previews','Distinct roles and task-specific controls','Useful metadata and task hierarchy'],'verification':['Side-by-side current/reference comparison at matched scale','Reduced-motion and sampled contrast checks','Existing empty, populated and restricted views at both desktop widths']},
    {'id':'5','title':'Finish the coverage gaps before desktop sign-off','priority':'Required to complete the audit','changes':['Provide an isolated populated inspection scenario for Shoot planning/schedule, Edit/Animation, Masters, To Do and pending Freelancer offers','Finish unverified keyboard/hover, role and nested branches in the master register'],'preserve':['No current user records should be reset to manufacture audit data','No invitations, messages, approvals or payments are needed to inspect confirmation states'],'risks':['Current Client-New fixture cannot prove populated workflow quality','Demonstration and legacy routes are not proof of live consumer behaviour'],'verification':['Resolve each finite state and source-to-live-entry mapping','Retain current screenshots and traceable evidence IDs','Run no production build, tests or dependency installation for report-only work']},
]

before = read('data/browser-storage-before.json')
restored = read('data/browser-storage-restored.json')
storage_equal = before == restored
preservation = {
    'browserStorageRestoredToBaseline': storage_equal,
    'inspectionEffects': 'Only automatic stage initialisation, recent-page history, a legacy Script draft initialisation and temporary role key changed. These four keys were restored to the captured baseline. No invitation, message, approval, payment or explicit stored-record form was submitted.',
    'roleAndViewport': 'Returned to the original Client view, reset the temporary viewport, then left the prototype for this separate audit preview. Existing user browser tabs were not used.',
    'application': 'Protected-file hashes and final Git status are checked separately in data/preservation-verification.json.',
    'verification': 'Report text, JSON, screenshot/source paths and local browser rendering checked. No tests, dependency installation, commit, push or production build.',
}
save('data/preservation-summary.json', preservation)

data = {
    'meta': {'id':'desktop-2026-10-20','title':'Brisk desktop: keep the clarity, refine the craft','date':'20 October 2026','status':'Partial audit - for Tom\'s review','repositoryPath':str(REPO)+'/', 'branch':'codex/unified-brisk-prototype','commit':'3188bc4ca88d6ed2689c9b5bf8c47a7bfdd56e63','counts':{'routes':61,'findings':len(findings),'highPriority':sum(f['severity'] in ['S1','S2'] for f in findings),'coverage':len(coverage),'captures':len(captures),'inspected':sum(c['status']=='Inspected' for c in coverage)},'completionNote':'This is not a desktop sign-off. Required populated workflows and individual role/interaction branches remain unverified. All recommendations are unfixed and need Tom\'s review.'},
    'executive': {'summary':'Brisk has a strong desktop direction: a calm persistent frame, a legible production journey, focused editing dialogs and task-specific collaboration controls. The next step is refinement rather than a broad redesign. Protect readable content and dependable controls first, then reduce competing emphasis and make dense workspaces feel more deliberate. The pack records 18 consolidated findings, eight strengths and five optional refinements. Prototype identity switching is excluded.','highlights':[{'findingId':'A10','title':'Media loses its visible exit at narrow desktop','summary':'The global header covers the filename and Close; a pointer attempt opens Ask Brisk. Repair the panel/header boundary.'},{'findingId':'A12','title':'Brief hides short specification values','summary':'At 1133px, closed fields truncate even 3 mins and Landscape. Keep the approved table hierarchy and protect readable minimums.'},{'findingId':'B01','title':'Keep separate team actions, improve the selection controls','summary':'Selection, hours, assigning and inviting remain distinct. Use named DS checkboxes and complete keyboard semantics.'},{'findingId':'A13','title':'Polish navigation and feedback around the existing structure','summary':'Keep the calm frame and focused dialogs; fix step positioning, contextual navigation and contradictory helpers.'}],'note':'Observed defects, approved-standard violations, heuristic judgements and optional hypotheses are labelled separately. No research results or formal accessibility-compliance claims are implied.'},
    'scope': {'baseline':{'repository':str(REPO),'branch':'codex/unified-brisk-prototype','head':'3188bc4ca88d6ed2689c9b5bf8c47a7bfdd56e63','roles':'Studio Staff, Studio Freelancer, Customer. Normal interface language: Filmmaker / Client.','scenario':'Existing Client-New state. No scenario reset or new records manufactured.','viewports':'1440 x 1000 and 1133 x 1000 for most current route defaults. Individual evidence captions retain actual dimensions; one earlier asset capture was 1280 x 720.','reviewers':'One lead and three bounded reviewers, common authority/evidence brief, central browser ownership. Reviewer outputs reconciled into this report.'},
        'authority':['Latest explicit scoped decisions, including UI-first focus and desktop-first sequence','Approved Brisk DS components, variants and tokens','Docs/desktop-design-baseline.md and consistent project guidance','Current verified consumers, where consistent with approval','Inspected Mobbin references and general heuristics as supporting evidence'],
        'limitations':['Audit remains partial: default pages do not establish all nested, role, hover, focus, read-only or validation branches.','No record-changing action was completed merely to inspect a state. Empty/unavailable fixture branches are explicit, including Shoot planning/schedule, Edit/Animation, Masters, To Do and pending offers.','Native Add link prompt and actual file selection/import/export results were not verified. Shared components do not prove every consumer.','Keyboard checks cover the stated interactions only. No screen-reader session or complete contrast/conformance audit was performed.','Some early captures contain loading/transition artefacts; these are excluded from visual claims or explicitly qualified.'],
        'unfinishedScope':['Populated Shoot Pre-production, On Set and schedule/grouping need existing inspectable records; the current scenario exposes setup.','Edit/Animation player/version/comment/approval and Masters delivery/download/request branches are empty or unavailable in the canonical current scenario.','To Do populated time blocks and Freelancer pending offer/accepted job/invoice branches are unavailable without changing the fixture.','Remaining finite hover/focus/dismissal/role/width and nested branches are listed individually in the master coverage register. An available but uninspected branch is not relabelled as blocked.'],
        'exclusions':['Mobile design and routine mobile verification deferred by explicit approval.','Prototype identity changes, fixture/auth plumbing and source-only permission architecture are excluded from the UI findings.','Unused/legacy implementations and prototype-only demonstration routes are separately classified. Their screenshots do not certify live application consumers.','No Quote, Proposal or Concept expansion. No backend, real integration or deployment recommendations.'],
        'preservation':preservation},
    'findings':findings,'coverage':coverage,'catalogue':catalogue,'comparisons':comparisons,'pages':pages,'decisions':decisions,'batches':batches,'captures':captures,'designAssessment':assessment,
    'externalReferences':[{'title':'Toggl Track member form','url':'https://mobbin.com/screens/605de95e-0dfd-45c6-8fbf-7ac55f3190b3','path':'references/mobbin-toggl-members.webp','relevance':'People/role/hours separation and explicit add boundary. Supporting reference only.'},{'title':'Asana project members','url':'https://mobbin.com/screens/09f791a4-1954-4035-bbdc-38daff566e6f','path':'references/mobbin-asana-members.webp','relevance':'Existing access remains distinct from inviting. Supporting reference only.'},{'title':'Mixpanel project role modal','url':'https://mobbin.com/screens/da0046ad-155c-4f65-a5c1-dc16e22bc0a3','relevance':'Inspected for role/access field hierarchy; no local reference copy. Does not override Brisk roles.'}],
}
data['comparisons'].append({'id':'COMPARE08','title':'External references support action clarity, not a new visual system','summary':'Inspected [Toggl Track member form](https://mobbin.com/screens/605de95e-0dfd-45c6-8fbf-7ac55f3190b3), [Asana project members](https://mobbin.com/screens/09f791a4-1954-4035-bbdc-38daff566e6f) and [Mixpanel project roles](https://mobbin.com/screens/da0046ad-155c-4f65-a5c1-dc16e22bc0a3). These support explicit add/invite boundaries and legible access scope. Brisk keeps its own DS, professional language, hours/rates and three access roles.','examples':[{'path':'references/mobbin-toggl-members.webp','title':'Mobbin: Toggl Track','route':'Mobbin external reference','role':'External example','width':None,'state':'Inspected member form, supporting evidence only'},{'path':'references/mobbin-asana-members.webp','title':'Mobbin: Asana','route':'Mobbin external reference','role':'External example','width':None,'state':'Inspected project-members access panel, supporting evidence only'}],'recommendation':'Use these only to bolster action-boundary reasoning; do not copy their styling or introduce a new Brisk role.'})

save('data/findings.json', findings)
save('data/report-data.json', data)
(ROOT / 'data/report-data.js').write_text('window.AUDIT_DATA = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n')
with (ROOT / 'data/findings.csv').open('w', newline='') as stream:
    fields = ['id','title','area','family','category','severity','impact','classification','confidence','roles','routes','states','observed','expected','authority','recommendation','rationale','alternatives','tradeoffs','rootCause','occurrences','sources','currentScreenshot','approvedReference','verificationRemaining','reviewStatus']
    writer = csv.DictWriter(stream, fieldnames=fields)
    writer.writeheader()
    for f in findings:
        writer.writerow({k:json.dumps(f.get(k,''),ensure_ascii=False) if isinstance(f.get(k), (list,dict)) else f.get(k,'') for k in fields})
print(f'Assembled {len(findings)} findings, {len(coverage)} coverage entries, {len(catalogue)} pattern families and {len(captures)} captures.')
