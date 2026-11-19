
function obj(v){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Expected an object');return v;}
function arr(v,label='array'){if(!Array.isArray(v)||v.length>500)throw Error(label+' must be an array with at most 500 items');return v;}
function str(v){if(typeof v!=='string'||!v.trim()||v.length>100000)throw Error('Expected nonempty text (max 100000 characters)');return v;}
function num(v,label='number',min=-1e12){if(typeof v!=='number'||!Number.isFinite(v)||v<min||Math.abs(v)>1e12)throw Error(label+' must be a finite number in range');return v;}
function bool(v){if(typeof v!=='boolean')throw Error('Expected a boolean');return v;}
function date(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))throw Error('Expected YYYY-MM-DD');const t=Date.parse(v+'T00:00:00Z');if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==v)throw Error('Invalid calendar date');return t;}
export function run(x){obj(x);if(JSON.stringify(x).length>200000)throw Error('Input exceeds 200 KB limit');

const keys=new Set(arr(x.keys,'keys').map(k=>str(k).toLowerCase()));let count=0;const walk=(v,d=0)=>{if(d>30)throw Error('Nesting too deep');if(Array.isArray(v))return v.map(a=>walk(a,d+1));if(v&&typeof v==='object'){const out=Object.create(null);for(const [k,a]of Object.entries(v)){if(keys.has(k.toLowerCase())){out[k]='[REDACTED]';count++;}else out[k]=walk(a,d+1);}return out;}return v;};const cleaned=walk(x.record);return {metrics:{redacted:count,configuredKeys:keys.size},rows:[{output:JSON.stringify(cleaned,null,2)}]};

}
