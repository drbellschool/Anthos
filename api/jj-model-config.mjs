/**
 * Anthos Jack & Jill model settings are intentionally isolated from the
 * site's legacy OPENAI_MODEL setting. Otherwise a Vercel env override can
 * silently return the Deep Dive engine to an older model.
 *
 * GPT-6 Luna supports Responses API structured outputs and medium/high
 * reasoning effort. Prioritize getting a real decision in one conversation
 * over repeatedly asking the same question. Medium is for private character
 * replies; high is for the shared consequence/character evolution director.
 */
export const DEEP_DIVE_DEFAULT_MODEL="gpt-6-luna";
export const DEEP_DIVE_MODEL_ENV="ANTHOS_JJ_MODEL";

export function deepDiveModel(env=process.env){
 const override=typeof env?.ANTHOS_JJ_MODEL==="string"?env.ANTHOS_JJ_MODEL.trim():"";
 return override||DEEP_DIVE_DEFAULT_MODEL;
}
export function deepDiveRequest({instructions,input,schema,name,attempt=0,env=process.env}){
 const model=deepDiveModel(env);
 const story=["jj_evolution_outcome","jj_evolution_finale","jj3_story_outcome"].includes(name);
 const luna=model==="gpt-6-luna";
 return {
  model,
  store:false,
  instructions,
  input:JSON.stringify(input),
  // Output budget includes hidden reasoning tokens. Higher effort needs more
  // headroom to finish the *visible* JSON response without truncation.
  max_output_tokens:story?(attempt?10000:7500):(attempt?5500:3900),
  ...(luna?{reasoning:{effort:story?"high":"medium"}}:{}),
  text:{format:{type:"json_schema",name,strict:true,schema}}
 };
}
