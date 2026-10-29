import json,re,sys
max_e=int(sys.argv[1]) if len(sys.argv)>1 else 146
from pathlib import Path
root=Path(__file__).resolve().parents[1]
captures=json.loads((root/'data/captures.json').read_text())
proposal=json.loads((root/'reviewers/coverage-proposal.json').read_text())
groups={g['id']:g for g in proposal['groups']}
extra=[
 {'id':'N138','name':'Project flow adjuster','routeIds':['R026','R025','R027','R028','R029','R030','R031'],'applicableRoles':['Studio Staff'],'proposedByLead':True,'finiteSafeStates':[{'id':f'N138-S{i:02}','label':label} for i,label in enumerate(['current stages and pinned Media explanation','initial focus','Escape dismissal','Close and focus return','term subpanel without changing selection','hide confirmation cancel only','reorder alternative source review only'],1)]},
 {'id':'N139','name':'Main Chat workspace','routeIds':['R005'],'applicableRoles':['Studio Staff','Studio Freelancer','Customer'],'proposedByLead':True,'finiteSafeStates':[{'id':f'N139-S{i:02}','label':label} for i,label in enumerate(['project/client rail and conversation default','Internal/External channel controls','composer empty/unavailable tools without send','thread panel','Client/project settings','call menu','keyboard and panel dismissal'],1)]}
]
extra[1]['finiteSafeStates'].extend([{'id':f'N139-S{i:02}','label':label} for i,label in [(8,'message search/default and no results'),(9,'DMs/Mentions/Groups/Threads/Calls current views'),(10,'existing call notes'),(11,'project members panel without access change')]])
groups['N091']['finiteSafeStates'].extend([{'id':'N091-S10','label':'Notes expanded/local editor without save'},{'id':'N091-S11','label':'Latest actions expanded'}])
for g in extra:
 g['entryPath']='Project stage header > Adjust project flow' if g['id']=='N138' else 'Sidebar Chat > selected project/conversation'
 g['sourceMapping']=['src/components/production-flow/ProductionFlowRail.tsx:150','src/components/project/ProjectStageHeader.tsx:226'] if g['id']=='N138' else ['src/components/chat/ChatPage.tsx:1']
 g['desktopWidthsRequired']=[1440,1133]
 g['mutationOnlyBranches']=['Reorder/hide/restore/reset stages or change Edit/Animation term'] if g['id']=='N138' else ['Send messages, edit conversation settings or trigger calls']
 g['interactionContract']=['Open/read/close without data mutation','Hover and keyboard focus','Escape and focus return where applicable']
 groups[g['id']]=g
# State numbers identify the proposed finite state, but a capture is still only partial evidence.
# Omitted state ids mean default context only, never an opened subdialog.
def A(g,ss=(),note=''):
 return {'groupId':g,'stateIds':[f'{g}-S{s:02}' for s in ss],'observation':note,'status':'Partially inspected'}
