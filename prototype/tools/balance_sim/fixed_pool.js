'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
async function runJobs(jobs,{workers=1,label='検査'}={}){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'vb-fixed-')),results=new Array(jobs.length);let next=0,done=0,failed=false;
  async function work(){while(next<jobs.length&&!failed){const index=next++,input=path.join(tmp,`${index}.json`),out=path.join(tmp,`${index}.out.json`);
    fs.writeFileSync(input,JSON.stringify(jobs[index]));
    await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[path.join(__dirname,'fixed_worker.js'),input,out],{stdio:['ignore','ignore','pipe']});let error='';
      child.stderr.on('data',chunk=>{error+=chunk;});child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(`${label} ${index}: ${error||code}`)));
    }).catch(e=>{failed=true;throw e;});
    results[index]=JSON.parse(fs.readFileSync(out,'utf8'));done++;console.log(`${label} ${done}/${jobs.length} ${jobs[index].scene||jobs[index].kind}`);
    fs.unlinkSync(input);fs.unlinkSync(out);
  }}
  try{const settled=await Promise.allSettled(Array.from({length:Math.min(workers,jobs.length)},work));const bad=settled.find(s=>s.status==='rejected');if(bad)throw bad.reason;return results;}
  finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
module.exports={runJobs};
