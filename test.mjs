import test from 'node:test';
import assert from 'node:assert/strict';
import {run} from './engine.mjs';
import {sample} from './sample.mjs';
test('domain behavior and boundary cases',()=>{assert.equal(run(sample).metrics.redacted,2); assert.ok(!JSON.stringify(run(sample)).includes('SYNTHETIC_TOKEN')); assert.equal(run({...sample,keys:[]}).metrics.redacted,0);});
test('deterministic result and input preservation',()=>{const copy=JSON.stringify(sample);assert.deepEqual(run(sample),run(sample));assert.equal(JSON.stringify(sample),copy);});
test('reject malformed root and oversized input',()=>{assert.throws(()=>run(null));assert.throws(()=>run([]));assert.throws(()=>run({...sample,oversized:'x'.repeat(200001)}));});

test('exact paths preserve same-named public fields',()=>{
 const result=run({keys:[],paths:['/private/value'],record:{private:{value:'SYNTHETIC_SECRET'},public:{value:'visible'}}});
 assert.deepEqual(JSON.parse(result.rows[0].output),{private:{value:'[REDACTED]'},public:{value:'visible'}});
 assert.deepEqual(result.audit,[{path:'/private/value',reason:'exact path'}]);
 assert.ok(!JSON.stringify(result).includes('SYNTHETIC_SECRET'));
});
test('pointer escapes, array indices, empty property names and literal numeric keys',()=>{
 const result=run({keys:[],paths:['/a~1b/~0key/0/','/01'],record:{'a/b':{'~key':[{'':'hidden'}]},'01':'hidden'}});
 assert.equal(result.metrics.redacted,2);
 assert.deepEqual(result.unmatchedPaths,[]);
});
test('root and parent redaction do not traverse removed subtrees',()=>{
 const result=run({keys:[],paths:['/account','/account/token'],record:{account:{token:'hidden'}}});
 assert.equal(result.metrics.redacted,1);
 assert.deepEqual(result.unmatchedPaths,['/account/token']);
 assert.equal(run({keys:[],paths:[''],record:{token:'hidden'}}).rows[0].output,JSON.stringify('[REDACTED]'));
});
test('case-insensitive keys and duplicate paths produce one audit event per value',()=>{
 const result=run({keys:['TOKEN','token'],paths:['/Token','/Token'],record:{Token:'hidden',list:[{token:'hidden'}]}});
 assert.equal(result.metrics.redacted,2);
 assert.equal(result.metrics.configuredKeys,1);
 assert.equal(result.metrics.configuredPaths,1);
 assert.deepEqual(result.audit.map(x=>x.reason),['exact path','field name']);
});
test('unknown and malformed paths are explicit; no wildcard interpretation',()=>{
 assert.deepEqual(run({keys:[],paths:['/missing','/*'],record:{a:1}}).unmatchedPaths,['/missing','/*']);
 for(const path of ['relative','/~2','/~',null,42])assert.throws(()=>run({keys:[],paths:[path],record:{}}));
 assert.throws(()=>run({keys:[],paths:Array(501).fill('/x'),record:{}}));
 assert.throws(()=>run({keys:[]}));
});
test('prototype-like property names are preserved safely',()=>{
 const record=JSON.parse('{"__proto__":{"token":"hidden"},"constructor":"ordinary"}');
 const result=run({keys:['token'],record});
 assert.equal(JSON.parse(result.rows[0].output).__proto__.token,'[REDACTED]');
 assert.equal({}.token,undefined);
});
test('record values and depth boundaries are validated',()=>{
 for(const value of [undefined,()=>{},NaN,Infinity,new Date()])assert.throws(()=>run({keys:[],record:{value}}));
 let record={value:1};for(let i=0;i<31;i++)record={next:record};
 assert.throws(()=>run({keys:[],record}),/Nesting/);
 assert.equal(run({keys:[],record:null}).rows[0].output,'null');
});
