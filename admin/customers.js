(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  if(!$("customerRows"))return;
  let page=0,loaded=false,busy=false,last=[],total=null;
  const label=(id,value)=>{$(id).textContent=value===null||value===undefined?"—":String(value);};
  function notice(message,error=false){
    const node=$("customerNotice");node.textContent=message;node.classList.toggle("is-error",error);
  }
  async function api(query,body){
    const options=body?{method:"POST",headers:{"Content-Type":"application/json","X-Threefold-Admin":"1"},body:JSON.stringify(body)}:{};
    const r=await fetch("/api/admin"+query,{...options,credentials:"same-origin",cache:"no-store"});
    const result=await r.json().catch(()=>({error:"Unexpected server response."}));
    if(r.status===401){notice("Your admin session expired. Sign in again.",true);throw Error("Session expired. Sign in again.");}
    if(!r.ok||!result.ok)throw Error(result.error||"Customer service unavailable.");
    return result;
  }
  function el(tag,cls,text){
    const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;
  }
  function cell(row,node){const td=el("td");td.append(node);row.append(td);}
  function pill(value,kind){
    const span=el("span","customer-pill customer-pill-"+kind,value);return span;
  }
  function draw(rows){
    const tbody=$("customerRows");tbody.replaceChildren();
    if(!rows.length){const tr=el("tr"),td=el("td","","No matching customer records. Add someone using the button above.");td.colSpan=6;tr.append(td);tbody.append(tr);return;}
    rows.forEach(person=>{
      const tr=el("tr");const customer=el("div","customer-person");
      customer.append(el("strong","",person.name),el("span","",person.email));cell(tr,customer);
      cell(tr,pill(person.program==="pilot"?"Pilot":"Standard","program"));
      cell(tr,pill(person.status,person.status==="archived"?"archive":"status"));
      cell(tr,el("span","customer-muted",person.groupId?"Grouped · "+person.groupId.slice(0,8):"Individual"));
      cell(tr,el("span","customer-muted",person.staffNomination==="admin_pending"?"Admin candidate":"Member"));
      const button=el("button","button customer-manage","Edit");button.type="button";
      button.addEventListener("click",()=>edit(person));cell(tr,button);
      tbody.append(tr);
    });
  }
  async function refresh(){
    if(busy)return;
    busy=true;$("customerRefresh").disabled=true;
    notice("Reading real customer records…");
    const params=new URLSearchParams({view:"customers",page:String(page)});
    const search=$("customerSearch").value.trim();
    if(search)params.set("search",search);
    if($("customerFilterProgram").value)params.set("program",$("customerFilterProgram").value);
    if($("customerFilterStatus").value)params.set("status",$("customerFilterStatus").value);
    try{
      const result=await api("?"+params);
      loaded=true;last=result.customers;total=result.total;
      draw(last);
      label("customerCountAll",result.counts.all);
      label("customerCountPilot",result.counts.pilot);
      label("customerCountStandard",result.counts.standard);
      label("customerCountAdmin",result.counts.adminPending);
      const lower=last.length?page*40+1:0,upper=page*40+last.length;
      label("customerPageStatus",total===null?lower+"–"+upper+" results":lower+"–"+upper+" of "+total+" records");
      $("customerPrev").disabled=page<=0;
      $("customerNext").disabled=total===null?last.length<40:(page+1)*40>=total;
      notice("Live records · Standard does not mean paid · No account invitations have been sent.");
    }catch(e){
      notice(e.message,true);
      if(!loaded)draw([]);
    }finally{busy=false;$("customerRefresh").disabled=false;}
  }
  function showForm(id){
    $("customerAddForm").hidden=id!=="customerAddForm";
    $("customerEditForm").hidden=id!=="customerEditForm";
    if(id)$(id).scrollIntoView({block:"nearest",behavior:"smooth"});
  }
  function edit(person){
    showForm("customerEditForm");
    const form=$("customerEditForm");
    for(const [key,value] of Object.entries({id:person.id,name:person.name,program:person.program,
      staffNomination:person.staffNomination,status:person.status})){
      form.elements.namedItem(key).value=value;
    }
    label("customerEditTitle","Edit "+person.name);
    label("customerEditEmail",person.email+" · "+(person.registered?"Linked to an existing Auth identity":"Pending directory contact"));
  }
  function formData(form){return Object.fromEntries(new FormData(form).entries());}
  async function submit(button,body,form){
    if(busy)return;
    busy=true;button.disabled=true;
    notice("Saving to the private customer database…");
    try{
      const result=await api("",body);
      form.reset();showForm(null);loaded=false;page=0;busy=false;
      await refresh();notice(result.message||"Customer updated.");
    }catch(e){notice(e.message,true);}
    finally{busy=false;button.disabled=false;}
  }
  $("customerOpenAdd").addEventListener("click",()=>showForm("customerAddForm"));
  $("customerCloseAdd").addEventListener("click",()=>showForm(null));
  $("customerCloseEdit").addEventListener("click",()=>showForm(null));
  $("customerAddForm").addEventListener("submit",event=>{
    event.preventDefault();const data=formData(event.currentTarget);
    submit($("customerAddSubmit"),{action:"customer-add",...data},event.currentTarget);
  });
  $("customerEditForm").addEventListener("submit",event=>{
    event.preventDefault();const data=formData(event.currentTarget);
    submit($("customerSave"),{action:"customer-update",...data},event.currentTarget);
  });
  for(const form of [$("customerAddForm"),$("customerEditForm")]){
    form.elements.namedItem("staffNomination").addEventListener("change",()=>{
      if(form.elements.namedItem("staffNomination").value==="admin_pending")form.elements.namedItem("program").value="standard";
    });
    form.elements.namedItem("program").addEventListener("change",()=>{
      if(form.elements.namedItem("program").value==="pilot")form.elements.namedItem("staffNomination").value="none";
    });
  }
  $("customerRefresh").addEventListener("click",refresh);
  let searchDelay;
  $("customerSearch").addEventListener("input",()=>{
    clearTimeout(searchDelay);searchDelay=setTimeout(()=>{page=0;refresh();},280);
  });
  for(const id of ["customerFilterProgram","customerFilterStatus"])
    $(id).addEventListener("change",()=>{page=0;refresh();});
  $("customerPrev").addEventListener("click",()=>{if(page>0){page--;refresh();}});
  $("customerNext").addEventListener("click",()=>{if(total===null||((page+1)*40<total)){page++;refresh();}});
  const nav=document.querySelector('[data-studio-tab="customers"]');
  nav?.addEventListener("click",()=>{if(!$("dashboard").hidden)refresh();});
  document.addEventListener("threefold-auth",event=>{
    if(!event.detail?.authenticated){loaded=false;last=[];total=null;draw([]);showForm(null);}
  });
})();