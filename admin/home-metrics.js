(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const dollars=n=>typeof n==="number"&&Number.isFinite(n)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(n):"Unavailable";
 const integer=n=>Number.isInteger(n)&&n>=0?new Intl.NumberFormat("en-US").format(n):"Unavailable";
 const compact=n=>typeof n==="number"&&Number.isFinite(n)?new Intl.NumberFormat("en-US",{notation:"compact",maximumFractionDigits:1}).format(n):"Unavailable";
 let controller=null,loading=false;
 async function refresh(){
  if(loading)return;
  loading=true;const btn=$("refreshOpsMetrics");btn.disabled=true;
  $("opsMetricsNotice").textContent="Refreshing live provider reports…";
  if(controller)controller.abort();controller=new AbortController();
  try{
   const r=await fetch("/api/admin?view=home-metrics",{credentials:"same-origin",cache:"no-store",signal:controller.signal});
   if(r.status===401){$("opsMetricsNotice").textContent="Sign in again to view private operating costs.";return;}
   if(!r.ok)throw Error("Metrics endpoint unavailable");
   const d=await r.json();if(!d.ok)throw Error("Metrics could not be loaded");
   const c=d.couples||{},t=d.telnyx||{},o=d.openai||{};
   $("metricCouples").textContent=c.available?integer(c.registered):"Unavailable";
   $("metricVerified").textContent=c.available?integer(c.verified):"Unavailable";
   $("metricCouplesNote").textContent=c.available?"Completed standard couples · excludes pilots":(c.reason||"Directory not connected");
   $("metricTelnyxBalance").textContent=dollars(t.balance);
   $("metricTelnyxBalanceNote").textContent=typeof t.availableCredit==="number"
    ?"Available credit "+dollars(t.availableCredit):t.reason||"Prepaid balance not available";
   $("metricTelnyxSpend").textContent=dollars(t.monthlyCost);
   $("metricTelnyxUsage").textContent=typeof t.messages==="number"
    ?integer(t.messages)+" reported message parts · this month"
    :t.usageStatus==="permission_denied"?"Usage-report access denied":"Messaging usage currently unavailable";
   $("metricOpenaiSpend").textContent=dollars(o.monthlyCost);
   $("metricOpenaiScope").textContent=o.reason||"UTC month · organization-wide, not necessarily Anthos only";
   $("metricOpenaiTokens").textContent=typeof o.inputTokens==="number"&&typeof o.outputTokens==="number"
    ?compact(o.inputTokens+o.outputTokens):"Unavailable";
   $("metricOpenaiRequests").textContent=typeof o.requests==="number"
    ?integer(o.requests)+" model requests · "+integer(o.inputTokens)+" in / "+integer(o.outputTokens)+" out"
    :(o.reason||"Organization usage requires an OpenAI admin key");
   $("metricsCheckedAt").textContent="Checked "+new Date(d.checkedAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
   const gaps=[!c.available&&"couple records",t.balance===null&&"Telnyx balance",t.monthlyCost===null&&"Telnyx monthly costs",o.monthlyCost===null&&"OpenAI billing"].filter(Boolean);
   $("opsMetricsNotice").textContent=gaps.length?"Not yet reporting: "+gaps.join(", ")+". Missing values are not zero.":"Live reporting loaded. Totals are provider/account scope, not an Anthos-only invoice.";
  }catch(err){
   if(err.name!=="AbortError")$("opsMetricsNotice").textContent="Could not refresh figures. Your existing Anthos dashboard remains available.";
  }finally{loading=false;btn.disabled=false;}
 }
 $("refreshOpsMetrics").addEventListener("click",refresh);
 document.addEventListener("threefold-auth",e=>{
  if(e.detail?.authenticated)refresh();
  else if(controller){controller.abort();$("metricsCheckedAt").textContent="Sign in to load metrics";}
 });
})();
