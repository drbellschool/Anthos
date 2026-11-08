import test from "node:test";
import assert from "node:assert/strict";
import {ANDRAGOGY,PHASES,MILESTONES,AGENTS,THEMES,RESEARCH,MODEL_VERSION,getTheme,lessonFocus,resolveReadiness,avoidRepetitiveResponse,storyIsSafe,coachingGuide,storyGuide} from "../api/jj2-learning-model.mjs";
test("unified JJ2 contract retains seven adult-learning principles, six phases, eight skills, seven internal agents",()=>{
 assert.equal(ANDRAGOGY.length,7);
 assert.deepEqual(PHASES,["hook","conflict","discovery","reattempt","outcome","reflection"]);
 assert.deepEqual(MILESTONES,["Recognize","Interpret","Navigate","Regulate","Differentiate","Discover","Apply","Reflect"]);
 assert.equal(AGENTS.length,7);
 assert.ok(MODEL_VERSION.startsWith("2."));
 assert.ok(Object.keys(RESEARCH).length>=5);
 assert.ok(Object.values(THEMES).every(t=>t.opening?.scene&&t.lessonKeys?.length));
});
test("future adventures reuse the same learning engine, with different premises and sources",()=>{
 const a=lessonFocus(2,"christmas"),b=lessonFocus(2,"getaway");
 assert.deepEqual(a.milestones,b.milestones);
 assert.notEqual(a.theme,b.theme);
 assert.notDeepEqual(getTheme("christmas").opening,getTheme("getaway").opening);
 assert.equal(lessonFocus(1).milestones[0],"Recognize");
});
test("readiness depends on an actionable decision, never research mastery or praise",()=>{
 assert.equal(resolveReadiness({action:""}),false);
 assert.equal(resolveReadiness({action:"Jack apologizes to Jill and explains his plan."}),true);
 assert.equal(resolveReadiness({action:"",priorReady:true}),true);
});
test("the story guide enforces role ownership, coherent fiction and private input only",()=>{
 const guide=storyGuide({checkpoint:1,themeKey:"christmas",canon:getTheme("christmas").opening,jackAction:"Jack apologizes.",jillAction:"Jill shares her priorities."});
 assert.match(guide.instructions,/BOTH coached actions/);
 assert.ok(!("privateRecentMessages" in guide.context));
 assert.equal(guide.context.jackAction,"Jack apologizes.");
 const coaching=coachingGuide({role:"jack",checkpoint:1,themeKey:"christmas",name:"A",canon:getTheme("christmas").opening,history:[]});
 assert.match(coaching.instructions,/exclusively coaches Jack/);
 assert.match(coaching.instructions,/decisionEvidence/);
});
test("privacy and quality checks reject verbatim private directives and repeated answers",()=>{
 const canon=getTheme("christmas").opening;
 const original="Jack should secretly invite both mothers tonight and never tell Jill.";
 const valid={outcome:"Two competing dinner plans collide spectacularly. Jack and Jill try to untangle the invitations and realize that the family group chat has already named a turkey captain.",scene:"Now that both mothers are involved, Jack and Jill need a new plan that respects their priorities without accidentally booking two Christmas meals.",location:"Kitchen",tension:"Conflicting family plans",research:"Repair attempts can help reopen a conversation.",facts:["Group chat has a turkey captain"]};
 assert.equal(storyIsSafe(valid,canon,[original,"Jill wants to discuss it."]),true);
 assert.equal(storyIsSafe({...valid,outcome:original},canon,[original]),false);
 assert.equal(avoidRepetitiveResponse("Same words again, and then nothing changes.",[{body:"Same words again, and then nothing changes."}]),false);
});
