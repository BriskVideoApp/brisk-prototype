"""Reconcile Reviewer B's bounded final inspection. Writes audit artefacts only."""
import json
from pathlib import Path
from datetime import datetime, timezone
root=Path(__file__).resolve().parents[1]
now=datetime.now(timezone.utc).isoformat()
def read(p): return json.loads((root/p).read_text())
def write(p,d): (root/p).write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
caps=read('data/b-completion-captures.json'); acts=read('data/b-completion-actions.json')
lookup={c['seriesId']:c['id'] for c in caps}
def ids(a,b=None):
 return [lookup[f'H{i:03}'] for i in range(a,(b or a)+1)]
for rows in [caps,acts]:
 for x in rows:
  if x['seriesId'] in ['H070','H071','H072']:
   x['coverageIds']=[i for i in x['coverageIds'] if i!='N091']
  if x['seriesId']=='H067':
   x['caption' if rows is caps else 'outcome']='Videos Deadline filter shows Overdue, Due soon and On track options at 1440. No deadline filter option selected.'
  if x['seriesId']=='H101':
   x['caption' if rows is caps else 'outcome']='Actual Message thread pane, with existing parent message and two replies, Reply in thread region containing an empty composer and disabled Send. Studio Staff, 1440 × 1000. No reply entered or sent.'
write('data/b-completion-captures.json',caps);write('data/b-completion-actions.json',acts)
cleanup={
 'completedAt':'2026-10-20T21:37:03.222Z','profile':'Tom Producer','browserId':'1',
 'ownedTabId':'1716948424','origin':'http://127.0.0.1:8768','ownedTabsAfter':[],
 'viewportOverride':'Documented viewport.reset() completed; read-only DOM confirmed normal 1512 × 767 viewport before closing.',
 'tabClosure':'Explicitly closed only bound B audit tab1716948424; owned-tab inventory then empty.',
 'restoredState':'Studio Staff; Videos All15; filters and search clear; expanded navigation; overlays closed; no local draft retained.',
 'evidence':lookup['H105'],'otherWork':'No other profile, user tab, reviewer tab or window selected, reset or closed.'}
