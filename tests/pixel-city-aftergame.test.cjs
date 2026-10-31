const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../pixel-city-engine');

function city(){const s=C.createCity();s.stage=C.STAGES.length;s.areas=C.AREAS.map(a=>a.id);s.money=100000;return s;}

test('late-game buildings require the completed campaign and add real city capacity',()=>{
  const s=C.createCity();s.money=100000;
  assert.equal(C.build(s,6,10,'tower').ok,false);
  s.stage=C.STAGES.length;
  const before=C.stats(s);
  assert.equal(C.build(s,6,10,'tower').ok,true);
  assert.equal(C.build(s,14,10,'tech').ok,true);
  const after=C.stats(s);
  assert.equal(after.totalCapacity-before.totalCapacity,48);
  assert.ok(after.jobs>before.jobs);
});

test('projects reward once and old completed cities retain their progress',()=>{
  const s=city();s.population=500;
  assert.equal(C.claimProject(s,'health').ok,false);
  assert.equal(C.build(s,6,10,'hospital').ok,true);
  const balance=s.money;
  assert.equal(C.claimProject(s,'health').ok,true);
  assert.ok(s.money>balance);
  assert.equal(C.claimProject(s,'health').ok,false);
  const restored=C.restore(JSON.stringify(s));
  assert.deepEqual(restored.projectDone,['health']);
  const old=city();delete old.projectDone;delete old.contract;delete old.contractsCompleted;
  const migrated=C.restore(JSON.stringify(old));
  assert.equal(migrated.stage,C.STAGES.length);assert.deepEqual(migrated.projectDone,[]);assert.equal(migrated.contract,null);
});

test('contracts require time and objectives, cannot be double claimed, and can be repeated',()=>{
  const s=city();
  assert.equal(C.acceptContract(s,'budget').ok,true);
  assert.equal(C.acceptContract(s,'growth').ok,false);
  assert.equal(C.claimContract(s).ok,false);
  s.money=100000;for(let i=0;i<3;i++)C.advance(s);
  // The initial small city earns too little for the budget contract.
  assert.equal(C.claimContract(s).ok,false);
  assert.equal(C.cancelContract(s).ok,true);
  assert.equal(C.acceptContract(s,'growth').ok,true);
  const saved=C.restore(JSON.stringify(s));assert.equal(saved.contract.id,'growth');
  assert.equal(C.build(s,6,10,'tower').ok,true);
  assert.equal(C.build(s,14,10,'tech').ok,true);
  assert.equal(C.build(s,6,12,'wind').ok,true);
  assert.equal(C.build(s,7,12,'pump').ok,true);
  for(let i=0;i<10;i++)C.advance(s);
  assert.equal(C.claimContract(s).ok,true);
  assert.equal(C.claimContract(s).ok,false);
  assert.equal(s.contractsCompleted,1);
  assert.equal(C.acceptContract(s,'growth').ok,true);
  assert.equal(C.claimContract(s).ok,false);
});

test('medical and education contracts use connected service coverage',()=>{
  const s=city();assert.equal(C.build(s,6,10,'hospital').ok,true);assert.equal(C.build(s,14,10,'university').ok,true);
  const report=C.stats(s);assert.equal(report.clinicCoverage,1);assert.equal(report.educationCoverage,1);
  assert.equal(C.acceptContract(s,'services').ok,true);for(let i=0;i<3;i++)C.advance(s);
  assert.equal(C.claimContract(s).ok,true);assert.equal(s.contractsCompleted,1);
});
