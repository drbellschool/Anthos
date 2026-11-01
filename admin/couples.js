// Private real couple registration monitor. No fictional data, no intimate content.
(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 if(!$("liveCoupleRows"))return;
 const el=(tag,value)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value);return n;};
 function cell(tr,value){tr.append(el("td",value));}
 function notice(msg,error=false){const n=$("liveCoupleNotice");n.textContent=msg;n.classList.toggle("is-error",error);}
 function draw(couples){
  const table=$("liveCoupleRows");table.replaceChildren();
  if(!couples.length){
   const tr=el("tr"),td=el("td","No couple registrations yet.");td.colSpan=6;tr.append(td);table.append(tr);return;
  }
  for(const c of couples){
   const tr=el("tr"),members=Array.isArray(c.people)?c.people:[];
   cell(tr,members.map(p=>p.name).join(" + ")||"Unknown");
   cell(tr,c.state==="both_joined_pending_verification"?"✓ Both signed up":
     c.state==="awaiting_spouse"?"Awaiting spouse":
     c.state==="needs_review"?"Needs review":"Not started");
   cell(tr,members.filter(x=>x.accountActive).length+"/"+members.length+" active");
   cell(tr,members.filter(x=>x.phoneVerified).length+"/"+members.length+" verified");
   cell(tr,c.marriedYears===null||c.marriedYears===undefined?"—"+(c.anniversaryDisagrees?" Dates differ":""):String(c.marriedYears));
   cell(tr,c.state==="needs_review"?"Check conflicting partner details":
     c.state==="awaiting_spouse"?"Spouse needs to complete their link":
     "Verify both phones and activate separate accounts");
   table.append(tr);
  }
 }
 let busy=false;
 async function load(){
   if(busy)return;
   busy=true;$("liveCoupleRefresh").disabled=true;notice("Reading registered couples from Supabase…");
   try{
     const res=await fetch("/api/admin?view=couples",{credentials:"same-origin",cache:"no-store"});
     const data=await res.json().catch(()=>({error:"Unexpected response."}));
     if(!res.ok||!data.ok)throw Error(data.error||"Live couple registrations unavailable.");
     $("liveCoupleRegistered").textContent=data.counts.registered;
     $("liveCoupleForms").textContent=data.counts.completedForms;
     $("liveCouplePending").textContent=data.counts.pending;
     $("liveCoupleReview").textContent=data.counts.needingReview;
     draw(data.couples);
     notice(data.truncated?
       "Showing only the first 5,000 records; registration totals are partial.":"Live customer records. Couple pairing is recorded; verification and account activation remain separate.");
   }catch(err){notice(err.message,true);draw([]);}
   finally{busy=false;$("liveCoupleRefresh").disabled=false;}
 }
 $("liveCoupleRefresh").addEventListener("click",load);
 document.querySelector('[data-studio-tab="couples"]')?.addEventListener("click",()=>{if(!$("dashboard").hidden)load();});
 document.addEventListener("threefold-auth",event=>{
   if(!event.detail?.authenticated){draw([]);for(const k of ["liveCoupleRegistered","liveCoupleForms","liveCouplePending","liveCoupleReview"])$(k).textContent="—";}
 });
})();