route_map={
'R001':[A('N090',(1,4),'Staff Videos default; visible filters/status fields only, no filter/status action inferred.')],
'R002':[A('N118',(), 'Sub-brand asset page default only; no asset editor or preview opened.')],
'R003':[A('N118',(), 'Client Brand Kit asset page default only; nested asset actions not inspected.')],
'R004':[A('N118',(), 'Brand Kits directory current default only; setup, sub-brand and asset actions not opened.')],
'R005':[A('N139',(1,2,3),'Main Chat default conversation, rails, channel controls and composer visible; no channel/settings/call/thread action inferred.')],
'R006':[A('N121',(2,), 'Client invoices page current account scope; payment/billing actions not activated.')],
'R007':[A('N098',(1,), 'Client profile Overview/company form default; Contacts/editor/Start project not inferred.')],
'R009':[A('N099',(), 'Alias entry/redirect only; opening indicator is not a loaded portal inspection.')],
'R010':[A('N133',(1,), 'Name your video default with project code/name; Continue visible; no submission or empty-name validation inferred.')],
'R011':[A('N136',(5,), 'Legacy standalone Script demonstration default, kept distinct from current canonical project Script.')],
'R012':[A('N102',(1,2,3), 'Asset drawer Details/preview/source metadata default. Comments/actions/keyboard not inferred.')],
'R013':[A('N100',(1,2,3,4,7),'Media default scope/tabs/kind/sort controls visible; no opened menus or keyboard behaviour inferred.')],
'R014':[A('N135',(4,), 'Development delivery diagnostics only, excluded from current product findings.')],
'R016':[A('N132',(), 'Current offer Brief entry only; unavailable content does not verify offer terms or acceptance.')],
'R015':[A('N130',(1,5), 'Full-page Updates inbox current empty state, not the global Updates popover.')],
'R017':[A('N119',(1,6),'Expenses summary and invoice rows/Mark paid control visible; no invoice review/approval/payment performed.')],
'R018':[A('N094',(1,2),'To Do home alias current empty state with week/viewing controls, not a populated planner.')],
'R019':[A('N096',(1,),'Person profile Overview/access/Studio details visible; no other tab, inline editor or destructive confirmation inferred.')],
'R020':[A('N095',(1,),'People default directory/search/sort controls; no opened workload or sort picker inferred.')],
'R021':[A('N131',(1,4),'Script export preview/return link default; no export/print command invoked.')],
'R022':[A('N119',(1,),'Project costs/agreed offers/invoice rows visible; invoice review dialog not opened.')],
'R023':[A('N129',(1,),'Project Files populated location cards/metadata; no add/edit/remove form opened.')],
'R024':[A('N104',(), 'Project alias resolved to Brief landing; capture is default context only.')],
'R025':[A('N108',(2,),'Current Script version label visible; Versions list not opened.'),A('N109',(),'Script editor default; row/source/document/comment tools not opened.')],
'R026':[A('N104',(), 'Brief landing default with missing/disabled source entry; no question/picker/summary interaction inferred.')],
'R027':[A('N116',(1,9),'Current Edit is not ready/readiness state; populated player, versions and comments remain uninspected.')],
'R028':[A('N117',(1,),'Current Masters No deliverables yet empty state; populated delivery tree is not covered.')],
'R029':[A('N100',(1,3,4),'Project Media default scope/kind/sort controls; actions not invoked.'),A('N101',(),'Folder tree default only; menus/creation/rename not opened.')],
'R030':[A('N112',(1,7),'Shoot current Setup question/default only; no answers, module completion or populated planning tools changed.')],
'R031':[A('N111',(5,),'Storyboard board default with unavailable image where present; frame review and menus require separate captures.')],
'R032':[A('N134',(1,2),'Journey/magic-link entry current fixture; no continuation or invitation submission.')],
'R033':[A('N135',(2,),'Prototype production-flow preview current default only; not canonical live workflow verification.')],
'R034':[A('N135',(1,),'Scenario labels inspected without activating/resetting a scenario.')],
'R035':[A('N136',(1,),'Legacy review route currently presents Edit readiness; no populated review interaction inferred.')],
'R036':[A('N121',(),'Client Company details default only; no saved details/logo changes.')],
'R037':[A('N121',(),'Client Team default only; no invitation/access/member action inferred.')],
'R038':[A('N127',(),'Current Client billing/Stripe connected overview; no connect/disconnect dialog or external action opened.')],
'R039':[A('N126',(1,2),'Notification category/timing/content preview default; editor not opened, no toggles changed.')],
'R040':[A('N126',(1,),'Studio notification summary/default options visible only; no preference changed.')],
'R041':[A('N126',(2,),'Client message template preview/default only; message editor not opened.')],
'R042':[A('N120',(2,),'Personal notification controls visible without changing channel/group settings.')],
'R043':[A('N120',(1,),'Personal profile/contact/work details default only; no profile/rate upload/save action.')],
'R044':[A('N120',(3,),'Current sign-in method/security default; change-password dialog not opened.')],
'R045':[A('N127',(),'Plan/usage/add-on summary default only; comparison/change/add-on modals unopened.')],
'R046':[A('N126',(2,),'Default submit/review message setting preview only; no editor or save invoked.')],
'R047':[A('N124',(1,2,3),'AI Playbook instructions, empty references and upload/link entry controls visible only; no upload/source/save.')],
'R048':[A('N122',(),'Branding alias current Studio setup summary only; no focused editor.')],
'R049':[A('N122',(),'Studio details alias current Studio setup summary only; no focused editor.')],
'R050':[A('N125',(2,4),'Messaging providers and connection statuses visible; no connect/disconnect action.')],
'R051':[A('N122',(),'Studio setup identity/video/default Brief summary only; focused editor states remain uninspected.')],
'R052':[A('N122',(5,),'Sample Client portal preview default only.'),A('N135',(5,),'Demonstration preview banner/links; separate from a live Client portal.')],
'R053':[A('N123',(1,2,3),'Production defaults roles/stages/required labels visible; no add/save/discard changes.')],
'R054':[A('N125',(3,4),'Storage provider/status default visible; no provider choice or saved setting change.')],
'R055':[A('N095',(1,),'Studio team alias resolves to Staff People directory; no new nested workflow inferred.')],
'R056':[A('N118',(12,),'Guest Brand Kit shared preview default/read-only appearance; no nested asset action.')],
'R057':[A('N115',(5,6),'Shared Call Sheet document and existing crew/contact content; no print/share/publish command invoked.')],
'R058':[A('N135',(3,),'Share-control playground default only; excluded from current product finding totals.')],
'R059':[A('N128',(1,),'Studio onboarding initial signup/brand entry only; later AI/review/restart steps not reached.')],
'R060':[A('N094',(1,2),'Current No active videos assigned empty state with week/viewing controls. Populated planner/editor unavailable in captured fixture.')],
'R061':[A('N099',(1,2,6,7),'Client portal default grouping/status controls and Start Video visible; no filter/series/action interaction inferred.')]
}
# E-series are concrete opened states. A state may be visible without its full interaction contract tested.
em={
1:[A('N090',(5,),'Customer Videos default status appearance only.')],2:[A('N090',(1,4),'Staff Videos default controls only.')],
3:[A('N091',(1,3,6),'Project detail drawer and expanded Team section visible.')],
4:[A('N092',(1,4,5,6,7),'Shooter role editor current hours, pending invitations and Freelancer choices; no submit.')],
5:[A('N092',(1,4),'Staff suggested subset empty; Show all control visible.')],6:[A('N092',(1,4),'Same Staff suggested-empty subset at 1133px.')],
7:[A('N092',(1,3,4),'Expanded Staff options with disabled/current-project people and available people; no assignment.')],
8:[A('N092',(1,3,5,6),'Freelancer selection/rates/current invitation state visible; no invitation/assignment.')],
9:[A('N100',(1,2,3,4,7),'Global All clients/All projects Media default; no global bulk Download all.')],
10:[A('N100',(5,),'Named file selection control before keyboard activation.')],
11:[A('N100',(5,),'Space on nested Select opens inspector instead of selecting; interaction recorded by lead.'),A('N102',(1,2,3),'Unexpectedly opened inspector Details for Office arrivals file.')],
12:[A('N100',(5,),'Two selected files retained while search shows one; current toolbar scope visible.')],
13:[A('N099',(6,),'Client portal initial identity/context snapshot only; current focus excludes identity plumbing.')],
14:[A('N099',(1,2,6),'Fully rendered Loom Client portal default, not filter/series interaction.')],
15:[A('N104',(),'Direct alternate-Client Brief default context only; identity behaviour excluded from current UX finding scope.')],
16:[A('N100',(5,),'Project Media two selected/one visible filtered state; singular send label versus total selection.')],
17:[A('N100',(5,),'Delete confirmation names two files despite one visible result; no deletion confirmed.')],
18:[A('N111',(8,),'Storyboard document actions menu open with Delete version disabled; no action command invoked.')],
19:[A('N111',(4,5,8),'Frame review canvas/unavailable image/empty Comments rail at 1440px; no comment/drawing/media edit.')],
20:[A('N111',(4,5,8),'Same frame-review state at 1133px; no comment/drawing/media edit.')],
22:[A('N085',(1,3),'Account menu open; focused personal-profile link recorded; keyboard navigation itself not tested by snapshot.')],
23:[A('N084',(2,),'Recent pages native-link menu open; Home/End/arrows/Escape not inferred.')],
24:[A('N089',(6,),'Ask Brisk opening/loading context only; use E025 for settled UI.')],
25:[A('N089',(4,6),'Ask Brisk settled, prompt controls visible, empty Send disabled; no prompt submitted.')],
26:[A('N089',(2,6),'Add source command menu only; source pickers not opened/selected.')],
27:[A('N087',(2,4),'Updates popover empty; Mark all as read disabled, not invoked.')],
28:[A('N097',(1,2,5,6),'Invite Person step 1 Staff radio checked, blank email/Name and Next disabled; Cancel visible.')],
29:[A('N097',(3,4,5,6),'Client invitation step 2 current Loom, zero project selection and access summary; no send.')],
30:[A('N097',(4,5,6),'Mixed All projects checkbox with four selected projects; local draft only.')],
31:[A('N095',(3,),'Sarah workload open: clamped availability, booked/potential/capacity and project breakdown; no assignment change.')],
32:[A('N095',(1,2),'People impossible-query no results and Clear search visible; recovery click not inferred.')],
33:[A('N095',(5,),'Studio Freelancers selected with role-specific rows/capacity/current work; invitation opener label visible only.')],
34:[A('N095',(),'Archived selected with two records; no restore or archive action.')],
35:[A('N098',(2,),'Client Contacts tab and current contact/invitation/access actions visible; no action invoked.')],
36:[A('N098',(3,),'Jess Change project access editor with all current five projects checked, at 1133px; no save.')],
37:[A('N098',(3,),'Same existing checked access editor at 1440px; no save.')],
38:[A('N098',(4,),'Start project draft with empty project name/Create project disabled at 1440px; no create.')],
39:[A('N098',(4,),'Same Start project empty draft at 1133px; no create.')],
40:[],41:[],42:[],
43:[],
44:[A('N102',(1,2,3),'Asset inspector current Details at 1133px; screenshot shows Filename/Close header hidden by global bar.')],
45:[A('N102',(1,),'Attempted overlapping Close click leaves inspector and opens Ask Brisk; lead-recorded result.'),A('N089',(6,),'Accidental Ask Brisk opening context only, no prompt/source action.')],
46:[A('N102',(1,),'Escape from Filename leaves drawer; lead-recorded result, no rename.')],
47:[A('N100',(1,6),'Explicit Loom Client scope exposes Download Client media; action not invoked.')],
48:[A('N100',(4,),'Sort media keyboard-focus snapshot after shared picker interaction; no sorting outcome inferred from screenshot alone.')],
49:[A('N095',(1,),'Sort people focused after menu Escape as recorded by lead; role/view values retained.')],
50:[A('N104',(1,2,7),'Description question, existing missing text field, no typing/autosave.')],
51:[A('N106',(1,2,3,4,5),'Send Brief confirmation current Client recipient/default message/settings link; Cancel focus; no send.')],
52:[A('N106',(1,2,3,4,5),'Same confirmation at 1440px; no send.')],
53:[A('N105',(1,2,3,5),'Brief link access panel, Brief-only scope/View only current choice; no copy/access change.'),A('N104',(6,),'Summary promises approval while current Approve Brief is disabled; observed copy conflict.')],
54:[A('N105',(1,2,3,5),'Same link panel at 1133px; no copy/access change.'),A('N104',(6,),'Current disabled approval and summary-helper combination.')],
55:[A('N138',(1,2),'Adjust flow open at 1133px; focus remains on opener outside declared modal.')],
56:[A('N138',(3,),'Escape on opener leaves Adjust flow panel open; lead-recorded action/result.')],
57:[A('N138',(1,2),'Current flow panel at 1440px; no stage/term/reset mutation.')],
58:[A('N108',(1,2,3,6),'Versions list current V3 and visible create/duplicate/rename commands; none invoked.')],
59:[A('N108',(1,2,6),'Escape on version opener leaves panel open; lead-recorded interaction, no version command.')],
60:[A('N108',(1,2,3,6),'Same Versions panel at 1133px.')],
61:[A('N108',(1,2,6),'Outside click on Words heading leaves Versions open; lead-recorded interaction.')],
62:[A('N109',(7,8),'Quiet Script actions menu, Delete version disabled; copy/export/conversion not invoked.')],
63:[A('N109',(6,8),'Existing empty Comments panel and filters visible; no comment/reaction sent.')],
64:[A('N108',(2,4,6),'Historical V1 Read only preview with Return latest/Restore as new version; returned V3 without restore/edit.')],
65:[A('N109',(1,2,8),'Current row overflow contains Duplicate/Delete/Insert above/below; no edit action invoked.')],
66:[A('N109',(8,),'Visuals column expanded on current approved Script; no content edited.')]
}
em.update({
67:[A('N109',(3,8),'Approved Script edit guard opened and cancelled; no unapproval.'),A('N107',(3,4),'Edit-approved confirmation content only; no consequence completed.')],
68:[A('N111',(1,2,8),'Storyboard Add media source menu exposes four sources; no source selected.')],
69:[A('N111',(8,),'Source menu dismissed after Add Link activation; no native prompt or link form was exposed and no URL added. Initial caption is corrected here.')],
70:[A('N111',(8,),'Same post-command Storyboard context at 1440px; not evidence of a link form. No URL added.')],
71:[A('N110',(1,8),'Existing populated transcript collection at 1440px; no content or send.')],
72:[A('N110',(1,8),'Same populated collection at 1133px.')],
73:[A('N110',(8,),'Space on Add comment pin starts playback instead of comment composer; paused and mute restored.')],
74:[A('N110',(5,8),'Collection Copy all/Download command menu visible; no command invoked.')],
75:[A('N110',(4,8),'Per-clip compact commands/danger action menu visible; no command invoked.')],
76:[A('N110',(),'Highlights only filter shows existing empty highlights, not an empty underlying collection.')],
77:[A('N110',(5,8),'Collection commands remain enabled under empty Highlights view. Approved collection-wide scope is intentional; initial disabled caption is incorrect.')],
78:[A('N110',(2,6,8),'Text selection toolbar names destination Script V3; no highlight or send.')],
79:[A('N099',(1,),'Client portal grouping menu options shown; no stored record changes.')],
80:[A('N099',(2,),'Completed filter has no existing matching videos; no record created.')],
81:[A('N099',(3,),'Customer Stories series expanded; current child projects visible.')],
82:[A('N099',(4,),'Client project action menu at 1440px; no command invoked.')],
83:[A('N099',(4,),'Same Client action menu at 1133px; no command invoked.')],
84:[A('N099',(5,),'Project history and external collaboration panel loaded; empty composer, no message.')],
85:[A('N132',(),'My jobs Offers is empty in existing Freelancer fixture; populated offer preview unavailable.')],
86:[A('N132',(),'My jobs Offer history is empty in existing Freelancer fixture; no record manufactured.')],
87:[A('N118',(3,),'Logo download format/source dialog; no download or replacement.')],
88:[A('N118',(5,),'Existing font roles editor at 1133px; no edit/save.')],
89:[A('N118',(5,),'Same font roles editor at 1440px; no edit/save.')],
90:[A('N118',(6,),'Voice and tone current summary/tags editor at 1440px; no edit/save.')],
91:[A('N118',(6,),'Same Voice and tone editor at 1133px.')],
92:[A('N118',(7,),'Existing visual asset preview; no download/delete.')],
93:[A('N119',(1,2),'Existing Sent back invoice review, mismatch and reason visible; status not changed.')],
94:[A('N119',(1,),'Existing invoice PDF preview only; no status change.')],
95:[A('N119',(1,3,7),'Submitted matching invoice with two PDFs and optional approval note; approval not invoked.')],
96:[A('N119',(5,),'Send back local form with required blank reason, no submission.')],
97:[A('N119',(5,),'Local reason draft enables Send back; Back/Cancel discards without submission.')],
98:[A('N119',(2,3),'Submitted currency-mismatch invoice requires approval note; no approval.')],
99:[A('N119',(4,),'Existing Approved invoice forwarding draft only; no approval or email.')],
100:[A('N119',(4,),'Accounts inbox multi-selector for an already Approved invoice; no send.')],
101:[A('N119',(4,),'No forwarding destinations selected; Email invoice disabled, no send.')],
102:[A('N122',(),'Studio focused editor current fields only; exact editor mapped by capture ID below; no save.')],
103:[A('N126',(1,),'Notifications root navigation context only.')],
104:[A('N126',(1,),'Work to review category reached from root; navigation changes to workspace sidebar.')],
105:[A('N126',(2,3,6),'Editable Title/Message local dialog; no edit/save.')],
106:[A('N126',(2,6),'Fixed approval notification preview, no preference changed.')]
})
em.update({
107:[A('N127',(1,6),'Plan comparison at 1133px, current plan/options; no purchase.')],
108:[A('N127',(1,6),'Plan comparison at 1440px; no plan committed.')],
109:[A('N127',(2,6),'Plan change confirmation opened and cancelled before Confirm change.')],
110:[A('N127',(3,6),'Additional storage confirmation only; no add-on applied.')],
111:[A('N120',(4,),'Change password dialog opened; credentials untouched, no submit.')],
112:[A('N104',(1,3,7),'Video type step after keyboard navigation toward footer; no choice changed.')],
113:[A('N104',(1,3,7),'Audience step selected from previous footer; retained scroll context, no answer changed.')],
114:[A('N104',(1,3,7),'Audience heading partly behind fixed header after step transition at 1133px; no answer changed.')],
115:[A('N104',(3,7),'Duration menu displays full 3 mins at 1133px; no option selected.')],
116:[A('N104',(3,7),'Deliverables with collapsed navigation at 1133px; no content change.')],
117:[A('N090',(),'Videos unread-badge computed styles observed; no filter/status action inferred.')],
118:[A('N091',(),'Expanded project detail section; exact section identified by capture ID below.')],
119:[A('N091',(10,),'Project Notes local empty editor; no text/save.')],
120:[A('N129',(2,),'Empty Add location form; no URL/save.')],
121:[A('N129',(3,),'Existing Working files local editor; no edit/save.')],
122:[A('N129',(4,),'Remove location confirmation states original files remain; cancelled without removal.')],
123:[A('N130',(2,5),'Unread notification filter empty; no mark-read action.')],
124:[A('N139',(1,7),'Keyboard navigation reaches historical message region; sticky date overlap visible, no message/reaction.')],
125:[A('N139',(1,7),'Historical message region after ArrowDown scrolling, no content change.')],
126:[A('N139',(1,7),'PageDown from historical message link; scrolling inspection only.')],
127:[A('N139',(8,),'Message search suggested filters/current permitted results; no send.')],
128:[A('N139',(8,),'Message-search no-results local query; no send.')],
129:[A('N139',(5,),'External Chat connections/routing settings, no toggle/configuration change.')],
130:[A('N139',(11,),'Existing project members panel; no invite/access mutation.')],
131:[A('N139',(9,),'Current DMs/Mentions/Groups/Threads/Calls view as named by capture; no creation/call/message.')],
132:[A('N139',(10,),'Existing call notes opened, no call or edit.')],
133:[A('N103',(1,2),'Project Media Upload source menu only; computer file not selected.')],
134:[A('N103',(2,3,4),'Mock Drive picker current files, none selected, disabled Import; no file import.')],
135:[A('N103',(3,4),'Cloud picker no results; Import files remains disabled, no selection/import.')],
136:[A('N101',(),'Folder action menu only; no add/rename/move/delete command invoked from it.')],
137:[A('N101',(5,),'One-file Move destination draft; no move confirmed.')],
138:[A('N101',(5,),'Destination folder hierarchy expanded; no destination/move confirmed, later cancelled.')],
139:[A('N086',(1,2,3),'Test mode menu exposes exactly three access-role choices and current scenario; no reset.')],
140:[A('N088',(1,2,4),'Global Chat drawer current conversation/project context; Escape subsequently closes per lead, no message.')],
141:[A('N085',(1,),'Staff account menu role-appropriate routes; no account/sign-out mutation.')],
142:[A('N089',(2,6),'Ask Brisk Add source menu; no context/prompt submitted.')],
143:[A('N089',(3,6),'AI source/context picker opened; no selection or prompt.')],
144:[A('N098',(3,),'Existing Jess Client access editor, all five current checks; no save.')],
145:[A('N098',(3,),'One checkbox unchecked in local access draft; no Save, cancelled.')],
146:[A('N098',(3,),'Reopened after Cancel, original five checked; direct cancellation preservation verified.')]
})
# Additional Client directory creation is nested, but not present in C's original group denominator.
extra.append({'id':'N140','name':'Client directory create/search','routeIds':['R008'],'applicableRoles':['Studio Staff'],'proposedByReviewer':'B, for lead reconciliation only','finiteSafeStates':[{'id':f'N140-S{i:02}','label':lab} for i,lab in enumerate(['default search/status/sort controls','Add Client empty draft validation','existing duplicate-name draft without submission','no results and Clear search','Cancel without create'],1)]})
extra[-1].update({'entryPath':'Sidebar Clients > Add Client or search','sourceMapping':['src/components/clients/ClientsPage.tsx:1'],'desktopWidthsRequired':[1440,1133],'mutationOnlyBranches':['Create, archive or delete Client'],'interactionContract':['Open/read/cancel local draft only','No duplicate validation submission','Hover, keyboard focus, Escape and focus return']})
groups['N140']=extra[-1]
route_map['R008']=[A('N140',(1,),'Clients directory default/search/status/sort controls only; Add Client requires separate opened capture.')]
em[40]=[A('N140',(2,5),'Add Client blank required name/Create disabled; no create.')]
em[41]=[A('N140',(3,5),'Existing Loom name entered as draft; Create enabled; duplicate validation only occurs on submission and was deliberately not invoked.')]
em[42]=[A('N140',(3,5),'Same duplicate-name draft at 1440px; no submission, no claim of duplicate validation.')]
em[43]=[A('N140',(4,),'Client no-results state/Clear filters visible; no creation or recovery-click claim.')]
# E021 is a raw diagnostic screenshot outside the registered capture metadata.
excluded=[{'id':'E021-recovered-asset','reason':'Raw recovered asset diagnostic screenshot, unregistered in captures.json and excluded from finding/coverage totals per lead.'}]
# Lead-recorded actions are distinguished from the visible snapshot, never inferred merely from a focus ring.
actions={
7:['Lead verified ArrowRight on Team Staff leaves Staff selected/focused; not a full tab-keyboard assessment.'],
11:['Space on named Select Office-arrivals-camera-b.mov opens inspector and no selection toolbar appears.'],
17:['Safe Delete confirmation opened and cancelled; final clear selection reported by lead but not shown in this capture.'],
45:['Attempted Close activation reaches overlapping Ask Brisk instead; inspector remains.'],
46:['Escape from Filename does not dismiss inspector; no rename committed.'],
49:['Lead reports menu Escape returns focus to Sort people.'],
55:['Lead checked active focus remains Adjust project flow opener outside aria-modal panel.'],
56:['Lead pressed Escape on opener; panel remains open.'],
59:['Lead pressed Escape on Versions opener; panel remains open.'],
61:['Lead clicked Words heading outside Versions; panel remains open.'],
62:['Lead reports Escape closes quiet action menu and returns focus to opener; result is a lead log, not the open-state screenshot itself.'],
109:['Plan change confirmation cancelled before Confirm change; no plan change.'],
122:['Remove location confirmation cancelled; original location retained.'],
138:['Destination hierarchy inspected; Move draft cancelled without confirming.'],
140:['Lead pressed Escape and observed global Chat drawer closes. No wider keyboard lifecycle claim.'],
145:['One project unchecked in local draft, then Cancel invoked without Save.'],
146:['Access editor reopened after Cancel; all original five project checks still present.'],
73:['Lead pressed Space on Add comment Interviewer 00:08: playback began at 00:08, no composer appeared. Playback paused and mute restored.'],
67:['Approved Script edit guard opened then cancelled without unapproving.'],
97:['Lead reports Back then Cancel discards the local reason draft; no Send back.'],
64:['Historical V1 preview selected, then Return latest used to restore displayed V3; no restore-as-new/edit command.']}
entries=[]
for c in captures:
 m=re.match(r'E(\d+)',c['id']);num=int(m.group(1)) if m else None
 if num is not None and num>max_e:continue
 if not (m or c['id'].startswith('D-R') or c['id'].startswith('BRIEF-')):continue
 cid=c['id'];refs=[root/'evidence'/f'{cid}.dom.txt',root/'evidence'/f'{cid}.txt']
 textfile=next((p for p in refs if p.exists()),None)
 textbody=textfile.read_text() if textfile else ''
 png=root/'evidence'/f'{cid}.png'
 if m:
  ass=em.get(num,[])
  if num==118:
   ss=5 if 'hours' in cid else 2 if 'deadline' in cid else 11 if 'latest-actions' in cid else 10
   ass=[A('N091',(ss,),'Existing expanded project '+cid.split('E118-project-')[-1]+' content at 1133px; no saved change.')]
  if num==102:
   ss=1 if 'edit-name' in cid else 2 if 'add-logo' in cid else 3 if 'video-types' in cid else 4
   ass=[A('N122',(ss,7),'Current focused Studio editor; no edit/save. Captured at 1133px only.')]

 elif cid.startswith('BRIEF-'):
  ss=[1,2,7]
  if 'brand-kit' in cid:ss += [3,4]
  elif any(v in cid for v in ['video-type','audience','references','footage','deadline','deliverables']):ss +=[3]
  if 'summary' in cid:ss +=[6]
  ass=[A('N104',tuple(ss),f"Current {cid.replace('BRIEF-','').rsplit('-',1)[0]} question/summary rendered at named width; no values edited. Picker/control default only unless separately recorded.")]
 else:
  ass=route_map.get(c.get('coverageId'),[])
  if c.get('coverageId')=='R001' and c.get('role')=='Studio Freelancer':ass=[A('N132',(),'My jobs current queue default only; existing Offers/History empty; no pending-offer terms or decision checked.')]
  if c.get('coverageId')=='R003' and 'heading "404"' in textbody:ass=[A('N118',(),'Brand Kit unavailable for existing Freelancer membership; no asset UI verified.'),A('N137',(),'Direct Brand Kit entry unavailable for existing role; identity plumbing excluded from findings.')]
  if c.get('coverageId')=='R016' and 'Brief unavailable' in textbody:ass=[A('N132',(6,),'Existing Freelancer offer Brief unavailable; pending offer, terms and acceptance dialog cannot be inspected in this fixture.')]

 # Actual AX/DOM text signature, supporting presence only; incremental AX diffs are explicitly marked.
 markers=[]
 for ln in textbody.splitlines():
  if re.search(r'\b(heading|dialog|menu|tabpanel|tablist)\b|\[disabled\]|\[active\]|\[mixed\]',ln):
   markers.append(ln.strip()[:280])
 recorded_state=c.get('state')
 if num in [69,70]:recorded_state='Post Add Link command context only; no form/prompt exposed, no URL added (corrected caption)'
 if num==77:recorded_state='Empty Highlights view; collection-wide commands enabled and intentionally scoped to the underlying visible collection (corrected caption)'
 entry={'captureId':cid,'routeId':c.get('coverageId'),'url':c.get('url'),'role':c.get('role'),'width':c.get('width'),'height':c.get('height'),'recordedState':recorded_state,'status':'Partially inspected','screenshot':str(png.relative_to(root)) if png.exists() else None,'textEvidence':str(textfile.relative_to(root)) if textfile else None,'textEvidenceExists':bool(textfile),'snapshotMayBeIncremental':'following is a diff' in textbody,'visibleEvidenceMarkers':markers[-12:],'groups':ass,'interactionVerification':actions.get(num,[]) if num else [],'limits':['Screenshot/DOM proves only the captured state at this role/width.','Visible controls are not proof their menu, validation, save, permissions or keyboard behaviour was exercised.']}
 if not ass:entry['routeOnlyReason']='Route-level visual context only; no corresponding opened nested workflow established by this capture.'
 if cid.startswith('D-'):entry['limits'].append('Default route capture does not cover any unopened dialog/menu or other consumer.')
 if c.get('coverageId')=='R012' and c.get('width')==1280:entry['limits'].append('Actual viewport 1280 x720 per corrected metadata; filename 1440 must not be treated as 1440 verification.')
 if c.get('coverageId') in ['R011','R014','R033','R034','R035','R052','R058']:entry['productScope']='Demonstration/diagnostic/sample; retained in inventory but excluded from current product finding totals unless specifically compared.'
 entries.append(entry)
