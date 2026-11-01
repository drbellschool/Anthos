// Compact private Couple Insights. Database pagination: max 25 couples per request.
(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 if(!$("liveCoupleRows"))return;
 const el=(tag,value)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value);return n;};
 const cell=(tr,value)=>{const td=el("td");if(typeof value==="string")td.textContent=value;else td.append(value);tr.append(td);};
 let page=0,total=0,busy=false,debounce=null,loadSequence=0;
 const PAGE_SIZE=25;
 function notice(msg,error=false){const n=$("liveCoupleNotice");n.textContent=msg;n.classList.toggle("is-error",error);}
 function draw(couples){
  const rows=$("liveCoupleRows");rows.replaceChildren();
  if(!couples.length){const tr=el("tr"),td=el("td","No matching couples.");td.colSpan=6;tr.append(td);rows.append(tr);return;}
  for(const c of couples){
   const tr=el("tr"),people=Array.isArray(c.people)?c.people:[];
   const who=el("div");who.className="couple-name";
   who.append(el("strong",people.map(x=>x.name).join(" + ")||"Couple record"));
   who.append(el("small",c.marriedYears===null||c.marriedYears===undefined?
      (c.anniversaryDisagrees?"Anniversary dates differ":"Anniversary pending"):c.marriedYears+" years married"));
   cell(tr,who);
   const zips=people.map(x=>x.postalCode).filter(Boolean);
   const unique=[...new Set(zips)];
   cell(tr,unique.length?unique.join(" / ")+(zips.length<people.length?" · ZIP needed":""):"ZIP needed");
   cell(tr,c.state==="both_joined_pending_verification"?"Both joined":
     c.state==="awaiting_spouse"?"Spouse pending":c.state==="needs_review"?"Needs review":"Not paired");
   cell(tr,people.filter(x=>x.phoneVerified).length+"/"+people.length+" verified");
   cell(tr,"Not connected");
   const manage=el("button","Manage");manage.type="button";manage.className="couple-manage";
   manage.addEventListener("click",()=>{
     const tab=document.querySelector('[data-studio-tab="customers"]');
     if(!tab)return;tab.click();
     const search=$("customerSearch");if(search&&people[0]?.name){search.value=people[0].name;search.dispatchEvent(new Event("input",{bubbles:true}));}
   });
   cell(tr,manage);rows.append(tr);
  }
 }
 async function load(){
  const seq=++loadSequence;
  busy=true;$("liveCoupleRefresh").disabled=true;notice("Loading couple registrations…");
  const p=new URLSearchParams({view:"couples",page:String(page)});
  const term=$("liveCoupleSearch").value.trim();if(term)p.set("search",term);
  try{
   const res=await fetch("/api/admin?"+p,{credentials:"same-origin",cache:"no-store"});
   const data=await res.json().catch(()=>({error:"Unexpected response"}));
   if(!res.ok||!data.ok)throw Error(data.error||"Couple report is unavailable");
   if(seq!==loadSequence)return;
   total=data.total;const counts=data.counts||{};
   $("liveCoupleTotal").textContent=total;
   $("liveCoupleRegistered").textContent=counts.registered??"—";
   $("liveCouplePending").textContent=counts.pending??"—";
   $("liveCoupleReview").textContent=counts.needingReview??"—";
   draw(data.couples);
   const first=data.couples.length?page*PAGE_SIZE+1:0;
   const last=page*PAGE_SIZE+data.couples.length;
   $("liveCoupleRange").textContent=first+"–"+last+" of "+total;
   $("liveCouplePrev").disabled=page===0;
   $("liveCoupleNext").disabled=(page+1)*PAGE_SIZE>=total;
   notice("Live · Registration is separate from phone ownership and account activation.");
  }catch(err){if(seq===loadSequence){notice(err.message,true);draw([]);}}
  finally{if(seq===loadSequence){busy=false;$("liveCoupleRefresh").disabled=false;}}
 }
 $("liveCoupleSearch").addEventListener("input",()=>{
  clearTimeout(debounce);debounce=setTimeout(()=>{page=0;load();},250);
 });
 $("liveCouplePrev").addEventListener("click",()=>{if(page>0){page--;load();}});
 $("liveCoupleNext").addEventListener("click",()=>{if((page+1)*PAGE_SIZE<total){page++;load();}});
 $("liveCoupleRefresh").addEventListener("click",load);
 document.querySelector('[data-studio-tab="couples"]')?.addEventListener("click",()=>{
  if(!$("dashboard").hidden)load();
 });
 document.addEventListener("threefold-auth",e=>{
  if(!e.detail?.authenticated){
   ++loadSequence;page=0;total=0;draw([]);
   for(const id of ["liveCoupleTotal","liveCoupleRegistered","liveCouplePending","liveCoupleReview"])$(id).textContent="—";
   $("liveCoupleRange").textContent="—";
  }
 });
})();