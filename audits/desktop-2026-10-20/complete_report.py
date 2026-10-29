"""Reconcile the isolated desktop completion pass into the local review pack.

Run after assemble_report.py. Only audit artefacts are read/written.
"""
from pathlib import Path
import copy
import csv
import json
import re

P = Path(__file__).parent
def read(name):
    return json.loads((P/name).read_text())
def save(name, value):
    (P/name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')

D = read('data/report-data.json')
captures = {x['id']:x for x in D['captures']}
findings = D['findings']
by_id = {x['id']:x for x in findings}
for finding in findings:
    for field in ['verificationRemaining','occurrences','sources','routes']:
        if field in finding and not isinstance(finding[field],list):
            finding[field]=[finding[field]]
decisions = D['decisions']
assessment = D['designAssessment']
def evidence_ref(value):
    if isinstance(value,list):
        return [evidence_ref(x) for x in value]
    if isinstance(value,str):
        stem=Path(value).stem
        if stem in captures:
            return stem
        if '/' not in value and (P/'evidence'/value).exists():
            return {'path':'evidence/'+value,'title':stem}
    return value

# Initial recommendations always remain unapproved and unfixed.
for name in ['reviewers/a-completion-findings.json','reviewers/b-completion-findings.json','reviewers/c-completion-findings.json','reviewers/lead-completion-findings.json']:
    if not (P/name).exists():
        continue
    payload = read(name)
    for f in (payload if isinstance(payload,list) else payload.get('findings',[])):
        f = copy.deepcopy(f)
        if f['id']=='AC04':
            by_id['A10'].setdefault('mergedCandidateIds',[]).append('AC04')
            continue
        if f['id'] == 'B14':
            assessment['refinements'].append({
                'id':'REF06', 'title':'Keep keyboard context when editing time',
                'recommendation':f['recommendation'],
                'rationale':'Useful interaction polish for a non-modal editor. No modal focus-trap requirement is inferred.',
                'screenshots':['F002-todo-entry-editor','F004-todo-populated-1133'],
                'authority':'Heuristic judgement. No approved bespoke non-modal lifecycle found.',
                'decision':'Tom to review; optional refinement, not a separate task-blocker.'})
            continue
        if f['id'] in by_id:
            # Reviewer extension of an existing root cause, not another count.
            by_id[f['id']].setdefault('completionExtensions',[]).append(f)
            continue
        f['reviewStatus']='Needs decision'
        f['implementationState']='Unfixed. Audit and recommendation only.'
        if f.get('supportingComparisonEvidence'):
            f.setdefault('supportingScreenshots',[]).extend(f['supportingComparisonEvidence'])
        if 'currentScreenshot' not in f:
            ev=f.get('evidence',[])
            if isinstance(ev,dict):
                f['currentScreenshot']=ev.get('currentScreenshot')
                f.setdefault('supportingScreenshots',ev.get('additionalScreenshots',[]))
                f.setdefault('approvedReference',ev.get('approvedReferenceStatement'))
            else:
                f['currentScreenshot']=ev[:2]
                f.setdefault('supportingScreenshots',ev[2:])
        findings.append(f)
        by_id[f['id']]=f
    for decision in (payload.get('decisionNotes',[]) if isinstance(payload,dict) else []):
        decisions.append({'id':'DEC08','title':decision['title'],'context':decision['observed'],'recommendation':decision['recommendation'],'authority':decision['sources'],'tradeoffs':'Clarify current V1 versus future commercial scope without silently changing plan prices, entitlements or approved portal appearance.','reviewStatus':'Needs decision'})

provenance_path=P/'reviewers/a-completion-comparisons/provenance.json'
if provenance_path.exists():
    provenance=read('reviewers/a-completion-comparisons/provenance.json')
    for f in findings:
        panel_id='AC04' if f['id']=='A10' else f['id']
        originals=[x for x in provenance if x['panel'].startswith(panel_id+'-')]
        if not originals:
            continue
        original_ids=list(dict.fromkeys(Path(x['source']).stem for x in originals))
        contexts=[captures[i] for i in original_ids if i in captures]
        f.setdefault('annotatedPanels',[]).append({
            'path':'reviewers/a-completion-comparisons/'+originals[0]['panel'],
            'title':f['title']+' - genuine current evidence',
            'role':' / '.join(dict.fromkeys(c['role'] for c in contexts)),
            'route':' / '.join(dict.fromkeys(c['url'] for c in contexts)),
            'state':'Annotated current screenshot crops at original pixel scale. Full originals remain linked separately.',
            'notes':'No proposed UI, generated screenshot or verified fix. Crop bounds, actual sizes and original hashes: reviewers/a-completion-comparisons/provenance.json.',
            'originalCaptureIds':original_ids})

if 'B17' in by_id:
    by_id['B17']['title']='To Do planning and completion rely on drag-and-drop'
    by_id['B17'].setdefault('supportingScreenshots',[]).extend(['F143-todo-planned-sample','F144-todo-done-sample','F145-todo-sample-saved'])
    by_id['B17']['observed'] += ' Lead also created a disposable planned block by dragging a project onto Monday, then dragged it into Done and saved Stage/Hours with the keyboard. The pointer path works; no equivalent day/status creation control was exposed in that editor.'
if 'B18' in by_id:
    by_id['B18']['classification']='Source-supported risk'
    by_id['B18']['severity']='S3'
by_id['B10']['severity']='S4'
by_id['A08']['classification']='Heuristic judgement'
if 'B19' in by_id:
    by_id['B19']['severity']='S3'
    by_id['B19']['title']='Review timeline lacks a keyboard slider contract'
    by_id['B19'].setdefault('supportingScreenshots',[]).extend(['F114-canonical-edit-sample-play','F115-edit-keyboard-seek'])
    by_id['B19']['observed'] += ' A genuine uploaded MP4 reached readyState4. Native Play/Pause and five-second step buttons responded to Enter in the canonical Edit consumer; those alternatives limit the claim to the timeline contract.'
if 'B20' in by_id:
    by_id['B20']['observed'] += ' The actual Message thread pane is a third verified nested occurrence: Enter on Close thread closes only the pane and retains Global Chat (H103); Escape from Close thread closes both pane and Global Chat (H104). No reply draft was entered or lost.'
    by_id['B20']['occurrences'].append('Global Chat > existing project message > actual Message thread pane, H101-H104')
    by_id['B20']['sources'].append('src/components/chat/ChatPage.tsx:688')
    by_id['B20'].setdefault('supportingScreenshots',[]).extend(['H101-chat-actual-thread-pane','H102-chat-actual-thread-pane-1133','H103-chat-thread-close','H104-chat-thread-escape'])
if 'B07' in by_id:
    by_id['B07']['sources']=[s for s in by_id['B07']['sources'] if 'MastersPage' not in s]
    by_id['B07']['occurrences']=[s for s in by_id['B07']['occurrences'] if 'Masters' not in str(s)]
    by_id['B07']['verificationRemaining'].append('The former Masters RequestDialog is source-only with no live opener and is excluded from this finding.')
    by_id['B07']['observed'] += ' In the live invoice file preview, ArrowRight on the first PDF tab leaves it selected/focused; Enter on the second PDF tab switches the preview. Files are reachable with ordinary Tab/Enter, but the declared tab widget has incomplete arrow/panel semantics.'
    by_id['B07']['occurrences'].append('Expenses > invoice review > multiple PDF preview tabs, H058/H059')
    by_id['B07']['sources'].append('src/components/costs/CostsPrimitives.tsx:219')
    by_id['B07'].setdefault('supportingScreenshots',[]).extend(['H058-invoice-pdf-arrow','H059-invoice-multiple-pdf-second'])
if 'B09' in by_id:
    by_id['B09']['rootCause']='The specialised flow panel declares modal semantics without a matching focus/dismissal lifecycle.'
by_id['A12'].setdefault('supportingScreenshots',[]).extend(i for i in captures if i.startswith(('F061-','F078-')))

# Precise new occurrence of the established layering problem.
f=by_id['A10']
f['title']='Inspectors and the Shoot progress panel need a protected desktop layer'
f.setdefault('supportingScreenshots',[]).append('F057-progress-sidebar-collision')
f['observed'] += ' The Shoot progress dialog is a separate verified occurrence: left16px, width440px, z-index100 against the expanded240px sidebar at z-index110. Its first224px sit underneath navigation. This is not a claim that all panels share one implementation.'
f['recommendation'] += ' Apply the same protected-layer principle to Shoot progress, anchored in the content viewport or above the sidebar as appropriate; preserve the progress-to-shot reveal behaviour.'
f.setdefault('routes',[]).append('/projects/loom-launch-film/stages/shoot?section=call-sheet&view=on-set')
f.setdefault('occurrences',[]).append('On Set > Schedule captured count > Shoot day progress, expanded sidebar, F057')
f.setdefault('verificationRemaining',[]).append('Verify both Media and Shoot consumers independently after any layer change; shared intent does not imply a shared CSS fix.')

# New positive evidence is as important as the defects.
strengths = [
 {'id':'STR09','title':'Selection, assignment and invitation remain distinct', 'whyItWorks':'The Team editor preserves a dirty hours draft when removal is cancelled. Invitation requirements prevent blank messages or unusable rates from being sent. These are different decisions and should retain separate action boundaries.', 'screenshots':['H001-team-remove-role-confirm','H004-team-zero-rate','H005-team-invite-empty-message']},
 {'id':'STR10','title':'Readiness checks explain what needs attention', 'whyItWorks':'Schedule readiness lists unscheduled shots, a missing location and a missing break. AI preparation offers a guided route to missing details rather than a vague warning. Preserve this specificity while refining panel fit.', 'screenshots':['F100-ai-schedule-readiness','F101-schedule-ready-warning','F102-schedule-missing-guide']},
 {'id':'STR11','title':'First-run setup stays focused on production', 'whyItWorks':'Three production questions lead directly to the first Client. The confirmation says that no notification is sent and offers Start a video or Do this later. A required name then leads into the actual Brief.', 'screenshots':['F119-onboard-shooting-settled','F120-onboard-video-types-expanded','F124-first-client-added','F125-first-video-name-empty','F127-first-video-brief-handoff']},
 {'id':'STR12','title':'Re-cut drafting protects unfinished thinking', 'whyItWorks':'The unsent draft has Undo/Redo and a discard confirmation. Cancelling that confirmation preserves the mark, and Undo gives a safe way back. Keep this recovery when improving keyboard access to the first instruction.', 'screenshots':['F112-recut-unsent-draft-guard','F113-recut-undo-recovery']},
 {'id':'STR13','title':'Client grouping retains useful project progress', 'whyItWorks':'Series only, Standalone only and explicit status filters change the scope without flattening the production journey. Keyboard series expansion works, and project activity stays in a contextual secondary panel.', 'screenshots':['F134-portal-series-only-1133','F135-portal-series-expanded','F136-portal-project-menu','F138-portal-project-chat-loaded']},
 {'id':'STR14','title':'Commercial detail stays in context', 'whyItWorks':'Freelancer offers distinguish viewing the Brief, accepting and declining. Invoice mismatch feedback names the amount difference, and zero hours keeps time submission disabled. The wide jobs table retains its video identity while commercial columns remain reachable by horizontal scrolling.', 'screenshots':['F074-freelancer-commercial-pan','F075-freelancer-time-invalid','F076-freelancer-invoice-draft','F077-freelancer-open-offer']},
]
for s in strengths:
    s['screenshots']=[i for i in s['screenshots'] if i in captures]
    s['recommendation']='Preserve the behaviour and information hierarchy. Refine only the specific problems evidenced elsewhere.'
    assessment['strengths'].append(s)
assessment['summary']='Brisk is strongest when a calm shared frame supports a specialised production task. Keep the circular project journey, pinned Media, focused editing dialogs, explicit review scope and distinct assignment/invitation actions. The most valuable next step is better fit, clearer hierarchy and more consistent interaction boundaries within this established design.'
for item in read('reviewers/a-completion.json').get('optionalRefinements',[]):
    item=copy.deepcopy(item)
    item['screenshots']=evidence_ref(item.get('screenshots',item.get('evidence',[])))
    item['classification']='Optional heuristic refinement, not a confirmed task failure'
    if item['id']=='AC-RF01':
        item['screenshots']=['F158-todo-horizontal-pan','F159-todo-horizontal-pan-1133']
        item['whyConsider']='At1440, the week grid pans40px within its880px host and Friday is reachable. At1133, a720px week host contains920px of days while the outer content also overflows893px to1040px. These two boundaries make panning less deliberate. No inaccessible-day claim is made.'
        item['decisionNeeded']='Tom to review a single clearly owned horizontal scroll boundary, retaining readable day widths and project identity.'
    assessment['refinements'].append(item)

decisions.append({'id':'DEC07','title':'Keep a discoverable route to prior Masters versions', 'context':'Uploading a second file produces V2 in the current Masters register. A VersionsPanel exists in source, but no live control calls its versions branch. This is a current UI scope question, not proof of data loss.', 'recommendation':'Confirm whether prior-version browsing belongs in the current Masters scope. If yes, expose it quietly beside the current version and preserve Current versus Previous and download scope.', 'tradeoffs':'A small version affordance supports delivery traceability; adding a persistent version column would increase table density.', 'authority':'Current source and F111. No approved screenshot exists for this exact interaction.', 'reviewStatus':'Needs decision'})

D['comparisons'].extend([
 {'id':'COMPARE09','title':'Dense editors should protect text and actions before reducing type', 'summary':'The To Do footer, Shoot interview question text and short schedule blocks expose different fit problems. Give content the space its task needs: keep actions reachable, let complete questions be read, and avoid giving short timed entries a taller visual block than the time scale can hold. Do not solve these by shrinking all text.', 'examples':[i for i in ['F087-todo-editor-footer-1440','F092-todo-editor-1133','F055-question-focus-readability','F056-schedule-picker-escape'] if i in captures]},
 {'id':'COMPARE10','title':'Cancellation is strongest when it keeps the current layer and draft', 'summary':'Team removal and re-cut drafting preserve local work when cancelled. Global Chat search and Shoot time suggestions dismiss their parent on Escape. Keep the working examples as current comparisons, not invented approval for every custom panel.', 'examples':[i for i in ['H001-team-remove-role-confirm','H014-chat-search-no-results','H015-chat-search-escape','F112-recut-unsent-draft-guard'] if i in captures], 'findingIds':['B20']},
])

coverage=read('data/coverage-register.json')
D['coverage']=coverage
coverage_by_id={x['id']:x for x in coverage}
# Supersede checkpoint language without changing the underlying approval boundaries.
catalogue_updates=read('reviewers/lead-catalogue-completion.json')
for item in D['catalogue']:
    item.update(catalogue_updates.get(item['id'],{}))
    conflicts=item.get('conflicts','')
    conflicts=re.sub(r'\s*Current canonical capture requested\.', '', conflicts)
    conflicts=conflicts.replace('; current canonical capture requested.', '.')
    conflicts=conflicts.replace('Current canonical capture requested; see A02/B accessible-name finding.', 'See B01 for the observed accessible-name issue.')
    conflicts=conflicts.replace(' Current capture needed for live comparison.', '')
    conflicts=conflicts.replace('Team hours and currency fields remain unresolved audit scope, not automatically certified by EditingDialog.', 'Team hours and currency are specialised fields. Confirm their permitted DS variant before a future migration; EditingDialog approval does not certify the contents.')
    item['conflicts']=conflicts
for page in D['pages']:
    route_id=page['title'].split(' · ')[0]
    record=coverage_by_id[route_id]
    page['status']=record['status']
    page['gaps']=[record.get('remainingGap','')]
    page['screenshots']=record.get('screenshots',page.get('screenshots',[]))
    source_route=page['route'].split('?')[0]
    route_pattern='^'+re.sub(r'\\\[[^\]]+\\\]',r'[^/]+',re.escape(source_route))+'$'
    for f in findings:
        if any(re.match(route_pattern,r.split('?')[0]) for r in f.get('routes',[])) and f['id'] not in page['findingIds']:
            page['findingIds'].append(f['id'])
    new_compositions={
        'R001':'Current populated Staff Videos and Freelancer My jobs were inspected alongside empty/restricted entries. Keep visible project identity, scoped offers and reachable commercial columns; refine the existing identity cell before widening the whole table.',
        'R018':'The populated weekly board, current/other person selector, week navigation, local planning/completion and time editor were inspected. Preserve readable day widths and quick planning; improve the editor bounds and the narrow desktop scroll boundary.',
        'R019':'Staff, Freelancer and Client contact detail variants were inspected. Commercial rate/history cards, project access, current work, hours, skills and invitation/activity views retain useful task-specific separation.',
        'R027':'Canonical empty/readiness/upload and actual sample playback were inspected, with versions, comments and review tools. Preserve precise frame/overall scope and independent controls; complete the timeline keyboard contract without removing the working step buttons.',
        'R028':'Empty and populated Masters, assets, captions, comments, scoped downloads and unsent re-cut draft recovery were inspected. Preserve the register and cancellation safeguards. Prior-version entry is an explicit scope decision; a source-only VersionsPanel is not counted as a live workflow.',
        'R030':'Current six-question setup, Plan the shoot and Simple shoot, planning editors, schedule/grouping, readiness and On Set were inspected. The variants serve different production needs. Improve readable questions, short-event layout, panel layers and gesture boundaries within that structure.',
        'R059':'Current V1 onboarding was followed through three production questions, expanded/custom video types, first Client, naming and the Brief handoff. Its direct sequence and explicit no-notification promise are design strengths; superseded branding/review screens are excluded.',
        'R060':'Populated To Do was inspected at both desktop widths, including actual disposable pointer planning/completion, keyboard Stage/Hours save and horizontal pan. No claim that hidden Friday content is inaccessible is made.',
        'R061':'Settled populated Client and Staff-preview portals were inspected. Grouping, status empty/recovery, series expansion and project activity retain the production progress display. Keep those distinctions rather than flattening the page into generic cards.',
    }
    if route_id in new_compositions:page['summary']=[new_compositions[route_id]]
    if route_id=='R002':page['summary']=['Asset ordering adapts to desktop width. Preserve that useful hierarchy while reviewing the enclosing Client-coloured surfaces in A06; actual palette, font and logo content remains legitimate brand preview.']
    if route_id=='R003':page['summary']=['Logos, Colours and Fonts lead at1440; video/editor files and Documents lead at1133. This responsive ordering is not a separate defect. Download formats, font roles and voice/tone retain useful task-specific structure. Review only the enclosing tinted layers in A06 and the separately evidenced actions.']
    if route_id=='R007':page['summary']=['The Staff Client profile groups Overview, Contacts and Brand Kit behind one tab strip. Overview combines editable company details with active-project and latest-activity summaries; Invite teammate, Client portal and Start project remain distinct actions. Contact project-access drafts and Start project/Archive confirmations were inspected and cancelled. The metric layout is an optional hierarchy refinement, not a confirmed defect.']
    if route_id=='R026':page['summary']=[s.replace('Lead confirms no deliberate scrolling; reproduction and scroll measurements pending.', 'A13 records the reproduced retained-scroll issue and measured header obstruction at both desktop widths.') for s in page['summary']]
    page['findingIds']=[i for i in page['findingIds'] if i in by_id]
    if route_id in ['R018','R060']:
        page['findingIds']=list(dict.fromkeys(page['findingIds']+['AC01','B15','B17']))
    if route_id=='R005':page['findingIds']=list(dict.fromkeys(page['findingIds']+['B20']))

pending=[x for x in coverage if x['status'] not in ['Inspected','Not applicable']]
D['meta'].update(date='21 October 2026', status='Desktop audit complete - for Tom\'s review' if not pending else 'Partial desktop audit - remaining checks recorded', completionNote='The finite desktop audit scope is inspected and reconciled. This is not design sign-off or implementation approval. All recommendations remain unfixed and need Tom\'s review.' if not pending else 'Required reachable UI checks remain in the coverage register; completion is not claimed.')
D['meta']['counts'].update(findings=len(findings),highPriority=sum(f['severity'] in ['S1','S2'] for f in findings),captures=len(captures),inspected=sum(x['status']=='Inspected' for x in coverage))
D['executive']['summary']=f'Brisk has a strong desktop direction. Keep its calm navigation frame, legible production journey and task-specific collaboration controls. Refinement should first protect readable content and reachable actions, then reduce competing emphasis and make dense workspaces feel more deliberate. The pack contains {len(findings)} consolidated findings, {len(assessment["strengths"])} strengths and {len(assessment["refinements"])} optional refinements. Prototype identity and data plumbing are excluded.'
D['executive']['highlights']=[
 {'findingId':'A10','title':'Give inspectors and progress panels a protected desktop layer','summary':'Keep filenames, Close and progress choices clear of the fixed header and sidebar. Repair each affected consumer without replacing the useful specialised panel.'},
 {'findingId':'AC01','title':'Keep time-editor actions inside the usable viewport','summary':'The footer starts below a 1000px-high desktop frame. Account for the editor’s actual height and keep its save boundary visible.'},
 {'findingId':'AC06','title':'Restore the visible billing-frequency choice','summary':'Monthly and Annual are clipped into a 2px strip at both desktop widths. The keyboard alternative works; the visual and pointer boundary still needs correction.'},
 {'findingId':'A12','title':'Improve readable values before making the interface denser','summary':'Protect short Brief specifications, complete interview questions and caption text. Preserve the current task hierarchy and readable type.'},
]
D['scope']['baseline'].update(scenario='Existing seeded scenarios and explicitly disposable sample content on isolated loopback origins8766-8769. Workinglocalhost storage captured separately and compared at handoff.',viewports='1440px and1133px desktop references. Every capture retains its actual image dimensions, logical viewport and any screenshot API extent limitation.',reviewers='One lead and three focused reviewers. Shared baseline and evidence brief; independent verified browser storage for the completion pass. Findings reconciled centrally.')
D['scope']['limitations']=[
 'Finite semantic states and materially different role consumers were inspected, not every possible data/role/width permutation. Each route retains links to its separate nested workflows.',
 'External invitation/message delivery, live integrations, payment, destructive confirmation outcomes and generated production file correctness were not executed. Confirmation and read-only UI were inspected where reachable.',
 'Source-only legacy branches, absent controls and prototype demonstration routes are explicitly classified. They are not silently counted as live UI inspection.',
 'Keyboard checks and sampled readability/contrast checks are stated individually. No screen-reader session or formal accessibility-compliance claim is made.',
 'Earlier screenshot-wrapper captures sometimes retain less vertical image extent than the logical viewport. Both are recorded, originals are preserved, and no invisible region is certified by those pixels.',
]
D['scope']['unfinishedScope']=[{'id':x['id'],'surface':x.get('name',x.get('surface')),'gap':x.get('remainingGap')} for x in pending]
D['scope']['preservation']={
 'application':'No application code, assets, dependencies or mock seed files changed. Protected hashes and Git diff are checked in the saved preservation record.',
 'workingData':'Workinglocalhost browser storage is compared against the completion-pass starting snapshot. Disposable origins were used for local samples and scenario progression.',
 'permittedInspection':'Sample approvals, uploads, first-run setup, time planning and a labelled local mock AI clarification occurred only in the authorised disposable demo. No human invitations/messages, external AI request, payments or destructive confirmations were completed.',
 'report':'Only local audit artefacts are written. No dependency install, tests, production build, commit, push or external publication.',
 'reviewPersistence':'Review-status selections and notes remain in browser memory until explicitly exported. Export review JSON to save them; import it to resume.'}
D['batches']=[b for b in D['batches'] if b['id']!='5']
D['batches'][0]['changes'].extend(['Keep To Do editor footer within the desktop viewport','Restore the visible billing-frequency selector'])
D['batches'].append({'id':'5','title':'Refine the newly populated production tools','priority':'After immediate control barriers','changes':['Let interview questions and caption cues be read fully','Give short schedule entries a legible non-overlapping treatment','Add keyboard planning/completion and first re-cut instruction paths','Review no-op asset move feedback and Masters version entry'], 'preserve':['Current production tasks and Studio/Client distinctions','Optional stages, Animation label and pinned Media','Explicit Save, Send and Approve boundaries'], 'verification':['Each affected consumer at1440and1133','Existing long text, short schedule durations and dirty local drafts','Keyboard alternatives and accessible names; no destructive outcomes required']})
D['supportingFiles']=[{'label':'Finding register(JSON)','path':'data/findings.json'},{'label':'Finding register(CSV)','path':'data/findings.csv'},{'label':'Coverage register','path':'data/coverage-register.json'},{'label':'Completion evidence and decisions','path':'PROGRESS.md'},{'label':'Validation record','path':'data/report-final-validation.json'}]

for f in findings:
    f['reviewStatus']='Needs decision'
    f.setdefault('implementationState','Unfixed. No implementation performed.')
    f.setdefault('approvedReference','No approved reference screenshot exists for this exact state; written authority is cited.')
    f['roles']=list(dict.fromkeys(role for text in f.get('roles',[]) for role in ['Studio Staff','Studio Freelancer','Customer'] if str(text).startswith(role)))
    for field in ['currentScreenshot','supportingScreenshots','approvedReferenceScreenshot','currentComparison','focusedCrop']:
        if field in f:
            f[field]=evidence_ref(f[field])
    # Keep screenshot references resolvable after registry normalisation.
    for field in ['currentScreenshot','supportingScreenshots']:
        if field not in f:
            continue
        values=f[field] if isinstance(f[field],list) else [f[field]]
        f[field]=list(dict.fromkeys(x for x in values if isinstance(x,str))) if all(isinstance(x,str) for x in values) else values
findings.sort(key=lambda f:(f['severity'],f['id']))
decisions.sort(key=lambda d:d['id'])
save('data/findings.json',findings)
save('data/report-data.json',D)
(P/'data/report-data.js').write_text('window.AUDIT_DATA = '+json.dumps(D,ensure_ascii=False,indent=2)+';\n')
fields=['id','title','area','family','category','severity','impact','classification','confidence','roles','routes','states','observed','expected','authority','recommendation','rationale','alternatives','tradeoffs','rootCause','occurrences','sources','currentScreenshot','approvedReference','verificationRemaining','reviewStatus']
with (P/'data/findings.csv').open('w',newline='') as stream:
    writer=csv.DictWriter(stream,fieldnames=fields);writer.writeheader()
    for f in findings:
        writer.writerow({k:json.dumps(f.get(k,''),ensure_ascii=False) if isinstance(f.get(k),(list,dict)) else f.get(k,'') for k in fields})
print(json.dumps({'findings':len(findings),'strengths':len(assessment['strengths']),'captures':len(captures),'pendingCoverage':len(pending)}))