# A state receives partial coverage even with both widths when roles/interaction branches remain absent.
state_rows=[]
for gid,g in groups.items():
 hits=[e for e in entries if any(a['groupId']==gid for a in e['groups'])]
 observed_roles=sorted(set(e['role'] for e in hits))
 widths=sorted(set(e['width'] for e in hits if e.get('width')))
 states=[]
 for s in g['finiteSafeStates']:
  sh=[e for e in hits if any(a['groupId']==gid and s['id'] in a['stateIds'] for a in e['groups'])]
  states.append({'id':s['id'],'label':s['label'],'status':'Partially inspected' if sh else 'Not inspected','captures':[e['captureId'] for e in sh],'limit':'Association is captured-state evidence only; full roles, widths, keyboard and remaining branches are not certified.' if sh else f'No matching capture through E{max_e:03}/BRIEF/current D-R defaults.'})
 missing_roles=[r for r in g.get('applicableRoles',[]) if r not in observed_roles]
 gaps=['Uncaptured finite states remain listed below.','Captured appearance and presence do not certify every consumer or all keyboard/focus/validation behaviour.']
 if missing_roles:gaps.append('Roles not represented: '+', '.join(missing_roles))
 if not {1133,1440}.issubset(set(widths)):gaps.append('Both 1133px and 1440px are not represented for this group.')
 state_rows.append({'id':gid,'name':g['name'],'status':'Partially inspected' if hits else 'Not inspected','captures':[e['captureId'] for e in hits],'observedRoles':observed_roles,'observedWidths':widths,'finiteStates':states,'remainingGaps':gaps})
