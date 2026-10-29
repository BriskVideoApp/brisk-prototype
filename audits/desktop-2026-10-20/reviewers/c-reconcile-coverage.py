"""Audit-only evidence reconciliation. Writes Reviewer C proposals, never the master."""
import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

B = Path(__file__).resolve().parents[1]
P = B / 'reviewers/completion-coverage-map.json'
D = json.loads(P.read_text())
M = json.loads((B / 'data/coverage-register.json').read_text())
capture_files = ['captures.json', 'completion-captures.json', 'a-completion-captures.json', 'b-completion-captures.json', 'c-completion-captures.json']
C = [dict(c) for f in capture_files for c in json.loads((B / 'data' / f).read_text())]
for capture in C:
    capture['width'] = capture.get('width',capture.get('viewport',{}).get('width',capture.get('context',{}).get('width')))
    capture['height'] = capture.get('height',capture.get('viewport',{}).get('height',capture.get('context',{}).get('height')))
    capture['file'] = capture.get('file',capture.get('screenshot'))
    capture['state'] = capture.get('state',capture.get('caption',capture.get('label')))
CI = {c['id']: c for c in C}

def expand(*terms):
    result = set()
    for term in terms:
        match = re.fullmatch(r'([EFGHJ])(\d{3})-(?:[EFGHJ])?(\d{3})', term)
        if match:
            letter, start, end = match.groups()
            for n in range(int(start), int(end) + 1):
                result.update(c for c in CI if c.startswith(f'{letter}{n:03d}-'))
        elif term in CI:
            result.add(term)
        else:
            result.update(c for c in CI if c.startswith(term + '-'))
    return sorted(result - {'E015-client-direct-deel', 'J087-brief-ai-local-prompt-draft'})

ST = {s['id']: dict(s) for s in D['finiteStateClosureProposals']['states']}

def inspected(n, s, terms, reason, label=None):
    sid = f'N{n:03d}-S{s:02d}'
    row = ST[sid]
    evidence = expand(*terms.split())
    assert evidence, (sid, terms)
    row.update(proposedStatus='Inspected', reason=reason, captureIds=evidence)
    if label:
        row['proposedLabel'] = label

def excluded(n, s, reason, sources):
    ST[f'N{n:03d}-S{s:02d}'].update(proposedStatus='Not applicable', reason=reason, sources=sources, captureIds=[])

