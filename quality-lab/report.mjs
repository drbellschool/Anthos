// Offline, private-safe QA dashboard generator.
// Usage: node quality-lab/report.mjs qa-artifacts [destination-directory]
// Only files named qa-*.json are imported; output never contains raw private advice.
import {readdir,readFile,mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {evaluateRun,summarize} from "./evaluator.mjs";
const source=process.argv[2]||"qa-artifacts",destination=process.argv[3]||source;
const escapeHtml=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const label=n=>n===null?"Not measured":typeof n==="number"?n.toLocaleString("en-US",{maximumFractionDigits:2}):String(n);
const pct=n=>n===null?"Not measured":(n*100).toFixed(1)+"%";
const statsCard=(title,value,sub="")=>`<div class="metric"><small>${escapeHtml(title)}</small><strong>${escapeHtml(value)}</strong><span>${escapeHtml(sub)}</span></div>`;
function dashboard(reports,stats){
 const cards=[
  statsCard("Attempted QA runs",label(stats.attempted),"Synthetic / evaluated only"),
  statsCard("Mean scored quality",label(stats.meanScore),stats.scored+" of "+stats.attempted+" runs scored"),
  statsCard("Median / minimum",label(stats.medianScore)+" / "+label(stats.lowestScore),"0–10 rubric"),
  statsCard("Accepted",pct(stats.passRate),stats.accepted+" passed all gates"),
  statsCard("Hard-failure rate",pct(stats.hardFailureRate),"A 10/10 score cannot override this"),
  statsCard("Mean cost per completed run",stats.meanCostUsd===null?"Unknown":"$"+stats.meanCostUsd,stats.costCoverage+" runs with cost data")
 ].join("");
 const rows=reports.map(r=>`<tr data-status="${escapeHtml(r.status)}">
  <td>${escapeHtml(r.episodeId||"Unknown")}</td>
  <td>${escapeHtml(r.petal||"—")}</td>
  <td>${escapeHtml(r.mode||"—")}</td>
  <td>${escapeHtml(r.profile||"—")}</td>
  <td><strong>${escapeHtml(r.weightedScore===null?"Unscored":r.weightedScore)}</strong></td>
  <td><span class="state">${escapeHtml(r.status)}</span></td>
  <td>${escapeHtml(r.failedGates.join(", ")||"—")}</td>
  <td>${escapeHtml(r.averageSceneWords??"—")}</td>
  <td>${escapeHtml(r.costUsd===null?"Unknown":"$"+r.costUsd)}</td></tr>`).join("");
 const failures=Object.entries(stats.failures).sort((a,b)=>b[1]-a[1]).slice(0,15)
  .map(([k,v])=>`<li><span>${escapeHtml(k)}</span><strong>${v}</strong></li>`).join("")||"<li>No failures assessed yet</li>";
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Anthos AI Quality Lab</title>
<style>
:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color-scheme:light;--ink:#253340;--muted:#586b75;--line:#dae1e2;--bg:#f5f8f7;--accent:#365d64}
*{box-sizing:border-box}body{background:var(--bg);color:var(--ink);margin:0}main{max-width:1200px;margin:auto;padding:38px 22px}
h1{font-size:32px;margin:8px 0}p{color:var(--muted);max-width:840px;line-height:1.6}.eyebrow{text-transform:uppercase;letter-spacing:.14em;color:var(--accent);font-size:12px;font-weight:800}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:12px;margin:24px 0}.metric{background:white;border:1px solid var(--line);border-radius:12px;padding:17px;display:grid;gap:7px}
.metric small{font-size:12px;color:var(--muted)}.metric strong{font-size:27px}.metric span{font-size:11px;color:var(--muted)}
section{background:white;border:1px solid var(--line);border-radius:12px;padding:20px;margin:18px 0}
h2{font-size:18px;margin:0 0 13px}.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:13px;text-align:left}
th,td{border-bottom:1px solid var(--line);padding:12px;white-space:nowrap}th{color:var(--muted)}.state{font-weight:700}
select{padding:8px;border:1px solid var(--line);border-radius:6px;background:white;margin:0 0 10px}
ul{list-style:none;padding:0}li{display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding:9px 0}
footer{color:var(--muted);font-size:12px;margin-top:24px}
</style></head><body><main>
<div class="eyebrow">Anthos / AI Quality Lab</div><h1>Jack & Jill: 8/10 release standard</h1>
<p>Only independently scored, fully evidenced synthetic pilots can pass. Missing judgments, unverified privacy/safety/continuity, and editorially unready episodes are never treated as successes. This is an offline report; no live customer data is connected.</p>
<div class="metrics">${cards}</div>
<section><h2>Test runs</h2><label for="status">Filter by result </label>
<select id="status"><option value="">All statuses</option>${Object.keys(stats.statuses).map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("")}</select>
<div class="scroll"><table><thead><tr><th>Episode ID</th><th>Petal</th><th>Mode</th><th>Coach style</th><th>Score</th><th>Gate</th><th>Hard failures</th><th>Avg words</th><th>Cost</th></tr></thead><tbody id="runs">${rows}</tbody></table></div></section>
<section><h2>Observed failure categories</h2><ul>${failures}</ul></section>
<footer>Scores are estimates, not proof. No CI or deployment promotion is implied. Reproduce using the recorded seed, model, episode version, engine SHA and synthetic replay file.</footer>
<script>document.getElementById("status").addEventListener("change",function(){const v=this.value;for(const row of document.querySelectorAll("#runs tr"))row.hidden=!!v&&row.dataset.status!==v;});</script>
</main></body></html>`;
}
const files=(await readdir(source)).filter(x=>/^qa-.*\.json$/.test(x)).sort();
const reports=[];
for(const file of files){
 const run=JSON.parse(await readFile(join(source,file),"utf8"));
 if(run.synthetic!==true)throw Error("Refusing non-synthetic QA artifact: "+file);
 reports.push(evaluateRun(run));
}
const stats=summarize(reports);
await mkdir(destination,{recursive:true});
await Promise.all([
 writeFile(join(destination,"metrics.json"),JSON.stringify({stats,reports},null,2)+"\n"),
 writeFile(join(destination,"dashboard.html"),dashboard(reports,stats))
]);
process.stdout.write(JSON.stringify({dashboard:join(destination,"dashboard.html"),stats},null,2)+"\n");
