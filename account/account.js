// Pilot only. No SMS enrollment or spouse linking is performed in this file.
// Backend RLS remains authoritative; client-side checks improve UX only.
const byId = id => document.getElementById(id);
const configEndpoint = "/api/public-config";
let client;
let user;
let profileExists = false;
let mode = "signin";

function status(message, isError = false) {
  const el = byId("status");
  el.textContent = message;
  el.classList.toggle("error", isError);
}
function show(panel) {
  for (const id of ["unavailable", "authPanel", "profilePanel"])
    byId(id).hidden = id !== panel;
}
function busy(button, value) {
  button.disabled = value;
  button.setAttribute("aria-busy", String(value));
}
function localISO(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2,"0"),
    String(date.getDate()).padStart(2,"0")].join("-");
}
function eligibleBirthDate(date) {
  const today = new Date();
  const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= localISO(cutoff);
}
function switchMode() {
  mode = mode === "signin" ? "signup" : "signin";
  const signup = mode === "signup";
  byId("authHeading").textContent = signup ? "Create your account" : "Welcome back";
  byId("authSubmit").textContent = signup ? "Create account" : "Sign in";
  byId("switchMode").textContent = signup ? "Already have an account?" : "Create an account";
  byId("termsRow").hidden = !signup;
  byId("terms").required = signup;
  byId("password").autocomplete = signup ? "new-password" : "current-password";
  status("");
}
async function render() {
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) {
    user = null;
    show("authPanel");
    return;
  }
  user = data.user;
  byId("signedInAs").textContent = "Signed in as " + (user.email || "your account");
  show("profilePanel");
  const response = await client.from("participants")
    .select("display_name,birth_date,proposed_wedding_date")
    .eq("user_id", user.id).maybeSingle();
  if (response.error) {
    status("Your account is signed in, but private profile access is not configured yet.", true);
    byId("profileForm").hidden = true;
    return;
  }
  byId("profileForm").hidden = false;
  const p = response.data;
  profileExists = !!p;
  byId("displayName").value = p?.display_name || "";
  byId("birthDate").value = p?.birth_date || "";
  byId("weddingDate").value = p?.proposed_wedding_date || "";
  byId("profileSummary").hidden = !p;
  byId("profileHeading").textContent = p ? "Your private profile" : "Tell us a little about you";
  status(p ? "Your account and private profile are ready." : "Account confirmed. Complete your private profile.");
}
async function handleAuth(event) {
  event.preventDefault();
  const button = byId("authSubmit");
  busy(button, true);
  status("");
  const email = byId("email").value.trim();
  const password = byId("password").value;
  try {
    if (mode === "signup") {
      if (!byId("terms").checked) {
        status("Please review the terms and privacy policy.", true);
        return;
      }
      const { data, error } = await client.auth.signUp({
        email, password,
        options: { emailRedirectTo: new URL("/account/", window.location.origin).href }
      });
      if (error) throw error;
      if (data?.session) {
        await render();
      } else {
        status("If the address can be registered, check your email for confirmation. Then return here to sign in.");
      }
    } else {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      byId("password").value = "";
      await render();
    }
  } catch {
    status(mode === "signup"
      ? "Account setup could not be completed. Review the details and try again."
      : "Sign-in failed. Check your email, password, and confirmation status.", true);
  } finally { busy(button, false); }
}
async function handleProfile(event) {
  event.preventDefault();
  if (!user) return;
  const button = byId("profileSubmit");
  const name = byId("displayName").value.trim();
  const birth = byId("birthDate").value;
  const wedding = byId("weddingDate").value;
  const today = localISO(new Date());
  if (!name || name.length > 80 || !eligibleBirthDate(birth) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(wedding) ||
      wedding > today || wedding < birth) {
    status("Please check your name and dates. Anthos is for adults 18 and older.", true);
    return;
  }
  busy(button, true);
  const values = {display_name:name, birth_date:birth, proposed_wedding_date:wedding};
  try {
    const result = profileExists
      ? await client.from("participants").update(values).eq("user_id",user.id)
      : await client.from("participants").insert({user_id:user.id,...values});
    if (result.error) throw result.error;
    profileExists = true;
    byId("profileSummary").hidden = false;
    byId("profileHeading").textContent = "Your private profile";
    status("Saved. Your personal details remain private to your account.");
  } catch {
    status("Your profile could not be saved. Please try again.", true);
  } finally { busy(button, false); }
}
async function start() {
  show("unavailable");
  byId("authForm").addEventListener("submit",handleAuth);
  byId("profileForm").addEventListener("submit",handleProfile);
  byId("switchMode").addEventListener("click",switchMode);
  byId("signOut").addEventListener("click",async ()=>{
    if (!client) return;
    const {error}=await client.auth.signOut();
    if(error){status("Could not sign out. Please try again.",true);return;}
    user=null;profileExists=false;
    byId("password").value="";
    show("authPanel");
    status("You have signed out.");
  });
  const today=localISO(new Date());
  byId("birthDate").max=today;
  byId("weddingDate").max=today;
  try {
    const response = await fetch(configEndpoint,{cache:"no-store"});
    if (!response.ok) throw new Error("Configuration unavailable");
    const config = await response.json();
    if (!config.enabled || !config.publishableKey || !config.supabaseUrl) return;
    const {createClient} = await import("https://esm.sh/@supabase/supabase-js@2.75.0?bundle");
    client = createClient(config.supabaseUrl,config.publishableKey);
    await render();
  } catch {
    status("Account pilot services are temporarily unavailable.",true);
  }
}
start();
