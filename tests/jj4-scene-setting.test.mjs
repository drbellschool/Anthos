import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sceneSettingForPhase} from '../api/jj4-scene-setting.mjs';

const episode={sceneSetting:'A kitchen breakfast as Jack fastens his watch and reaches for his keys.'};
const prior=[{phase:'hook',body:'Jack left through the front door. Jill stayed behind.'}];
test('Hook alone uses the authored opening setting',()=>{
 assert.equal(sceneSettingForPhase(episode,0,[]),episode.sceneSetting);
});
test('the next phase does not repeatedly prompt the breakfast scene',()=>{
 const current=sceneSettingForPhase(episode,1,prior);
 assert.doesNotMatch(current,/A kitchen breakfast|fastens his watch/i);
 assert.match(current,/CONTINUATION LOCATION ONLY/);
 assert.match(current,/do not restart the Hook/i);
 assert.match(current,/new choice or consequence/i);
});
test('a committed away location replaces the stale kitchen location',()=>{
 const state={actorLocations:{jack:{place:'away'},jill:{place:'kitchen'}}};
 const current=sceneSettingForPhase(episode,1,prior,state);
 assert.match(current,/Jack = away; Jill = kitchen/);
 assert.doesNotMatch(current,/kitchen breakfast/);
});
test('all episode petals use the same no-reset rule',()=>{
 const motel={sceneSetting:'Motel parking lot with two strangers waiting outside.'};
 const current=sceneSettingForPhase(motel,4,[{phase:'conflict',body:'Jack went inside the office.'}]);
 assert.doesNotMatch(current,/Motel parking lot/);
 assert.match(current,/no second first departure/i);
});
test('actual scene director uses scoped settings instead of the unchanging setting',()=>{
 const core=readFileSync(new URL('../api/jj4-core.mjs',import.meta.url),'utf8');
 assert.match(core,/sceneSetting:sceneSettingForPhase\(room\.episode,phaseIndex,sharedHistory,simulationBefore\)/);
 assert.doesNotMatch(core,/sceneSetting:room\.episode\.sceneSetting,/);
});