# Explicit action outcomes and finite current appearances. Not a promise that all controls pass.
I = [
(84,1,'F142','Fresh isolated history empty state captured.'),
(84,3,'H010 H041','Actual Home/End/ArrowDown navigation observed.'),
(84,4,'H011','Escape closes history and returns opener focus.'),
(85,1,'H012 H052 H054','Current menus in exactly three roles; Customer Client Admin and billing fixture qualified in B addendum.'),
(85,2,'H053 H055 H056','Actual outside dismissal separately recorded for all three current role menus.'),
(85,3,'H012 H052 H054','Initial profile-link focus and Staff Escape return directly recorded; no full screen-reader assertion.'),
(87,1,'H013 E123','Current populated summary and existing empty Unread presentation inspected; no manual mark-read.'),
(88,1,'H014 H015','All-project chooser and unmatched query; nested Escape outcome captured.'),
(88,2,'H030 H050 F138','Current Internal/External content inspected, plus Client external history. Not every membership permutation.'),
(88,3,'H028 H029 H050 H051','Actual nested External Chat settings states and Escape return at both widths.'),
(88,4,'H029 H051','Nested and outer dismissal actions logged; no claim of a full focus-trap audit.'),
(89,1,'H017 H018','History populated/no-results and nested Escape outcome inspected.'),
(89,3,'H074 H075','Actual Add photos/video/files source picker and unmatched query reached, cancelled without upload or source selection. Prior E143 alone did not establish this Files branch.'),
(89,4,'E025','Current prompt chips and disabled empty Send inspected. No response generation required.'),
(90,2,'H033','Combined existing Client/search no-results inspected.'),
(90,1,'H032 H064 H065 H066 H067 H068 H069','Actual Client, Teammate, Tags, Deadline, Status and Columns menus inspected; local filter choice/recovery only, no saved record status. No production-stage filter exists.'),
(90,3,'H034','Clear controls restores the current list.'),
(90,4,'H038','Current Staff saved-status menu opened only; no value committed.'),
(91,1,'E003 H035','Current Overview/Team and expanded role consumer inspected.'),
(91,3,'H038','Current status options opened without persisting a selection.'),
(91,4,'H070 H071 H072','Actual project-row Add tag menu and local Create tag draft Cancel/reset inspected. This belongs to Videos row consumer, not a drawer field.'),
(91,7,'H073','Actual project drawer Copy link panel opened; whole-project scope and view/comment/edit choices inspected without copying or changing access.'),
(91,9,'J090 J091','Actual Customer details consumer has static Status and Copy link-only footer without Mark complete/Archive; Team section expanded without Staff assignment editor. This is visible UI only, not a production access check.'),
(92,8,'H001 H002 H003','Remove role confirmation cancelled; local hours draft preserved, parent Cancel/reopen discarded it.'),
(94,2,'F086','Week navigation returns reference week; no arbitrary time records edited.'),
(94,3,'F145','Authorised isolated sample Stage and Hours saved to Done block. Scope only disposable origin.'),
(94,5,'F143 F144 F145','Actual planned-to-Done progression inspected on labelled disposable sample; daily/week totals update.'),
(95,4,'E031 D-R020-staff-1440','Existing project assignment links in workload and directory composition inspected. No unrelated external navigation.'),
(95,5,'H076 H078 H079 H086','Actual All/Staff/Freelancer/Client directory Invite entry defaults inspected independently. No invitation sent.'),
(95,6,'H052 H054','Freelancer/Customer current navigation omits private People directory. No production auth or every direct URL claim.'),
(96,1,'D-R019-staff-1440 F160 F162 F164 F165 F168','Actual Staff, Freelancer Commercial and Client Access profile consumers inspected, with relevant narrower-desktop variants.'),
(96,2,'H021','Local Name editor Cancel restores original Staff person name.'),
(96,3,'D-R019-staff-1440 H024 F166 F167 F168 F169','Current Work, Hours, Skills and Notes/activity tabs plus actual Assign project chooser; no assignment submitted.'),
(96,4,'F160 F165','Actual Freelancer Commercial default day rate, two offers, contractor details and invoice history cards. No rate editor exists in this read-only consumer; none invented.'),
(96,5,'F161 F162 F163 F164','Actual Freelancer assigned-project access and Client visible shared-project context; Manage access enters existing-person wizard, cancelled without Send or access change.'),
(96,6,'F170 F171','Actual empty invitation-history filter with recovery and populated pending Staff Editor invitation event. No Resend/Cancel invitation.'),
(96,7,'H022 H023','Archive scope and Delete exact-name guard opened/cancelled. Pause access is immediate, not an invented confirmation.'),
(97,1,'H020 E028 E029','Actual invitation form exposes exactly three access-role radio choices. Staff and Client forms captured; no additional job-title role introduced.'),
(97,3,'H087 H088 H089','Actual Client company selector, no-company disabled boundary and company-picker no-results. There is no inline Client creation in this wizard.'),
(97,4,'H077 H080 H081 H082 H083 H084 H085 H090 H091 H092 H093','Staff access, Freelancer all-Client/one-Client and local all/mixed/none projects, Client company-only/all/mixed/none scopes inspected. Required-access differences and disabled Send are real; no invitation sent.'),
(97,5,'H020 F163','Actual initial Cancel and existing-person wizard Back then Cancel outcomes logged; no invitation sent.'),
(98,4,'H025 E038 E039','Start project draft shows selected Client and required empty name; no project created in working origin.'),
(98,5,'H026','Archive confirmation then Keep active; no archive/delete committed.'),
(98,6,'F140 G020','Real Staff portal preview banner plus separately labelled Studio sample portal inspected.'),
(99,1,'E079 F134','All/Series/Standalone grouping choices and actual Series filter at1133.'),
(100,2,'J003 J004','Current Media, Masters and Archived collections inspected with existing records.'),
(100,3,'J005 E009','Actual kind selection and existing current filter presentation; no unsupported people/transcript filter promised.'),
(100,6,'E047 E016 E017','Client/project scoped download action and selected-file scope visible; no actual download/content validation.'),
(100,8,'J002','Unmatched media query and Clear controls; no data mutation.'),
(101,1,'J011 J013','Folder rail collapse and full-size expanded nested Day one actions captured; J011 is explicitly truncated historical evidence.'),
(101,2,'J016 J017 J018','Authorised audit-only Add folder immediately creates New folder, inline rename observed; actual Escape does not leave editor, Enter commits.'),
(101,3,'J014 J015','Existing folder Rename untouched input and Escape outcome inspected. No Save/Cancel affordance invented.'),
(101,6,'J022','Current Client Media controls have management operations absent. This is visible capability UI only, not production authorisation.'),
(102,1,'J006 J007 J021','Details and Comments consumers, existing and empty comments, no send.'),
(102,2,'J006 J084 J085','Actual Media video unavailable, image and document preview consumers separately captured.'),
(102,4,'J006','Unavailable original and disabled action explicitly observed.'),
(102,5,'J001 J009 J010 J067','Existing Failed, Preparing and transcript-processing states observed; no retry manufactured.'),
(102,6,'J021 J022','Staff and Client current comment presentation inspected; Filmmaker/Client labels are observed, no unproven privacy promise inferred.'),
(103,1,'E133','Upload file source command observed. Native upload outcome excluded for this Media consumer; sample Edit/Masters file chooser evidence is separate.'),
(103,5,'J019 J020','Actual disabled-import cloud picker cancelled; no file selected or imported.'),
(104,3,'E115 BRIEF-video-type-1440 BRIEF-audience-1440 BRIEF-deadline-1440','Specialised current question controls and actual Duration menu inspected. Not every choice permutation.'),
(104,4,'J086','Actual Brand kit picker opened with preview/option labels and escaped without selection.'),
(104,5,'J088 J089','Authorised labelled local AI simulation creates no human/external message; real Client-message Edit/Delete menu opened then Escape. Neither command invoked.'),
(104,6,'BRIEF-summary-1440 E053 E054','Current missing-summary disabled approval and reason/copy observed. Approved state is separately evidenced; no approval submission in working origin.'),
(105,1,'E053 E054','Current stage scope and whole-project choice inspected. No copied link/access change.'),
(106,3,'E051 E052 F058 J060 J061 F050 F046','Consumer-specific Brief/Shoot/Storyboard forms and review/delivery contexts inspected; exact wording only in captured consumers, no sending.'),
(107,1,'J031 BRIEF-summary-1440','Actual empty Script and incomplete Brief disabled approval reasons inspected.'),
(107,2,'F032 F041 J043 J076','Approval result or existing approved snapshot observed; immediate actions are not falsely described as pre-confirmations.'),
(107,3,'J077 J078 E067','Actual approved-edit consequences in Script and Storyboard inspected and cancelled. Explicit unapprove action outcome excluded.'),
(108,3,'J032 J033 J034','Rename local draft/Escape, sample-only Duplicate and current version menu commands. No unrelated version permutations required.'),
(108,5,'J035 J036','Actual Restore as new version and Delete confirmation inspected then Cancel; no restore/delete.'),
(109,1,'E065 J037','Actual current AV row/context and selected editable row state inspected; no claim of full drag keyboard support.'),
(109,2,'E065','Actual row menu Insert/Duplicate/Delete affordances opened. Mutation outcomes excluded, no invented pre-confirmation.'),
(109,4,'J038 E068','Actual four Add/Replace source commands separately visible.'),
(109,5,'J039','Actual Script Add link immediately adds a mock Link1 placeholder in disposable sample; no URL editor exists in this consumer. Observed outcome inspected, not a successful URL entry claim.'),
(109,6,'E063','Actual Script comments empty rail inspected; reactions depend on existing comments and no sample human comment is sent.'),
(110,1,'J025 J068','Actual clip collection and navigation inspected; current TranscriptsPanel has no Search field.'),
(110,3,'J028 E076','Actual Highlights only empty/recovery inspected; this is highlight filtering, not an invented text-search feature.'),
(110,5,'J029 J030 J074','Clip-scoped export and actual Back to Transcripts destination at1440/1133.'),
(110,7,'J067 J075','Actual asset transcript-processing state and existing Figma zero-clips collection inspected.'),
(111,2,'J049 J082 J083','Actual four-source menu and real native Add link prompt reached, captured and Cancelled with no URL. Original active user tab restored.'),
(111,3,'J048','Actual Frame1 Duplicate/Delete commands opened; no Delete invoked because no independent guard exists for editable frames.'),
(111,4,'J052 J053 J079 J080 J081','Actual AV comment rail/filter and populated frame review canvas at both desktop widths, then Back return.'),
(111,6,'J047','Current Storyboard consumer uses version panel; source-specific Rename uses native prompt and is not redundantly invoked. Shared Script history commands verified separately.'),
(111,7,'J076 J077 J078','Existing approved Notion seed opens consequence guard for Add frame; Cancel preserves approval12frames8illustrated.'),
(112,1,'F093-F098','All six current Setup questions, source options and choices inspected. Older two/five-question descriptions not treated as current.'),
(112,7,'D-R030-staff-1440 F006 F147','Current initial/full populated and actual simple consolidated Shoot consumers inspected at relevant desktop widths.'),
(113,1,'F008','Actual Shot type taxonomy menu and keyboard Escape inspected. Other taxonomy values in editor remain static appearance only.'),
(113,3,'F012 F013 F014','Current empty reference/source picker and authorised sample attachment inspect actual populated consumer.'),
(113,4,'F107','Existing-person chooser no-results/Create path and Escape inspected; no person created merely to inspect.'),
(113,6,'F019 F020','Supporting Documents and local Add link validation inspected; native upload outcome excluded.'),
(113,7,'F108 F154 F155 F156 F157','Distinct Delete day/schedule item/person/location/shot guard consumers actually reached and cancelled; none confirmed.'),
(114,3,'F104 F105','Real backlog standalone shot selection and current target-group menu.'),
(114,4,'F105','Actual Add to group destination menu, no group assignment committed.'),
(114,5,'F106','Actual new-group name draft empty boundary disables Create; no group saved.'),
(114,6,'F100','Actual AI schedule check for disposable Day3, not an invented failure.'),
(114,7,'F101 F102 F103','Actual readiness warning and two guided missing-details steps.'),
(114,8,'F151 F152 F153','Actual pointer move/resize and Cancel outcome logged on isolated sample. Observed extra Add dialog is a finding, not a passing check.'),
(115,1,'F148 F149','Actual On Set completion advances Now/Next in existing simple Shoot sample; undo restores Crew call.'),
(115,2,'F109 F149','Actual day selection updates On Set context; full/simple consumers observed.'),
(115,3,'F150','Actual sample shot-capture checkbox updates progress.'),
(115,4,'F148 F149','Actual sample completion and recovery inspected; no production claim.'),
(115,5,'D-R057-staff-1440 D-R057-staff-1133 F110','Current shared Call Sheet page at both widths plus native Call Sheet action menu. Browser print/save outcome excluded.'),
(116,1,'D-R027-staff-1440 F053 F114','Canonical Edit empty plus actual official CC0 sample chooser/upload/playback. Legacy /review remains component evidence separately.'),
(116,4,'F035 F051 F115','Existing review timeline/comment navigation and actual canonical keyboard seek feedback inspected; no comments created to manufacture markers.'),
(116,5,'F039','Actual drawing mode/tool palette with empty disabled Undo/Send; no drawing/comment sent.'),
(116,8,'F041 F050 F051','Actual shared review approval result and Customer feedback controls inspected. No human review request sent.'),
(117,3,'F046 F111','Actual deliverable/file checklist and selection counts inspected; no asset checklist completion committed.'),
(117,5,'F111 F112','Actual uploaded CC0 sample expanded Masters player/mark-up context inspected. Functional canonical player decode/seek separately verified F114/115.'),
(117,11,'F112 F113','Actual source-linked re-cut brief/mark-up one-mark draft, Cancel guard preserves, Undo0 then safe exit. No Send.'),
(117,12,'F112 F113','Actual dirty draft discard confirmation cancelled, preserved state recovered via Undo. No destructive confirmation.'),
(118,1,'G120-G129','Actual empty/manual intake, local mock AI processing/result and reset. Legacy SetupModal has no live opener and is excluded.'),
(118,2,'G002 G003','Motion v3/v2 historical files and restoration inspected.'),
(118,4,'G004','Actual Add colour immediately creates a sample entry/picker in isolated origin; no general Save boundary invented.'),
(118,5,'G005 E088 E089','Current font role matrix inspected without saving changes.'),
(118,6,'G006 E090 E091','Current inline Voice/Tone and explicit editor consumers inspected; local draft/Cancel only.'),
(118,7,'G007 G008','Existing Footage filter and visual-asset preview, no deletion/download.'),
(118,8,'G009','Actual Brand Guidelines PDF preview, no save/print.'),
(118,9,'G001 D-R002-staff-1440','Existing sub-brand route and Create sub-brand entry affordance inspected. Current Create immediately persists; creation outcome excluded, no invented pre-creation form.'),
(118,10,'G010','Actual selected editor-file action scope inspected.'),
(118,11,'G011','Actual selected-file Delete confirmation Cancel.'),
(118,12,'G012 G013 G014','Actual guest read-only page and nested logo actions inspected. Misleading Replace/Delete affordances are an unfixed UX finding, not a stored-data bypass.'),
(119,8,'H061 H062','Settled Freelancer and Customer Expenses entry redirects to their workspace; no contractor review shown. No every-project URL/production-auth claim.'),
(120,1,'G071 G076 G095 G099 G104 G105','Three-role profiles and Freelancer professional/business fields inspected. No own-rate field exists here; rates belong to People/assignment.'),
(120,2,'G073 G077 G096','Three-role current notification groups and mandatory security explanation inspected; no preferences saved.'),
(120,3,'G074 G078 G079 G080 G081 G097 G098','Actual password/Google/Microsoft/magic-link preview branches, not real provider auth.'),
(120,4,'G075','Change password dialog Cancel; no credentials entered.'),
(120,5,'G082 G092','Current Client company/Studio context and Member restriction inspected.'),
(121,1,'G082 G083 G091 G092','Actual Admin and Member Company/Team contexts.'),
(121,3,'G084 G102','Blank colleague invitation and Cancel, no invite sent.'),
(121,4,'G085 G086 G087 G101','Current mixed/all/none local project-access drafts and Cancel, no permission save.'),
(121,5,'G088 G089 G090','Active/pending member command menus and role selector appearance; immediate remove/resend outcomes excluded.'),
(122,6,'G016 G017 G018 G019','Focused editor local draft cancellation inspected. No additional navigation-discard confirmation exists in all four consumers; do not infer production-default guard.'),
(122,7,'G016 G017 G018 G019','Actual Cancel exits each focused editor; no changes saved.'),
(123,4,'G024','Actual Add role local draft causes navigation discard guard; discarded without saving defaults.'),
(123,5,'G024','Actual unsaved guard and discard recovery; save outcome excluded.'),
(124,3,'G026','Actual public example link staged in unsaved reference draft then discarded; native upload and external navigation excluded.'),
(124,5,'G026','Actual draft/discard guard and restored instructions. No save.'),
(125,1,'G027 G066','Actual connection/reconnect current UI and Stripe connect entry Cancel. No external OAuth/connect outcome.'),
(126,2,'G037 G048 G049','Editable linked notification copy and fixed Account/access plus direct Client template distinctions inspected.'),
(126,3,'G039 G040 G050','Actual local message editor/empty-title guard/Cancel, no message sent or copy saved.'),
(126,5,'G036 G040','Actual draft validation/Cancel and original preference restoration inspected. No claim every editor has identical guard.'),
(127,4,'G063 G064 G065 G066','Stripe connected/disconnect confirmation Cancel and unselected/connect entry Cancel; no actual connection.'),
(127,5,'G059-G062 G067-G070','Current explicit trial/overdue/restricted/cancelling and Client billing unavailable previews, labelled demo variants.'),
(128,2,'F117 F119 F120 F121 F122','Actual current V1 three production questions and video-type expansion/custom draft Cancel, 1440/1133.'),
(128,4,'F123 F124','Actual Skip-first-Client guard Back and Client-added do-later/naming context. No older extra setup steps required.'),
(129,3,'E121','Existing Edit location form and Cancel inspected; no saved URL change.'),
(129,5,'J071 J072','Explicitly authorised audit sample URL on Nina-assigned Figma project; actual read-only Notes/no editing commands and visible Mark confirmed, not invoked.'),
(129,6,'J065 J069','Source-supported empty Staff preview and actual existing assigned Figma Freelancer empty state, no working records manufactured.'),
(130,2,'H042 H043','Actual All/Unread and Mentions category inspected with current records.'),
(130,4,'H044 H045','Read-only reminder preview inspected at both widths.'),
(130,6,'H044 H045','Actual keyboard opening/dismissal captured; no unsupported list Arrow convention promised.'),
(131,2,'J054 J055','Actual Storyboard two-page PDF preview current content, both desktop widths.'),
(131,3,'J029 J074','Actual clip-scoped Transcript PDF preview, both desktop widths.'),
(131,4,'J030 J041 J056','Actual clicked Back destinations for Transcripts, Script and Storyboard separately verified.'),
(131,6,'J029 J040 J054 J055 J073 J074','All three real document preview consumers inspected at1440 and1133. No browser print/native PDF output claimed.'),
(133,2,'F125','Actual empty first-video name disables Continue to Brief.'),
(133,3,'F124 F125 F126','Actual naming Cancel returns to Client-added confirmation; source-specific entry context recorded.'),
(133,4,'F125 F126 F127','Actual Staff Client-scoped naming and authorised isolated sample Brief handoff; no invitation.'),
(134,3,'D-R032-staff-1440','Current supplied unavailable/expired fixture composition only; no arbitrary production-token testing.'),
(134,1,'F128 F129 F130 F131 F132 F133','Actual Staff/Freelancer invitation and Client magic-link entry contexts independently inspected at1440 and1133; no Accept/Join/external delivery.'),
(134,2,'F128 F130 F131','Actual invitation named participant/workspace and exact Staff/Freelancer access-role explanation inspected.'),
(134,4,'F132 F133','Actual Client editable Name/Email fields with empty-name disabled continuation and native email mismatch, no submit. Not falsely called enforced read-only.'),
(138,4,'H008 H040','Actual Keep visible/Close exit and focus destination recorded. Initial focus/Escape defects stay unfixed.'),
(138,5,'H009','Actual Edit/Animation term subpanel opened without selection.'),
(138,6,'H007 H008 H039','Actual Hide Script consequence confirmation and Keep visible Cancel preserve stage at both widths.'),
(139,2,'H030 H050 F138','Actual Internal/External channel content and Client external-history consumer.'),
(139,4,'E131-chat-threads','Existing Threads current view inspected. Opening a nested individual message thread remains qualified by current fixture; no fake message.'),
(139,6,'E131-chat-calls E132','Actual Calls current view and existing call notes; call-start outcome excluded.'),
(139,7,'H015 H029 H051 H103 H104','Actual nested search/settings and thread Close/Escape assessed. H104 Escape closes both thread and Global Chat; inspected defect, not a passing dismissal. No full every-control traversal claim.'),
(140,1,'D-R008-staff-1440 E043','Current Client search/status/sort presentation and no-results existing consumers.'),
(140,4,'E043','Actual no-results and Clear search control observed; no Client created.'),
(140,5,'E040 E041 E042','Actual local Add Client drafts cancelled with no submission; duplicate validation on submit remains excluded.'),
]
for n, s, terms, reason in I:
    inspected(n, s, terms, reason)

