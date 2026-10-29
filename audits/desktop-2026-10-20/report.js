/* Local audit renderer. Review choices live in memory and are saved only by explicit JSON export. */
(() => {
  'use strict';
  const D = window.AUDIT_DATA || {};
  const meta = D.meta || D.metadata || {};
  const array = value => value == null ? [] : Array.isArray(value) ? value : [value];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const human = value => String(value).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]+/g,' ').replace(/^./,c=>c.toUpperCase());
  const asText = value => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : Array.isArray(value) ? value.map(asText).join(' ') : value && typeof value === 'object' ? Object.values(value).map(asText).join(' ') : '';
  const slug = value => String(value || '').replace(/[^a-z0-9_-]+/gi,'-');
  const safeHref = value => {
    const text = String(value || '');
    return /^(https?:\/\/|#|\.\.?\/|[a-z0-9_ -]+\/)/i.test(text) && !/^(javascript|data):/i.test(text) ? text : '#';
  };
  const rich = value => esc(value).replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,url)=>`<a href="${esc(safeHref(url.replace(/&amp;/g,'&')))}" target="_blank" rel="noopener">${label}</a>`).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');
  const valueHtml = value => {
    if (value == null || value === '') return '<span class="muted">Not supplied</span>';
    if (Array.isArray(value)) return value.length ? `<ul class="data-list">${value.map(item=>`<li>${valueHtml(item)}</li>`).join('')}</ul>` : '<span class="muted">None recorded</span>';
    if (typeof value === 'object') return `<dl class="metadata-grid">${Object.entries(value).filter(([,v])=>v!=null).map(([k,v])=>`<dt>${esc(human(k))}</dt><dd>${valueHtml(v)}</dd>`).join('')}</dl>`;
    return `<p>${rich(value)}</p>`;
  };
  const pill = (value,type='') => `<span class="pill ${type?'pill-'+type+'-'+slug(value):''}">${esc(value || 'Not recorded')}</span>`;
  const roles = item => array(item.roles || item.applicableRoles);
  const routeList = item => array(item.routes || item.route || item.exampleUrl);
  const family = item => item.family || item.componentFamily || '';
  const reviewStatuses = ['Needs decision','Approved','Deferred','Fixed','Verified'];
  const findings = array(D.findings).map((f,i)=>({...f,id:f.id || `F${String(i+1).padStart(3,'0')}`}));
  const findingsById = new Map(findings.map(f=>[f.id,f]));
  const review = new Map(findings.map(f=>[f.id,{status:f.reviewStatus || 'Needs decision',note:''}]));
  const initialReview = () => new Map(findings.map(f=>[f.id,{status:f.reviewStatus || 'Needs decision',note:''}]));
  let changed = false;
  const captures = [...array(D.evidence),...array(D.captures),...array(D.screenshots)];
  const evidenceById = new Map(captures.filter(c=>c&&typeof c==='object').map(c=>[String(c.id),c]));
  const localImage = path => {
    const p=String(path || '');
    if (!p || /^(https?:|data:|javascript:|file:)/i.test(p)) return null;
    if (/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(p)) return p;
    return null;
  };
  function resolveEvidence(ref) {
    if (!ref) return null;
    if (typeof ref === 'object') {
      const found=ref.id && evidenceById.get(String(ref.id));
      const merged={...(found || {}),...ref};
      const path=merged.path || merged.src || merged.file || merged.image || merged.screenshot || null;
      return {...merged,path:localImage(path)};
    }
    const id=String(ref);
    const known=evidenceById.get(id) || captures.find(c=>c&&typeof c==='object'&&String(c.id).startsWith(id+'-'));
    if (known) return resolveEvidence(known);
    const path=localImage(id);
    if (path) return {id,path};
    return null;
  }
  function evidenceRefs(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap(evidenceRefs);
    if (typeof value==='string') return [value];
    if (value.path || value.src || value.file || value.image || value.screenshot || value.id) return [value];
    return ['screenshots','screenshotIds','captures','current','currentScreenshots','images','panels'].flatMap(k=>evidenceRefs(value[k]));
  }
  function figure(ref,label='Current prototype') {
    const e=resolveEvidence(ref);
    if (!e || !e.path) return `<div class="no-reference"><strong>${esc(label)}</strong>No local screenshot is attached. ${typeof ref==='string'?esc(ref):''}</div>`;
    const title=e.title || e.id || label;
    const route=String(e.route || e.url || 'Not recorded').replace(/^https?:\/\/localhost:\d+/,'');
    const role=e.role || 'Not recorded';
    const viewport=e.viewport || (e.width?`${e.width}${e.height?' × '+e.height:''}px`:'Not recorded');
    const state=e.state || 'Not recorded';
    const note=e.caption || e.notes || '';
    const context=`Route: ${route} | Role: ${role} | Viewport: ${viewport} | State: ${state}`;
    const caption=context+(note?' | '+asText(note):'');
    return `<figure class="evidence-figure"><span class="evidence-label">${esc(label)}</span><button type="button" class="evidence-trigger" data-image="${esc(e.path)}" data-title="${esc(title)}" data-caption="${esc(caption)}" aria-label="Enlarge ${esc(title)}"><img src="${esc(e.path)}" loading="lazy" alt="${esc(title+': '+caption)}"></button><figcaption><strong>${esc(title)}</strong><dl class="capture-context"><dt>Route</dt><dd class="route-code">${esc(route)}</dd><dt>Role</dt><dd>${esc(role)}</dd><dt>Viewport</dt><dd>${esc(viewport)}</dd><dt>State</dt><dd>${esc(state)}</dd></dl>${note?`<p class="capture-note">${esc(asText(note))}</p>`:''}${e.captured?`<span class="capture-timestamp">Captured ${esc(e.captured)}</span>`:''}<a href="${esc(e.path)}" target="_blank" rel="noopener">Open full screenshot</a></figcaption></figure>`;
  }
  function supportingLinks() {
    const defaults=[{label:'Finding register (JSON)',path:'data/findings.json'},{label:'Finding register (CSV)',path:'data/findings.csv'},{label:'Coverage register (JSON)',path:'data/coverage-register.json'}];
    const supplied=D.supportingFiles;
    const files=Array.isArray(supplied)?supplied:supplied&&typeof supplied==='object'?Object.entries(supplied).map(([label,path])=>({label,path})):defaults;
    return `<div class="supporting-files"><strong>Supporting registers</strong><div>${files.map(file=>{const path=typeof file==='string'?file:file.path || file.href || '';const label=typeof file==='string'?file:file.label || file.name || path;return `<a href="${esc(safeHref(path))}" target="_blank" rel="noopener">${esc(label)}</a>`;}).join('')}</div><p>These supplied registers are the audit baseline. Export review JSON separately to save temporary review choices and notes.</p></div>`;
  }
  function unfinishedScopeHtml() {
    const pending=coverage.filter(c=>!['Inspected','Not applicable'].includes(c.status || 'Not inspected'));
    const supplied=D.scope?.unfinishedScope || D.scope?.unfinished || D.scope?.remainingWork || meta.unfinishedScope || D.unfinishedScope || D.remainingWork;
    if (!pending.length && !array(supplied).length) return `<div class="unfinished-scope"><h3>Desktop inspection complete; recommendations await review</h3><p>The defined finite desktop states are reconciled in the coverage register. External outcomes, unused code and deferred mobile work are explicitly excluded. This records inspection, not approval, implementation or a claim that every data combination was tested.</p><a href="#scope">Read the inspection boundaries</a></div>`;
    return `<div class="unfinished-scope" id="unfinished-scope"><span class="eyebrow">Completion boundary</span><h3>Partial audit: unfinished scope</h3><p>${pending.length?`${pending.length} coverage entries remain partially inspected, not inspected or blocked.`:'Further inspection remains as recorded below.'} Default page captures do not cover their menus, dialogs, keyboard states or other role variants.</p>${supplied?valueHtml(supplied):'<p>Required safe states and unverified branches are listed in the complete coverage register. Mutation-only branches were deliberately not executed under the audit boundaries.</p>'}${pending.length?`<details><summary>See ${pending.length} unfinished coverage entries</summary><ul>${pending.map(c=>`<li><a href="#coverage-${esc(c.id)}">${esc(c.id)} · ${esc(c.name || c.surface || c.route || c.id)}</a> ${pill(c.status || 'Not inspected','status')}<p>${esc(asText(c.remainingGap || c.gaps || c.remainingGaps || c.reason || 'Required state verification remains.'))}</p></li>`).join('')}</ul></details>`:''}<a href="#coverage">Review the full coverage register</a></div>`;
  }
  function sourceHtml(source) {
    const raw=typeof source==='object' ? source.path || source.source || source.file || '' : String(source || '');
    const match=raw.match(/^(.*?)(?::(\d+))?$/);
    const file=match?match[1]:raw,line=match?match[2]:'';
    if (!file) return '';
    let href=file;
    const repoRoot=meta.repositoryPath || '/Users/gclt1/GitHub/brisk-prototype/';
    if (href.startsWith(repoRoot)) href=href.slice(repoRoot.length).replace(/^\//,'');
    if (!href.startsWith('http') && !href.startsWith('../') && !href.startsWith('#')) href='../../'+href;
    return `<a class="source-link" href="${esc(safeHref(href))}" target="_blank" rel="noopener" title="${esc(line?'Source line '+line:'Source file')}">${esc(raw)}</a>`;
  }
  function sourcesHtml(values) {return `<ul class="source-list">${array(values).map(s=>`<li>${sourceHtml(s)}</li>`).join('')}</ul>`;}
  function fieldsHtml(item,keys) {
    return `<dl class="metadata-grid">${keys.filter(key=>item[key]!=null && item[key]!=='').map(key=>`<dt>${esc(human(key))}</dt><dd>${key==='sources'||key==='sourceMapping'?sourcesHtml(item[key]):valueHtml(item[key])}</dd>`).join('')}</dl>`;
  }
  function findingLinks(ids) {
    return `<div class="finding-links">${array(ids).map(id=>{const f=findingsById.get(typeof id==='object'?id.id:id);return f?`<a href="#finding-${esc(f.id)}">${esc(f.id)} · ${esc(f.title)}</a>`:'';}).join('')}</div>`;
  }
  function container(id,html) {document.getElementById(id).innerHTML=html;}
  const none = text => `<div class="empty-note">${esc(text)}</div>`;
  function renderExecutive() {
    const title=meta.title || D.title || 'A clearer, more coherent Brisk';
    const status=meta.status || D.status || 'Partial audit - review in progress';
    const executive=D.executive || {};
    const coverage=array(D.coverage || D.coverageRegister);
    const inspected=coverage.filter(c=>c.status==='Inspected').length;
    const scopeCounts=meta.counts || D.counts || {};
    const high=findings.filter(f=>f.severity==='S1'||f.severity==='S2');
    const highlights=array(executive.highlights || D.highlights);
    document.title=(meta.title || 'Brisk desktop audit')+' - review pack';
    document.getElementById('sidebar-date').textContent=meta.date || D.date || '20 October 2026';
    document.getElementById('nav-finding-count').textContent=String(findings.length);
    let html=`<span class="eyebrow">Brisk / Desktop UI audit</span><div class="audit-status">${esc(status)}</div><h1 id="executive-title">${esc(title)}</h1><div class="lead-copy">${valueHtml(executive.summary || meta.summary || D.summary || 'An evidence-based review of the current desktop prototype. Inspection gaps are recorded explicitly; recommendations require review before implementation.')}</div><div class="stats-grid"><div class="stat"><span class="stat-value">${esc(scopeCounts.findings??findings.length)}</span><span class="stat-label">Consolidated findings</span></div><div class="stat"><span class="stat-value">${esc(scopeCounts.highPriority??high.length)}</span><span class="stat-label">Higher-impact findings</span></div><div class="stat"><span class="stat-value">${esc(scopeCounts.routes??(array(D.routes).length||coverage.filter(c=>String(c.id).startsWith('R')).length))}</span><span class="stat-label">Discovered route patterns</span></div><div class="stat"><span class="stat-value">${esc(scopeCounts.captures??captures.length)}</span><span class="stat-label">Current screenshot captures</span></div></div>`;
    if (executive.note || meta.completionNote || D.completionNote) html+=`<div class="panel">${valueHtml(executive.note || meta.completionNote || D.completionNote)}</div>`;
    html+='<h3>Highest-impact observations</h3><div class="highlight-list">';
    if (highlights.length) html+=highlights.map(h=>typeof h==='string'?`<div class="highlight">${valueHtml(h)}</div>`:`<div class="highlight"><a href="${h.findingId?'#finding-'+esc(h.findingId):'#findings'}">${esc(h.title || h.id || 'Observation')}</a>${valueHtml(h.summary || h.impact || h.description)}</div>`).join('');
    else html+=[...findings].sort((a,b)=>String(a.severity).localeCompare(String(b.severity))).slice(0,4).map(f=>`<div class="highlight"><a href="#finding-${esc(f.id)}">${esc(f.id)} · ${esc(f.title)}</a><p>${esc(f.impact || f.observed || '')}</p></div>`).join('') || none('No consolidated findings have been supplied yet.');
    html+='</div>'+unfinishedScopeHtml()+supportingLinks();container('executive-content',html);
  }
  function renderScope() {
    const scope=D.scope || {};
    let html='<div class="panel-grid"><div class="panel"><h3>Inspected baseline</h3>';
    html+=valueHtml(scope.baseline || meta.baseline || D.baseline || {repository:meta.repository || 'Brisk prototype',branch:meta.branch || 'Not recorded',commit:meta.commit || meta.head || 'Not recorded',desktopWidths:'1440px and approximately 1133px; actual coverage is recorded below'});
    html+='</div><div class="panel"><h3>Boundaries & limitations</h3>'+valueHtml(scope.limitations || meta.limitations || D.limitations || ['Audit and recommendations only.','No implementation or approval is implied.','Uninspected states remain explicit in the coverage register.'])+'</div></div>';
    if (scope.authority || D.authority) html+='<div class="panel"><h3>Authority order</h3>'+valueHtml(scope.authority || D.authority)+'</div>';
    if (scope.exclusions || D.exclusions) html+='<div class="panel"><h3>Exclusions</h3>'+valueHtml(scope.exclusions || D.exclusions)+'</div>';
    if (scope.preservation || meta.preservation || D.preservation) html+='<div class="panel"><h3>Preservation & verification</h3>'+valueHtml(scope.preservation || meta.preservation || D.preservation)+'</div>';
    container('scope-content',html);
  }
  const coverage = array(D.coverage || D.coverageRegister);
  function renderCoverage() {
    if (!coverage.length) return container('coverage-content',none('Coverage data has not been supplied. The audit is not established as complete.'));
    const counts={};coverage.forEach(c=>{counts[c.status || 'Not inspected']=(counts[c.status || 'Not inspected']||0)+1;});
    container('coverage-content',`<div class="coverage-closure"><strong>${coverage.filter(c=>['Inspected','Not applicable'].includes(c.status)).length} of ${coverage.length} entries reconciled</strong><p>Each live workflow records its finite applicable states and actual role/desktop evidence. Not applicable entries retain their exclusion reason. Inspection records an assessment, including failures; it does not mean a recommendation passed, was approved or was fixed.</p></div><div class="coverage-counts">${Object.entries(counts).map(([s,count])=>`${pill(s,'status')} <span class="small muted">${count}</span>`).join('')}</div><div class="coverage-toolbar"><label class="sr-only" for="coverage-search">Search coverage</label><input id="coverage-search" type="search" aria-label="Search coverage register" placeholder="Search route, workflow, state or gap"><select id="coverage-status" aria-label="Filter coverage status"><option value="">All coverage statuses</option>${Object.keys(counts).map(s=>`<option>${esc(s)}</option>`).join('')}</select><span id="coverage-results" role="status"></span></div><div class="table-wrap"><table class="coverage-table"><thead><tr><th>ID</th><th>Surface & entry</th><th>Roles</th><th>Coverage</th><th>Evidence & remaining gaps</th></tr></thead><tbody id="coverage-rows"></tbody></table></div>`);
    const draw=()=>{
      const q=document.getElementById('coverage-search').value.toLowerCase(),status=document.getElementById('coverage-status').value;
      const visible=coverage.filter(c=>(!q||asText(c).toLowerCase().includes(q))&&(!status||(c.status||'Not inspected')===status));
      document.getElementById('coverage-results').textContent=visible.length+' of '+coverage.length;
      container('coverage-rows',visible.map(c=>{
        const refs=evidenceRefs(c.screenshots || c.screenshotEvidence || c.evidence || c.currentEvidence);
        const states=c.states || c.relevantStates || c.finiteSafeStates;
        const gaps=c.gaps || c.remainingGap || c.remainingGaps || c.reason || 'No remaining gap recorded; inspect the stated coverage before assuming completeness.';
        return `<tr id="coverage-${esc(c.id)}"><td>${esc(c.id)}</td><td><strong>${esc(c.name || c.surface || c.workflow || c.route || c.id)}</strong><code>${esc(c.route || c.exampleUrl || routeList(c).join(', '))}</code>${c.classification?`<p class="small muted">${esc(c.classification)}</p>`:''}<p class="small">${esc(c.entryPath || c.entry || '')}</p>${sourcesHtml(c.sources || c.sourceMapping || c.source)}${states?`<details><summary>Required states & branches</summary>${valueHtml(states)}</details>`:''}</td><td>${roles(c).map(r=>`<div>${esc(r)}</div>`).join('')}</td><td>${pill(c.status || 'Not inspected','status')}${valueHtml(c.browser || c.browserVerification || c.verification || c.browserPerformed || '')}</td><td><p>${esc(asText(gaps))}</p>${refs.map(ref=>{const e=resolveEvidence(ref);return e&&e.path?`<a href="${esc(e.path)}" target="_blank" rel="noopener" class="source-link">${esc(e.id || 'Screenshot')}</a>`:'';}).join(' ')}${c.mutationOnlyBranches?`<details><summary>Mutation branches not executed</summary>${valueHtml(c.mutationOnlyBranches)}</details>`:''}</td></tr>`;
      }).join('') || '<tr><td colspan="5">No coverage entries match.</td></tr>');
    };
    document.getElementById('coverage-search').addEventListener('input',draw);document.getElementById('coverage-status').addEventListener('change',draw);draw();
  }
  function renderCatalogue() {
    const items=array(D.catalogue || D.componentCatalogue || D.baselineCatalogue);
    container('catalogue-content',items.length?`<div class="catalogue-grid">${items.map((c,i)=>`<article class="catalogue-card" id="catalogue-${esc(c.id || i)}"><span class="eyebrow">${esc(c.id || 'Pattern '+(i+1))}</span><h3>${esc(c.title || c.family || c.name || 'Pattern')}</h3>${fieldsHtml(c,['approvedComponent','pattern','authority','canonicalExample','variants','permittedVariants','rules','conflicts','missingVariants','decisions','sources'])}${evidenceRefs(c.screenshots || c.evidence || c.referenceScreenshot || c.screenshot).map(r=>figure(r,'Canonical reference')).join('')}</article>`).join('')}</div>`:none('The canonical pattern catalogue has not been supplied yet. Existing frequency does not establish approval.'));
  }
  function uniqueEvidence(refs) {
    const seen=new Set();
    return refs.filter(ref=>{const e=resolveEvidence(ref);const key=e?.id || e?.path || asText(ref);if(seen.has(key))return false;seen.add(key);return true;});
  }
  function supportingFindingEvidence(f,current,approved) {
    const annotations=uniqueEvidence(evidenceRefs(f.annotatedPanels));
    const focal=uniqueEvidence(evidenceRefs(f.focusedCrop));
    const comparisons=uniqueEvidence(evidenceRefs(f.currentComparison));
    const occupied=new Set([...current,...approved,...annotations,...focal,...comparisons].map(ref=>{const e=resolveEvidence(ref);return e?.id || e?.path || asText(ref);}));
    const supporting=uniqueEvidence(evidenceRefs(f.supportingScreenshots)).filter(ref=>{const e=resolveEvidence(ref);return !occupied.has(e?.id || e?.path || asText(ref));});
    const annotationMetadata=annotations.some(ref=>resolveEvidence(ref)?.path?.includes('a-completion-comparisons/'))?'reviewers/a-completion-comparisons/provenance.json':'reviewers/a-comparisons/panels.json';
    let html='';
    if(f.evidencePanel)html+=`<p><a href="${esc(safeHref(f.evidencePanel))}" target="_blank" rel="noopener">Open the matched interaction comparison with retained originals</a></p>`;
    if(annotations.length) html+=`<section class="annotated-evidence" aria-label="Annotated current screenshot evidence"><h4>Annotated current evidence</h4><p>These panels identify regions in genuine current screenshots. They are evidence annotations, not proposals or verified fixes. <a href="${annotationMetadata}" target="_blank" rel="noopener">Crop metadata and retained originals</a></p><div class="annotated-grid">${annotations.map(ref=>figure(ref,'Annotated current evidence')).join('')}</div></section>`;
    const extraCount=focal.length+comparisons.length+supporting.length;
    if(extraCount)html+=`<details class="supporting-evidence"><summary>Supporting evidence · ${extraCount} ${extraCount===1?'image':'images'}</summary><div class="supporting-evidence-body">${focal.length?`<h4>Focused current crops</h4><div class="evidence-grid">${focal.map(ref=>figure(ref,'Focused current crop')).join('')}</div>`:''}${comparisons.length?`<h4>Current UI comparisons</h4><p class="small muted">These captures compare existing widths or contexts. They do not establish an approved replacement or a verified fix.</p><div class="evidence-grid">${comparisons.map(ref=>figure(ref,'Current UI comparison')).join('')}</div>`:''}${supporting.length?`<h4>Additional full captures</h4><div class="evidence-grid">${supporting.map(ref=>figure(ref,'Supporting current capture')).join('')}</div>`:''}</div></details>`;
    return html;
  }
  function designEvidence(item) {
    const refs=uniqueEvidence(evidenceRefs(item.screenshots || item.evidence));
    if(!refs.length)return none('No current evidence attached to this assessment.');
    const contexts=array(item.captureContexts);
    const contextual=ref=>{if(typeof ref==='string'){const c=contexts.find(c=>c.id===ref);if(c)return c;}return ref;};
    return figure(contextual(refs[0]),'Current design evidence')+(refs.length>1?`<details class="supporting-evidence"><summary>${refs.length-1} more ${refs.length===2?'capture':'captures'}</summary><div class="supporting-evidence-body evidence-grid">${refs.slice(1).map(ref=>figure(contextual(ref),'Supporting current capture')).join('')}</div></details>`:'');
  }
  function renderDesignAssessment() {
    const raw=D.designAssessment;
    if(!raw)return container('design-assessment-content',none('The design assessment has not been supplied. Strengths and optional refinements should be scoped to current evidence.'));
    const a=Array.isArray(raw)?{strengths:raw}:raw;
    const strengths=array(a.strengths),refinements=array(a.refinements || a.optionalRefinements),principles=a.principles || a.crossAppPreservePrinciples;
    let html=`<div class="design-introduction"><p class="lead-copy">${rich(a.summary || a.overallAssessment || '')}</p>${a.purpose?`<p class="muted">${esc(a.purpose)}</p>`:''}</div><div class="assessment-kicker"><h3>What is already working</h3><span>${strengths.length} evidence-based strengths</span></div><div class="design-strengths">`;
    html+=strengths.map(item=>`<article class="design-card strength-card" id="design-${esc(item.id)}"><header><span class="eyebrow">${esc(item.id || 'Strength')} · Preserve</span><h3>${esc(item.title || item.name || 'Design strength')}</h3>${item.area?pill(item.area):''}</header><div class="design-card-layout"><div class="design-reasoning">${item.whyItWorks?`<h4>Why it works</h4>${valueHtml(item.whyItWorks)}`:''}${item.taskBenefit?`<h4>Task benefit</h4>${valueHtml(item.taskBenefit)}`:''}${item.preservePrinciples || item.preserve?`<div class="preserve-callout"><h4>Preserve</h4>${valueHtml(item.preservePrinciples || item.preserve)}</div>`:''}${fieldsHtml(item,['authority','limits'])}${sourcesHtml(item.sources)}</div><div class="design-evidence">${designEvidence(item)}</div></div></article>`).join('');
    html+='</div><div class="assessment-kicker"><h3>Optional craft refinements</h3><span>Design judgements, not confirmed defects</span></div><div class="optional-scope-note">These refinements are proposals for Tom’s review. Their benefits are reasoned design judgements or hypotheses, not measured user outcomes. They do not override approved patterns or authorise implementation.</div>';
    html+=refinements.map(item=>`<article class="design-card refinement-card" id="design-${esc(item.id)}"><header><span class="eyebrow">${esc(item.id || 'Refinement')} · Optional</span><h3>${esc(item.title || item.name || 'Craft refinement')}</h3>${item.classification?pill(item.classification):''}</header><div class="design-card-layout"><div class="design-reasoning">${item.whyConsider || item.rationale?`<h4>Why consider it</h4>${valueHtml(item.whyConsider || item.rationale)}`:''}<h4>Smallest coherent change</h4>${valueHtml(item.smallestCoherentChange || item.smallestCoherentImprovement || item.recommendation)}${fieldsHtml(item,['taskBenefit','tradeoffs','alternatives','decisionNeeded','decision','authority','limits'])}${sourcesHtml(item.sources)}${findingLinks(item.relatedFinding || item.findingIds)}</div><div class="design-evidence">${designEvidence(item)}</div></div></article>`).join('');
    if(principles)html+=`<div class="panel design-principles"><h3>Principles to carry through every batch</h3>${valueHtml(principles)}</div>`;
    if(a.limits)html+=`<div class="assessment-limits"><strong>Assessment limits</strong>${valueHtml(a.limits)}</div>`;
    container('design-assessment-content',html);
  }
  const filterDefs=[['area','Area',f=>array(f.area)],['family','Component family',f=>array(family(f))],['role','Role',roles],['category','Category',f=>array(f.category)],['severity','Severity',f=>array(f.severity)],['reviewStatus','Review status',f=>array(review.get(f.id).status)]];
  function renderFilters() {
    container('finding-filters',filterDefs.map(([key,label,getter])=>{
      const values=key==='reviewStatus'?reviewStatuses:[...new Set(findings.flatMap(getter).filter(Boolean))].sort();
      return `<label>${esc(label)}<select id="filter-${key}"><option value="">All ${esc(label.toLowerCase())}</option>${values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select></label>`;
    }).join(''));
    filterDefs.forEach(([key])=>document.getElementById('filter-'+key).addEventListener('change',renderFindings));
    document.getElementById('finding-search').addEventListener('input',renderFindings);
    document.getElementById('clear-filters').addEventListener('click',()=>{filterDefs.forEach(([key])=>document.getElementById('filter-'+key).value='');document.getElementById('finding-search').value='';renderFindings();});
  }
  function findingCard(f) {
    const rv=review.get(f.id);
    const current=evidenceRefs(f.currentScreenshot || f.currentScreenshots || f.screenshots || f.evidence);
    const approved=evidenceRefs(f.approvedReferenceScreenshot || f.approvedScreenshot || f.referenceScreenshot || f.referenceScreenshots || (typeof f.approvedReference==='object'||localImage(f.approvedReference)?f.approvedReference:null));
    const referenceNote=typeof f.approvedReference==='string'?f.approvedReference : f.referenceNote || 'No approved reference screenshot exists for this specific issue. The written authority below defines the expected standard.';
    const repro=[f.reproSteps,f.reproductionSteps,f.reproduction,f.evidence?.reproSteps,f.evidence?.reproduction].find(v=>v&&(!Array.isArray(v)||v.length));
    const reproContent=Array.isArray(repro)?`<ol>${repro.map(step=>`<li>${valueHtml(step)}</li>`).join('')}</ol>`:valueHtml(repro);
    const prose=[['Observed',f.observed || f.observedBehaviour || f.description],['Expected standard',f.expected || f.expectedStandard],['Recommended change',f.recommendation || f.recommendedChange],['Why this helps',f.rationale],['Alternatives & trade-offs',f.alternatives || f.tradeoffs?{alternatives:f.alternatives,tradeoffs:f.tradeoffs}:null]];
    return `<article class="finding-card" id="finding-${esc(f.id)}"><header class="finding-heading"><div class="finding-heading-top"><span class="finding-id">${esc(f.id)}</span><label class="review-control">Session review status<select data-review-id="${esc(f.id)}" aria-label="Review status for ${esc(f.id)}">${reviewStatuses.map(s=>`<option${rv.status===s?' selected':''}>${esc(s)}</option>`).join('')}</select></label></div><h3>${esc(f.title)}</h3><div class="finding-submeta">${pill(f.severity,'severity')}${pill(f.classification || f.evidenceClassification || 'Classification not recorded')}<span>${esc(f.category || '')}</span><span>·</span><span>${esc(f.confidence || 'Confidence not recorded')}</span></div><div class="tag-list" style="margin-top:12px">${[f.area,family(f),...roles(f)].filter(Boolean).map(v=>pill(v)).join('')}</div></header><div class="finding-body">${f.impact?`<div class="impact-callout"><strong>Practical user impact</strong>${rich(f.impact)}</div>`:''}<div class="finding-layout"><div class="finding-prose">${prose.filter(([,v])=>v).map(([title,v])=>`<div><h4>${title}</h4>${valueHtml(v)}</div>`).join('')}${repro?`<div><h4>Behavioural reproduction steps</h4>${reproContent}</div>`:''}</div><div class="finding-evidence"><div class="evidence-grid ${current.length+approved.length<2?'single':''}">${current.length?current.map(r=>figure(r,'Current prototype')).join(''):none('No current screenshot attached. The finding must retain an explicit verification gap.')}${approved.map(r=>figure(r,'Approved reference')).join('')}</div>${!approved.length?`<div class="no-reference"><strong>Approved visual reference</strong>${esc(referenceNote)}</div>`:''}</div></div>${supportingFindingEvidence(f,current,approved)}<details class="finding-details"><summary>Authority, affected locations & verification</summary>${fieldsHtml({...f,roles:roles(f),routes:routeList(f)},['roles','roleEvidenceScope','routes','states','classificationDetail','authority','rootCause','occurrences','sources','verificationRemaining','implementationState'])}</details><label class="review-note-label">Temporary review note for ${esc(f.id)}<textarea class="review-note" aria-label="Temporary review note for ${esc(f.id)}" data-note-id="${esc(f.id)}" placeholder="Record a decision, question or follow-up, then export JSON to save it.">${esc(rv.note)}</textarea></label></div></article>`;
  }
  function renderFindings() {
    const q=document.getElementById('finding-search').value.toLowerCase();
    const visible=findings.filter(f=>(!q||asText(f).toLowerCase().includes(q))&&filterDefs.every(([key,,getter])=>{const v=document.getElementById('filter-'+key).value;return !v||getter(f).includes(v);}));
    document.getElementById('finding-results').textContent=`${visible.length} of ${findings.length} findings`;
    container('findings-content',visible.map(findingCard).join('') || none('No findings match the current filters.'));
  }
  function renderComparisons() {
    const items=array(D.comparisons || D.crossAppComparisons);
    container('comparisons-content',items.length?items.map((c,i)=>`<article class="comparison-card"><span class="eyebrow">${esc(c.id || 'Comparison '+(i+1))}</span><h3>${esc(c.title || c.family || c.name || 'Comparison')}</h3>${valueHtml(c.summary || c.description || c.rationale)}${fieldsHtml(c,['standard','authority','difference','recommendation','tradeoffs'])}<div class="evidence-grid">${array(c.examples || c.screenshots || c.evidence).map(r=>typeof r==='object'&&(r.screenshot||r.evidence||r.screenshotId)?figure(r.screenshot||r.evidence||r.screenshotId,r.label||r.title||'Current prototype'):figure(r,'Current prototype')).join('')}</div>${findingLinks(c.findingIds || c.findings)}${sourcesHtml(c.sources)}</article>`).join(''):none('No consolidated comparison groups have been supplied. See individual findings for current/reference evidence.'));
  }
  function renderPages() {
    let pages=array(D.pages || D.pageReview);
    if (!pages.length) {
      const grouped=new Map();findings.forEach(f=>routeList(f).forEach(route=>{if(!grouped.has(route))grouped.set(route,[]);grouped.get(route).push(f.id);}));
      pages=[...grouped].map(([route,ids])=>({title:route,route,findingIds:ids,summary:'Known findings for this location. Absence of a finding does not establish that all states were inspected.'}));
    }
    container('pages-content',pages.length?pages.map(p=>`<article class="page-card"><h3>${esc(p.title || p.name || p.route)}</h3>${p.route?`<p class="route-code">${esc(p.route)}</p>`:''}${p.status?pill(p.status,'status'):''}${valueHtml(p.summary || p.observations || p.description)}${fieldsHtml(p,['roles','strengths','gaps','verificationRemaining'])}${findingLinks(p.findingIds || p.findings)}${evidenceRefs(p.screenshots || p.evidence).length?`<details class="compact-details"><summary>Page evidence</summary><div class="evidence-grid">${evidenceRefs(p.screenshots || p.evidence).map(r=>figure(r,'Current page')).join('')}</div></details>`:''}</article>`).join(''):none('Page-level review has not been supplied. Consult the coverage register for unfinished pages.'));
  }
  function renderDecisions() {
    const items=array(D.decisions);
    container('decisions-content',items.length?items.map((d,i)=>`<article class="decision-card"><span class="eyebrow">${esc(d.id || 'Decision '+(i+1))}</span><h3>${esc(d.title || d.question || 'Decision required')}</h3>${d.context || d.description || d.summary?valueHtml(d.context || d.description || d.summary):''}${fieldsHtml(d,['recommendation','recommendedOption','options','alternatives','tradeoffs','consequences','authority'])}${findingLinks(d.findingIds || d.findings)}</article>`).join(''):none('No explicit decision register has been supplied. Findings remain Needs decision unless Tom approves the relevant recommendation.'));
  }
  function renderBatches() {
    const items=array(D.batches || D.implementationBatches);
    container('batches-content',items.length?items.map((b,i)=>`<article class="batch-card"><span class="batch-number">${esc(b.id || i+1)}</span><h3>${esc(b.title || b.name || 'Implementation batch')}</h3>${b.summary || b.scope || b.description?valueHtml(b.summary || b.scope || b.description):''}${fieldsHtml(b,['priority','dependencies','changes','preserve','risks','verification','verificationRequirements','acceptanceCriteria'])}${findingLinks(b.findingIds || b.findings)}</article>`).join(''):none('No implementation batches have been supplied. Do not proceed from this report directly into fixes.'));
  }
  function markChanged(message) {changed=true;const el=document.getElementById('save-notice');el.classList.add('has-changes');el.textContent=message || 'Unsaved session review choices. Export review JSON to save them. Reloading or closing this tab loses changes.';}
  document.addEventListener('change',event=>{
    const el=event.target;
    if(el.matches('[data-review-id]')) {const item=review.get(el.dataset.reviewId);if(item){item.status=el.value;markChanged();renderFindings();}}
  });
  document.addEventListener('input',event=>{const el=event.target;if(el.matches('[data-note-id]')){const item=review.get(el.dataset.noteId);if(item){item.note=el.value;markChanged();}}});
  document.getElementById('export-review').addEventListener('click',()=>{
    const payload={schema:'brisk-desktop-audit-review/v1',auditId:meta.id || D.auditId || 'desktop-2026-10-20',exportedAt:new Date().toISOString(),baselineCommit:meta.commit || meta.head || '',notice:'Review notes and statuses only. This file does not authorise or implement changes.',findings:[...review].map(([id,r])=>({id,reviewStatus:r.status,note:r.note}))};
    const blob=new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='brisk-desktop-audit-review-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);changed=false;document.getElementById('save-notice').classList.remove('has-changes');document.getElementById('save-notice').textContent='Review JSON export requested. Keep the downloaded file and import it to restore these choices. The report itself remains unchanged.';
  });
  document.getElementById('import-review').addEventListener('click',()=>document.getElementById('import-file').click());
  document.getElementById('import-file').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      if(parsed.schema!=='brisk-desktop-audit-review/v1'||!Array.isArray(parsed.findings))throw new Error('Choose a review JSON file exported from this report.');
      if(parsed.auditId && parsed.auditId!==(meta.id || D.auditId || 'desktop-2026-10-20'))throw new Error('This review file belongs to a different audit.');
      let applied=0,skipped=0;
      for(const item of parsed.findings){if(!review.has(item.id)||!reviewStatuses.includes(item.reviewStatus)){skipped++;continue;}review.set(item.id,{status:item.reviewStatus,note:typeof item.note==='string'?item.note:''});applied++;}
      markChanged(`${applied} review choices imported${skipped?', '+skipped+' unknown entries skipped':''}. They are temporary in this tab. Export JSON again after further edits.`);renderFindings();
    }catch(error){document.getElementById('save-notice').textContent='Import failed: '+error.message;}
    event.target.value='';
  });
  document.getElementById('reset-review').addEventListener('click',()=>{
    if(!window.confirm('Reset temporary review choices and notes to the supplied report baseline? Export first if you want to keep them.'))return;
    review.clear();for(const [id,r]of initialReview())review.set(id,r);changed=false;document.getElementById('save-notice').classList.remove('has-changes');document.getElementById('save-notice').textContent='Session choices reset to the supplied report baseline. Exported files and application data are unchanged.';renderFindings();
  });
  const dialog=document.getElementById('evidence-dialog');
  document.addEventListener('click',event=>{const trigger=event.target.closest('[data-image]');if(!trigger)return;document.getElementById('enlarged-evidence').src=trigger.dataset.image;document.getElementById('enlarged-evidence').alt=trigger.dataset.caption;document.getElementById('evidence-dialog-title').textContent=trigger.dataset.title;document.getElementById('evidence-dialog-caption').textContent=trigger.dataset.caption;document.getElementById('open-original').href=trigger.dataset.image;dialog.showModal();});
  document.getElementById('close-evidence').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  document.addEventListener('error',event=>{const img=event.target;if(!(img instanceof HTMLImageElement)||img.id==='enlarged-evidence')return;const box=img.closest('.evidence-trigger');if(box){box.innerHTML='<span class="missing-image">Screenshot could not be loaded. Open the original link to inspect its path.</span>';box.removeAttribute('data-image');}},true);
  window.addEventListener('beforeunload',event=>{if(!changed)return;event.preventDefault();event.returnValue='';});
  renderExecutive();renderScope();renderCoverage();renderCatalogue();renderDesignAssessment();renderFilters();renderFindings();renderComparisons();renderPages();renderDecisions();renderBatches();
  if(!window.AUDIT_DATA)document.getElementById('save-notice').textContent='Report data is not loaded. Populate data/report-data.js with window.AUDIT_DATA; this scaffold does not establish audit completion.';
  if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){document.querySelectorAll('.report-sidebar nav a').forEach(a=>a.classList.toggle('is-active',a.hash==='#'+entry.target.id));}},{rootMargin:'-5% 0px -70% 0px'});document.querySelectorAll('.report-section').forEach(s=>observer.observe(s));}
})();
