import {createReadStream, realpathSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {run} from './engine.mjs';

export async function main(args, stdin=process.stdin, stdout=process.stdout, stderr=process.stderr) {
  const usage='Usage: node redact.mjs INPUT.json|- [--audit NEW_FILE.json] [--strict]\n';
  if(args.length===1&&args[0]==='--help'){stdout.write(usage);return 0;}
  let auditPath, strict=false;
  if(!args.length){stderr.write(usage);return 2;}
  const inputPath=args[0];
  for(let i=1;i<args.length;i++){
    if(args[i]==='--strict'&&!strict)strict=true;
    else if(args[i]==='--audit'&&!auditPath&&args[i+1]&&!args[i+1].startsWith('--'))auditPath=args[++i];
    else {stderr.write(usage);return 2;}
  }
  if(inputPath.startsWith('--')){stderr.write(usage);return 2;}
  let result;
  try {
    const source=inputPath==='-'?stdin:createReadStream(inputPath);
    let bytes=0;const chunks=[];
    for await(const chunk of source){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);bytes+=buffer.length;if(bytes>800000)throw Error('size');chunks.push(buffer);}
    const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
    result=run(JSON.parse(text));
  }catch {stderr.write('Input rejected: check file access, UTF-8 JSON, rules and size limits.\n');return 2;}
  if(strict&&result.unmatchedPaths.length){stderr.write('Policy rejected: one or more exact paths were unmatched.\n');return 3;}
  if(auditPath){
    try {await writeFile(auditPath,JSON.stringify({metrics:result.metrics,audit:result.audit,unmatchedPaths:result.unmatchedPaths},null,2)+'\n',{flag:'wx',mode:0o600});}
    catch {stderr.write('Audit could not be created. Choose a new writable file path.\n');return 2;}
  }
  stdout.write(result.rows[0].output+'\n');return 0;
}
function invokedDirectly(){try{return process.argv[1]&&realpathSync(process.argv[1])===realpathSync(fileURLToPath(import.meta.url));}catch{return false;}}
if(invokedDirectly())process.exitCode=await main(process.argv.slice(2));