# Source-proven absent, unsafe-to-manufacture or superseded states are not missing UI checks.
N = [
(87,3,'No per-notification context menu exists in current Updates popover. Actual notification links remain inspected.',['src/components/notifications/NotificationBell.tsx:89','src/components/notifications/NotificationInboxItem.tsx']),
(89,5,'No Minimise control exists in current desktop Ask Brisk header; historical compact-launcher requirement removed.',['reviewers/b-completion-coverage.json']),
(91,6,'No separate progress control exists in the current ProjectDetailPanel. Production stage progress belongs to the Videos row/project stage header and is independently inspected there. Old Team screenshot alone was insufficient for a drawer progress state.',['src/components/active-videos/ActiveVideosPage.tsx:1222','src/components/active-videos/ActiveVideosPage.tsx:1625']),
(91,8,'No next/previous project controls exist in the inspected current drawer. Do not invent navigation.',['reviewers/b-completion-coverage.json']),
(101,4,'Current folder Delete invokes onDelete immediately; there is no confirmation UI to open safely. Delete command is captured, deletion outcome excluded.',['src/components/media/MediaFolderTree.tsx:174','src/components/media/MediaBrowser.tsx:303']),
(105,4,'Current Share access panel Copy button has no disabled condition. A missing-URL disabled state was an invented inventory requirement.',['src/components/share/ShareActionRow.tsx:882']),
(112,2,'Initial Attach opener exists only in unused ShootDashboard. Current live Replace requires existingPlan, whose initial value is null and reads only pre-existing storage. No normal empty-plan entry/seed exists. Legacy conditional Replace UI is excluded rather than injecting a stored record.',['src/components/shoot/ShootStagePage.tsx:414','src/components/shoot/ShootStagePage.tsx:540','src/components/shoot/ShootStagePage.tsx:2641','src/components/shoot/ShootStagePage.tsx:6543','src/components/shoot/ShootStagePage.tsx:6642']),
(117,4,'Masters VersionsPanel type exists but no live caller opens inspector panel=versions; current live actions only captions/thumbnail. Exclude dead history panel, preserve observed V2 identity.',['src/components/masters/MastersPage.tsx:1365','src/components/masters/MastersPage.tsx:1366']),
(123,3,'Production defaults page currently has no required/optional stage controls. Project flow visibility is a different live workflow N138.',['reviewers/a-completion-coverage-closure.json']),
(126,4,'Restore defaults only appears when a stored message override exists; inspected baseline has none. It mutates immediately, so no override is manufactured merely to expose it.',['reviewers/a-completion-coverage-closure.json']),
(128,3,'Approved current V1 onboarding removes generated-branding/review page. Actual three production questions then first Client are inspected; do not restore superseded UI.',['Docs/ux-decision-log.md:53','Docs/ux-decision-log.md:59']),
(128,5,'No global discard/restart confirmation exists in current V1 onboarding; prototype Reset is separate excluded tooling. Actual Skip-first-Client guard is inspected N128-S04.',['Docs/ux-decision-log.md:59','src/components/studio-onboard/StudioOnboardScreen.tsx']),
(130,3,'No item action menu exists in current NotificationInboxItem. Actual links/Retry/Preview controls inspected; Retry outcome excluded.',['reviewers/b-completion-coverage.json']),
(134,3,'Current PrototypeJourneyEntry has no expired/unavailable branch. Initial current Client welcome screen did not establish one; remove this invented requirement.',['src/components/prototype-scenarios/PrototypeJourneyEntry.tsx:12']),
(134,5,'Current Journey invitation/magic-link entry has no Back/Cancel route control; do not invent one. Accept/Join outcomes and external delivery excluded.',['src/components/prototype-scenarios/PrototypeJourneyEntry.tsx:12']),
]
for n, s, reason, source in N:
    excluded(n, s, reason, source)

