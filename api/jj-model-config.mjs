/**
 * Anthos Jack & Jill model settings are intentionally isolated from the
 * site's legacy OPENAI_MODEL setting. Otherwise a Vercel env override can
 * silently return the Deep Dive engine to an older model.
 *
 * GPT-6 Luna supports Responses API structured outputs and both "none"
 * and "low" reasoning effort. Use the quicker setting for natural private
 * texts; allow a little reasoning for multi-character causal consequences.
 */
export const DEEP_DIVE_DEFAULT_MODEL="gpt-6-luna";
export const DEEP_DIVE_MODEL_ENV="ANTHOS_JJ_MODEL";

export function deepDiveModel(env=process.env){
 const override=typeof env?.ANTHOS_JJ_MODEL==="string"?env.ANTHOS_JJ_MODEL.trim():"";
 return override||DEEP_DIVE_DEFAULT_MODEL;
}
export function deepDiveRequest({instructions,input,schema,name,attempt=0,env=process.env}){
 const model=deepDiveModel(env);
 const story=name==="jj_evolution_outcome"||name==="jj3_story_outcome";
 const luna=model==="gpt-6-luna";
 return {
  model,
  store:false,
  instructions,
  input:JSON.stringify(input),
  max_output_tokens:story?(attempt?5000:3900):(attempt?3000:2100),
  ...(luna?{reasoning:{effort:story?"low":"none"}}:{}),
  text:{format:{type:"json_schema",name,strict:true,schema}}
 };
}
