import test from "node:test";
import assert from "node:assert/strict";
import {
 adviceForNextScene,validateImpactPlan,publicBehaviorPlan,
 assembleDirectedScene,IMPACT_SCHEMA,DIRECTED_SCENE_SCHEMA
} from "../api/jj4-causality.mjs";
import {readFileSync} from "node:fs";
const core=readFileSync(new URL("../api/jj4-core.mjs",import.meta.url),"utf8");
const episode={
 checkpoints:[
  {afterPhase:"hook",audience:"both",waitForReply:true,purpose:"Listen before assuming"},
  {afterPhase:"conflict",audience:"jack",waitForReply:true,purpose:"Address missed bid"},
  {afterPhase:"discovery",audience:"jill",waitForReply:true,purpose:"Find her own terms"},
  {afterPhase:"reattempt",audience:"both",waitForReply:true,purpose:"Respond to change"},
  {afterPhase:"outcome",audience:"none",waitForReply:false,purpose:""}
 ]
};
const history=[
 {role:"shared",kind:"scene",phase_index:0,body:"The opening scene."},
 {role:"jack",kind:"prompt",phase_index:0,body:"Jack asks for help."},
 {role:"jack",kind:"coach",phase_index:0,body:"She is cheating on you. You should confront her."},
 {role:"jill",kind:"coach",phase_index:0,body:"He must be cheating too."},
 {role:"shared",kind:"scene",phase_index:1,body:"They argue over changing affection."},
 {role:"jack",kind:"coach",phase_index:1,body:"Try listening to her rather than blaming her."}
];
test("After a both-coach checkpoint, the director extracts only the two real pieces of advice",()=>{
 const influence=adviceForNextScene(1,episode,history);
 asse¶»§q«^