closures=[
 {'id':'N090','scope':'Current Studio Staff Videos controls and row tag consumer','status':'Inspected for finite Staff UI',
  'states':['Teammate options','Tags options and transient selected filter restored','Deadline options','Status filter options','Columns locked/current visibility and immediate-change helper','Actual project-row Add tag menu','Create tag blank/draft/Cancel/reopen blank'],
  'evidence':ids(64,72)+ids(97),
  'limits':'No saved project status, tag, deadline or column change. Client read-only route is covered by lead/C, not these captures. Row tag evidence belongs to N090, not drawer N091. No exhaustive label or data-count combinations.'},
 {'id':'N091','scope':'Project drawer Copy link scope panel','status':'Inspected finite branch',
  'states':['Whole project scope','View only current access; Can comment/Can edit choices visible','Current teammates','Visible Close returns to drawer'],
  'evidence':ids(73)+ids(98),'limits':'No Copy project link or access radio selected. This closes the Copy link branch only; earlier E/H captures remain necessary for other drawer panels.'},
 {'id':'N089','scope':'Ask Brisk Files source picker','status':'Inspected finite branch',
  'states':['Add source > Add photos, video or files','Suggested existing source rows','Search no-results','1440 and1133 fit','Close picker then drawer'],
  'evidence':ids(74,75)+ids(99),
  'limits':'No upload, source selection, prompt or response generated. Prior E/H evidence covers Mention, history and source chip. Existing selected source state is shown, not changed.'},
 {'id':'N095','scope':'People entry defaults, sort and Archived finite views','status':'Inspected finite branches',
  'states':['All32 Invite person defaults Staff','Staff10 Invite Studio Staff defaults Staff','Freelancers7 Invite Studio Freelancer defaults Freelancer','Client contacts15 Invite Client defaults Customer','Sort options with Latest activity current','Archived2 existing records'],
  'evidence':ids(76)+ids(78,79)+ids(86)+ids(95,96),
  'limits':'Root owns profile Commercial/rate-history and Client Access closures. Workload prior E031. Non-Staff settled restriction H052/H054 and root/C evidence. No sort choice, profile edit or invitation sent.'},
 {'id':'N097','scope':'Staff-inviter three role-specific invitation drafts','status':'Inspected',
  'states':['Step1 defaults from each People view','Staff access automatic Studio scope and optional Job title','Freelancer zero Client/project disabled','Freelancer All Clients then one Client','Freelancer all/mixed/none projects and Send guard','Customer company required','Existing Client company searchable picker and no-results','Customer projects explicitly optional: zero/all/mixed/none','Back then Cancel; reopen original blank company/projects'],
  'evidence':ids(76,94),
  'widths':'Staff/Freelancer initial1440; Freelancer and Customer access1133. Finite current layouts, not every role/state at both widths.',
  'source':'src/components/people/PeoplePage.tsx:62; src/components/invitations/InvitePersonModal.tsx:84,259',
  'limits':'All Send invite actions intentionally uninvoked. Reserved audit-review@example.invalid typed only into local disposable front-end draft. No real invitation or stored record created. This is Staff acting as inviter, not an assertion that non-Staff can invite.',
  'notApplicable':'N097-S03 inline Client creation does not exist in this consumer: Customer BriskSelect maps existing activeClients only. Do not count unrelated Add Client or Start project forms as this picker.'},
 {'id':'N139','scope':'Actual existing Chat message thread pane, distinct from Threads overview','status':'Inspected finite branch',
  'states':['Existing parent with two replies','Empty Reply in thread composer, Send disabled','1440 and1133 fit','Close thread retains Global Chat/project','Escape closes thread and whole Global Chat'],
  'evidence':ids(101,104),
  'source':'src/components/chat/ChatPage.tsx:688,1590; src/components/navigation/AppShell.tsx:54',
  'limits':'No message or reply sent. No dirty-draft loss tested. H103 Close and H104 Escape give directly observed differing task boundaries; this extends B20, not a new finding. Direct /chat layout still uses its own E/D evidence.'}
]
final={
 'reviewer':'B','updatedAt':now,'scope':'Lead-requested final reachable desktop branches. Audit-only artefacts; no master/report or app edits.',
 'browser':{'profile':'Tom Producer','browserId':'1','tabId':'1716948424','origin':'http://127.0.0.1:8768','isolation':'Reused verified disposable B origin; no storage reset/injection or scenario progression. UI draft actions only.'},
 'captureRange':'H064-H105','captureRegistry':'data/b-completion-captures.json','actionRegistry':'data/b-completion-actions.json',
 'closures':closures,
 'remainingAssignedUiGaps':[],
 'separateLeadWork':'People Freelancer Commercial/rate history and Client Access profile tabs assigned to lead. Whole-app role/route roll-ups remain C/lead responsibility.',
 'processBoundariesExcluded':['Send invite','Create tag','Copy project link','Access-radio changes','Column visibility/reset changes','Message or reply Send','AI Upload/source selection/prompt Send'],
 'relatedFindings':[{'id':'B20','change':'Add actual thread Escape occurrence H102/H104 and working Close H103. Same event-boundary root cause, no new finding.'},{'id':'A07','change':'H102 also shows known date-pill overlap. Related evidence only, no new duplicate.'}],
 'positiveCraft':[{'evidence':ids(83,85)+ids(90,94),'observation':'Invitation guard preserves a useful role difference: Freelancer needs selected project access; Client can join a company with no projects yet. Local drafts are discarded on Cancel.'},{'evidence':ids(69)+ids(97),'observation':'Columns explains immediate persistence and distinguishes locked Project/Actions fields from optional columns. Done is a clear close action for these immediate preferences.'},{'evidence':ids(73)+ids(98),'observation':'Project link panel names Whole project and current View only scope adjacent to the final Copy action. The reference remains readable at both desktop widths.'},{'evidence':ids(101,103),'observation':'Thread has contextual parent/replies and an empty composer with disabled Send. Visible Close preserves the surrounding project conversation.'}],
 'cleanup':cleanup,
 'completionQualification':'Assigned finite precommit UI states inspected; no claim of every data/role/viewport permutation, production accessibility compliance, decoded media playback or committed-action outcome.'}
