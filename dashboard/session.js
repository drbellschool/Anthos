// Private Anthos dashboard session bridge. Tokens are never written to localStorage.
(()=>{'use strict';
const gate=document.getElementById('sessionGate'),api='/api/couple-home';
function show(message){if(gate)gate.textContent=message;}
async function send(data){const r=await fetch(api,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw Error(result.error||'Unable to sign in');return result;}
async function boot(){
 try{
  if(location.hash.includes('access_token=')){
   show('Finishing your private sign-in…');
   const p=new URLSearchParams(location.hash.slice(1));
   history.replaceState(null,'',location.pathname+location.search);
   const access_token=p.get('access_token'),refresh_token=p.get('refresh_token');
   if(!access_token||!refresh_token)throw Error('This sign-in link is incomplete. Request another.');
   await send({action:'establish',access_token,refresh_token,expires_in:Number(p.get('expires_in'))||3600});
  }
  const response=await fetch(api,{credentials:'same-origin',cache:'no-store'});
  if(response.status===401){location.replace('/login/');return;}
  if(!response.ok)throw Error('Your dashboard could not be loaded.');
  const state=await response.json();
  if(!state.authenticated){location.replace('/login/');return;}
  window.AnthosCord.setProgress(Number(state.checkpoints)||0);
  if(Number.isInteger(state.year))document.getElementById('yearText').textContent=String(state.year);
  const note=document.getElementById('profileStatus');
  if(note){
   if(!state.linked)note.textContent='Your sign-in is verified. Your existing Anthos profile has not yet been securely linked. Personal progress will appear here after linking.';
   else note.textContent='Welcome'+(state.firstName?', '+state.firstName:'')+'!'+(state.spouseFirstName?' Your journey with '+state.spouseFirstName+' is ready.':'')+' Your recorded learning checkpoints appear in the cord.';
  }
  const subtitle=document.getElementById('cordSource');
  if(subtitle)subtitle.textContent=state.linked?'Your recorded Deep Dive checkpoints — not a marriage grade':'Your private Yearly Cord — awaiting profile connection';
  document.body.classList.remove('auth-pending');gate?.remove();
  document.getElementById('signOut')?.addEventListener('click',async()=>{try{await send({action:'logout'});}finally{location.replace('/login/');}});
 }catch(err){show(err.message||'Unable to open your dashboard.');document.getElementById('retryLogin')?.removeAttribute('hidden');}
}
boot();
})();