# The Threads overview does not close the separately reachable reply pane. Actual H101 does.
if expand('H101'):
    inspected(139,4,'H101 H102 H103 H104','Actual existing two-replies pane at1440/1133: parent context, two replies, named empty Reply composer/disabled Send. Close removes thread only; Escape closes thread and Global Chat, an inspected defect. No message sent. Threads overview alone was insufficient.')
else:
    ST['N139-S04'].update(proposedStatus='Partially inspected', reason='Current Threads overview is captured, but actual existing-message ChatThreadPane requires direct evidence. No fake message should be created.')

# Attach source-qualified corrections to labels rather than demand a Cartesian test matrix.
labels = {
'N090-S01':'Current Client/Teammate/Tags/Status/Deadline filters and Columns; no production-stage filter',
'N091-S04':'Project-row tag menu (owned with Videos controls, not drawer field)',
'N094-S05':'Actual Plan/Done completion on disposable sample',
'N094-S06':'Current-user and other-person viewing context; no assumed read-only requirement',
'N097-S03':'Existing Client company selector; no inline Client creation in invitation wizard',
'N100-S03':'Current kind and available consumer filters; no invented transcript/people selector',
'N104-S05':'Existing/local simulated Client clarification message Edit/Delete menu',
'N105-S02':'Current view/comment/edit link access; scoped file downloads owned by Media/Masters',
'N109-S05':'Actual Script Add link placeholder outcome; Storyboard native URL prompt separate',
'N110-S01':'Clip collection and navigation (no Search control)',
'N110-S03':'Highlights-only filtering and empty recovery (no text-search feature)',
'N114-S08':'Actual isolated sample pointer move/resize outcome',
'N118-S09':'Existing sub-brand and creation command; immediate create outcome excluded',
'N120-S01':'Three-role profile/work/business fields; rates do not live in this personal consumer',
'N128-S02':'Current V1 three production questions and video-type choice branches',
'N134-S04':'Prefilled/editable Name and Email inspection, required/invalid draft guards',
}
for sid, label in labels.items():
    ST[sid]['proposedLabel'] = label

