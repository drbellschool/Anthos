// Version 4.0 Sophia epilogue — independent of the six authored story phases.
// Summarizes only FICTIONAL shared story beats. Credible research annotations
// are controlled by this module rather than invented by the language model.
export const RESEARCH_SOURCES=Object.freeze([
 {label:"Gottman Institute · Emotional bids and turning toward",url:"https://www.gottman.com/blog/an-introduction-to-emotional-bids-and-trust/"},
 {label:"Schnarch · Differentiation framework (author interview)",url:"https://www.soundstrue.com/a/resources/transcript/emotional-commitment-and-great-sex/"},
 {label:"Aron et al. (2000) · Shared novel activities",url:"https://pubmed.ncbi.nlm.nih.gov/10707334/"}
]);
const clean=(value,max)=>typeof value==="string"?value.trim().slice(0,max):"";
const EPILOGUE_SCHEMA={type:"object",additionalProperties:false,
 properties:{observation:{type:"string"},practice:{type:"string"}},
 required:["observation","practice"]};
const targetedEpisode=episode=>episode?.title==="The Four-Hundred-Dollar Surprise";
function completeSentence(text,max,fallback){
 const source=String(text||"").trim();
 if(!source)return fallback;
 const clipped=source.slice(0,max);
 if(source.length<=max&&/[.!?][”"']?$/.test(source))return source;
 const matches=[...clipped.matchAll(/[.!?](?=\s|$)/g)];
 const last=matches.at(-1);
 return last&&last.index>30?clipped.slice(0,last.index+1):fallback;
}
function specificClosing(episode,generated){
 const observation=completeSentence(generated.observation,430,
  "Jack acknowledged his delayed repair, while Jill acknowledged buying the microwave without consulting him. They still need to follow through on the practical decision.");
 const practice=completeSentence(generated.practice,250,
  "Ask each other what action would rebuild trust after a difficult financial decision, then choose one specific next step.");
 return "SOPHIA · A CLOSING THOUGHT\n\n"+
  "What happened: "+observation+"\n\n"+
  "The skill connection: Facing a hard decision means owning your part without controlling the other person. A gentle startup raises a concern without blame; accepting influence means considering a partner's actual reasons.\n\n"+
  "One thing to try: "+practice+"\n\n"+
  "The story is fictional and its ending is not a grade on your marriage.";
}
export function composeSophiaClosure(episode,generated={}){
 if(targetedEpisode(episode))return specificClosing(episode,generated);
 const observation=clean(generated.observation,460)||
  "Jack and Jill's story showed how assumptions about affection can get in the way of understanding what each person needs now.";
 const practice=clean(generated.practice,320)||
  "Try asking each other: “What kind of closeness would feel good and welcome this week?” Listen without pressure to agree to anything immediately.";
 const science=[
  "Gottman's observational work describes small bids for attention or connection and the importance of how partners respond to them [1].",
  "Schnarch's differentiation framework emphasizes being able to stay connected while speaking honestly about your own needs and boundaries; this is a clinical model, not a score from this story [2].",
  "In experimental work, Aron and colleagues found that doing novel activities together can improve short-term reports of relationship quality [3]."
 ].join(" ");
 const result="SOPHIA · A CLOSING THOUGHT\n\n"+
  "What I noticed: "+observation+"\n\n"+
  "The research connection: "+science+"\n\n"+
  "One small thing to try: "+practice+"\n\n"+
  "Jack and Jill are fictional. Their ending isn't a grade or a prediction about your marriage. The references below are there if you'd like to explore the ideas.";
 return result.slice(0,2400);
}
export async function draftSophiaClosure(episode,sharedScenes){
 const key=process.env.OPENAI_API_KEY?.trim();
 if(!key)return composeSophiaClosure(episode);
 const input={
  title:episode.title,
  learningObjective:episode.learningObjective,
  researchNotes:episode.researchNotes,
  closureCriteria:episode.closureCriteria,
  reflectionPrompt:episode.reflectionPrompt,
  scenes:sharedScenes.map(s=>({phase:s.phase_index,story:s.body})).slice(-6)
 };
 const instructions=[
  "You write Sophia's warm, human closing reflection for an Anthos marriage-enrichment FICTIONAL episode.",
  "The six authored stages are over. You are not another narrator, not Jack, not Jill, and not a therapist.",
  "Summarize one specific observable learning moment from the supplied fictional shared scenes. Do not invent additional events, achievements, coaching messages, motives or a perfect relationship outcome.",
  "Only Jack and Jill are story characters; never describe the real husband or wife as if they were characters.",
  "Offer one realistic, consent-respecting, low-pressure practice for two people to discuss in real life. Respect autonomy and the ability to say no. No quizzes or relationship scores.",
  "Do not write research claims or bibliographies; the application adds accurately attributed educational research context itself.",
  targetedEpisode(episode)?"Return two complete concise fields: observation 30–55 words about the NEW consequences and the actual ending, and practice one practical invitation of 15–30 words. Do not recap all six scenes or promise a happy resolution.":"Return two short fields: observation (45–80 words grounded in the story) and practice (one concrete invitation, 20–45 words).",
  "Avoid empty praise, glib humor, cheesy metaphors, shaming, overpromises, and diagnosing a couple."
 ].join(" ");
 try{
  const model=process.env.ANTHOS_JJ4_MODEL?.trim()||process.env.OPENAI_MODEL?.trim()||"gpt-4.1-mini";
  const res=await fetch("https://api.openai.com/v1/responses",{
   method:"POST",
   headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
   body:JSON.stringify({model,store:false,instructions,input:JSON.stringify(input),
    max_output_tokens:550,
    text:{format:{type:"json_schema",name:"jj4_sophia_closure",strict:true,schema:EPILOGUE_SCHEMA}}}),
   signal:AbortSignal.timeout(35000)
  });
  if(!res.ok)return composeSophiaClosure(episode);
  const data=await res.json();
  const output=(data.output||[]).flatMap(x=>x.content||[])
   .filter(x=>x.type==="output_text").map(x=>x.text).join("");
  const parsed=JSON.parse(output);
  return composeSophiaClosure(episode,parsed);
 }catch{return composeSophiaClosure(episode)}
}
