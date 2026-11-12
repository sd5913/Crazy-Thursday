import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultFaceSettings, baselineSignature, analyzeFaceSettings, gameEyesClosed } from '../src/face-settings.js';
import { measureEyes } from '../src/eye-geometry.js';
const cats = (left=1,right=1) => [{categoryName:'eyeBlinkLeft',score:left},{categoryName:'eyeBlinkRight',score:right}];
test('squint is not needed; each eye must independently close',()=>{
 const baseline=defaultFaceSettings();
 assert.equal(gameEyesClosed(cats(),{baseline},{left:.04,right:.04}),true);
 assert.equal(gameEyesClosed(cats(1,.6),{baseline}),false);
});
test('personal eyelid geometry rejects half-open and invalid eyes',()=>{
 const baseline=defaultFaceSettings();
 const profile={signature:baselineSignature(baseline),channels:Object.fromEntries(['smile','frown','jaw','blink'].map(k=>[k,{neutral:0,gain:1}])),eyes:{left:{open:.3,closed:.03},right:{open:.3,closed:.03}}};
 assert.equal(gameEyesClosed(cats(),{baseline,profile},{left:.04,right:.04}),true);
 assert.equal(gameEyesClosed(cats(),{baseline,profile},{left:.18,right:.04}),false);
 assert.equal(gameEyesClosed(cats(),{baseline,profile},null),false);
});
test('EAR uses pixel aspect ratio and rejects missing landmarks',()=>{
 const points=Array.from({length:468},()=>({x:0,y:0}));
 for(const ids of [[33,160,158,133,153,144],[362,385,387,263,373,380]]) {
  const coords=[[.1,.2],[.12,.18],[.18,.18],[.2,.2],[.18,.22],[.12,.22]];
  ids.forEach((id,i)=>points[id]={x:coords[i][0],y:coords[i][1]});
 }
 const eyes=measureEyes(points,800,400);
 assert.ok(Math.abs(eyes.left-.2)<.0001);
 assert.equal(measureEyes([],800,400),null);
 assert.equal(measureEyes(points,0,400),null);
});


test('raw eye ratio must be at or below 0.05 on both sides',()=>{
 const baseline=defaultFaceSettings();
 assert.equal(baseline.eyeOpennessLimit,.05);
 assert.equal(gameEyesClosed(cats(),{baseline},{left:.05,right:.05}),true);
 assert.equal(gameEyesClosed(cats(),{baseline},{left:.051,right:.04}),false);
 assert.equal(gameEyesClosed(cats(),{baseline},null),false);
});


test('Blink output is irrelevant when both eyelid ratios qualify',()=>{
 const baseline=defaultFaceSettings();
 assert.equal(gameEyesClosed(cats(0,0),{baseline},{left:.04,right:.04}),true);
 assert.equal(gameEyesClosed(cats(1,1),{baseline},{left:.1,right:.04}),false);
});
