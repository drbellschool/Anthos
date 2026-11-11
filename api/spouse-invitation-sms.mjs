// Single transactional spouse invitation, sent only after the inviter confirms
// their spouse agreed to receive one invitation SMS. No recurring messaging.
const validPhone=/^\+[1-9]\d{7,14}$/;
const tokenUrl=/^https:\/\/anthos\.love\/signup\/#t=[A-Za-z0-9_-]{16}$/;
export async function sendSpouseSignupInvitation({to,link,inviter}){
 if(process.env.TELNYX_SPOUSE_INVITES_ENABLED!=="true")
  return {attempted:false,reason:"disabled"};
 if(!process.env.TELNYX_API_KEY||!validPhone.test(process.env.TELNYX_FROM_NUMBER||""))
  return {attempted:false,reason:"not_configured"};
 if(!validPhone.test(to)||!tokenUrl.test(link))throw new Error("Invalid spouse invitation.");
 const safeName=String(inviter||"Your spouse").replace(/[^a-zA-Z .'-]/g,"").slice(0,35)||"Your spouse";
 const text=safeName+" invited you to complete your Anthos couple registration: "+link+
 ". One invitation only. You decide whether to join. No recurring messages without your consent.";
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),9500);
 try{
  const response=await fetch("https://api.telnyx.com/v2/messages",{
   method:"POST",headers:{Authorization:"Bearer "+process.env.TELNYX_API_KEY,
     "Content-Type":"application/json",Accept:"application/json"},
   signal:controller.signal,
   body:JSON.stringify({from:process.env.TELNYX_FROM_NUMBER,to,text})
  });
  if(!response.ok)return {attempted:true,accepted:false};
  return {attempted:true,accepted:true}; // not proof of handset delivery
 }catch{return {attempted:true,accepted:false,outcomeUncertain:true}}
 finally{clearTimeout(timeout)}
}
