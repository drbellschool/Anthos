// Server-only transactional registration SMS transport.
// This module does not expose a public send endpoint and does not activate pilots.
const phone=/^\+[1-9]\d{7,14}$/;
const enabled=()=>process.env.TELNYX_REGISTRATION_ENABLED==="true";
export function registrationSmsConfigured(){
 return enabled()&&!!process.env.TELNYX_API_KEY&&phone.test(process.env.TELNYX_FROM_NUMBER||"");
}
export async function sendRegistrationCode({to,code}){
 if(!registrationSmsConfigured())throw new Error("Registration SMS is not enabled.");
 if(!phone.test(to)||!/^\d{6}$/.test(String(code)))throw new Error("Invalid verification request.");
 // No user-supplied text, links, marketing, or pilot messaging.
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),9000);
 try{
  const response=await fetch("https://api.telnyx.com/v2/messages",{
   method:"POST",signal:controller.signal,
   headers:{Authorization:"Bearer "+process.env.TELNYX_API_KEY,
    "Content-Type":"application/json",Accept:"application/json"},
   body:JSON.stringify({from:process.env.TELNYX_FROM_NUMBER,to,
    text:"Anthos verification code: "+code+". Expires in 10 minutes. If you did not request this, ignore this message."})
  });
  if(!response.ok)throw new Error("Registration SMS provider rejected the request.");
  // Provider acceptance is NOT delivery confirmation.
  return {accepted:true};
 }finally{clearTimeout(timeout)}
}