write('reviewers/b-final-closure.json',final)
add=read('reviewers/b-closure-addendum.json');add['remainingBranchPass']='reviewers/b-final-closure.json';add['latestCleanup']=cleanup;add['cleanup']['historical']=True
write('reviewers/b-closure-addendum.json',add)
for filename,key in [('reviewers/b-completion-findings.json','findings'),('reviewers/b-completion.json','newFindings')]:
 d=read(filename);f=next(x for x in d[key] if x['id']=='B20')
 f['title']='Nested Escape dismisses the surrounding task as well as its inner layer'
 f['family']='Nested overlays and keyboard dismissal'
 f['impact']='Dismissing time suggestions leaves the schedule editor; dismissing message search or a message thread leaves the whole Global Chat drawer. This removes the surrounding task unexpectedly. No dirty-draft loss was tested.'
 s='Global Chat > existing message thread > Escape'
 if s not in f['states']:f['states'].append(s)
 f['observed']='F023/F056: one Escape closed Start time suggestions and its parent schedule EditingDialog, returning focus to the scheduled entry. No draft values were edited. H014/H015: one Escape from nested message search closed both search and Global Chat, leaving focus on body. H102/H104: Escape from the actual existing Message thread pane also closed thread and Global Chat; visible Close thread in H103 retained the project conversation. H050/H051 provide a working comparison: nested External Chat settings Escape closed settings only and restored its opener inside Global Chat.'
 f['expected']='The active inner layer handles Escape first, preserving its surrounding editing task or conversation. Once that layer is closed, a later Escape may dismiss the parent.'
 f['recommendation']='Consume Escape in the active inner layer before parent handlers run. For TimeSelect, close/reset suggestions and retain Start time focus; for Chat search or thread, close that inner layer and restore the relevant opener while keeping Global Chat open. A later Escape can use the existing parent exit path.'
 f['tradeoffs']='Handle Escape exclusively only when an inner layer is actually open. Preserve typed-time reset/commit rules, parent Cancel, visible thread Close, focus return and other keyboard callbacks.'
 occurrence='Global Chat actual Message thread pane, directly verified H102/H104; visible Close preserves parent in H103'
 if occurrence not in f['occurrences']:f['occurrences'].insert(2,occurrence)
 for e in ids(102,104):
  if e not in f['evidence']:f['evidence'].append(e)
 step='In Global Chat open the existing Launch Film conversation and its 2 replies. Press Escape once from Close thread: both thread and drawer close. Compare the visible Close thread control, which closes only the thread. Leave the reply composer empty.'
 if step not in f['reproSteps']:f['reproSteps'].append(step)
 f['rootCause']='TimeSelect and embedded Chat child dismissal handlers do not exclusively consume Escape; the same event reaches the outer dialog or Global Chat window listener. Search and thread are related consumers of the same Chat boundary, requiring one scoped event policy.'
 f['verificationRemaining']='Dirty-draft loss was not tested. Staff direct evidence; other roles and TimeSelect consumers need focused checks after an approved change. Test child-first Escape, later parent Escape and opener focus. Visible Close controls exist; no complete keyboard trap or inaccessible-conversation claim.'
 if filename.endswith('b-completion.json'):
  d['finalClosure']='reviewers/b-final-closure.json'
  d['verifiedStrengths'].extend([{'workflowIds':[x['id']], 'evidence':x['evidence'],'observation':x.get('scope','')} for x in []])
 write(filename,d)
