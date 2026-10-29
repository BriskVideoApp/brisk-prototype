"""Lead-owned application of the reviewed finite coverage proposal. Audit files only."""
from pathlib import Path
import copy
import json
from collections import Counter

P=Path(__file__).parent
def read(name):return json.loads((P/name).read_text())
def save(name,value):(P/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')

proposal=read('reviewers/c-final-coverage-proposal.json')
register=read('data/coverage-register.json')
backup=P/'reviewers/coverage-register-before-completion.json'
if not backup.exists():save('reviewers/coverage-register-before-completion.json',register)
captures={}
for name in ['captures','completion-captures','a-completion-captures','b-completion-captures','c-completion-captures']:
    for c in read('data/'+name+'.json'):
        captures[c['id']]=c
states={x['id']:x for x in proposal['finiteStates']}
routes={x['id']:x for x in proposal['routeEntries']}
workflows={x['id']:x for x in proposal['workflows']}
assert len(states)==364 and len(routes)==61 and len(workflows)==56
assert len(captures)==sum(len(read('data/'+name+'.json')) for name in ['captures','completion-captures','a-completion-captures','b-completion-captures','c-completion-captures'])
for row in register:
    item=routes.get(row['id']) or workflows[row['id']]
    row['status']=item['proposedStatus']
    row['screenshots']=item.get('captureIds',[])
    missing=[i for i in row['screenshots'] if i not in captures]
    assert not missing,(row['id'],missing)
    contexts=[captures[i] for i in row['screenshots']]
    row['observedRoles']=sorted(set(c['role'] for c in contexts if c.get('role')))
    row['observedWidths']=sorted(set(c.get('width',c.get('viewport',{}).get('width')) for c in contexts if c.get('width',c.get('viewport',{}).get('width'))))
    row['browserStatus']='Current composition and explicit nested-state evidence reconciled' if row['status']=='Inspected' else 'Source/exclusion or remaining state recorded explicitly'
    row['sourceReview']='Current route/component source reviewed against the current authority order; code existence alone is not approval or browser evidence.'
    row['browserVerification']=[{
        'method':'Current genuine screenshots, DOM/action records and source-to-live-entry reconciliation',
        'scope':item.get('statusScope') or item.get('qualifier'),
        'observedRoles':row['observedRoles'],'observedWidths':row['observedWidths'],
        'evidenceCount':len(row['screenshots']),
        'limits':'Finite semantic states and materially different role consumers; no full data/role/width Cartesian product or formal accessibility certification.'}]
    if row['id'] in routes:
        if row['id']=='R016':
            row['fixtureLimitation']='The original Freelancer fixture showed Brief unavailable. The authorised isolated pending-offer scenario subsequently exposed the populated Brief and offer terms/decision UI in F077-F084. External acceptance/decline outcomes were not submitted.'
        row['statusScope']=item['statusScope']
        row['nestedWorkflowIds']=item.get('linkedWorkflowIds',row.get('nestedWorkflowIds',[]))
        row['nestedWorkflowRollupStatus']=item.get('nestedWorkflowRollupStatus')
        row['remainingGap']=item.get('reason','') if row['status']=='Not applicable' else ('None within route-entry composition. The linked nested workflows remain independently accountable.' if row['status']=='Inspected' else item.get('remainingTaskChecks','See finite states.'))
        continue
    for state in row.get('finiteSafeStates',[]):
        item_state=states[state['id']]
        state['status']=item_state['proposedStatus']
        if item_state.get('proposedLabel'):
            state['label']=item_state['proposedLabel']
        state['evidence']=item_state.get('captureIds',[])
        state['captures']=item_state.get('captureIds',[])
        assert all(i in captures for i in state['captures']),(state['id'],state['captures'])
        state['method']=item_state['reason']
        state['limit']='Inspected records assessment, including observed failures. It does not mean a recommendation is approved or fixed, or every combination was exercised.' if state['status']=='Inspected' else item_state['reason']
        state['observedRoles']=item_state.get('observedRoles',[])
        state['observedWidths']=item_state.get('observedWidths',[])
        state['explicitActionIds']=item_state.get('explicitActionIds',[])
        if item_state.get('sources'):state['sources']=item_state['sources']
    row['finiteStateCounts']=dict(Counter(x['status'] for x in row['finiteSafeStates']))
    pending=[x for x in row['finiteSafeStates'] if x['status'] not in ['Inspected','Not applicable']]
    row['remainingGap']='; '.join(x['id']+': '+x['label']+' - '+x['method'] for x in pending) if pending else ('No remaining applicable UI state in the defined finite scope. Explicit exclusions and unexecuted external/destructive outcomes remain listed separately.' if row['status']=='Inspected' else item.get('qualifier','Source-only/reference exclusion.'))
    row['mutationOnlyBranches']=['External human invitations/messages, payments, actual integration connection and destructive confirmation outcomes were not executed. Authorised local sample progression is documented in the isolated action registries.']
    row['completionPassActionRegistries']=['data/completion-actions.json','data/a-completion-actions.json','data/b-completion-actions.json','data/c-completion-actions.json']
    row['currentEvidence']=[{'id':c['id'],'state':c.get('state',c.get('caption','')),'role':c.get('role'),'width':c.get('width',c.get('viewport',{}).get('width')),'url':c.get('url'),'textEvidence':c.get('dom','evidence/'+c['id']+'.dom.txt')} for c in contexts]

for row in register:
    if row['id'] not in routes:continue
    children=[workflows[i]['proposedStatus'] for i in row.get('nestedWorkflowIds',[]) if i in workflows]
    row['nestedWorkflowRollupStatus']='Inspected' if all(s in ['Inspected','Not applicable'] for s in children) else 'Partially inspected'

save('data/coverage-register.json',register)
result={'coverageEntries':len(register),'counts':dict(Counter(x['status'] for x in register)),'finiteStateCounts':dict(Counter(s['status'] for x in register for s in x.get('finiteSafeStates',[]))),'remaining':[x['id'] for x in register if x['status'] not in ['Inspected','Not applicable']],'authority':'Lead accepted source applicability corrections and explicit current action evidence. No default screenshot or component reuse closes an unseen consumer.'}
save('data/completion-coverage-validation.json',result)
print(json.dumps(result,indent=2))
