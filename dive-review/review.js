/* Anthos mobile Deep Dive REVIEW, not customer enrollment.
 * Fictional authored stories. No calls to Supabase, SMS, or AI.
 * Demo choices and reviewer notes stay on this device only.
 */
(() => {
  "use strict";
  const E=globalThis.ANTHOS_DEEP_DIVE_ENGINE;
  const $=id=>document.getElementById(id);
  const STORY_URLS=Object.freeze({
    questions:"/dive-review/stories/questions.v1.json",
    christmas:"/dive-review/stories/christmas.v1.json"
  });
  const selected=new URLSearchParams(location.search).get("story");
  let currentKey=Object.hasOwn(STORY_URLS,selected)?selected:"questions";
  let stories={},story=null,state=null,notes={},started=false;
  const stateKey=()=> "anthos_dive_review_v1_"+story.id+"_v"+story.storyVersion;
  const notesKey=()=> stateKey()+"_editorial_notes";
  function readLocal(key,otherwise){
    try {const raw=localStorage.getItem(key);return raw?JSON.parse(raw):otherwise;}
    catch{return otherwise;}
  }
  function writeLocal(key,value) {
    try{localStorage.setItem(key,JSON.stringify(value));return true;}
    catch{showFeedback("This browser cannot save changes. You can still review this session.");return false;}
  }
  function showFeedback(message){$("readerFeedback").textContent=message;}
  function put(id,text){$(id).textContent=text??"";}
  function flower(completed){
    const petals=Array.from({length:12},(_,i)=>'<ellipse cx="50" cy="24" rx="8" ry="17" transform="rotate('+i*30+' 50 50)" fill="'+(i===0?"#819d7e":"#e1e4d8")+'" stroke="#f9f7f0" stroke-width="1.3"/>').join("");
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">'+petals+
      '<circle cx="50" cy="50" r="20" fill="#f9f7f1" stroke="#c3bdab" stroke-width="1"/>'+
      '<text x="50" y="48" text-anchor="middle" font-size="16" font-family="Georgia" fill="#354e3d">'+completed+'</text>'+
      '<text x="50" y="62" text-anchor="middle" font-size="10" font-family="system-ui" fill="#617461">of 8</text></svg>';
  }
  function error(message){
    $("overview").hidden=false;
    $("reader").hidden=true;
    put("storyOverview",message);
    $("startButton").disabled=true;
  }
  function applyStory(key){
    if(!Object.hasOwn(stories,key))return;
    currentKey=key;story=E.storyCheck(stories[key]);
    state=E.restore(story,readLocal(stateKey(),null));
    notes=readLocal(notesKey(),{});
    if(!notes||typeof notes!=="object"||Array.isArray(notes))notes={};
    started=false;
    $("reviewNotes").open=false;
    try{history.replaceState(null,"",location.pathname+"?story="+encodeURIComponent(key));}catch{}
    render();$("storyDialog").close();
    window.scrollTo({top:0,behavior:"instant"});
  }
  function run(action){
    const next=E.transition(story,state,action);
    if(next.changed){
      state=next.state;
      writeLocal(stateKey(),state);
      render();
    }else if(next.reason)showFeedback("This chapter is not available yet. Continue in order and answer the current decision.");
    return next.changed;
  }
  function jump(index){
    const changed=run({type:"navigate",chapter:index});
    if(changed){$("reader").scrollIntoView({behavior:"smooth",block:"start"});}
  }
  function render(){
    if(!story)return;
    put("storyTitle",story.title);
    put("petalName",story.petalName);
    put("petalHeading",story.petalName);
    put("storyOverview",story.overview);
    put("progressStat",state.completed+" / 8");
    $("flower").innerHTML=flower(state.completed);
    $("flower").setAttribute("aria-label","Twelve-petal Anthos bloom. This story has "+state.completed+" of eight milestones completed.");
    $("startButton").textContent=state.completed===0?"Begin Deep Dive ↗":state.completed===8?"Review completed story ↗":"Continue Deep Dive ↗";
    $("overview").hidden=started;
    $("reader").hidden=!started;
    if(started)renderReader();
  }
  function button(label,cls,fn,disabled=false){
    const b=document.createElement("button");b.type="button";b.className=cls;b.textContent=label;b.disabled=disabled;b.addEventListener("click",fn);
    return b;
  }
  function renderReader(){
    const v=E.view(story,state),c=v.chapter,i=v.index;
    put("chapterEyebrow","CHAPTER "+(i+1)+" OF 8");
    put("chapterState",v.complete?"Story finished":v.readOnly?"Completed — revisiting":v.canChoose?"Your decision":v.needsRepair?"Repair needed":"In progress");
    const rail=$("chapterRail");rail.replaceChildren();
    story.chapters.forEach((ch,n)=>{
      const b=button(n<state.completed?"✓":String(n+1),"chapter-node "+(n===i?"current ":n<state.completed?"done ":""),()=>jump(n),n>state.completed);
      b.setAttribute("aria-label","Chapter "+(n+1)+": "+ch.title+(n<state.completed?", completed":"")+(n===i?", current":""));
      if(n===i)b.setAttribute("aria-current","step");
      rail.append(b);
    });
    put("storyLocation",c.location||"THE SCENE");
    put("chapterTitle",c.title);
    put("storyText",v.storyText);
    $("decision").hidden=!c.options;
    $("result").hidden=!v.choice;
    $("lesson").hidden=!!c.options;
    put("takeaway",c.takeaway);
    put("transitionText",c.transition||"");
    const choices=$("options");choices.replaceChildren();
    const repairs=$("repair");repairs.replaceChildren();repairs.hidden=true;
    if(c.options){
      put("question",c.prompt);
      put("decisionHint",c.mastery?"Independent choice: no hints before you decide.":"Choose the response you believe is most constructive.");
      c.options.forEach((option,n)=>{
        const b=document.createElement("button");b.type="button";
        b.className="choice"+(v.choiceIndex===n?" selected":"");
        const letter=document.createElement("b");letter.textContent=String.fromCharCode(65+n);
        const txt=document.createElement("span");txt.textContent=option.text;
        b.append(letter,txt);
        b.disabled=!v.canChoose;
        b.addEventListener("click",()=>{
          if(run({type:"choose",index:n}))$("result").scrollIntoView({block:"nearest",behavior:"smooth"});
        });
        choices.append(b);
      });
      if(v.choice){
        put("impact",v.outcome);
        const score=c.mastery&&v.mastery?" Independent mastery: "+v.mastery.status.replaceAll("-"," ")+". "+v.mastery.summary:"";
        put("coach",v.coaching+score);
        if(v.needsRepair){
          repairs.hidden=false;
          const p=document.createElement("p");p.textContent="This choice caused hurt. Practice a repair before continuing. Your original choice stays on record.";
          repairs.append(p);
          v.repairOptions.forEach(choice=>{
            repairs.append(button(choice.text,"btn outline",()=>{
              if(run({type:"repair",repair:choice.id}))$("result").scrollIntoView({block:"nearest",behavior:"smooth"});
            }));
          });
        }else if(v.repair){
          repairs.hidden=false;
          const item=v.repairOptions.find(x=>x.id===v.repair.selected);
          const p=document.createElement("p");
          p.textContent="Repair practiced: "+(item?item.consequence:"The characters begin to repair the harm.")+
            (v.repair.guided?" Sophia offers one clearer model: 'I was unfair. I'm sorry for my words. Can we try again?'":"");
          repairs.append(p);
        }
      }
    }
    const back=$("previousButton");
    back.disabled=i===0;
    back.textContent=i===0?"← Previous":"← Chapter "+i;
    const advance=$("advanceButton");
    advance.disabled=v.complete||(!v.readOnly&&!v.canAdvance);
    advance.textContent=v.complete?"Story finished ✓":v.readOnly?"Return to current ↗":
      v.canChoose?"Choose an answer":
      v.needsRepair?"Practice repair first":
      i===7?"Finish Deep Dive ✦":"Complete chapter "+(i+1)+" ↗";
    put("chapterNote",notes[String(i)]||"");
    put("notesCount",Object.values(notes).filter(n=>typeof n==="string"&&n.trim()).length+" saved");
    showFeedback(v.complete?"All eight chapters finished. You can revisit any chapter or copy your editorial notes.":"");
  }
  async function copyAllNotes(){
    const values=Object.entries(notes).filter(([,v])=>typeof v==="string"&&v.trim()).sort((a,b)=>Number(a[0])-Number(b[0]));
    if(!values.length){put("noteFeedback","No notes to copy yet.");return;}
    const payload="Anthos Review · "+story.title+"\n"+values.map(([i,text])=>"Chapter "+(Number(i)+1)+" — "+story.chapters[Number(i)]?.title+"\n"+text.trim()).join("\n\n");
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(payload);
      else{
        const el=document.createElement("textarea");el.value=payload;el.style.position="fixed";el.style.top="-9999px";document.body.append(el);el.select();const okay=document.execCommand("copy");el.remove();if(!okay)throw Error("Copy blocked");
      }
      put("noteFeedback","Copied "+values.length+" chapter note(s). Paste them into our chat for revision.");
    }catch{put("noteFeedback","Your browser blocked copying. Try another browser or manually select your notes.");}
  }
  function init(){
    $("storiesButton").addEventListener("click",()=>$("storyDialog").showModal());
    $("closeDialog").addEventListener("click",()=>$("storyDialog").close());
    document.querySelectorAll(".story-pick").forEach(b=>b.addEventListener("click",()=>applyStory(b.dataset.story)));
    $("storyDialog").addEventListener("click",ev=>{if(ev.target===$("storyDialog"))$("storyDialog").close();});
    $("startButton").addEventListener("click",()=>{started=true;render();$("reader").scrollIntoView({behavior:"smooth",block:"start"});});
    $("previousButton").addEventListener("click",()=>{if(state.chapter>0)jump(state.chapter-1);});
    $("advanceButton").addEventListener("click",()=>{
      const v=E.view(story,state);
      const result=run(v.readOnly?{type:"navigate",chapter:Math.min(state.completed,7)}:{type:"advance"});
      if(result)$("reader").scrollIntoView({behavior:"smooth",block:"start"});
    });
    $("saveNote").addEventListener("click",()=>{
      if(!story)return;
      const key=String(state.chapter);
      const text=$("chapterNote").value.trim().slice(0,3000);
      if(text)notes[key]=text;else delete notes[key];
      if(writeLocal(notesKey(),notes)){put("noteFeedback",text?"Saved on this device.":"Note cleared.");put("notesCount",Object.keys(notes).length+" saved");}
    });
    $("copyNotes").addEventListener("click",copyAllNotes);
    $("resetButton").addEventListener("click",()=>{
      if(!story||!confirm("Reset only this story's chapter progress on this device? Editorial notes are kept."))return;
      try{localStorage.removeItem(stateKey());}catch{}
      state=E.fresh(story);started=false;render();window.scrollTo({top:0,behavior:"smooth"});
    });
    Promise.all(Object.entries(STORY_URLS).map(async ([key,url])=>{
      const response=await fetch(url,{cache:"no-store",credentials:"same-origin"});
      if(!response.ok)throw new Error("Story loading error ("+response.status+")");
      return [key,E.storyCheck(await response.json())];
    })).then(entries=>{
      stories=Object.fromEntries(entries);
      applyStory(currentKey);
    }).catch(()=>{
      error("The story preview could not load. Please try refreshing the page.");
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();