# B-owned completion coverage: retain partial statuses where this pass still depends on lead/C.
d=read('reviewers/b-completion-coverage.json');d['version']=2;d['date']=now;d['captureCount']=len(caps);d['finalClosure']='reviewers/b-final-closure.json';d['restoration']=cleanup
for g in d['groups']:
 gid=g['id']
 if gid=='N089':
  g['status']='Inspected';g['viewports']=[1440,1133];g['inspectedFiniteStates']+=['Files source picker populated','Files source no-results','Files source picker1133'];g['evidence']+=ids(74,75)+ids(99);g['remainingUiStates']=[]
  g['scope']='Finite current Staff input/history/source UI. Prior E142/E143 cover Mention. Responses and post-send outcomes intentionally excluded, not implied inspected.'
 if gid=='N090':
  g['viewports']=[1440,1133];g['inspectedFiniteStates']+=closures[0]['states'];g['evidence']+=ids(64,72)+ids(97);g['remainingUiStates']=['Client read-only route not tested by B; integrate lead/C evidence.']
 if gid=='N091':
  g['viewports']=[1440,1133];g['inspectedFiniteStates']+=closures[1]['states'];g['evidence']+=ids(73)+ids(98);g['remainingUiStates']=['Latest actions, Notes and hours Edit/details not repeated by B; use their exact prior E/lead evidence.']
 if gid=='N095':
  g['viewports']=[1440,1133];g['inspectedFiniteStates']+=closures[3]['states'];g['evidence']+=closures[3]['evidence'];g['remainingUiStates']=['Workload prior E031, and role restrictions/profile tabs belong to lead/C evidence. No blanket closure of those states from the invitation captures.']
 if gid=='N097':
  g['status']='Inspected';g['viewports']=[1440,1133];g['inspectedFiniteStates']+=closures[4]['states'];g['evidence']+=ids(76,94);g['remainingUiStates']=[];g['sourceExcludedOrMutationOutcomes']=['Send/Resend outcomes excluded. Customer inline Client creation is absent in this consumer, not an uninspected form.'];g['scope']=closures[4]['scope']+'. '+closures[4]['limits']
 if gid in ['N139','N088']:
  g['inspectedFiniteStates']+=['Actual Message thread parent/replies and empty composer','Thread visible Close retains parent','Thread Escape also closes Global Chat'];g['evidence']+=ids(101,104)
  if gid=='N139':g['remainingUiStates']=['Direct /chat page fit, DMs/groups and Calls use exact lead/C E/D captures. Actual thread pane now directly verified in embedded consumer; Threads overview alone was insufficient.']
 g['evidence']=list(dict.fromkeys(g['evidence']))
write('reviewers/b-completion-coverage.json',d)
# Extend the local evidence panel with matching1133 thread state comparison.
p=root/'reviewers/b20-comparison.html';html=p.read_text()
if 'Actual thread before Escape' not in html:
 figures=[]
 for hid,title,caption in [('H102','Actual thread before Escape','Existing parent and two replies. Empty composer; no draft entered or sent. Genuine1133 ×1000 capture.'),('H104','Actual thread after one Escape','Thread and Global Chat both close; focus is body. Compare H103: visible Close thread retains the surrounding project conversation.')]:
  stem=lookup[hid];figures.append(f'<figure><h2>{title}</h2><a href="../evidence/{stem}.jpg" target="_blank"><img src="../evidence/{stem}.jpg" alt="{title}"></a><figcaption>{caption} <a href="../evidence/{stem}.jpg">Open original</a> · <a href="../evidence/{stem}.dom.txt">DOM evidence</a></figcaption></figure>')
 html=html.replace('</main>','<h2>Related actual thread consumer</h2><p>Matching1133 desktop comparison, separate from the1440 search/settings pairs above. This is an additional occurrence of B20.</p><section>'+''.join(figures)+'</section></main>')
 p.write_text(html)
# Verification is artefact-only, appropriate to an audit with no application change.
errors=[]
for label,rows in [('captures',caps),('actions',acts)]:
 if len({x['id'] for x in rows})!=len(rows):errors.append(label+' duplicate ID')
 for x in rows:
  if not x.get('url','').startswith('http://127.0.0.1:8768/'):errors.append(label+' wrong origin '+x['id'])
for x in caps:
 for k in ['screenshot','dom']:
  if not (root/x[k]).is_file():errors.append('missing '+x[k])
findings=read('reviewers/b-completion-findings.json')['findings']
required=set(read('reviewers/b.json')['findings'][0].keys())
for f in findings:
 for k in required-set(f):errors.append(f['id']+' missing field '+k)
 if f['reviewStatus']!='Needs decision':errors.append(f['id']+' changed approval state')
# Resolve all finding evidence against actual files rather than captions alone.
for f in findings:
 for e in f['evidence']:
  if not any((root/'evidence').glob(e+'.*')):errors.append(f['id']+' missing evidence '+e)
validation={'reviewer':'B','updatedAt':now,'findings':len(findings),'captures':len(caps),'groups':len(d['groups']),'errors':errors,'closureAddendum':'reviewers/b-closure-addendum.json','finalClosure':'reviewers/b-final-closure.json','applicationVerification':'Artefact-only checks: tracked code/assets unchanged. No build, tests, dependency installation, application edits, commits or push.'}
write('reviewers/b-completion-validation.json',validation)
print(json.dumps(validation,indent=2))
