(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 if(!$("customerRows"))return;
 let page=0,busy=false,total=null,loaded=false,last=[],inviteCtx=null,searchDelay;
 const number=(id,x)=>$(id).textContent=x===null||x===undefined?"—":String(x);
 function notice(text,bad=false){$("customerNotice").textContent=text;$("customerNotice").classList.toggle("is-error",bad);}
 async function api(query,body){
  const opt=body?{method:"POST",headers:{"Content-Type":"application/json","X-Threefold-Admin":"1"},body:JSON.stringify(body)}:{};
  const res=await fetch("/api/admin"+query,{...opt,credentials:"same-origin",cache:"no-store"});
  const data=await res.json().catch(()=>({error:"The server returned an unexpected response."}));
  if(res.status===401)throw Error("Your admin session expired. Sign in again.");
  if(!res.ok||!data.ok)throw Error(data.error||"Customer directory is unavailable.");
  return data;
 }
 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 function td(tr,item){const c=el("td");c.append(item);tr.append(c);}
 function chip(label,kind){return el("span","customer-pill customer-pill-"+kind,label);}
 function status(on,yes="✓ Done",no="— Pending"){
   return chip(on?yes:no,on?"ok":"pending");
 }
 function cellActions(p){
   const wrap=el("div","customer-row-actions");
   const invite=el("button","customer-mini","Invite");invite.type="button";
   invite.addEventListener("click",()=>makeInvite(p,invite));
   const edit=el("button","customer-mini customer-mini-edit","✎");edit.type="button";
   edit.title="Edit "+p.name;edit.setAttribute("aria-label","Edit "+p.name);edit.addEventListener("click",()=>editPerson(p));
   wrap.append(invite,edit);return wrap;
 }
 function draw(rows){
   const body=$("customerRows");body.replaceChildren();
   if(!rows.length){const tr=el("tr"),td1=el("td","","No matching customers. Add your first contact above.");td1.colSpan=9;tr.append(td1);body.append(tr);return;}
   for(const p of rows){
     const tr=el("tr"),who=el("div","customer-person");
     who.append(el("strong","",p.name));
     who.append(el("span","",p.email));
     const partner=p.groupId?rows.find(q=>q.id!==p.id&&q.groupId===p.groupId):null;
     who.append(el("small","", (p.program==="pilot"?"Pilot":"Standard")+(partner?" · "+partner.name:"")+
         (p.staffNomination==="admin_pending"?" · Admin candidate":"")));
     td(tr,who);
     td(tr,status(p.registered,"✓ Linked","— Unlinked"));
     const q=p.questionnaire||{};
     const setup=el("div","customer-setup");
     const parts=[q.birthday,q.wedding,q.holidays].filter(Boolean).length;
     setup.append(chip(q.completed?"✓ Complete":parts+"/3 dates",q.completed?"ok":"pending"));
     td(tr,setup);
     td(tr,status(p.smsConsent==="recorded_unverified","✓ Opt-in*","— No opt-in"));
     td(tr,status(p.emailConsent==="recorded","✓ Opt-in","— No opt-in"));
     td(tr,chip("Not linked","future"));
     td(tr,chip("Later","future"));td(tr,chip("Later","future"));
     td(tr,cellActions(p));body.append(tr);
   }
 }
 async function refresh(){
   if(busy)return;busy=true;$("customerRefresh").disabled=true;notice("Loading verified customer statuses…");
   const params=new URLSearchParams({view:"customers",page:String(page)});
   const search=$("customerSearch").value.trim();if(search)params.set("search",search);
   for(const [id,key] of [["customerFilterProgram","program"],["customerFilterStatus","status"]])
     if($(id).value)params.set(key,$(id).value);
   try{
     const r=await api("?"+params);loaded=true;last=r.customers;total=r.total;
     draw(last);
     const c=r.counts||{};
     number("customerCountAll",c.all);
     number("customerCountPilot",c.pilot);
     number("customerCountQuestionnaire",c.questionnaire);
     number("customerCountSms",c.smsOptIns);number("customerCountLinked",c.accountsLinked);
     const pct=c.all>0&&c.questionnaire!==null?Math.round(100*c.questionnaire/c.all):null;
     number("customerPercentQuestionnaire",pct===null?"No contacts yet":c.questionnaire+" of "+c.all+" ("+pct+"%)");
     const start=last.length?page*40+1:0,end=page*40+last.length;
     number("customerPageStatus",total===null?start+"–"+end+" entries":start+"–"+end+" of "+total+" contacts");
     $("customerPrev").disabled=page<1;
     $("customerNext").disabled=total===null?last.length<40:(page+1)*40>=total;
     notice("Live data · *SMS opt-in is not phone verification or permission to send · Billing, flowers and photos are not yet integrated.");
   }catch(e){notice(e.message,true);if(!loaded)draw([]);}
   finally{busy=false;$("customerRefresh").disabled=false;}
 }
 function form(id){
   for(const key of ["customerAddForm","customerEditForm","customerInvitePanel"])$(key).hidden=id!==key;
   if(id)$(id).scrollIntoView({block:"nearest",behavior:"smooth"});
 }
 function editable(p){
   form("customerEditForm");
   const f=$("customerEditForm");
   for(const [name,value] of Object.entries({id:p.id,name:p.name,program:p.program,staffNomination:p.staffNomination,status:p.status}))
     f.elements.namedItem(name).value=value;
   number("customerEditTitle",p.name+" · customer details");
   number("customerEditEmail",p.email+" · Billing history: not connected · Flower: not launched · Photos: not launched");
   const checks=$("customerReadinessChecks");checks.replaceChildren();
   const q=p.questionnaire||{};
   for(const [name,yes,detail] of [
     ["Birthday supplied",!!q.birthday,"Date collected; birth year not retained here"],
     ["Wedding date supplied",!!q.wedding,"Anniversary recorded"],
     ["Meaningful holidays reviewed",!!q.holidays,"Choices recorded by the participant"],
     ["Questionnaire complete",!!q.completed,"Submitted through a unique link"],
     ["Customer account linked",!!p.registered,"Actual authenticated account"],
     ["Phone number supplied",!!p.phone,"Not carrier-verified"],
     ["Text consent recorded",p.smsConsent==="recorded_unverified","No Sophia SMS until verified and activated"],
     ["Email permission recorded",p.emailConsent==="recorded","Not proof email address is verified"]
   ]){
     const item=el("div","customer-check");
     const mark=el("span","customer-check-icon",yes?"☑":"☐");mark.setAttribute("aria-hidden","true");
     item.append(mark,el("div","",name));
     item.title=detail;checks.append(item);
   }
 }
 async function makeInvite(p,button){
   if(busy)return;busy=true;button.disabled=true;notice("Generating an expiring private signup link…");
   try{
     const r=await api("",{action:"customer-invite",id:p.id});
     inviteCtx={person:p,link:r.link};
     $("customerInviteLink").value=r.link;
     number("customerInviteRecipient",p.name+" · "+p.email+" · Expires in 72 hours · Not sent");
     form("customerInvitePanel");
     notice("Private link ready. Share it only with "+p.name+". No message has been sent.");
   }catch(e){notice(e.message,true)}finally{busy=false;button.disabled=false;}
 }
 function message(){return inviteCtx?"You're invited to Anthos! Complete your private marriage-adventure profile here: "+inviteCtx.link:"";}
 function body(f){return Object.fromEntries(new FormData(f).entries());}
 async function submit(button,payload,formNode){
   if(busy)return;busy=true;button.disabled=true;notice("Saving…");
   try{
     const r=await api("",payload);
     formNode.reset();form(null);busy=false;page=0;loaded=false;await refresh();
     notice(r.message||"Customer saved. You can now generate their signup link.");
   }catch(e){notice(e.message,true)}finally{busy=false;button.disabled=false;}
 }
 $("customerOpenAdd").addEventListener("click",()=>form("customerAddForm"));
 $("customerCloseAdd").addEventListener("click",()=>form(null));
 $("customerCloseEdit").addEventListener("click",()=>form(null));
 $("customerCloseInvite").addEventListener("click",()=>form(null));
 $("customerAddForm").addEventListener("submit",e=>{e.preventDefault();submit($("customerAddSubmit"),{action:"customer-add",...body(e.currentTarget)},e.currentTarget);});
 $("customerEditForm").addEventListener("submit",e=>{e.preventDefault();submit($("customerSave"),{action:"customer-update",...body(e.currentTarget)},e.currentTarget);});
 for(const f of [$("customerAddForm"),$("customerEditForm")]){
   f.elements.namedItem("staffNomination").addEventListener("change",()=>{
     if(f.elements.namedItem("staffNomination").value==="admin_pending")f.elements.namedItem("program").value="standard";
   });
   f.elements.namedItem("program").addEventListener("change",()=>{
     if(f.elements.namedItem("program").value==="pilot")f.elements.namedItem("staffNomination").value="none";
   });
 }
 $("customerCopyLink").addEventListener("click",async()=>{
   if(!inviteCtx)return;
   try{await navigator.clipboard.writeText(inviteCtx.link);notice("Signup link copied. Share it only with the intended recipient.");}
   catch{$("customerInviteLink").select();notice("Select and copy the highlighted link.");}
 });
 $("customerEmailLink").addEventListener("click",()=>{
   if(!inviteCtx)return;
   location.href="mailto:"+encodeURIComponent(inviteCtx.person.email)+"?subject="+encodeURIComponent("Your Anthos invitation")+"&body="+encodeURIComponent(message());
 });
 $("customerTextLink").addEventListener("click",()=>{
   if(!inviteCtx)return;
   location.href="sms:?body="+encodeURIComponent(message());
 });
 $("customerRefresh").addEventListener("click",refresh);
 $("customerSearch").addEventListener("input",()=>{clearTimeout(searchDelay);searchDelay=setTimeout(()=>{page=0;refresh();},250);});
 for(const id of ["customerFilterProgram","customerFilterStatus"])$(id).addEventListener("change",()=>{page=0;refresh();});
 $("customerPrev").addEventListener("click",()=>{if(page){page--;refresh();}});
 $("customerNext").addEventListener("click",()=>{if(total===null||(page+1)*40<total){page++;refresh();}});
 document.querySelector('[data-studio-tab="customers"]')?.addEventListener("click",()=>{if(!$("dashboard").hidden)refresh();});
 document.addEventListener("threefold-auth",e=>{
   if(!e.detail?.authenticated){last=[];loaded=false;inviteCtx=null;$("customerInviteLink").value="";form(null);draw([]);}
 });
})();