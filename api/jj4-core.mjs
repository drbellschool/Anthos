// Anthos 4.0 private browser pilot. Separate tables from the retired 3.x engine.
// All participant access is authenticated by a unique secret URL token; private coach
// messages are returned only to that role. Nothing sends an SMS.
import {createHash,randomBytes,randomUUID} from "node:crypto";
import {getScenario} from "./jj2-library.mjs";
import {normalizeStudio,PHASES} from "./episode-studio.mjs";
import {RESEARCH_SOURCES,draftSophiaClosure} from "./jj4-closure.mjs";
import {adviceForNextScene,IMPACT_SCHEMA,validateImpactPlan,publicBehaviorPlan,DIRECTED_SCENE_SCHEMA,assembleDirectedScene,unsupportedExternalPolicyClaims,checkCoachingTrace,checkSceneLength,asksForHumor} from "./jj4-causality.mjs";
import {validatePrivateCheckin,fallbackPrivateCheckin,checkinContract} from "./jj4-private-voice.mjs";
import {isContinuityPilot,continuityInput,SCENE_REVIEW_SCHEMA,reviewPass,wordCount} from "./jj4-continuity.mjs";
import {LEDGER_SCHEMA,emptyLedger,sanitizeLedger,storyLedgerInstructions,ledgerPrompt} from "./jj4-story-ledger.mjs";
import {simulationEnabled,initialSimulation,SIMULATION_SCENE_SCHEMA,checkSimulationTransition,simulationInstructions} from "./jj4-character-simulation.mjs";
import {classifyCoachTurn,privateQuestionPrompt,PRIVATE_ANSWER_SCHEMA} from "./jj4-response-router.mjs";

const BASE="https://kstluxwgrrgdbjyloscb.supabase.co/rest/v1/";
const R="anthos_jj4_rooms",P="anthos_jj4_participants",M="anthos_jj4_messages";
const ROLE=["jack","jill"];
const PHASES4=PHASES.¶»§q«^