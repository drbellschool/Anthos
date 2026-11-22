// Authenticated Insight Atlas. Service key never leaves this server.
// A pilot invite is not an account session: Supabase Auth MUST verify the
// user, the couple membership, and each role's invite before linking.
import {createHash} from "node:crypto";
import {storySupabaseBase,storySupabaseHeaders} from "./jj4-database-config.mjs";

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const INVITE=/^[a-zA-Z0-9_-]{43}$/;
const hash=v=>createHash("sha256").update(v).digest("hex");
const restricted=(s,c=400)=>{throw Object.assign(new Error(s),{status:c})};
const secret=()=>process.env.SUPABASE_SECRET_KEY?.trim()||process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store",
 "X-Robots-Tag":"noindex, nofollow","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers});
async function db(name,q={},body,method="GET",fetchImpl=fetch){
 const allowed=new Set(["couple_members","couples","anthos_jj4_rooms","anthos_jj4_participants","anthos_jj4_messages",
 "anthos_atlas_episodes","anthos_atlas_room_claims","anthos_atlas_skill_catalog",
 "anthos_atlas_skill_states","anthos_atlas_evidence","anthos_atlas_movements",
 "anthos_atlas_memories","anthos_atlas_transcript","rpc/anthos_atlas_claim_room"]);
 if(!allowed.has(name))restricted("Unsupported Atlas resource.",500);
 const key=secret();
 if(!key)restricted("Atlas server database is unavailable.",503);
 const url=new URL(storySupabaseBase()+name);
 for(const [k,v] of Object.entries(q))url.searchParams.set(k,String(v));
 const h=storySupabaseHeaders(key);
 if(method==="POST"&&q.on_conflict)h.Prefer="return=representation,resolution=ignore-duplicates";
 const res=await fetchImpl(url.toString(),{method,headers:h,
  ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(9500)});
 if(!res.ok)restricted("Secure Atlas storage rejected the operation.",res.status===409?409:502);
 return res.json();
}
async function session(request,fetchImpl=fetch){
 const raw=request.headers.get("authorization")||"";
 if(!/^Bearer [A-Za-z0-9._-]{30,}$/.test(raw))restricted("Sign in to review the Atlas.",401);
 const key=secret();if(!key)restricted("Account verification unavailable.",503);
 const base=new URL(storySupabaseBase()).origin;
 const h={apikey:key,Authorization:raw,"Cache-Control":"no-store"};
 const res=await fetchImpl(base+"/auth/v1/user",{headers:h,signal:AbortSignal.timeout(9500)});
 if(!res.ok)restricted("Atlas session expired or invalid.",401);
 const who=await res.json();
 if(!UUID.test(who?.id||""))restricted("Atlas identity unavailable.",401);
 const active=await db("couple_members",{select:"couple_id,status",user_id:"eq."+who.id,status:"eq.active",limit:3},undefined,"GET",fetchImpl);
 // Never guess which of multiple family relationships or expired invitations to use.
 if(active.length!==1)restricted("A single verified active couple account is required.",403);
 const couple=(await db("couples",{select:"id,status",id:"eq."+active[0].couple_id,status:"eq.active",limit:1},undefined,"GET",fetchImpl))[0];
 if(!couple)restricted("This couple is not activated.",403);
 return {userId:who.id,coupleId:couple.id};
}
async function membersEpisode(coupleId,id,fetchImpl=fetch){
 if(!UUID.test(id||""))restricted("Invalid episode identifier.");
 const ep=(await db("anthos_atlas_episodes",{select:"id,couple_id,source_room_id,story_title,story_key,status,review_unlocked_at,husband_review_consent_at,wife_review_consent_at,created_at,completed_at",
  couple_id:"eq."+coupleId,id:"eq."+id,limit:1},undefined,"GET",fetchImpl))[0];
 if(!ep)restricted("Episode not found.",404);
 return ep;
}
async function archiveCompleted(ep,fetchImpl=fetch){
 if(!ep?.source_room_id)return;
 const room=(await db("anthos_jj4_rooms",{select:"id,episode,stage",id:"eq."+ep.source_room_id,limit:1},undefined,"GET",fetchImpl))[0];
 if(!room||room.stage!=="complete")restricted("The episode is not finished.",409);
 const messages=await db("anthos_jj4_messages",{select:"id,role,kind,body,phase_index,created_at",
  room_id:"eq."+ep.source_room_id,order:"id.asc",limit:300},undefined,"GET",fetchImpl);
 const records=[];
 for(const m of messages||[]){
  if(m.kind==="coach"||m.kind==="prompt"||m.kind==="sophia"){
   const actor=m.kind==="sophia"?"sophia":m.role==="jack"?(m.kind==="coach"?"husband":"jack"):(m.kind==="coach"?"wife":"jill");
   records.push({episode_id:ep.id,couple_id:ep.couple_id,source_key:"message:"+m.id,
    actor,kind:m.kind==="prompt"?"character":m.kind,
    scene_day:m.phase_index,body:String(m.body||"").slice(0,1800),source_time:m.created_at});
  }
 }
 // In 4.3 open mode, private text and real consequences live in room JSON.
 for(const turn of room.episode?.authored43?.turns||[]){
  if(!["jack","jill"].includes(turn.role)||!INVITE.test(turn.key?.replaceAll("-","")||"")&&
   !UUID.test(turn.key||""))continue;
  const side=turn.role==="jack"?"husband":"wife";
  const items=[
   {actor:side,kind:"coach",body:turn.body,suffix:"coach"},
   {actor:turn.role,kind:"character",body:turn.reply,suffix:"character"},
   ...(turn.event?[{actor:"shared",kind:"story",body:turn.event,suffix:"event"}]:[])
  ];
  for(const t of items)if(String(t.body||"").trim())records.push({
   episode_id:ep.id,couple_id:ep.couple_id,
   source_key:"open:"+turn.key+":"+t.suffix,actor:t.actor,kind:t.kind,
   scene_day:turn.day,body:String(t.body).slice(0,1800),source_time:turn.at
  });
 }
 if(records.length){
  // Bounded, idempotent archive; room expires after 14 days but this survives.
  for(let i=0;i<records.length;i+=50)
   await db("anthos_atlas_transcript",{on_conflict:"episode_id,source_key"},
    records.slice(i,i+50),"POST",fetchImpl);
 }
}
async function resolveApproval(ep,role,fetchImpl=fetch){
 if(role==="jack"){
  await db("anthos_atlas_episodes",{id:"eq."+ep.id,couple_id:"eq."+ep.couple_id},
   {status:"complete",husband_review_consent_at:new Date().toISOString(),completed_at:ep.completed_at||new Date().toISOString()},"PATCH",fetchImpl);
 }else{
  await db("anthos_atlas_episodes",{id:"eq."+ep.id,couple_id:"eq."+ep.couple_id},
   {status:"complete",wife_review_consent_at:new Date().toISOString(),completed_at:ep.completed_at||new Date().toISOString()},"PATCH",fetchImpl);
 }
 // Re-read to handle both opt-ins arriving at nearly the same time.
 const after=await membersEpisode(ep.couple_id,ep.id,fetchImpl);
 if(after.status==="complete"&&after.husband_review_consent_at&&after.wife_review_consent_at&&!after.review_unlocked_at)
  await db("anthos_atlas_episodes",{id:"eq."+ep.id,couple_id:"eq."+ep.couple_id,status:"eq.complete"},
   {review_unlocked_at:new Date().toISOString()},"PATCH",fetchImpl);
 const full=await membersEpisode(ep.couple_id,ep.id,fetchImpl);
 return {unlocked:!!full.review_unlocked_at,status:full.status};
}
export async function atlasApi(request,{fetchImpl=fetch}={}){
 if(!["GET","POST"].includes(request.method))return json({error:"Method not allowed"},405);
 try{
  if(request.method==="POST"){
   if(request.headers.get("origin")!==new URL(request.url).origin)restricted("Invalid request origin.",403);
   if(!(request.headers.get("content-type")||"").startsWith("application/json"))restricted("JSON required.");
  }
  const user=await session(request,fetchImpl);
  const url=new URL(request.url);
  if(request.method==="GET"){
   const mode=url.searchParams.get("mode")||"episodes";
   if(mode==="episodes"){
    const episodes=await db("anthos_atlas_episodes",{select:"id,story_title,story_key,status,review_unlocked_at,episode_month,created_at",
     couple_id:"eq."+user.coupleId,order:"created_at.desc",limit:100},undefined,"GET",fetchImpl);
    return json({ok:true,episodes:(episodes||[]).map(x=>({
     id:x.id,title:x.story_title,status:x.status,month:x.episode_month,
     sharedReviewAvailable:!!x.review_unlocked_at
    }))});
   }
   if(mode==="catalog"){
    const skills=await db("anthos_atlas_skill_catalog",{select:"skill_id,skill_title,research_foundation,color_hex,skill_description",active:"eq.true",order:"skill_id.asc",limit:50},undefined,"GET",fetchImpl);
    return json({ok:true,skills});
   }
   if(mode==="episode"){
    const ep=await membersEpisode(user.coupleId,url.searchParams.get("episodeId"),fetchImpl);
    if(ep.status!=="complete"||!ep.review_unlocked_at)restricted("Both spouses must authorize the completed episode review.",403);
    const [transcript,evidence,movements]=await Promise.all([
     db("anthos_atlas_transcript",{select:"id,source_key,actor,kind,scene_day,body,source_time",
       episode_id:"eq."+ep.id,order:"source_time.asc,id.asc",limit:1000},undefined,"GET",fetchImpl),
     db("anthos_atlas_evidence",{select:"id,subject,skill_id,source_ref,source_quote,explanation,observed_rating,confidence,context_class,occurred_at",
       episode_id:"eq."+ep.id,order:"occurred_at.asc",limit:1000},undefined,"GET",fetchImpl),
     db("anthos_atlas_movements",{select:"evidence_id,subject,skill_id,previous_score,new_score,delta,recorded_at",
       couple_id:"eq."+user.coupleId,order:"recorded_at.asc",limit:3000},undefined,"GET",fetchImpl)
    ]);
    const ids=new Set(evidence.map(e=>e.id));
    return json({ok:true,episode:{id:ep.id,title:ep.story_title},
     transcript,evidence,movements:movements.filter(x=>ids.has(x.evidence_id))});
   }
   if(mode==="annual"){
    const episodeRows=await db("anthos_atlas_episodes",{select:"id",
      couple_id:"eq."+user.coupleId,status:"eq.complete",review_unlocked_at:"not.is.null",limit:100},
      undefined,"GET",fetchImpl);
    if(!episodeRows?.length)return json({ok:true,skills:[],movements:[],message:"Shared annual skill history is available after an episode is mutually unlocked."});
    const hidden=await db("anthos_atlas_episodes",{select:"id,status,review_unlocked_at",
      couple_id:"eq."+user.coupleId,review_unlocked_at:"is.null",limit:1},
      undefined,"GET",fetchImpl);
    if(hidden.length)return json({ok:true,skills:[],movements:[],
     message:"Your annual trajectory becomes available when all earlier and ongoing episode reviews are mutually unlocked."});
    const [scores,movements,evidence]=await Promise.all([
     db("anthos_atlas_skill_states",{select:"subject,skill_id,score,evidence_count,last_observed_at",
      couple_id:"eq."+user.coupleId,limit:200},undefined,"GET",fetchImpl),
     db("anthos_atlas_movements",{select:"evidence_id,subject,skill_id,previous_score,new_score,delta,recorded_at",
      couple_id:"eq."+user.coupleId,order:"recorded_at.asc",limit:3000},undefined,"GET",fetchImpl),
     db("anthos_atlas_evidence",{select:"id,episode_id,source_quote,explanation,context_class,confidence,skill_id,subject",
      couple_id:"eq."+user.coupleId,order:"occurred_at.asc",limit:3000},undefined,"GET",fetchImpl)
    ]);
    return json({ok:true,skills:scores,movements,evidence});
   }
   restricted("Unknown Atlas view.",400);
  }
  const input=await request.json().catch(()=>null);
  if(!input||typeof input!=="object"||Array.isArray(input))restricted("Invalid request.");
  if(input.action==="link"){
   const raw=String(input.inviteToken||"");
   if(!INVITE.test(raw)||input.acknowledgeFutureSharedReview!==true)
    restricted("You must use your individual 4.3 invitation and acknowledge future shared review.");
   const roleHash=hash(raw);
   const participant=(await db("anthos_jj4_participants",{
     select:"room_id,role,joined_at",token_hash:"eq."+roleHash,limit:1},undefined,"GET",fetchImpl))[0];
   if(!participant||!["jack","jill"].includes(participant.role))restricted("Invalid invitation.",401);
   const linked=await db("rpc/anthos_atlas_claim_room",{},
    {p_room:participant.room_id,p_couple:user.coupleId,p_user:user.userId,
     p_role:participant.role,p_invite_hash:roleHash,p_ack_shared_future_review:true},
    "POST",fetchImpl);
   return json({ok:true,linked:!!linked,episodeId:linked||null,
    message:linked?"Both spouses connected to their yearlong story.":"Your role is verified. Your spouse must link their own invitation."});
  }
  if(input.action==="review-consent"){
   const ep=await membersEpisode(user.coupleId,input.episodeId,fetchImpl);
   if(!ep.source_room_id)restricted("This episode has no available source transcript.",409);
   const claims=await db("anthos_atlas_room_claims",{select:"role,user_id",
    room_id:"eq."+ep.source_room_id,couple_id:"eq."+ep.couple_id,
    user_id:"eq."+user.userId,limit:1},undefined,"GET",fetchImpl);
   if(claims.length!==1)restricted("Only an original verified coach may approve review.",403);
   await archiveCompleted(ep,fetchImpl);
   return json({ok:true,...await resolveApproval(ep,claims[0].role,fetchImpl)});
  }
  restricted("Unknown Atlas action.",400);
 }catch(e){const status=Number.isInteger(e?.status)?e.status:500;
  return json({error:String(e?.message||"Atlas unavailable.").slice(0,190)},status)}
}
export default {fetch:atlasApi};
