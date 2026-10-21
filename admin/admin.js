(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const path="/api/admin";
  const post=async body=>{
    const result=await fetch(path,{
      method:"POST",credentials:"same-origin",
      headers:{"Content-Type":"application/json","X-Threefold-Admin":"1"},
      body:JSON.stringify(body),cache:"no-store"
    });
    const data=await result.json().catch(()=>({error:"The server returned an unexpected response."}));
    return {...data,httpStatus:result.status};
  };
  const get=async()=>{
    const result=await fetch(path,{credentials:"same-origin",cache:"no-store"});
    return result.json();
  };
  const show=id=>{
    $("dashboard").hidden=id!=="dashboard";
    $("loginPanel").hidden=id!=="login";
    $("logout").hidden=id!=="dashboard";
    document.dispatchEvent(new CustomEvent("threefold-auth",{detail:{authenticated:id==="dashboard"}}));
  };
  const say=(id,message,isError=false)=>{
    const el=$(id);el.textContent=message;
    el.classList.toggle("error",Boolean(isError));
  };
  const badge=(id,configured)=>{
    $(id).textContent=configured?"Key installed":"Missing key";
    $(id).classList.toggle("ready",configured);
  };
  const enable=(button,loading)=>{
    button.disabled=loading;
    if(loading)button.dataset.original=button.textContent;
    button.textContent=loading?"Checking…":(button.dataset.original||button.textContent);
  };
  const safeNum=n=>Number.isFinite(Number(n))?Number(n):0;
  let smsTestReady=false;
  let smsAlreadyRequested=false;
  function refreshSMSButton(){
    const confirmations=$("smsOwner").checked&&$("smsConsent").checked&&
      $("smsCarrierConfirmed").checked&&$("smsConfirm").value.trim()==="SEND ONE TEST";
    $("sendTestSMS").disabled=!smsTestReady||!confirmations||smsAlreadyRequested;
  }

  const updateServices=s=>{
    if(!s)return;
    const a=s.openai,t=s.telnyx;
    $("openaiStat").textContent=a?.configured?"Key installed":"Not connected";
    $("telnyxStat").textContent=t?.configured?"Key installed":"Not connected";
    badge("openaiBadge",!!a?.configured);badge("telnyxBadge",!!t?.configured);
    $("openaiModel").textContent=a?.model||"—";
    $("openaiKey").textContent=a?.configured?"Stored securely in Vercel":"Not present";
    $("telnyxKey").textContent=t?.configured?"Stored securely in Vercel":"Not present";
    $("telnyxSender").textContent=t?.senderConfigured?"••• "+t.senderLast4:"Not configured";
    $("checkOpenAI").disabled=!a?.configured;
    $("tryOpenAI").disabled=!a?.configured;
    $("checkTelnyx").disabled=!t?.configured;
    const test=s.testSMS||{};
    smsTestReady=!!(t?.configured&&t?.senderConfigured&&test.recipientReady&&
      test.carrierApproved&&test.enabled);
    $("smsTestRecipient").textContent=test.recipientReady?
      "Approved test phone ending "+test.recipientLast4:"Not allowlisted";
    $("smsTestCarrier").textContent=test.carrierApproved?"Confirmed in settings":"Not confirmed";
    $("smsTestEnabled").textContent=test.enabled?"On (restricted)":"Off";
    if(test.messagePreview)$("smsTestPreview").textContent=test.messagePreview;
    if(!smsTestReady){
      say("testSMSOutput","Test sending is locked. In Vercel configure THREEFOLD_TEST_SMS_TO, "+
        "THREEFOLD_10DLC_APPROVED and THREEFOLD_TEST_SMS_ENABLED after Telnyx campaign approval.");
    }
    refreshSMSButton();
  };
  async function init(){
    say("globalStatus","");
    try {
      const state=await get();
      if(state.authenticated){
        show("dashboard");updateServices(state.services);
      }else{
        show("login");
        if(!state.adminConfigured){
          $("loginGuide").textContent="Administrator access isn't configured yet. Set your private password and session secret in Vercel's Environment Variables to activate the login.";
          $("loginButton").disabled=true;
          say("globalStatus","Server login is locked until THREEFOLD_ADMIN_PASSWORD and THREEFOLD_SESSION_SECRET are configured.",true);
        }else{
          $("loginButton").disabled=false;
          $("loginGuide").textContent="Sign in to review provider connections. Your password is verified by the server, not stored in this browser.";
        }
      }
    }catch{
      show("login");$("loginButton").disabled=true;
      say("globalStatus","Could not reach the admin API. Check the deployment and try again.",true);
    }
  }
  $("loginForm").addEventListener("submit",async event=>{
    event.preventDefault();const button=$("loginButton"),password=$("password").value;
    enable(button,true);say("globalStatus","");
    try{
      const data=await post({action:"login",password});
      $("password").value="";
      if(data.ok){await init();say("globalStatus","You're signed in securely.");}
      else say("globalStatus",data.error||"Could not sign in.",true);
    }catch{say("globalStatus","Unable to reach the sign-in API.",true);}
    finally{enable(button,false);}
  });
  $("logout").addEventListener("click",async()=>{
    try{await post({action:"logout"});}catch{}
    show("login");say("globalStatus","You have signed out.");$("password").value="";
  });
  async function runCheck(service){
    const isAI=service==="openai",button=$(isAI?"checkOpenAI":"checkTelnyx");
    const destination=isAI?"openaiOutput":"telnyxOutput";
    enable(button,true);say(destination,"Contacting "+(isAI?"OpenAI":"Telnyx")+" …");
    try{
      const reply=await post({action:isAI?"check-openai":"check-telnyx"});
      if(reply.httpStatus===401){show("login");say("globalStatus","Session expired. Sign in again.",true);return;}
      if(reply.ok){
        let message=reply.message;
        if(isAI)message+="\nModel: "+reply.model+"\nResponse: "+reply.output+
          (reply.usage?"\nInput/output tokens: "+safeNum(reply.usage.inputTokens)+"/"+safeNum(reply.usage.outputTokens):"");
        else message+="\nMessaging profiles returned: "+safeNum(reply.profileCountReturned)+
          (reply.profiles?.length?"\n"+reply.profiles.map(p=>"• "+p.name+" ("+p.id+")").join("\n"):"")+
          "\n"+(reply.note||"");
        say(destination,message);
      }else say(destination,reply.message||reply.error||"Connection could not be verified.",true);
    }catch{say(destination,"Connection test failed. Please retry.",true);}
    finally{enable(button,false);}
  }
  $("checkOpenAI").addEventListener("click",()=>runCheck("openai"));
  $("checkTelnyx").addEventListener("click",()=>runCheck("telnyx"));
  for(const id of ["smsOwner","smsConsent","smsCarrierConfirmed","smsConfirm"]){
    $(id).addEventListener(id==="smsConfirm"?"input":"change",refreshSMSButton);
  }
  $("sendTestSMS").addEventListener("click",async()=>{
    if(!smsTestReady||smsAlreadyRequested)return;
    refreshSMSButton();
    if($("sendTestSMS").disabled)return;
    if(!window.confirm("Send one potentially billable Threefold test SMS to your preapproved personal number? Only proceed if your 10DLC campaign is approved."))return;
    // Lock immediately before the network operation. No automatic retries.
    smsAlreadyRequested=true;
    refreshSMSButton();
    say("testSMSOutput","Contacting Telnyx once. Please wait…");
    try{
      const data=await post({action:"send-test-sms",confirmation:"SEND ONE TEST",
        ownPhone:true,expressConsent:true,carrierStatusVerified:true});
      if(data.httpStatus===401){
        show("login");
        say("globalStatus","Your admin session expired. Please sign in again.",true);return;
      }
      const msg=(data.message||data.error||"Telnyx did not confirm the result.")+
        (data.providerMessageId?"\nTelnyx message ID: "+data.providerMessageId:"")+
        (data.note?"\n"+data.note:"");
      say("testSMSOutput",msg,!data.ok);
    }catch{
      say("testSMSOutput","The request could not be confirmed. Check Telnyx messaging activity before trying again.",true);
    }
  });

  $("tryOpenAI").addEventListener("click",async()=>{
    const button=$("tryOpenAI"),prompt=$("aiPrompt").value.trim();
    if(prompt.length<3||prompt.length>500){say("globalStatus","Enter 3–500 characters of fictional test text.",true);return;}
    enable(button,true);$("aiResponse").querySelector("span").textContent="REHEARSING";
    $("aiResponse").querySelector("p").textContent="OpenAI is composing a short fictional response…";
    try{
      const data=await post({action:"try-openai",prompt});
      if(data.httpStatus===401){show("login");say("globalStatus","Session expired. Sign in again.",true);return;}
      $("aiResponse").querySelector("span").textContent=data.ok?"THREEFOLD'S RESPONSE":"CONNECTION ERROR";
      $("aiResponse").querySelector("p").textContent=data.ok?data.output:(data.message||data.error||"Unable to test OpenAI.");
    }catch{
      $("aiResponse").querySelector("span").textContent="CONNECTION ERROR";
      $("aiResponse").querySelector("p").textContent="Unable to reach the server.";
    }finally{enable(button,false);}
  });
  init();
})();