// Private admin-only household registration summaries.
// A provisional household registration never grants customer access or verifies phones.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function groupIdsFor(rows){
 return [...new Set(rows.map(row=>row.group_id).filter(x=>typeof x==="string"&&UUID.test(x)))];
}
export function summarizeCouples(rows,related){
 const byGroup=new Map();
 for(const person of related){
  if(!person||!person.group_id||person.record_status==="archived")continue;
  const group=byGroup.get(person.group_id)||[];
  group.push(person);byGroup.set(person.group_id,group);
 }
 const statusFor=row=>{
  if(!row.group_id)return {state:"not_started",partnerName:null,completed:0};
  const members=byGroup.get(row.group_id)||[];
  if(members.length>2)return {state:"needs_review",partnerName:null,completed:members.filter(x=>!!x.questionnaire_submitted_at).length};
  const partner=members.find(x=>x.id!==row.id);
  if(!partner)return {state:"awaiting_spouse",partnerName:null,completed:members.filter(x=>!!x.questionnaire_submitted_at).length};
  // Both recipients redeemed the same couple invitation, both submitted,
  // and each identified the other's phone as intended spouse.
  const matching=members.length===2&&partner.spouse_phone_e164===row.phone_e164&&
      row.spouse_phone_e164===partner.phone_e164;
  if(!matching)return {state:"needs_review",partnerName:partner.display_name,completed:members.filter(x=>!!x.questionnaire_submitted_at).length};
  const done=members.filter(x=>!!x.questionnaire_submitted_at).length;
  return {state:done===2?"both_joined_pending_verification":"awaiting_spouse",
    partnerName:partner.display_name,
    completed:done,
    phoneVerificationComplete:!!row.phone_verified_at&&!!partner.phone_verified_at,
    // Account activation is distinct from household pairing. Explicit future
    // mutual authorization is required before any shared account access.
    bothAccountsActive:!!row.auth_user_id&&!!partner.auth_user_id};
 };
 const byId=new Map(rows.map(x=>[x.id,statusFor(x)]));
 const unique=new Set(rows.filter(row=>byId.get(row.id)?.state==="both_joined_pending_verification").map(row=>row.group_id));
 return {byId,registeredCouplesShown:unique.size};
}
