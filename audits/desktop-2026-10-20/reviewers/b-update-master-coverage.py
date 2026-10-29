"""Refresh audit-only coverage evidence after the lead finishes browser collection.

Default mode is a dry run. Pass --write after the lead's explicit browser-done
signal. This script does not inspect or modify the application or browser.
"""
import argparse
import json
from copy import deepcopy
from pathlib import Path

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--write', action='store_true')
args = parser.parse_args()
master_path = root / 'data/coverage-register.json'
master = json.loads(master_path.read_text())
mapping = json.loads((root / 'reviewers/evidence-coverage-map.json').read_text())
proposal = json.loads((root / 'reviewers/coverage-proposal.json').read_text())
base_groups = {g['id']: g for g in proposal['groups']}
base_groups.update({g['id']: g for g in mapping['additionalGroupsForLead']})
by_id = {r['id']: deepcopy(r) for r in master}
caps = {c['captureId']: c for c in mapping['captures']}

for rid, row in by_id.items():
    if not rid.startswith('R'):
        continue
    defaults = [c for c in caps.values() if c.get('routeId') == rid]
    row['screenshots'] = [c['captureId'] for c in defaults]
    row['browserVerification'] = [
        f"{c['role']}, {c.get('width')}x{c.get('height')}: {c.get('recordedState')}; "
        'captured default/restricted appearance only, not unopened nested states'
        for c in defaults
    ]
    row['browserStatus'] = 'Current saved default evidence reviewed' if defaults else 'No current default capture mapped'
    row['observedRoles'] = sorted({c['role'] for c in defaults})
    row['observedWidths'] = sorted({c['width'] for c in defaults if c.get('width')})
    row['nestedWorkflowIds'] = sorted({g['id'] for g in base_groups.values() if rid in g.get('routeIds', [])})
    if row.get('status') != 'Not applicable':
        row['status'] = 'Partially inspected' if defaults else 'Not inspected'
        row['remainingGap'] = ('Captured default/restricted states only. Applicable role, width, hover/focus, nested and mutation-dependent gaps remain explicitly recorded in the linked workflow groups.' if defaults else 'No current default capture mapped. Source inventory alone does not establish browser inspection.')
    # Explicitly record unavailable content without treating it as loaded UI.
    unavailable = [c for c in defaults if any(t in c.get('recordedState', '').lower() for t in ['unavailable', '404'])]
    if rid == 'R016' and defaults:
        row['fixtureLimitation'] = 'Existing Freelancer fixture shows Brief unavailable at both widths. Populated pending offer terms/decision states remain blocked; no role or record manufactured.'
    if rid == 'R003' and any(c['role'] == 'Studio Freelancer' for c in defaults):
        row['roleLimitation'] = 'Freelancer direct Loom Brand Kit returns 404 for existing non-membership; that capture does not cover editable Brand Kit content.'

for group in mapping['groups']:
    gid = group['id']
    original = by_id.get(gid, base_groups.get(gid, {'id': gid}))
    row = deepcopy(original)
    row['name'] = group['name']
    hits = [caps[cid] for cid in group['captures']]
    row['screenshots'] = group['captures']
    row['currentEvidence'] = [
        {'id': c['captureId'], 'state': c['recordedState'], 'role': c['role'], 'width': c['width'], 'url': c['url'], 'textEvidence': c['textEvidence']}
        for c in hits
    ]
    row['observedRoles'] = group['observedRoles']
    row['observedWidths'] = group['observedWidths']
    row['browserVerification'] = [
        {'captureId': c['captureId'], 'method': 'Saved current screenshot and DOM/accessibility snapshot', 'scope': [a['observation'] for a in c['groups'] if a['groupId'] == gid], 'interactionVerification': c['interactionVerification']}
        for c in hits
    ]
    old_states = {s['id']: s for s in row.get('finiteSafeStates', [])}
    row['finiteSafeStates'] = [
        {**old_states.get(s['id'], {}), **s, 'evidence': s['captures']}
        for s in group['finiteStates']
    ]
    if row.get('status') != 'Not applicable':
        row['status'] = group['status']
        row['remainingGap'] = ' '.join(group['remainingGaps'])
    # Preserve Tom's exclusion of prototype identity/persistence mechanics.
    if gid == 'N137':
        row['status'] = 'Not applicable'
        row['remainingGap'] = 'Prototype identity/guard mechanics excluded by latest user steering. Product-facing restricted appearance remains covered under its live route/workflow.'
        for s in row['finiteSafeStates']:
            s['status'] = 'Not applicable'
            s['limit'] = 'Excluded prototype mechanics; no production-isolation finding or completion claim.'
    by_id[gid] = row

# Fixture-dependent branches are blocked individually, while a group with an
# inspected empty/restricted branch remains only Partially inspected.
fixture_blocks = {
 'N094': (['S03','S04'], 'Existing To Do fixture has no active assigned jobs or time entries; no records manufactured.'),
 'N132': (['S01','S02','S03','S04','S05'], 'Current Freelancer has zero Offers, Offer history and active jobs; direct Brief unavailable at both widths. No pending offer, time-entry or invoice-upload state manufactured.'),
 'N116': (['S02','S03','S04','S05','S06','S07'], 'Current Edit is not ready; no existing populated review asset reached and no upload performed to manufacture one.'),
 'N117': (['S02','S03','S04','S05','S06','S07','S08'], 'Current Masters has No deliverables yet; populated delivery/video/version branches unavailable without creating records.')
}
for gid, (suffixes, reason) in fixture_blocks.items():
    row = by_id[gid]
    row['fixtureLimitation'] = reason
    for state in row['finiteSafeStates']:
        if state['id'].split('-')[-1] in suffixes and not state.get('captures'):
            state['status'] = 'Blocked'
            state['limit'] = reason
    row['remainingGap'] += ' Fixture limitation: ' + reason

result = list(by_id.values())
summary = {'mode': 'write' if args.write else 'dry run', 'entries': len(result), 'routes': sum(r['id'].startswith('R') for r in result), 'workflowGroups': sum(r['id'].startswith('N') for r in result), 'statuses': {s: sum(r.get('status') == s for r in result) for s in ['Inspected', 'Partially inspected', 'Not inspected', 'Blocked', 'Not applicable']}, 'evidenceScope': mapping['scope']}
if args.write:
    # Backup is an audit artifact, not an application change.
    backup = root / 'reviewers/coverage-register-before-b-merge.json'
    if not backup.exists():
        backup.write_text(master_path.read_text())
    master_path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    (root / 'reviewers/coverage-merge-summary.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary))
