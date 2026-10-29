  const validRule=r=>r.mode==='fixed'||([r.internal,r.first,r.revision].every(x=>x!==''&&Number.isInteger(Number(x))&&Number(x)>0)&&Number(r.internal)<=Number(r.first)&&r.increment!==''&&Number.isInteger(Number(r.increment))&&Number(r.increment)>=0);
  const sameRule=(left,right)=>['mode','internal','first','revision','increment'].every(key=>key==='mode'?left[key]===right[key]:String(left[key])===String(right[key]));
  const ruleDays=value=>value+' '+(Number(value)===1?'day':'days');
  const renderSettings=()=>{
    const rule=state.settings.shared;
    $('#shared-mode-summary').textContent=rule.mode==='auto'?'Automatic · Working days, Monday to Friday':'Specific dates, chosen per project';
    $('#shared-time-summary').hidden=rule.mode!=='auto';
    ['internal','first','revision'].forEach(key=>$('#shared-'+key+'-summary').textContent=ruleDays(rule[key]));
    $('#shared-length-summary').hidden=rule.mode!=='auto';
    $('#shared-length-summary').textContent='Longer edits: +'+ruleDays(rule.increment)+' per extra minute.';
    const entries=Object.entries(state.settings.overrides);
    $('#no-exceptions').hidden=entries.length>0;
    $('#saved-stage-exceptions').replaceChildren();
    entries.forEach(([stage,value])=>{
      const row=$('#saved-exception-template').content.firstElementChild.cloneNode(true);
      row.querySelector('[data-exception-name]').textContent=stage;
      row.querySelector('[data-exception-copy]').textContent=value.mode==='fixed'?'Specific dates':'Internal '+ruleDays(value.internal)+' · Client '+ruleDays(value.first)+' · After feedback '+ruleDays(value.revision);
      if(stage==='Edit'&&value.mode==='auto')row.querySelector('[data-exception-copy]').textContent+=' · +'+ruleDays(value.increment)+' per extra minute';
      const button=row.querySelector('button');button.dataset.stage=stage;button.setAttribute('aria-label','Edit '+stage+' exception');
      $('#saved-stage-exceptions').append(row);
    });
    $('#add-stage-exception').disabled=entries.length===5;
    $('#round-allowance-summary').textContent=state.settings.revisionRounds===null?'Not set':state.settings.revisionRounds+' '+(state.settings.revisionRounds===1?'round':'rounds');
  };
  const readEditorRule=()=>{
    const prefix=state.editor.kind==='shared'?'rule':'override',name=state.editor.kind==='shared'?'settings-mode':'override-mode';
    const value={mode:$('input[name="'+name+'"]:checked').value};
    ['internal','first','revision','increment'].forEach(key=>value[key]=$('#'+prefix+'-'+key).value);
    return value;
  };
  const updateSettingsEditor=()=>{
    if(!state.editor)return;
    if(state.editor.kind==='rounds'){
      const raw=$('#revision-rounds').value,value=raw===''?null:Number(raw);
      $('#rounds-editor-save').disabled=value===state.editor.original;
      return;
    }
    if(state.editor.kind==='exception'&&!state.editor.existing)state.editor.stage=$('input[name="exception-stage"]:checked').value;
    const value=readEditorRule(),prefix=state.editor.kind==='shared'?'shared':'exception';
    $('#'+prefix+'-editor-times').hidden=value.mode!=='auto';
    $('#'+prefix+'-editor-fixed').hidden=value.mode!=='fixed';
    if(prefix==='exception')$('#exception-edit-length').hidden=state.editor.stage!=='Edit';
    $('#'+prefix+'-editor-save').disabled=sameRule(value,state.editor.original??state.settings.shared);
  };
  const openSettingsEditor=(kind,stage)=>{
    state.opener=document.activeElement;
    const existing=kind==='exception'&&Boolean(stage&&state.settings.overrides[stage]);
    const chosenStage=stage||['Script','Storyboard','Edit','Animation','Masters'].find(name=>!state.settings.overrides[name]);
    state.editor={kind,stage:chosenStage,existing,original:kind==='shared'?structuredClone(state.settings.shared):kind==='rounds'?state.settings.revisionRounds:existing?structuredClone(state.settings.overrides[stage]):null};
    const dialog=$('#'+(kind==='shared'?'shared':kind==='rounds'?'rounds':'exception')+'-editor');
    $$('dialog [role="alert"]').forEach(el=>el.hidden=true);
    if(kind==='rounds')$('#revision-rounds').value=state.settings.revisionRounds??'';
    else{
      const rule=kind==='shared'?state.settings.shared:existing?state.settings.overrides[stage]:state.settings.shared;
      const prefix=kind==='shared'?'rule':'override';setRadio(kind==='shared'?'settings-mode':'override-mode',rule.mode);
      ['internal','first','revision','increment'].forEach(key=>$('#'+prefix+'-'+key).value=rule[key]);
      if(kind==='exception'){
        $('#exception-editor h2').textContent=existing?stage+' exception':'Add stage exception';
        $('#exception-stage-picker').hidden=existing;$('#exception-reset').hidden=!existing;
        $$('input[name="exception-stage"]').forEach(input=>{input.disabled=Boolean(state.settings.overrides[input.value]);});
        setRadio('exception-stage',chosenStage);
      }
    }
    updateSettingsEditor();dialog.showModal();
    (dialog.querySelector('input:not(:disabled)')??dialog.querySelector('button:not(:disabled)')).focus();
  };
  const closeSettingsEditor=()=>{
    if(!state.editor)return;
    const editor=state.editor,dialog=$('#'+(editor.kind==='shared'?'shared':editor.kind==='rounds'?'rounds':'exception')+'-editor');
    dialog.close();state.editor=null;
    const replacement=editor.kind==='exception'?$('[data-stage="'+editor.stage+'"]'):null;
    if(state.opener?.isConnected)state.opener.focus();else (replacement??$('#add-stage-exception')).focus();
  };
  const saveSettingsEditor=()=>{
    const editor=state.editor;
    if(editor.kind==='rounds'){
      const raw=$('#revision-rounds').value,value=raw===''?null:Number(raw);
      if(value!==null&&(!Number.isInteger(value)||value<0)){$('#rounds-editor-error').textContent='Use a whole number of rounds, or leave it unset.';$('#rounds-editor-error').hidden=false;return;}
      state.settings.revisionRounds=value;
    }else{
      const value=readEditorRule(),prefix=editor.kind==='shared'?'shared':'exception';
      if(!validRule(value)){$('#'+prefix+'-editor-error').textContent='Use whole working days. Internal WIP1 cannot be later than Client WIP1.';$('#'+prefix+'-editor-error').hidden=false;return;}
      if(editor.kind==='shared')state.settings.shared=value;else state.settings.overrides[editor.stage]=value;
    }
    renderSettings();closeSettingsEditor();feedback('Saved in this preview only. Existing project deadlines have not moved.');
  };
  $$('dialog').forEach(dialog=>{
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeSettingsEditor();});
    dialog.addEventListener('mousedown',event=>{if(event.target!==dialog)return;const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)closeSettingsEditor();});
  });
