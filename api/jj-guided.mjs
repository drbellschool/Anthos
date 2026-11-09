/** Version-pinned cadence: input at the start, a meaningful pivot, and the finale. */
export const GUIDED_STEPS=Object.freeze([1,3,5]);
export const guidedRoom=r=>!!r&&r.engine_version==="3.3.0"&&r.guidance_mode==="guided"&&r.autoplay===true&&r.mode==="shared";
export const guidedCheckpoint=r=>guidedRoom(r)&&GUIDED_STEPS.includes(r.step);
export const guidedNeedsInput=(r,participant)=>guidedCheckpoint(r)&&r.status==="active"&&participant?.submitted_step!==r.step;
export const autonomousInterlude=r=>guidedRoom(r)&&!GUIDED_STEPS.includes(r.step)&&r.step>=2&&r.step<=4;