# Cross-series ledger keeps every genuine capture associated with an accountable entry.
D['completionSeries'] = {f: len(json.loads((B/'data'/f).read_text())) for f in capture_files}
D['completionCaptureMapping'] = [{'captureId':c['id'],'coverageIds':c.get('coverageIds',[]),'role':c.get('role'),'width':c.get('width'),'url':c.get('url'),'state':c.get('state'),'file':c.get('file'),'scope':'Only named captured state; action/outcome claims require companion action record.'} for c in C if c['id'][0] in 'FGHJ']

for row in ST.values():
    row['captureIds'] = sorted(set(row.get('captureIds',[])) & CI.keys() - {'E015-client-direct-deel','J087-brief-ai-local-prompt-draft'})
    row['observedRoles'] = sorted({CI[c].get('role','Unknown') for c in row['captureIds']})
    row['observedWidths'] = sorted({CI[c]['width'] for c in row['captureIds'] if isinstance(CI[c].get('width'),int)})
    row['explicitActionIds'] = [c for c in row['captureIds'] if c.startswith(('F','G','H','J'))]
    if row['proposedStatus'] == 'Inspected':
        assert row['captureIds'], row['id']

rollups = []
for workflow in [w for w in M if w['id'].startswith('N')]:
    states = [r for r in ST.values() if r['workflowId'] == workflow['id']]
    counts = Counter(r['proposedStatus'] for r in states)
    remaining = [r['id'] for r in states if r['proposedStatus'] not in ['Inspected','Not applicable']]
    status = 'Not applicable' if counts['Not applicable'] == len(states) else 'Inspected' if not remaining else 'Partially inspected'
    rollups.append({'id':workflow['id'],'name':workflow['name'],'proposedStatus':status,'finiteStateCounts':dict(counts),'remainingStateIds':remaining,'captureIds':sorted({c for r in states for c in r['captureIds']}),'qualifier':'Finite semantic current UI scope, actual observed roles/widths and explicit exclusions. Inspected is not a passing result or approved/fixed recommendation.'})

