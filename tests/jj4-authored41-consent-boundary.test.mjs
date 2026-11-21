import test from "node:test";
import assert from "node:assert/strict";
import {buildAuthored41,authoredOptions,authoredScene,composeAuthored41Closure} from "../api/jj4-authored41.mjs";

function seasonsWithAdvice(jillAtEnd){
 const episode=buildAuthored41({title:"Changing Seasons of Desire",pilotMode:"shared"});
 const history=[],scenes=[];
 for(let phase=0;phase<6;phase++){
  scenes.push({phase_index:phase,body:authoredScene(episode,phase,history).scene});
  if(phase<4)for(const role of ["jack","jill"]){
   const choice=authoredOptions(episode,role,phase)[0];
   const advice=role==="jill"&&phase===3?jillAtEnd:
    role==="jack"?"Acknowledge her boundary, explain your concern, then listen.":
    "Explain your exhaustion and ask what closeness means to him.";
   history.push({role,phase_index:phase,kind:"question",body:choice.label},
    {role,phase_index:phase,kind:"coach",body:advice});
  }
 }
 return {episode,scenes,closure:composeAuthored41Closure(episode,scenes)};
}
test("a constructive but explicit Jill 'no' never becomes mutual tea or touch consent",()=>{
 const declined=seasonsWithAdvice("I want to sleep alone tonight. Decline company kindly but tell Jack I care.");
 assert.doesNotMatch(declined.scenes[4].body,/agree to finish their tea together/i);
 assert.doesNotMatch(declined.scenes[5].body,/talking together|both explicitly choose/i);
 assert.doesNotMatch(declined.closure,/both accepted a specific next step/i);
 assert.match(declined.scenes[4].body,/decline|rest|no agreed/i);
});
test("constructive Jill advice may support shared tea only when explicitly welcomed",()=>{
 const welcome=seasonsWithAdvice("I would like to finish the tea together and talk, but without pressure for touch.");
 assert.match(welcome.scenes[4].body,/agree to finish their tea together/i);
 assert.doesNotMatch(welcome.scenes[4].body,/hug|kiss|must touch/i);
});