result={'version':1,'purpose':'Evidence-to-workflow mapping for lead integration into one master coverage register. Does not replace it or mark the audit complete.','scope':f'Registered E001-E{max_e:03} captures, BRIEF question/summary captures and current registered D-R defaults. Later E-series captures are excluded until the next checkpoint.','method':['Read each available saved .dom.txt or .txt snapshot and record actual landmark/control markers.','Associate only current visible/opened states with the deduplicated finite groups from coverage-proposal.json.','Never infer keyboard navigation, cancellation, saved changes or permission branches from a screenshot alone. Explicit interaction facts are labelled lead-recorded.','Incremental accessibility diffs may omit unchanged content; absence from such files is not proof of UI absence.','Every workflow remains Partially inspected or Not inspected because other roles, widths or finite states remain.'],'counts':{'registeredCapturesMapped':len(entries),'groups':len(state_rows),'groupsWithSomeEvidence':sum(bool(g['captures']) for g in state_rows),'groupsWithoutEvidence':sum(not g['captures'] for g in state_rows),'missingTextFiles':sum(not e['textEvidenceExists'] for e in entries)},'excludedCaptures':excluded,'additionalGroupsForLead':extra,'captures':entries,'groups':state_rows,'corrections':['E021 is a recovered asset diagnostic only, not an invented missing audit state.','Do not mark duplicate-Client validation tested from E041/E042 because submission was not invoked.','Storyboard library/stock source actions immediately mutate a frame; menu commands only may be inspected.','E069/E070 were initially miscaptioned Add Link form. No form appeared and no native prompt/URL was verified; corrected per lead interaction log.', 'E077 initial caption says commands disabled; lead confirmed commands enabled and intentional collection-wide scope. No command invoked.','The absence of an application result after Add Link is a prototype implementation detail excluded from UI findings unless a current UI defect is independently demonstrated.']}
(root/'reviewers/evidence-coverage-map.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result['counts']))