D['finiteStateClosureProposals'].update(states=list(ST.values()), proposedCounts=dict(Counter(r['proposedStatus'] for r in ST.values())), workflowRollups=rollups, missingEvidenceForProposedInspected=[])
D['finiteStateClosureProposals']['applicableFiniteStateCount'] = sum(r['proposedStatus'] != 'Not applicable' for r in ST.values())

# Route-entry composition reconciles all current captures by actual URL, aliases explicitly reused.
routes = [r for r in M if r['id'].startswith('R')]
patterns = [(r,re.compile('^'+re.sub(r'\\\[[^\]]+\\\]',r'[^/]+',re.escape(r['route']))+'/?$')) for r in routes]
by_route = {r['id']:[] for r in routes}
for c in C:
    if c['id'] == 'E015-client-direct-deel': continue
    matches = [r for r,p in patterns if p.match(urlparse(c.get('url','')).path)]
    if matches:
        match = max(matches,key=lambda r:len(re.sub(r'\[[^\]]+\]','',r['route'])))
        by_route[match['id']].append(c['id'])
    for r in routes:
        if c['id'].startswith('D-'+r['id']+'-'):
            by_route[r['id']].append(c['id'])
for row in D['routeEntryClosureModel']['rows']:
    ids = sorted(set(by_route[row['id']] + by_route.get(row.get('canonicalRouteId'),[])))
    row.update(captureIds=ids, directEntryCaptureIds=sorted(set(by_route[row['id']])), observedRoles=sorted({CI[c]['role'] for c in ids}), observedWidths=sorted({CI[c]['width'] for c in ids if isinstance(CI[c].get('width'),int)}))
    if row['id'] in ['R021','R032']:
        row.update(proposedStatus='Inspected',remainingCompositionChecks=[],reason='Actual current additional document/clean-entry consumers inspected at both desktop widths; exact roles/context retained in capture metadata.')
    children = [w for w in rollups if w['id'] in row['linkedWorkflowIds']]
    row['nestedWorkflowRollupStatus'] = 'Not applicable' if row['proposedStatus']=='Not applicable' else 'Partially inspected' if any(c['remainingStateIds'] for c in children) else 'Inspected'
    row['remainingTaskChecks'] = [s for c in children for s in c['remainingStateIds']]
