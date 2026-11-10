// Private server-side Anthos Deep Dive 2.0 petal library management.
// Never import this module from the browser or expose secret Supabase credentials.
const ROOT="https://kstluxwgrrgdbjyloscb.supabase.co/rest/v1/";
const token=()=>process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()||"";
const bad=(msg,status=400)=>{throw Object.assign(new Error(msg),{status})};
async function rest(resource,query={},body,method="GET"){
 const key=token();if(!key)bad("Library database is not configured",503);
 const url=new URL(ROOT+resource);
 for(const [k,v] of Object.entries(query))url.searchParams.set(k,v);
 let res;try{
  res=await fetch(url,{method,headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=representation"},
   ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(14000)});
 }catch{bad("Library database could not be reached",502)}
 if(!res.ok)bad(res.status===409?"This draft was changed elsewhere. Reload before saving.":"Library database rejected the request",res.status===409?409:502);
 const out=await res.json().catch(()=>[]);
 return out;
}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export async function getScenario(id){
 if(typeof id!=="string"||!uuid.test(id))bad("Choose a valid scenario ID");
 const out=await rest("anthos_jj2_scenarios",{id:"eq."+id,select:"*"});
 if(!out.length)bad("Scenario not found",404);
 return out[0];
}
export async function listScenarios(){
 const [petals,scenarios,saved]=await Promise.all([
   rest("anthos_petals",{select:"slug,sort_order,name,purpose,primary_lenses",order:"sort_order.asc"}),
   rest("anthos_jj2_scenarios",{select:"id,petal_slug,mode,slot,title,opening_scene,learning_objective,research_lenses,status,content_version,updated_at",order:"petal_slug.asc,mode.asc,slot.asc",limit:"200"}),
   rest("anthos_jj2_scenarios",{select:"id",episode_studio:"not.is.null",limit:"200"})
 ]);
 // Only expose saved status in the authenticated library, not the episode content.
 const savedIds=new Set(saved.map(item=>item.id));
 for(const item of scenarios)item.episode_saved=savedIds.has(item.id);
 const counts={total:scenarios.length,shared:scenarios.filter(x=>x.mode==="shared").length,
   individual:scenarios.filter(x=>x.mode==="individual").length,
   draft:scenarios.filter(x=>x.status==="draft").length,
   in_review:scenarios.filter(x=>x.status==="in_review").length,
   beta_ready:scenarios.filter(x=>x.status==="beta_ready").length};
 return {ok:true,petals,scenarios,counts};
}
const allowed=new Set(["draft","in_review","beta_ready","retired"]);
export async function saveScenario(data){
 if(typeof data?.id!=="string"||!uuid.test(data.id))bad("Invalid scenario");
 const expected=Number(data.content_version);
 if(!Number.isInteger(expected)||expected<1)bad("Reload before editing");
 const title=String(data.title||"").trim(),intro=String(data.opening_scene||"").trim(),objective=String(data.learning_objective||"").trim();
 const status=String(data.status||"draft");
 if(title.length<5||title.length>120)bad("Title must be 5–120 characters");
 if(intro.length<75||intro.length>1700)bad("Opening scene must be 75–1700 characters");
 if(objective.length<12||objective.length>450)bad("Learning objective must be 12–450 characters");
 if(!allowed.has(status))bad("Choose a valid review status");
 const existing=await getScenario(data.id);
 if(existing.content_version!==expected)bad("Someone edited this scenario. Reload before saving.",409);
 // Mark as beta_ready only on an explicit review decision. Never auto-publish.
 const rows=await rest("anthos_jj2_scenarios",
  {id:"eq."+data.id,content_version:"eq."+expected},
  {title,opening_scene:intro,learning_objective:objective,status,
   content_version:expected+1,updated_at:new Date().toISOString()},"PATCH");
 if(rows.length!==1)bad("Version conflict. Reload the library.",409);
 return {ok:true,scenario:rows[0]};
}

/** Admin-only Episode Studio draft persistence. Existing live room behavior is unchanged. */
export async function persistEpisodeStudio(id,expected,studio){
 if(typeof id!=="string"||!uuid.test(id))bad("Invalid scenario ID.");
 const row=await getScenario(id);
 if(row.content_version!==expected)bad("This episode was edited elsewhere. Reload before saving.",409);
 const rows=await rest("anthos_jj2_scenarios",
  {id:"eq."+id,content_version:"eq."+expected},
  {episode_studio:studio,content_version:expected+1,updated_at:new Date().toISOString()},"PATCH");
 if(rows.length!==1)bad("Version conflict. Reload before saving.",409);
 return rows[0];
}

/** Count actual saved 4.0 objective assignments, not historical seed keywords.
 *  Respond only with aggregate counts and episode titles to authenticated admin callers. */
export async function listEpisodeSkillUsage(){
 const rows=await rest("anthos_jj2_scenarios",{
  select:"id,title,episode_studio",episode_studio:"not.is.null",limit:"200"
 });
 const usage={};
 for(const row of rows){
  const s=row.episode_studio;
  if(!s||typeof s!=="object"||Array.isArray(s))continue;
  const ids=new Set([s.primarySkill,...(Array.isArray(s.supportingSkills)?s.supportingSkills:[])]);
  for(const id of ids){
   if(typeof id!=="string"||!id)continue;
   if(!usage[id])usage[id]=[];
   usage[id].push({id:row.id,title:String(s.title||row.title||"Untitled episode").slice(0,120)});
  }
 }
 for(const items of Object.values(usage))items.sort((a,b)=>a.title.localeCompare(b.title));
 return usage;
}
