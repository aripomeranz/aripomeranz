const assert = require('node:assert/strict');
const E = require('../assets/js/bridgit-engine.js');
function graphicRank(mask) {
  const p=Array.from({length:8},(_,i)=>i);
  const find=x=>p[x]===x?x:(p[x]=find(p[x]));
  let r=0;
  E.edges.forEach(([a,b],i)=>{if(mask&(1<<i)){a=find(a);b=find(b);if(a!==b){p[a]=b;r++;}}});
  return r;
}
let seed=123456;
const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
// Independent reference: the submodular min formula for aggregated rank.
for(let trial=0;trial<12;trial++) {
  const assignments=Array.from({length:13},()=>random(4));
  const game=E.makeGame(assignments);
  const unions=[];
  for(let mask=0;mask<(1<<game.capacity.length);mask++){
    let edges=0;
    for(let i=0;i<13;i++)if(mask&(1<<game.mapping[i]))edges|=1<<i;
    if(mask&(1<<game.target))edges|=1<<13;
    unions.push(graphicRank(edges));
  }
  for(let sample=0;sample<100;sample++){
    const bound=game.capacity.map(k=>random(k+1));
    const expected=Math.min(...unions.map((r,mask)=>r+bound.reduce((sum,b,i)=>sum+((mask&(1<<i))?0:b),0)));
    assert.equal(game.rank(bound),expected,'Forest oracle must agree with the submodular rank formula');
  }
}
const classic=E.makeGame(Array.from({length:13},(_,i)=>i));
const paper=E.makeGame(E.defaultLines);
const possibleRoute=paper.capacity.map(()=>0);
possibleRoute[paper.ids.indexOf(0)]=2; // Both green connections.
possibleRoute[paper.ids.indexOf(1)]=1; // Either red connection.
const withTarget=possibleRoute.slice();withTarget[paper.target]=1;
assert.equal(paper.rank(withTarget),paper.rank(possibleRoute)+1,
  'A possible route is insufficient when another representation is a disconnected forest');
possibleRoute[paper.ids.indexOf(9)]=1; // e10 joins either red choice to the green line.
const secured=possibleRoute.slice();secured[paper.target]=1;
assert.equal(paper.rank(secured),paper.rank(possibleRoute),'The paper example must recognize the secure green/red route');
for(let sample=0;sample<1000;sample++){
  const mask=random(1<<14),type=Array.from({length:14},(_,i)=>(mask>>i)&1);
  assert.equal(classic.rank(type),graphicRank(mask));
  assert.equal(classic.dualRank(type),type.reduce((a,b)=>a+b,0)-7+graphicRank(((1<<14)-1)^mask));
}
// Check complete ticket allocations, including hands with redundant tickets.
let completed=0;
for(const assignments of [E.defaultLines,Array.from({length:13},(_,i)=>i),Array(13).fill(0)]){
  const game=E.makeGame(assignments);
  function check(i,r){
    if(i===game.target){
      const red=r.concat(0),blue=game.capacity.map((k,j)=>j===game.target?0:k-red[j]);
      const redPlus=red.slice(),bluePlus=blue.slice();redPlus[game.target]=bluePlus[game.target]=1;
      const join=game.rank(redPlus)===game.rank(red),cut=game.dualRank(bluePlus)===game.dualRank(blue);
      assert.notEqual(join,cut,'Every completed allocation must have exactly one winner');completed++;return;
    }
    for(let k=0;k<=game.capacity[i];k++)check(i+1,r.concat(k));
  }
  check(0,[]);
  for(let play=0;play<40;play++){
    const g=E.makeGame(assignments,play%2?'Join':'Cut');let state=g.status();
    while(!state.winner){
      const legal=state.remaining.slice(0,g.target).map((n,i)=>n?i:-1).filter(i=>i>=0);
      assert.ok(legal.length,'No draw is possible');assert.equal(g.move(legal[random(legal.length)]),true);state=g.status();
    }
    const cert=g.winningTickets().concat(1),r=state.winner==='Join'?g.rank:g.dualRank;
    const size=cert.reduce((a,b)=>a+b,0);
    assert.equal(r(cert),size-1,'Winning certificate must be minimally dependent');
    cert.forEach((v,i)=>{if(v){const q=cert.slice();q[i]--;assert.equal(r(q),size-1,'Every deletion from a winning certificate must be independent');}});
    assert.equal(g.move(0),false,'Stop accepting moves after a win');
    const oldCount=state.history.length;g.undo();assert.equal(g.status().history.length,oldCount-1);assert.equal(g.status().winner,null);
  }
}
assert.throws(()=>E.makeGame([0]),/Invalid/);
assert.equal(E.makeGame(E.defaultLines).move(999),false);
console.log(`Passed: independent rank checks, ${completed} completed allocations, 120 random games, certificates and undo.`);
