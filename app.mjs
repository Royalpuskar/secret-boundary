import {run} from './engine.mjs';
import {sample} from './sample.mjs';
const $=id=>document.getElementById(id);
const escapePart=key=>key.replace(/~/g,'~0').replace(/\//g,'~1');
let result=null;
function lines(id){return $(id).value.split(/\r?\n/).filter(line=>line.trim()!=='');}
function invalidate(message='Policy or source changed. Apply the policy again.'){
 result=null;$('export').disabled=true;$('auditExport').disabled=true;
 $('output').textContent='No current output.';$('audit').replaceChildren();$('unmatched').replaceChildren();
 $('counts').textContent='No current result.';$('state').textContent='Needs review';$('status').textContent=message;
}
function readRecord(){const text=$('input').value;if(text.length>200000)throw Error('Source exceeds 200000 characters');return JSON.parse(text);}
function showError(error){invalidate('Input error: '+error.message);}
function addPath(path){if(path==='')$('root').checked=true;else{const current=new Set(lines('paths'));current.add(path);$('paths').value=[...current].join('\n');}invalidate('Path rule added. Apply policy to review the result.');}
function inspect(){
 $('tree').replaceChildren();
 try{
  const record=readRecord();run({keys:[],record});let count=0;const fragment=document.createDocumentFragment();
  function visit(value,path){if(count>=600)return;count++;
   const row=document.createElement('div');row.className='field';
   const code=document.createElement('code');code.textContent=path||'(whole record)';
   const type=document.createElement('small');type.textContent=Array.isArray(value)?'array':value===null?'null':typeof value;
   const button=document.createElement('button');button.textContent='Redact path';button.setAttribute('aria-label','Redact '+(path||'whole record'));button.onclick=()=>addPath(path);row.append(code,type,button);
   if($('reveal').checked&&(value===null||typeof value!=='object')){const preview=document.createElement('div');preview.className='field-value';const text=JSON.stringify(value);preview.textContent=text.length>200?text.slice(0,200)+'…':text;row.append(preview);}
   fragment.append(row);if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){if(count>=600)break;visit(item,path+'/'+escapePart(key));}
  }
  visit(record,'');$('tree').append(fragment);
  if(count>=600){const note=document.createElement('p');note.className='hint';note.textContent='Tree preview limited to 600 nodes. Redaction still evaluates the complete record within engine limits.';$('tree').append(note);}
 }catch(error){showError(error);}
}
function item(list,text){const node=document.createElement('li');node.textContent=text;list.append(node);}
function apply(){invalidate();try{
 const paths=lines('paths');if($('root').checked)paths.push('');
 result=run({keys:lines('keys'),paths,record:readRecord()});
 $('output').textContent=result.rows[0].output;
 $('counts').textContent=result.metrics.redacted+' values redacted · '+result.metrics.unmatchedPaths+' unmatched paths';
 for(const event of result.audit)item($('audit'),(event.path||'(whole record)')+' · '+event.reason);
 if(!result.audit.length)item($('audit'),'No matching redaction rules.');
 for(const path of result.unmatchedPaths)item($('unmatched'),path||'(whole record)');
 if(!result.unmatchedPaths.length)item($('unmatched'),'None.');
 $('state').textContent='Current result';$('status').textContent='Policy applied. Review remaining values before downloading.';
 $('export').disabled=false;$('auditExport').disabled=false;
 }catch(error){showError(error);}}
function download(name,value){const url=URL.createObjectURL(new Blob([value],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=()=>{if(result)download('redacted-record.json',result.rows[0].output);};
$('auditExport').onclick=()=>{if(result)download('redaction-audit.json',JSON.stringify({metrics:result.metrics,audit:result.audit,unmatchedPaths:result.unmatchedPaths},null,2));};
$('input').oninput=()=>{$('tree').replaceChildren();invalidate('Source changed. Inspect fields or apply the policy.');};
for(const id of ['keys','paths','root'])$(id).addEventListener('input',()=>invalidate());
$('reveal').onchange=inspect;$('inspect').onclick=inspect;$('run').onclick=apply;
function reset(){$('input').value=JSON.stringify(sample.record,null,2);$('keys').value=sample.keys.join('\n');$('paths').value='';$('root').checked=false;$('reveal').checked=false;invalidate();inspect();apply();}
$('reset').onclick=reset;reset();