D['routeEntryClosureModel']['proposedCounts'] = dict(Counter(r['proposedStatus'] for r in D['routeEntryClosureModel']['rows']))

D['updatedCheckpoint'] = 'Current F/G/H/J registries, exact finite-state evidence and source exclusions; proposal only, master untouched.'
D['scope'] = 'Reviewer C lead-reconciliation proposal. Actual isolated browser pass included. No application/master/report edits. UI-focused scope; prototype identity/auth mechanics excluded.'
D['minimalRemaining'] = [dict(id=r['id'],workflowId=r['workflowId'],label=r.get('proposedLabel',r['labelAsRecorded']),status=r['proposedStatus'],reason=r['reason']) for r in ST.values() if r['proposedStatus'] not in ['Inspected','Not applicable']]
D['summary'] = {'entriesReconciled':len(M),'originalCapturesRegistered':292,'currentCaptureLedgerCount':len(C),'historicalDetailedFActionMapCount':len(D.get('FSeriesMapping',[])),'currentCompletionCaptureMapCount':len(D['completionCaptureMapping']),'remainingMeaningfulUiChecks':D['minimalRemaining'],'closureModelCounts':{'routeEntries':D['routeEntryClosureModel']['proposedCounts'],'finiteStates':D['finiteStateClosureProposals']['proposedCounts'],'nestedWorkflowRollups':dict(Counter(r['proposedStatus'] for r in rollups))}}
D['FSeriesStatus'] = 'Historical detailed F001-F081 map is retained for traceability. Current completionCaptureMapping and finiteStateClosureProposals reconcile all current F/G/H/J evidence; no old remaining-state summary supersedes the finite proposal.'
final_by_id = {r['id']:r for r in D['routeEntryClosureModel']['rows']+rollups}
for entry in D['entryReconciliation']:
    final = final_by_id[entry['id']]
    entry['proposedStatus'] = final['proposedStatus']
    entry['wholeEntryStatusRecommendation'] = final['proposedStatus']+' for the explicit finite scope only; lead acceptance required, master unchanged.'
    entry['captureIds'] = final['captureIds']
    entry['observedRoles'] = sorted({CI[c]['role'] for c in final['captureIds']})
    entry['observedWidths'] = sorted({CI[c]['width'] for c in final['captureIds'] if isinstance(CI[c].get('width'),int)})
    entry['priorityBatches'] = []
    if entry['id'].startswith('N'):
        entry['finiteStateReconciliation'] = [r for r in ST.values() if r['workflowId']==entry['id']]
P.write_text(json.dumps(D,indent=2)+'\n')
out = {'status':'Reviewer C proposal, lead acceptance required; no master edit','counts':D['summary']['closureModelCounts'],'routeEntries':D['routeEntryClosureModel']['rows'],'workflows':rollups,'finiteStates':list(ST.values()),'minimalRemaining':D['minimalRemaining'],'captureCount':len(C),'captureSeriesCounts':D['completionSeries'],'verificationLimits':['No formal accessibility conformance claim.','No exhaustive data/role/width product.','No human messages/invites/payments/destructive confirmations.','Explicit local simulation/sample progression only in isolated origins.','Inspected failures remain findings, never fixed/approved.']}
(B/'reviewers/c-final-coverage-proposal.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out['counts'],indent=2))
print('Remaining:',[(x['id'],x['label']) for x in D['minimalRemaining']])
