(() => {
 "use strict";
 // UX gate only: never use this flag as authorization for SMS enrollment.
 const key = "anthos_welcome_confirmed_session_v1";
 let already=false;try{already=sessionStorage.getItem(key)==="yes"}catch{}
 if(already)return;
 const style=document.createElement("style");
 style.textContent=`
 .anthos-gate{position:fixed;inset:0;z-index:2147483646;overflow:auto;background:#f7f3ed;color:#26362c;display:grid;place-items:center;padding:20px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
 .anthos-gate *{box-sizing:border-box}.anthos-gate-panel{width:min(100%,570px);padding:clamp(26px,5vw,55px);background:#fffdf9;border:1px solid #dfd8c9;box-shadow:0 25px 75px #4b544225}
 .anthos-gate-mark{text-align:center;color:#ae9580;font:36px Georgia,serif}.anthos-gate-brand{text-align:center;font:38px Georgia,serif;margin:0}.anthos-gate-eyebrow{text-align:center;color:#879080;letter-spacing:.19em;font-size:10px;font-weight:700;text-transform:uppercase;margin:12px 0 30px}
 .anthos-gate h2{font:normal clamp(30px,5vw,43px)/1.15 Georgia,serif;margin:0 0 14px;text-align:center}.anthos-gate p{color:#687167;line-height:1.7;text-align:center;font-size:14px}
 .anthos-gate-fields{display:grid;gap:18px;margin:30px 0 16px}.anthos-gate label{display:grid;gap:7px;font-size:13px;font-weight:700;color:#35483a}
 .anthos-gate label small{font-size:12px;font-weight:400;color:#687367}.anthos-gate input{width:100%;min-width:0;border:1px solid #cbd3cb;border-radius:4px;background:#fff;padding:13px;font:16px system-ui;color:#26362c}
 .anthos-gate button{border:0;border-radius:100px;background:#294d3c;color:#fff;padding:16px;width:100%;font:700 14px system-ui;cursor:pointer}.anthos-gate button:hover{background:#365e4b}
 .anthos-gate-error{min-height:1.4em;color:#a43838!important;font-weight:700}.anthos-gate-footer{font-size:12px!important}.anthos-gate-footer a{color:#395b48}
 `;
 document.head.append(style);
 const overlay=document.createElement("div");overlay.className="anthos-gate";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-labelledby","anthos-gate-heading");
 overlay.innerHTML=`<div class="anthos-gate-panel"><div class="anthos-gate-mark" aria-hidden="true">✳</div><div class="anthos-gate-brand">anthos</div><div class="anthos-gate-eyebrow">THE BEGINNING OF YOUR STORY</div>
 <h2 id="anthos-gate-heading">Every love story has a beginning.</h2><p>The best adventures begin when we know a little about you. These dates will help Anthos celebrate your milestones and, once personal accounts launch, suggest experiences that fit your season of life.</p>
 <form id="anthos-gate-form"><div class="anthos-gate-fields">
 <label>Your date of birth <small>Helps us understand your stage of life, remember your birthday, and confirm that Anthos is for adults 18 and older.</small><input name="birthday" type="date" required autocomplete="bday"></label>
 <label>Your wedding date <small>Helps us celebrate anniversaries and the story you've built together.</small><input name="wedding" type="date" required></label></div>
 <p class="anthos-gate-error" id="anthos-gate-error" role="alert"></p>
 <button type="submit">Begin our story &rarr;</button></form>
 <p class="anthos-gate-footer">This preview only checks the dates in your browser; it doesn't save them or personalize the demo yet. <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p></div>`;
 document.body.append(overlay);
 const today=new Date(),todayStr=[today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");
 const b=overlay.querySelector('[name="birthday"]'),w=overlay.querySelector('[name="wedding"]'),error=overlay.querySelector("#anthos-gate-error");
 b.max=todayStr;w.max=todayStr;b.focus();
 function parseDate(str){if(!/^\d{4}-\d{2}-\d{2}$/.test(str))return null;const [y,m,d]=str.split("-").map(Number),t=new Date(y,m-1,d);return t.getFullYear()===y&&t.getMonth()===m-1&&t.getDate()===d?t:null}
 overlay.querySelector("form").addEventListener("submit",e=>{
 e.preventDefault();const birth=parseDate(b.value),wedding=parseDate(w.value),now=new Date(),limit=new Date(now.getFullYear()-18,now.getMonth(),now.getDate());
 if(!birth||!wedding||birth>now||wedding>now){error.textContent="Please enter both dates accurately.";return}
 if(birth>limit){error.textContent="Anthos is intended for adults age 18 and older.";return}
 if(wedding<birth){error.textContent="Please check your wedding date.";return}
 try{sessionStorage.setItem(key,"yes")}catch{}
 overlay.remove();style.remove();
 });
})();
