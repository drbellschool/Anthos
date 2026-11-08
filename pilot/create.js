(()=>{
 const $=id=>document.getElementById(id);
 function feedback(t){$("status").textContent=t}
 async function init(){
  try{const r=await fetch("/api/admin",{credentials:"same-origin",cache:"no-store"});
   const data=await r.json();if(!data.authenticated)throw Error("Sign in at /admin/ first, then return here.");
   $("create").disabled=false;feedback("Admin authenticated. You may create a room.");
  }catch(e){feedback(e.message)}
  $("create").addEventListener("click",async()=>{
   $("create").disabled=true;feedback("Creating invitations…");
   try{const r=await fetch("/api/admin",{method:"POST",credentials:"same-origin",
    headers:{"Content-Type":"application/json","x-threefold-admin":"1"},
    body:JSON.stringify({action:"pilot-create-jack-jill",theme:$("theme").value})});
    const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||"Could not create pilot.");
    $("linkA").value=data.invitations.a;$("linkB").value=data.invitations.b;
    $("links").hidden=false;feedback("Room created. Copy both links now.");
   }catch(e){feedback(e.message)}finally{$("create").disabled=false}
  });
  document.querySelectorAll("[data-copy]").forEach(b=>b.addEventListener("click",async()=>{
   const v=$(b.dataset.copy).value;if(!v)return;
   try{await navigator.clipboard.writeText(v);feedback("Invitation link copied.")}
   catch{ $(b.dataset.copy).select();feedback("Clipboard blocked. Select and copy the link manually.") }
  }));
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();