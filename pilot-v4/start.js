(()=>{
 const url=new URL(location.href),submitted=url.searchParams.get("invite")||"";
 if(/^[A-Za-z0-9_-]{43}$/.test(submitted)){
  sessionStorage.setItem("anthos_jj4_invitation",submitted);
  url.searchParams.delete("invite");
  history.replaceState(null,"",url.pathname+url.search+url.hash);
 }
 const token=submitted||sessionStorage.getItem("anthos_jj4_invitation")||"";
 window.Anthos4Player.mount(document.getElementById("jj4Standalone"),token);
})();