const T={domains:"Domaines",scenarios:"Scenarios",providers:"Fournisseurs",offers:"Offres",alloc:"Allocations",baseline:"Baseline_N_1",baselineDetails:"Baseline_N_1_Details",rights:"Droits_Utilisateurs",menu:"Configuration_Menu",offerCols:"Configuration_Colonnes_Offres",uiLabels:"Configuration_Libelles_UI",preSim:"Pre_Simulations",preRes:"Pre_Simulation_Ressources",presence:"Presence_Utilisateurs"};
const COLORS=["#2f6fed","#24b89a","#7c4de8","#e7a62c","#dc4c5a","#5a6b85","#42a5f5","#8bc34a"];
let D=null, ACCESS={role:"DENIED",domainIds:[]}, CURRENT=null, DASH_FILTER={domainIds:[],providerId:0};
let PRESENCE_INTERVAL=null;
let PRESENCE_RECORD_ID=0;
let PRESENCE_CURRENT_VIEW='dashboard';
let PRESENCE_ROWS=[];
const PRESENCE_HEARTBEAT_MS=20000;
const PRESENCE_TTL_MS=75000;
function presenceSessionId(){
  try{
    let id=sessionStorage.getItem('finopsPresenceSessionId');
    if(!id){
      id=(globalThis.crypto?.randomUUID?.()||`finops-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      sessionStorage.setItem('finopsPresenceSessionId',id);
    }
    return id;
  }catch(_){
    if(!window.__finopsPresenceSessionId)window.__finopsPresenceSessionId=`finops-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return window.__finopsPresenceSessionId;
  }
}

grist.ready({requiredAccess:"full"}); document.addEventListener("DOMContentLoaded",boot);
function rows(t){if(!t||!Array.isArray(t.id))return[];return t.id.map((id,i)=>{const r={id};for(const[k,v]of Object.entries(t))if(k!=="id"&&Array.isArray(v))r[k]=v[i];return r})}
function money(v,c="USD"){return new Intl.NumberFormat("fr-FR",{style:"currency",currency:c,maximumFractionDigits:0}).format(Number(v||0))} function num(v){return new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(Number(v||0))} function pct(v){return new Intl.NumberFormat("fr-FR",{style:"percent",maximumFractionDigits:1}).format(Number(v||0))} function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function toast(m,e=false){const x=document.getElementById("toast");if(!x)return;x.textContent=m;x.className="toast show"+(e?" error":"");setTimeout(()=>x.className="toast",2400)}
async function fetchAll(){const names=Object.values(T),raw=await Promise.all(names.map(n=>grist.docApi.fetchTable(n).catch(()=>({id:[]}))));const o={};names.forEach((n,i)=>o[n]=rows(raw[i]));o.domainById=Object.fromEntries(o[T.domains].map(r=>[r.id,r]));o.scenarioById=Object.fromEntries(o[T.scenarios].map(r=>[r.id,r]));o.providerById=Object.fromEntries(o[T.providers].map(r=>[r.id,r]));o.offerById=Object.fromEntries(o[T.offers].map(r=>[r.id,r]));return o}
async function boot(){document.getElementById("root").innerHTML='<div class="splash">Chargement des données Grist…</div>';try{D=await fetchAll();deriveAccess();renderShell();if(ACCESS.role!=="DENIED"){populateScenario();renderAll();ensureUILabelObserver();applyUILabelsSafe();startPresence()}}catch(e){console.error(e);document.getElementById("root").innerHTML=`<div class="denied"><div class="deniedcard"><div class="lock">!</div><h1>Erreur de chargement</h1><p>${esc(e.message)}</p></div></div>`}}
function refListIds(v){if(Array.isArray(v)){const a=v[0]==='L'?v.slice(1):v;return a.map(Number).filter(x=>Number.isFinite(x)&&x>0)}if(Number.isFinite(+v)&&+v>0)return[+v];return[]}

const APP_ROLES={
  LECTEUR:'LECTEUR',
  CONTRIBUTEUR:'CONTRIBUTEUR',
  OBSERVATEUR:'OBSERVATEUR',
  ADMINISTRATEUR:'ADMINISTRATEUR',
  CONTRIBUTEUR_AVANCE:'CONTRIBUTEUR_AVANCE',
  OWNER:'OWNER',
  DENIED:'DENIED'
};
const ROLE_LABELS={
  OWNER:'Owner Grist',
  LECTEUR:'Lecteur',
  CONTRIBUTEUR:'Contributeur',
  OBSERVATEUR:'Observateur',
  ADMINISTRATEUR:'Administrateur',
  CONTRIBUTEUR_AVANCE:'Contributeur avancé',
  DENIED:'Accès refusé'
};
function normalizeAppRole(v){
  const x=String(v||'').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[\s-]+/g,'_');
  if(x==='lecteur')return APP_ROLES.LECTEUR;
  if(x==='contributeur'||x==='domaine')return APP_ROLES.CONTRIBUTEUR;
  if(x==='observateur')return APP_ROLES.OBSERVATEUR;
  if(x==='administrateur'||x==='admin')return APP_ROLES.ADMINISTRATEUR;
  if(x==='contributeur_avance'||x==='contributeur_avancee')return APP_ROLES.CONTRIBUTEUR_AVANCE;
  return APP_ROLES.LECTEUR;
}
function roleLabel(role=ACCESS.role){return ROLE_LABELS[role]||role}
function roleSeesAdvancedMenus(role=ACCESS.role){
  return [APP_ROLES.OWNER,APP_ROLES.OBSERVATEUR,APP_ROLES.ADMINISTRATEUR,APP_ROLES.CONTRIBUTEUR_AVANCE].includes(role);
}
function roleCanEditUserMenus(role=ACCESS.role){
  return [APP_ROLES.OWNER,APP_ROLES.CONTRIBUTEUR,APP_ROLES.ADMINISTRATEUR,APP_ROLES.CONTRIBUTEUR_AVANCE].includes(role);
}
function roleCanEditAdvancedMenus(role=ACCESS.role){
  return [APP_ROLES.OWNER,APP_ROLES.ADMINISTRATEUR].includes(role);
}
function currentRightRow(){
  if(ACCESS.role===APP_ROLES.OWNER)return null;
  return ACCESS.rights?.[0]||null;
}
function currentUserLabel(){
  if(ACCESS.role===APP_ROLES.OWNER)return 'Owner Grist';
  return currentRightRow()?.Email||'Utilisateur autorisé';
}
function deriveAccess(){
  const rr=(D[T.rights]||[]).filter(r=>r.Actif!==false);

  // Avec les ACL FinOps, un utilisateur normal ne voit que sa propre ligne.
  // L'Owner Grist contourne les ACL et voit généralement plusieurs utilisateurs.
  const distinctEmails=new Set(rr.map(r=>String(r.Email||'').trim().toLowerCase()).filter(Boolean));
  if(distinctEmails.size>1){
    ACCESS={role:APP_ROLES.OWNER,domainIds:(D[T.domains]||[]).map(d=>+d.id),rights:rr,isOwner:true};
    return;
  }

  if(rr.length){
    const row=rr[0];
    const multi=refListIds(row.Domaines_Autorises);
    const ids=multi.length?multi:(+row.Domaine?[+row.Domaine]:[]);
    ACCESS={
      role:normalizeAppRole(row.Role_App),
      domainIds:[...new Set(ids.map(Number).filter(Boolean))],
      rights:[row],
      isOwner:false
    };
    return;
  }

  // Aucun enregistrement Droits_Utilisateurs visible = aucun accès applicatif.
  ACCESS={role:APP_ROLES.DENIED,domainIds:[],rights:[],isOwner:false};
}

function menuConfigAllRows(){
  const fallback=[
    {Cle:'dashboard',Libelle:'Dashboard',Ordre:10,Actif:true,Owner_Seulement:false},
    {Cle:'simulation',Libelle:'Simulation',Ordre:20,Actif:true,Owner_Seulement:false},
    {Cle:'compare',Libelle:'Comparaison',Ordre:30,Actif:true,Owner_Seulement:false},
    {Cle:'roi',Libelle:'ROI / Économies',Ordre:40,Actif:true,Owner_Seulement:false},
    {Cle:'presim',Libelle:'Pré-simulation nominative',Ordre:45,Actif:true,Owner_Seulement:false},
    {Cle:'scenarios',Libelle:'Scénarios',Ordre:50,Actif:true,Owner_Seulement:false},
    {Cle:'offers',Libelle:'Offre de service',Ordre:60,Actif:true,Owner_Seulement:false},
    {Cle:'offersadmin',Libelle:'Paramétrage offre de service',Ordre:65,Actif:true,Owner_Seulement:true},
    {Cle:'domains',Libelle:'Domaines',Ordre:70,Actif:true,Owner_Seulement:true},
    {Cle:'rights',Libelle:'Droits utilisateurs',Ordre:80,Actif:true,Owner_Seulement:true},
    {Cle:'menuadmin',Libelle:'Configuration du menu',Ordre:90,Actif:true,Owner_Seulement:true},
    {Cle:'labelsadmin',Libelle:'Paramétrage des libellés',Ordre:95,Actif:true,Owner_Seulement:true},
    {Cle:'acladmin',Libelle:'ACL / Sécurité',Ordre:100,Actif:true,Owner_Seulement:true}
  ];
  const known=new Set(fallback.map(x=>x.Cle));
  const source=(D?.[T.menu]||[]).filter(r=>known.has(String(r.Cle||'')));
  const byKey=Object.fromEntries(source.map(r=>[String(r.Cle),r]));
  return fallback.map(f=>({...f,...(byKey[f.Cle]||{})}))
    .sort((a,b)=>(+a.Ordre||9999)-(+b.Ordre||9999)||String(a.Cle).localeCompare(String(b.Cle)));
}
function menuConfigRows(){
  return menuConfigAllRows().filter(r=>r.Actif!==false);
}
function menuLabel(view){
  const r=menuConfigRows().find(x=>x.Cle===view);
  return r?.Libelle||DEFAULT_MENU_LABELS[view]||view;
}
function navIcon(view){
  return {dashboard:'◧',simulation:'⌘',compare:'⇄',roi:'↗',presim:'♙',scenarios:'▤',offers:'¤',offersadmin:'⚙',domains:'◎',rights:'♙',menuadmin:'☷',labelsadmin:'✎',acladmin:'🔐'}[view]||'•';
}

function buildNavHtml(){
  const advanced=roleSeesAdvancedMenus();
  return menuConfigRows()
    .filter(r=>advanced || !r.Owner_Seulement)
    .map((r,i)=>`<button class="${i===0?'active':''}" data-view="${esc(r.Cle)}"><span class="nav-icon">${navIcon(r.Cle)}</span><span class="nav-label">${esc(r.Libelle||r.Cle)}</span></button>`)
    .join('');
}



async function fetchPresenceRows(){
  try{
    return rows(await grist.docApi.fetchTable(T.presence));
  }catch(_){
    return [];
  }
}
function presenceIdentity(){
  if(isOwner())return 'Owner Grist';
  return currentRightRow()?.Email||currentUserLabel();
}
function presenceDomainText(){
  if(isOwner())return 'Tous les domaines';
  return scopedDomains().map(d=>d.Nom).join(', ')||'Aucun domaine';
}
function presencePageLabel(v){
  return menuLabel(v||'dashboard');
}
function presenceAgeLabel(ms){
  const age=Math.max(0,Date.now()-(+ms||0));
  if(age<30000)return "à l’instant";
  if(age<60000)return "il y a moins d’une minute";
  return `il y a ${Math.max(1,Math.round(age/60000))} min`;
}
function activePresenceRows(list=PRESENCE_ROWS){
  const now=Date.now();
  return (list||[])
    .filter(r=>r.Actif!==false && +r.Dernier_Heartbeat_MS>0 && now-(+r.Dernier_Heartbeat_MS)<=PRESENCE_TTL_MS)
    .sort((a,b)=>{
      const mineA=String(a.Session_Id)===presenceSessionId()?0:1;
      const mineB=String(b.Session_Id)===presenceSessionId()?0:1;
      return mineA-mineB || String(a.Email||'').localeCompare(String(b.Email||''),'fr');
    });
}
function renderPresenceUI(list=PRESENCE_ROWS){
  const wrap=document.getElementById('presenceWidget');
  if(!wrap)return;
  const active=activePresenceRows(list);
  const count=document.getElementById('presenceCount');
  if(count)count.textContent=String(active.length);

  const menu=document.getElementById('presenceMenu');
  if(!menu)return;
  menu.innerHTML=active.length?active.map(r=>{
    const mine=String(r.Session_Id)===presenceSessionId();
    return `<div class="presence-person ${mine?'mine':''}">
      <span class="presence-person-dot"></span>
      <div class="presence-person-main">
        <div class="presence-person-name">${esc(r.Email||'Utilisateur')}${mine?' <span class="badge ok">vous</span>':''}</div>
        <div class="presence-person-meta">${esc(r.Role_App||'')} · <b>${esc(presencePageLabel(r.Page))}</b></div>
        <div class="presence-person-domain">${esc(r.Domaine_Texte||'')} · ${esc(presenceAgeLabel(r.Dernier_Heartbeat_MS))}</div>
      </div>
    </div>`;
  }).join(''):'<div class="presence-empty">Aucune autre session FinOps détectée.</div>';
}
async function refreshPresenceUI(){
  PRESENCE_ROWS=await fetchPresenceRows();
  renderPresenceUI(PRESENCE_ROWS);
}
async function cleanupOldPresence(){
  if(!(isOwner()||ACCESS.role===APP_ROLES.ADMINISTRATEUR))return;
  try{
    const all=await fetchPresenceRows();
    const cutoff=Date.now()-24*60*60*1000;
    const stale=all.filter(r=>(+r.Dernier_Heartbeat_MS||0)<cutoff).slice(0,100);
    if(stale.length)await grist.docApi.applyUserActions(stale.map(r=>["RemoveRecord",T.presence,r.id]));
  }catch(_){}
}
async function heartbeatPresence(force=false){
  if(ACCESS.role===APP_ROLES.DENIED)return;
  if(document.hidden&&!force)return;
  const sessionId=presenceSessionId();
  const now=Date.now();
  const fields={
    Session_Id:sessionId,
    Email:presenceIdentity(),
    Role_App:roleLabel(),
    Page:PRESENCE_CURRENT_VIEW||'dashboard',
    Domaine_Texte:presenceDomainText(),
    Dernier_Heartbeat_MS:now,
    Actif:true
  };
  try{
    if(!PRESENCE_RECORD_ID){
      const all=await fetchPresenceRows();
      const existing=all.find(r=>String(r.Session_Id)===sessionId);
      PRESENCE_RECORD_ID=+existing?.id||0;
    }
    if(PRESENCE_RECORD_ID){
      try{
        await grist.docApi.applyUserActions([["UpdateRecord",T.presence,PRESENCE_RECORD_ID,fields]]);
      }catch(_){
        PRESENCE_RECORD_ID=0;
      }
    }
    if(!PRESENCE_RECORD_ID){
      await grist.docApi.applyUserActions([["AddRecord",T.presence,null,fields]]);
      const all=await fetchPresenceRows();
      PRESENCE_RECORD_ID=+(all.find(r=>String(r.Session_Id)===sessionId)?.id||0);
    }
    await refreshPresenceUI();
  }catch(e){
    console.warn('Presence heartbeat failed',e);
  }
}
function startPresence(){
  if(PRESENCE_INTERVAL)clearInterval(PRESENCE_INTERVAL);
  heartbeatPresence(true);
  PRESENCE_INTERVAL=setInterval(()=>heartbeatPresence(false),PRESENCE_HEARTBEAT_MS);
  if(!window.__finopsPresenceVisibilityBound){
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)heartbeatPresence(true)});
    window.addEventListener('focus',()=>heartbeatPresence(true));
    window.__finopsPresenceVisibilityBound=true;
  }
  cleanupOldPresence();
}

function renderShell(){
  if(ACCESS.role===APP_ROLES.DENIED){
    document.getElementById("root").innerHTML=`<div class="denied"><div class="deniedcard"><div class="lock">🔒</div><h1>Accès non autorisé</h1><p>Votre compte n’est pas inscrit comme utilisateur actif dans la table <b>Droits_Utilisateurs</b>.</p><div class="deniednote">Aucun menu FinOps n’est disponible. Demandez à un administrateur de vous ajouter dans la gestion des droits.</div></div></div>`;
    return;
  }

  const advanced=roleSeesAdvancedMenus();
  const navHtml=buildNavHtml();
  const advancedSections=advanced?'<section id="v-offersadmin" class="view"></section><section id="v-domains" class="view"></section><section id="v-rights" class="view"></section><section id="v-menuadmin" class="view"></section><section id="v-labelsadmin" class="view"></section><section id="v-acladmin" class="view"></section>':'';

  document.getElementById("root").innerHTML=`<div class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="logo">F</div><div class="brandtext"><h2>FINOPS IA</h2><small>SIMULATEUR MULTI-FOURNISSEURS</small></div><button id="sidebarToggle" class="sidebar-toggle" title="Rétracter le menu" aria-label="Rétracter le menu">‹</button></div>
      <nav class="nav">${navHtml}</nav>
      <div class="sidefoot"><b>${esc(roleLabel())}</b><br><span id="sideScope"></span></div>
    </aside>
    <main class="content">
      <header class="head">
        <div><h1 id="title">${esc(menuLabel('dashboard'))}</h1><div class="sub">Claude · Mistral · Cursor</div><div id="scope" class="scope"></div></div>
        <div class="head-right">
          <div class="session-strip" aria-label="Session FinOps">
            <div class="session-ident"><span class="session-label">Moi</span><b id="sessionUser">${esc(currentUserLabel())}</b></div>
            <div class="session-ident"><span class="session-label">Rôle</span><b id="sessionRole">${esc(roleLabel())}</b></div>
            <div class="session-ident"><span class="session-label">Page</span><b id="sessionPage">${esc(menuLabel('dashboard'))}</b></div>
            <div id="presenceWidget" class="presence-widget">
              <button id="presenceToggle" type="button" class="presence-toggle" aria-expanded="false">
                <span class="session-dot"></span><b><span id="presenceCount">1</span> en ligne</b><span aria-hidden="true">▾</span>
              </button>
              <div id="presenceMenu" class="presence-menu hidden"><div class="presence-empty">Chargement de la présence…</div></div>
            </div>
          </div>
          <div class="controls"><label class="field">Scénario<select id="scenarioSelect"></select></label><button id="refresh" class="btn secondary">Actualiser</button></div>
        </div>
      </header>
      <div id="status" class="status">Données synchronisées avec Grist.</div>
      <section id="v-dashboard" class="view active"></section><section id="v-simulation" class="view"></section><section id="v-compare" class="view"></section><section id="v-roi" class="view"></section><section id="v-presim" class="view"></section><section id="v-scenarios" class="view"></section><section id="v-offers" class="view"></section>${advancedSections}
    </main>
  </div><div id="toast" class="toast"></div>`;

  document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  document.getElementById('refresh').onclick=boot;
  document.getElementById('scenarioSelect').onchange=()=>{
    CURRENT=model(+selectedScenario()?.id||0);
    renderAll();
  };

  const presenceToggle=document.getElementById('presenceToggle');
  const presenceMenu=document.getElementById('presenceMenu');
  presenceToggle?.addEventListener('click',()=>{
    const hidden=presenceMenu?.classList.toggle('hidden');
    presenceToggle.setAttribute('aria-expanded',hidden?'false':'true');
    if(!hidden)refreshPresenceUI();
  });
  document.addEventListener('click',e=>{
    const widget=document.getElementById('presenceWidget');
    if(widget&&!widget.contains(e.target)){
      document.getElementById('presenceMenu')?.classList.add('hidden');
      document.getElementById('presenceToggle')?.setAttribute('aria-expanded','false');
    }
  },{once:true});

  const toggle=document.getElementById('sidebarToggle');
  toggle.onclick=()=>setSidebarCollapsed(!document.querySelector('.shell').classList.contains('sidebar-collapsed'));
  let collapsed=false;try{collapsed=localStorage.getItem('finopsSidebarCollapsed')==='1'}catch(_){}
  setSidebarCollapsed(collapsed);
}


function isOwner(){return ACCESS.role===APP_ROLES.OWNER}
function isUserMenu(view){
  const row=menuConfigAllRows().find(r=>r.Cle===view);
  return !row?.Owner_Seulement;
}
function canEditView(view){
  if(isOwner())return true;
  return isUserMenu(view)?roleCanEditUserMenus():roleCanEditAdvancedMenus();
}
function readOnlyMessage(){
  if(ACCESS.role===APP_ROLES.LECTEUR)return 'Mode lecture seule : votre rôle Lecteur ne permet aucune modification.';
  if(ACCESS.role===APP_ROLES.OBSERVATEUR)return 'Mode observation : tous les menus sont visibles, mais aucune modification n’est autorisée.';
  if(ACCESS.role===APP_ROLES.CONTRIBUTEUR_AVANCE)return 'Mode lecture seule sur cet onglet : le rôle Contributeur avancé ne peut modifier que les onglets autorisés aux utilisateurs.';
  return 'Vous ne disposez pas des droits de modification sur cet onglet.';
}
function enforceRolePermissions(){
  if(isOwner())return;
  document.querySelectorAll('.view').forEach(view=>{
    const key=(view.id||'').replace(/^v-/,'');
    const editable=canEditView(key);

    view.querySelector('.role-readonly-banner')?.remove();
    if(!editable){
      const banner=document.createElement('div');
      banner.className='role-readonly-banner';
      banner.textContent=readOnlyMessage();
      view.prepend(banner);
    }

    view.querySelectorAll('input,select,textarea,button').forEach(el=>{
      if(el.closest('.read-only-exempt'))return;
      if(editable)return;

      // Tous les contrôles de modification restent visibles mais sont désactivés.
      // Le bandeau de l'onglet explique systématiquement pourquoi.
      el.disabled=true;
      el.classList.add('readonly-control');
      if(el.matches('button'))el.title=readOnlyMessage();
    });
  });
}

const DEFAULT_MENU_LABELS={
  dashboard:'Dashboard',
  simulation:'Simulation',
  compare:'Comparaison',
  roi:'ROI / Économies',
  presim:'Pré-simulation nominative',
  scenarios:'Scénarios',
  offers:'Offre de service',
  offersadmin:'Paramétrage offre de service',
  domains:'Domaines',
  rights:'Droits utilisateurs',
  menuadmin:'Configuration du menu',
  labelsadmin:'Paramétrage des libellés',
  acladmin:'ACL / Sécurité'
};

function setSidebarCollapsed(collapsed){const shell=document.querySelector('.shell'),toggle=document.getElementById('sidebarToggle');if(!shell)return;shell.classList.toggle('sidebar-collapsed',collapsed);if(toggle){toggle.textContent=collapsed?'›':'‹';toggle.title=collapsed?'Déployer le menu':'Rétracter le menu';toggle.setAttribute('aria-label',toggle.title)}try{localStorage.setItem('finopsSidebarCollapsed',collapsed?'1':'0')}catch(_){}}
function switchView(v){
  document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.getElementById('v-'+v)?.classList.add('active');
  const label=menuLabel(v);
  document.getElementById('title').textContent=label;
  const page=document.getElementById('sessionPage');if(page)page.textContent=label;
  const scenarioField=document.getElementById('scenarioSelect')?.closest('.field');
  const refresh=document.getElementById('refresh');
  const hideTop=['presim','scenarios','offers','offersadmin','domains','rights','menuadmin','labelsadmin','acladmin'].includes(v);
  if(scenarioField)scenarioField.style.display=hideTop?'none':'';
  if(refresh)refresh.style.display=hideTop?'none':'';
  PRESENCE_CURRENT_VIEW=v;
  enforceRolePermissions();
  heartbeatPresence(true);
}
function scopedDomains(){return D[T.domains].filter(d=>d.Actif!==false&&ACCESS.domainIds.includes(+d.id))}
function scopedAlloc(sid){
  const scenarioId=+sid||+selectedScenario()?.id||0;
  return D[T.alloc].filter(r=>+r.Scenario===scenarioId&&ACCESS.domainIds.includes(+r.Domaine));
} function scopedBaseline(sid){return D[T.baseline].filter(r=>+r.Scenario===+sid&&ACCESS.domainIds.includes(+r.Domaine))} function scopedBaselineDetails(sid){return (D[T.baselineDetails]||[]).filter(r=>+r.Scenario===+sid&&ACCESS.domainIds.includes(+r.Domaine))}
function populateScenario(preferredId=0){
  const sel=document.getElementById('scenarioSelect');
  if(!sel)return;
  const currentId=+(preferredId||sel.value||0);
  const scenarios=(D[T.scenarios]||[]).slice().sort((a,b)=>(+a.Annee||0)-(+b.Annee||0)||String(a.Nom||'').localeCompare(String(b.Nom||''),'fr'));
  sel.innerHTML=scenarios.map(s=>`<option value="${s.id}">${esc(s.Nom||('Scénario '+s.id))}</option>`).join('');
  const valid=scenarios.some(s=>+s.id===currentId);
  if(valid)sel.value=String(currentId);
  else if(scenarios.length)sel.value=String(scenarios[0].id);
}
function selectedScenario(){return D.scenarioById[+document.getElementById('scenarioSelect').value]}
function model(sid,filter=null){
const s=D.scenarioById[+sid];
const domainIds=new Set((filter?.domainIds||[]).map(Number).filter(Boolean)),providerId=+(filter?.providerId||0);
const domains=scopedDomains().filter(d=>!domainIds.size||domainIds.has(+d.id));
const allowedDomainIds=new Set(domains.map(d=>+d.id));
const alloc=scopedAlloc(sid).filter(a=>{
  if(!allowedDomainIds.has(+a.Domaine))return false;
  if(!providerId)return true;
  const o=D.offerById[a.Offre];
  return +o?.Fournisseur===providerId;
});
const baseline=scopedBaseline(sid).filter(b=>allowedDomainIds.has(+b.Domaine));
const baselineDetails=scopedBaselineDetails(sid).filter(b=>allowedDomainIds.has(+b.Domaine));
const bd={},bo={},bp={};
for(const d of domains)bd[d.id]={d,total:0,eur:0,baselineAnnual:0,tjm:0,collabs:0,days:+s?.Nb_Jours_Ouvres_Annuels||0};
let fixed=0,included=0,over=0,total=0,unresolved=0,licenses=0;
for(const a of alloc){const o=D.offerById[a.Offre],p=D.providerById[o?.Fournisseur],d=bd[a.Domaine];if(!o||!p||!d)continue;const f=+a.Cout_Abonnement||0,i=+a.Usage_Inclus_Total||0,ov=+a.Cout_Overage||0,t=+a.Budget_Total_USD||0;fixed+=f;included+=i;over+=ov;total+=t;licenses+=+a.Nb_Licences||0;if(a.Tarif_A_Confirmer)unresolved++;d.total+=t;d.eur+=+a.Budget_Total_EUR||0;const ok=o.id,pk=p.id;bo[ok]??={o,p,licenses:0,fixed:0,included:0,over:0,total:0,unresolved:0};bo[ok].licenses+=+a.Nb_Licences||0;bo[ok].fixed+=f;bo[ok].included+=i;bo[ok].over+=ov;bo[ok].total+=t;if(a.Tarif_A_Confirmer)bo[ok].unresolved++;bp[pk]??={p,total:0,licenses:0};bp[pk].total+=t;bp[pk].licenses+=+a.Nb_Licences||0}
const detailsByDomain={};
for(const r of baselineDetails)(detailsByDomain[r.Domaine]??=[]).push(r);
for(const b of baseline){
  const d=bd[b.Domaine];if(!d)continue;
  d.days=+b.Jours_Ouvres_Effectifs||(+b.Jours_Ouvres_Override||0)||(+s?.Nb_Jours_Ouvres_Annuels||0);
  const tiers=(detailsByDomain[b.Domaine]||[]).filter(r=>(+r.Nb_Collaborateurs_N_1||0)>0 || (+r.TJM_EUR||0)>0);
  if(tiers.length){
    let weighted=0,collabs=0;
    for(const r of tiers){const c=+r.Nb_Collaborateurs_N_1||0,t=+r.TJM_EUR||0;collabs+=c;weighted+=c*t}
    d.collabs=collabs;
    d.tjm=collabs?weighted/collabs:0;
    d.baselineAnnual=weighted*d.days;
    d.tiers=tiers.slice().sort((a,b)=>(+a.Ordre||0)-(+b.Ordre||0)||(+a.id||0)-(+b.id||0));
  }else{
    d.baselineAnnual=+b.Cout_Reference_N_1_Annuel_EUR||0;
    d.tjm=+b.TJM_EUR||0;
    d.collabs=+b.Nb_Collaborateurs_N_1||0;
    d.tiers=[];
  }
}
const months=Math.max(1,+s?.Nb_Mois||12),rate=+s?.Taux_USD_EUR||0;
let baselineAnnual=0,budgetPeriodEUR=total*rate,budgetAnnualizedEUR=0,baselinePeriod=0,savingPeriod=0,savingAnnual=0;
for(const d of Object.values(bd)){d.budgetAnnualized=d.eur*12/months;d.baselinePeriod=d.baselineAnnual*months/12;d.savingPeriod=d.baselinePeriod-d.eur;d.savingAnnual=d.baselineAnnual-d.budgetAnnualized;d.savingPct=d.baselineAnnual?d.savingAnnual/d.baselineAnnual:0;d.daysEquivalent=d.tjm>0?d.savingAnnual/d.tjm:0;d.fteEquivalent=(d.tjm>0&&d.days>0)?d.savingAnnual/(d.tjm*d.days):0;baselineAnnual+=d.baselineAnnual;budgetAnnualizedEUR+=d.budgetAnnualized;baselinePeriod+=d.baselinePeriod;savingPeriod+=d.savingPeriod;savingAnnual+=d.savingAnnual}
const savingPct=baselineAnnual?savingAnnual/baselineAnnual:0;
return{s,alloc,baseline,baselineDetails,bd,bo,bp,fixed,included,over,total,licenses,unresolved,rate,months,baselineAnnual,budgetPeriodEUR,budgetAnnualizedEUR,baselinePeriod,savingPeriod,savingAnnual,savingPct}
}
function renderAll(){
  CURRENT=model(selectedScenario()?.id);
  const names=scopedDomains().map(d=>d.Nom).join(', ');
  document.getElementById('scope').textContent=isOwner()?'Périmètre : tous les domaines':`Périmètre : ${names||'aucun domaine'}`;
  document.getElementById('sideScope').textContent=isOwner()?'Tous les domaines':(names||'Aucun domaine');
  renderDashboard();renderSimulation();renderCompare();renderROI();renderPreSimulation();renderScenarios();renderOffersReadOnly();
  if(roleSeesAdvancedMenus()){renderOffersAdmin();renderDomainsAdmin();renderRightsAdmin();renderMenuAdmin();renderLabelsAdmin();renderAclAdmin()}
  applyUILabels();
  enforceRolePermissions();
}
function dashboardFilterOptions(){
  const domains=scopedDomains().sort((a,b)=>String(a.Nom).localeCompare(String(b.Nom),'fr'));
  const providers=D[T.providers].filter(p=>p.Actif!==false).sort((a,b)=>String(a.Nom).localeCompare(String(b.Nom),'fr'));
  const valid=new Set(domains.map(d=>+d.id));
  DASH_FILTER.domainIds=(DASH_FILTER.domainIds||[]).map(Number).filter(id=>valid.has(id));
  if(DASH_FILTER.providerId&&!providers.some(p=>+p.id===+DASH_FILTER.providerId))DASH_FILTER.providerId=0;
  return{domains,providers};
}
function renderDashboard(){
  const opts=dashboardFilterOptions();
  const m=model(selectedScenario()?.id,DASH_FILTER);
  const el=document.getElementById('v-dashboard');
  const offers=Object.values(m.bo),domains=Object.values(m.bd).sort((a,b)=>b.total-a.total);
  const unresolved=m.unresolved?`<span class="badge warn">${m.unresolved} tarif(s) à confirmer</span>`:'<span class="badge ok">Tous les tarifs chiffrés</span>';
  const selectedDomainSet=new Set((DASH_FILTER.domainIds||[]).map(Number));
  const activeDomains=opts.domains.filter(d=>selectedDomainSet.has(+d.id));
  const activeProvider=opts.providers.find(p=>+p.id===+DASH_FILTER.providerId);
  const domainSummary=activeDomains.length?activeDomains.map(d=>d.Nom).join(', '):'Tous les domaines';
  const filterSummary=[`Domaines : ${esc(domainSummary)}`,activeProvider?`Fournisseur : ${esc(activeProvider.Nom)}`:'Tous les fournisseurs'].join(' · ');
  el.innerHTML=`<div class="dashboard-filters read-only-exempt"><div class="filter-title"><b>Filtres du tableau de bord</b><span>${filterSummary}</span></div><div class="field dash-domain-field"><span class="field-label">Domaines</span><div class="dash-domain-picker"><button id="dashDomainPickerBtn" class="btn secondary dash-domain-btn">${activeDomains.length?`${activeDomains.length} domaine(s) sélectionné(s)`:'Tous les domaines'} ▾</button><div id="dashDomainMenu" class="dash-domain-menu hidden"><div class="dash-domain-actions"><button id="dashAllDomains" class="mini-btn">Tous</button><button id="dashNoDomains" class="mini-btn">Aucun</button></div>${opts.domains.map(d=>`<label class="dash-domain-option"><input type="checkbox" data-dash-domain="${d.id}" ${selectedDomainSet.has(+d.id)?'checked':''}><span>${esc(d.Nom)}</span></label>`).join('')}</div></div></div><label class="field">Fournisseur<select id="dashProviderFilter"><option value="0">Tous les fournisseurs</option>${opts.providers.map(p=>`<option value="${p.id}" ${+DASH_FILTER.providerId===+p.id?'selected':''}>${esc(p.Nom)}</option>`).join('')}</select></label><button id="dashResetFilters" class="btn secondary">Réinitialiser</button></div><div class="kpis"><div class="kpi"><div class="v">${num(m.licenses)}</div><div class="l">Licences</div></div><div class="kpi"><div class="v">${money(m.fixed)}</div><div class="l">Abonnements fixes</div></div><div class="kpi"><div class="v">${money(m.included)}</div><div class="l">Usage inclus valorisé</div></div><div class="kpi"><div class="v">${money(m.over)}</div><div class="l">Consommation supplémentaire</div></div><div class="kpi"><div class="v">${money(m.total)}</div><div class="l">Budget connu USD</div></div><div class="kpi"><div class="v">${money(m.total*m.rate,'EUR')}</div><div class="l">Budget connu EUR</div></div></div><div class="kpis roi-kpis"><div class="kpi roi"><div class="v">${money(m.baselineAnnual,'EUR')}</div><div class="l">Baseline N-1 annuelle</div></div><div class="kpi roi"><div class="v">${money(m.budgetAnnualizedEUR,'EUR')}</div><div class="l">Licences annualisées</div></div><div class="kpi roi"><div class="v ${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</div><div class="l">Économie annuelle</div></div><div class="kpi roi"><div class="v ${m.savingPct<0?'negative':''}">${pct(m.savingPct)}</div><div class="l">Taux d'économie</div></div></div><div class="card">${unresolved}</div><div class="grid2"><article class="card"><h3>Budget par fournisseur</h3><div id="providerDonut" class="donutlayout"></div></article><article class="card"><h3>Budget par domaine</h3><div id="domainBars"></div></article></div><article class="card"><h3>Vue budgétaire par offre</h3><p>Abonnement fixe, usage inclus, overage et ventilation fournisseur.</p><div class="tablewrap"><table><thead><tr><th>Fournisseur</th><th>Offre</th><th>Licences</th><th>Fixe</th><th>Usage inclus</th><th>Overage</th><th>Total USD</th><th>Total EUR</th><th>Statut</th></tr></thead><tbody>${offers.map(x=>`<tr class="${x.unresolved?'unresolved':''}"><td class="provider">${esc(x.p.Nom)}</td><td>${esc(x.o.Nom)}</td><td class="num">${num(x.licenses)}</td><td class="num">${money(x.fixed)}</td><td class="num">${money(x.included)}</td><td class="num">${money(x.over)}</td><td class="num"><b>${money(x.total)}</b></td><td class="num">${money(x.total*m.rate,'EUR')}</td><td>${x.unresolved?'<span class="badge warn">Devis à confirmer</span>':'<span class="badge ok">Chiffré</span>'}</td></tr>`).join('')}<tr class="total"><td colspan="6">TOTAL CONNU</td><td class="num">${money(m.total)}</td><td class="num">${money(m.total*m.rate,'EUR')}</td><td>${unresolved}</td></tr></tbody></table></div></article><article class="card"><h3>Ventilation par domaine</h3><div class="tablewrap"><table><thead><tr><th>Domaine</th><th>Budget USD</th><th>Budget EUR</th><th>Part</th></tr></thead><tbody>${domains.map(x=>`<tr><td><b>${esc(x.d.Nom)}</b></td><td class="num">${money(x.total)}</td><td class="num">${money(x.eur,'EUR')}</td><td class="num">${pct(m.total?x.total/m.total:0)}</td></tr>`).join('')}</tbody></table></div></article>`;
  const pf=document.getElementById('dashProviderFilter'),reset=document.getElementById('dashResetFilters');
  const pickerBtn=document.getElementById('dashDomainPickerBtn'),menu=document.getElementById('dashDomainMenu');
  pickerBtn.onclick=e=>{e.stopPropagation();menu.classList.toggle('hidden')};
  menu.onclick=e=>e.stopPropagation();
  document.addEventListener('click',()=>menu.classList.add('hidden'),{once:true});
  menu.querySelectorAll('input[data-dash-domain]').forEach(cb=>cb.onchange=()=>{
    DASH_FILTER.domainIds=[...menu.querySelectorAll('input[data-dash-domain]:checked')].map(x=>+x.dataset.dashDomain);
    renderDashboard();
  });
  document.getElementById('dashAllDomains').onclick=()=>{
    DASH_FILTER.domainIds=opts.domains.map(d=>+d.id);
    renderDashboard();
  };
  document.getElementById('dashNoDomains').onclick=()=>{
    DASH_FILTER.domainIds=[];
    renderDashboard();
  };
  pf.onchange=()=>{DASH_FILTER.providerId=+pf.value||0;renderDashboard()};
  reset.onclick=()=>{DASH_FILTER={domainIds:[],providerId:0};renderDashboard()};
  renderCharts(m);scheduleUILabelApply();
}
function renderCharts(m){
  const ps=Object.values(m.bp),sum=Math.max(1,m.total);let acc=0,st=[];
  ps.forEach((x,i)=>{const a=acc;acc+=x.total/sum*100;st.push(`${COLORS[i%COLORS.length]} ${a}% ${acc}%`)});
  document.getElementById('providerDonut').innerHTML=`<div class="donutwrap"><div class="donut" style="background:conic-gradient(${st.join(',')||'#e8ebf0 0 100%'})"></div><div class="donutcenter">${money(m.total)}</div></div><div class="legend">${ps.map((x,i)=>`<div class="legendrow"><span class="dot" style="background:${COLORS[i%COLORS.length]}"></span><span>${esc(x.p.Nom)}</span><b>${pct(x.total/sum)}</b></div>`).join('')}</div>`;
  const ds=Object.values(m.bd).sort((a,b)=>b.total-a.total),mx=Math.max(1,...ds.map(x=>x.total));
  document.getElementById('domainBars').innerHTML=ds.map(x=>`<div class="barrow"><span>${esc(x.d.Nom)}</span><div class="bartrack"><div class="barfill" style="width:${x.total/mx*100}%"></div></div><span class="num">${money(x.total)}</span></div>`).join('');
}
function renderSimulation(){const el=document.getElementById('v-simulation'),m=CURRENT;const activeScenario=selectedScenario();el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Allocations du scénario</h3><p>Scénario actif : <b>${esc(activeScenario?.Nom||'—')}</b> · ${m.alloc.length} allocation(s) liée(s). Une ligne = un domaine + une offre.</p></div><div class="table-actions"><button id="saveAllAlloc" class="btn primary">Enregistrer les modifications</button><button id="addAlloc" class="btn secondary">+ Ajouter une allocation</button></div></div><div class="tablewrap"><table><thead><tr><th>Domaine</th><th>Fournisseur</th><th>Offre</th><th>Licences</th><th>Mois facturés</th><th>Engagement</th><th>Tarif négocié mensuel</th><th>Tarif négocié annuel</th><th>Overage prévu /mois/lic.</th><th>Plafond overage</th><th>Total</th><th></th></tr></thead><tbody>${m.alloc.map(a=>allocRow(a)).join('')}</tbody></table></div></article><article id="newAllocCard" class="card hidden"></article>`;document.getElementById('addAlloc').onclick=showNewAlloc;document.getElementById('saveAllAlloc').onclick=saveAllAllocations;document.querySelectorAll('.delAlloc').forEach(b=>b.onclick=()=>delRecord(T.alloc,+b.dataset.id))}
function allocRow(a){const o=D.offerById[a.Offre],p=D.providerById[o?.Fournisseur],d=D.domainById[a.Domaine];return`<tr data-id="${a.id}" class="${a.Tarif_A_Confirmer?'unresolved':''}"><td><b>${esc(d?.Nom)}</b></td><td>${esc(p?.Nom)}</td><td>${esc(o?.Nom)}</td><td><input class="editor" data-f="Nb_Licences" type="number" min="0" value="${+a.Nb_Licences||0}"></td><td><input class="editor" data-f="Mois_Factures" type="number" min="0" value="${+a.Mois_Factures||0}"></td><td><input class="editor" data-f="Engagement_Mois" type="number" min="0" value="${+a.Engagement_Mois||0}"></td><td><input class="editor" data-f="Tarif_Negocie_Mensuel" type="number" min="0" step="0.01" value="${+a.Tarif_Negocie_Mensuel||0}"></td><td><input class="editor" data-f="Tarif_Negocie_Annuel" type="number" min="0" step="0.01" value="${+a.Tarif_Negocie_Annuel||0}"></td><td><input class="editor" data-f="Usage_Supplementaire_Prevu_Mois_Licence" type="number" min="0" step="1" value="${+a.Usage_Supplementaire_Prevu_Mois_Licence||0}"></td><td><input class="editor" data-f="Plafond_Overage_Mois_Licence" type="number" step="1" value="${Number(a.Plafond_Overage_Mois_Licence??-1)}" title="-1 = sans plafond, 0 = aucun overage"></td><td class="num"><b>${a.Tarif_A_Confirmer?'À chiffrer':money(a.Budget_Total_USD)}</b></td><td><button class="btn small danger delAlloc" data-id="${a.id}" title="Supprimer cette allocation">×</button></td></tr>`}
function showNewAlloc(){const c=document.getElementById('newAllocCard');c.classList.remove('hidden');c.innerHTML=`<h3>Nouvelle allocation</h3><div class="toolbar"><label class="field">Domaine<select id="naDomain">${scopedDomains().map(d=>`<option value="${d.id}">${esc(d.Nom)}</option>`).join('')}</select></label><label class="field">Offre<select id="naOffer">${D[T.offers].filter(o=>o.Actif!==false).map(o=>{const p=D.providerById[o.Fournisseur];return`<option value="${o.id}">${esc(p?.Nom)} — ${esc(o.Nom)}</option>`}).join('')}</select></label><label class="field">Licences<input id="naLic" type="number" min="0" value="20"></label><label class="field">Mois facturés<input id="naMonths" type="number" min="0" value="${+CURRENT.s.Nb_Mois||12}"></label><button id="createAlloc" class="btn primary">Créer</button></div><p>Pour une offre Enterprise sans prix, laisse le tarif négocié à 0 : elle restera marquée « devis à confirmer ».</p>`;document.getElementById('createAlloc').onclick=createAlloc}
async function createAlloc(){const oid=+document.getElementById('naOffer').value,o=D.offerById[oid];const fields={Scenario:CURRENT.s.id,Domaine:+document.getElementById('naDomain').value,Offre:oid,Nb_Licences:+document.getElementById('naLic').value||0,Mois_Factures:+document.getElementById('naMonths').value||0,Engagement_Mois:+o.Engagement_Defaut_Mois||0,Tarif_Negocie_Mensuel:0,Tarif_Negocie_Annuel:0,Usage_Supplementaire_Prevu_Mois_Licence:0,Overage_Autorise:o.Overage_Disponible!==false,Plafond_Overage_Mois_Licence:o.Overage_Disponible===false?0:-1};await apply([["AddRecord",T.alloc,null,fields]]);toast('Allocation créée.');await reload()}
async function saveAllAllocations(){const actions=[...document.querySelectorAll('#v-simulation tr[data-id]')].map(tr=>["UpdateRecord",T.alloc,+tr.dataset.id,readFields(tr)]);if(!actions.length){toast('Aucune allocation à enregistrer.');return}await apply(actions);toast(`${actions.length} allocation(s) enregistrée(s).`);await reload()}
function readFields(tr,selector='[data-f]'){const f={};tr.querySelectorAll(selector).forEach(i=>{let v=i.type==='checkbox'?i.checked:i.value;if(i.type==='number')v=+v||0;else if(i.tagName==='SELECT'&&i.dataset.f==='Domaine'&&/^\d+$/.test(v))v=+v;f[i.dataset.f]=v});return f}
async function saveAllGeneric(viewId,table,rowSelector,idAttr,label){const root=document.getElementById(viewId);const actions=[...root.querySelectorAll(rowSelector)].map(tr=>["UpdateRecord",table,+tr.getAttribute(idAttr),readFields(tr)]);if(!actions.length){toast('Aucune ligne à enregistrer.');return}await apply(actions);toast(`${actions.length} ${label} enregistrée(s).`);await reload()}
async function delRecord(table,id){if(!confirm('Supprimer cette ligne ?'))return;await apply([["RemoveRecord",table,id]]);toast('Ligne supprimée.');await reload()}
async function apply(actions){try{return await grist.docApi.applyUserActions(actions)}catch(e){toast(e.message,true);throw e}}
async function waitForGristRecalc(){
  // applyUserActions confirme l'écriture, mais les valeurs de formules/références
  // peuvent arriver juste après dans une lecture API consécutive.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  await new Promise(resolve=>setTimeout(resolve,120));
}
async function reload(){
  const previousScenarioId=+(document.getElementById('scenarioSelect')?.value||selectedScenario()?.id||0);
  await waitForGristRecalc();
  await fetchAll();
  deriveAccess();
  populateScenario(previousScenarioId);
  CURRENT=model(selectedScenario()?.id);
  renderAll();
  applyUILabelsSafe?.();
}

let COMPARE_SELECTED_IDS=[];
function compareSelectedIds(){
  const checked=[...document.querySelectorAll('.cmp:checked')].slice(0,6).map(x=>+x.value);
  if(checked.length)COMPARE_SELECTED_IDS=checked;
  return checked;
}

function effectiveOfferPrice(a,o){
  const monthlyCandidates=[
    [+a.Tarif_Negocie_Mensuel||0,'Négocié allocation'],
    [+o.Tarif_Negocie_Mensuel||0,'Négocié offre'],
    [+o.Tarif_Reference_Mensuel||0,'Référence interne'],
    [+o.Tarif_Catalogue_Mensuel||0,'Catalogue']
  ];
  const annualCandidates=[
    [+a.Tarif_Negocie_Annuel||0,'Négocié allocation'],
    [+o.Tarif_Negocie_Annuel||0,'Négocié offre'],
    [+o.Tarif_Reference_Annuel||0,'Référence interne'],
    [+o.Tarif_Catalogue_Annuel||0,'Catalogue']
  ];
  const monthly=monthlyCandidates.find(([v])=>v>0)||[0,'À confirmer'];
  const annual=annualCandidates.find(([v])=>v>0)||[0,'À confirmer'];
  const periodicity=String(o.Periodicite_Prix||'').toLowerCase();
  if(periodicity.includes('annuel') || (!monthly[0]&&annual[0])){
    return {amount:annual[0],period:'an',source:annual[1],kind:'annual'};
  }
  return {amount:monthly[0],period:'mois',source:monthly[1],kind:'monthly'};
}
function fixedCostBasis(a,o){
  const price=effectiveOfferPrice(a,o);
  const licenses=+a.Nb_Licences||0;
  const billed=+a.Mois_Factures||0;
  const engagement=+a.Engagement_Mois||0;
  const effectiveMonths=Math.max(billed,(o.Facturer_Engagement_Minimum?engagement:0));
  if(price.kind==='annual'){
    return {
      price,
      basis:price.amount?`${money(price.amount)} / licence / an × ${num(licenses)} licence(s)`:'Tarif annuel à confirmer',
      theoretical:price.amount*licenses
    };
  }
  return {
    price,
    basis:price.amount?`${money(price.amount)} / licence / mois × ${num(licenses)} licence(s) × ${num(effectiveMonths)} mois`:'Tarif mensuel à confirmer',
    theoretical:price.amount*licenses*effectiveMonths
  };
}

function scenarioDetailRows(m){
  return m.alloc.map(a=>{
    const d=D.domainById?.[a.Domaine]||D[T.domains].find(x=>+x.id===+a.Domaine)||{};
    const o=D.offerById[a.Offre]||{};
    const p=D.providerById[o.Fournisseur]||{};
    const fixedBasis=fixedCostBasis(a,o);
    return {
      domain:d.Nom||'Domaine',
      provider:p.Nom||'—',
      offer:o.Nom||'—',
      licenses:+a.Nb_Licences||0,
      engagement:+a.Engagement_Mois||(+o.Engagement_Defaut_Mois||0),
      billed:+a.Mois_Factures||(+o.Mois_Factures_Defaut||m.months||0),
      unitPrice:fixedBasis.price.amount,
      unitPeriod:fixedBasis.price.period,
      priceSource:fixedBasis.price.source,
      fixedBasis:fixedBasis.basis,
      fixedTheoretical:fixedBasis.theoretical,
      fixed:+a.Cout_Abonnement||0,
      variable:+a.Cout_Overage||0,
      total:+a.Budget_Total_USD||0,
      unresolved:!!a.Tarif_A_Confirmer
    };
  }).sort((a,b)=>a.domain.localeCompare(b.domain,'fr')||a.provider.localeCompare(b.provider,'fr')||a.offer.localeCompare(b.offer,'fr'));
}

function scenarioDomainGroups(m){
  const groups={};
  // V39 : le détail et l'impression ne montrent que les allocations qui
  // contribuent réellement au budget connu (coût fixe ou variable non nul).
  for(const r of scenarioDetailRows(m)){
    if(Math.abs(r.fixed)<0.000001 && Math.abs(r.variable)<0.000001 && Math.abs(r.total)<0.000001)continue;
    (groups[r.domain]??=[]).push(r);
  }
  return Object.entries(groups).map(([domain,rows])=>({
    domain,rows,
    licenses:rows.reduce((s,r)=>s+r.licenses,0),
    fixed:rows.reduce((s,r)=>s+r.fixed,0),
    variable:rows.reduce((s,r)=>s+r.variable,0),
    total:rows.reduce((s,r)=>s+r.total,0)
  })).filter(g=>Math.abs(g.fixed)>0.000001||Math.abs(g.variable)>0.000001||Math.abs(g.total)>0.000001);
}
function renderCompare(){
  const el=document.getElementById('v-compare');
  const scenarios=D[T.scenarios]||[];
  if(!COMPARE_SELECTED_IDS.length)COMPARE_SELECTED_IDS=scenarios.slice(0,Math.min(3,scenarios.length)).map(s=>+s.id);
  const selected=new Set(COMPARE_SELECTED_IDS);
  el.innerHTML=`<article class="card synthesis-card">
    <div class="cardhead synthesis-head"><div><h3>Comparer les scénarios</h3><p>Sélectionne jusqu’à 6 scénarios. Clique sur une carte pour ouvrir le détail financier par domaine.</p></div>
      <button id="printSynthesis" class="btn primary">🖨 Imprimer la synthèse</button>
    </div>
    <div class="checklist">${scenarios.map(s=>`<label class="checkpill"><input type="checkbox" class="cmp" value="${s.id}" ${selected.has(+s.id)?'checked':''}>${esc(s.Nom)}</label>`).join('')}</div>
    <div id="cmpOut" style="margin-top:14px"></div>
  </article>
  <div id="scenarioDetailModal"></div>`;
  document.querySelectorAll('.cmp').forEach(x=>x.onchange=()=>{
    const ids=[...document.querySelectorAll('.cmp:checked')].map(x=>+x.value);
    if(ids.length>6){x.checked=false;toast('Maximum 6 scénarios.',true);return}
    COMPARE_SELECTED_IDS=ids;drawCompare();
  });
  document.getElementById('printSynthesis').onclick=printSynthesisV36;
  drawCompare();
}
function drawCompare(){
  const ids=compareSelectedIds(),ms=ids.map(model).filter(m=>m?.s);
  const out=document.getElementById('cmpOut');if(!out)return;
  out.innerHTML=`<div class="comparegrid synthesis-grid">${ms.map((m,idx)=>{
    const fixedPct=m.total?Math.max(0,Math.min(100,m.fixed/m.total*100)):0;
    const domainCount=Object.values(m.bd).filter(x=>x.total>0).length;
    const offerCount=Object.keys(m.bo).length;
    return `<button type="button" class="comparecard synthesis-scenario-card tone-${idx%5}" data-open-scenario="${m.s.id}">
      <div class="scenario-card-top"><div><span class="scenario-eyebrow">SCÉNARIO</span><h4>${esc(m.s.Nom)}</h4></div>${m.unresolved?`<span class="badge warn">${m.unresolved} à confirmer</span>`:'<span class="badge ok">Chiffré</span>'}</div>
      <div class="scenario-budget">${money(m.total)}</div>
      <div class="scenario-eur">${money(m.total*m.rate,'EUR')}</div>
      <div class="scenario-metrics"><span><b>${num(m.licenses)}</b> licences</span><span><b>${domainCount}</b> domaines</span><span><b>${offerCount}</b> offres</span></div>
      <div class="cost-split"><div class="cost-split-bar"><span class="fixed" style="width:${fixedPct}%"></span><span class="variable" style="width:${100-fixedPct}%"></span></div><div class="cost-split-labels"><span>Fixe ${money(m.fixed)}</span><span>Variable ${money(m.over)}</span></div></div>
      <div class="scenario-card-footer"><span>Économie annuelle <b class="${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</b></span><strong>Voir le détail →</strong></div>
    </button>`;
  }).join('')}</div>
  `;
  out.querySelectorAll('[data-open-scenario]').forEach(x=>x.onclick=()=>openScenarioDetailV36(+x.dataset.openScenario));
}
function scenarioDetailHtmlV36(m,printMode=false){
  const groups=scenarioDomainGroups(m);
  const offerCount=Object.keys(m.bo).length;
  return `<div class="scenario-detail-document ${printMode?'print-document':''}">
    <div class="detail-hero">
      <div><span class="scenario-eyebrow">SYNTHÈSE FINOPS IA</span><h2>${esc(m.s.Nom)}</h2><div class="detail-meta"><span>${esc(String(m.s.Annee||''))}</span><span>${num(m.months)} mois</span><span>${num(m.licenses)} licences</span><span>${groups.length} domaines</span><span>${offerCount} offres</span>${m.unresolved?`<span class="badge warn">${m.unresolved} tarif(s) à confirmer</span>`:'<span class="badge ok">Chiffré</span>'}</div></div>
      <div class="detail-total"><small>Budget total</small><strong>${money(m.total)}</strong><span>${money(m.total*m.rate,'EUR')}</span></div>
    </div>
    <div class="detail-kpis">
      <div><span>Coûts fixes</span><b>${money(m.fixed)}</b></div>
      <div><span>Coûts variables</span><b>${money(m.over)}</b></div>
      <div><span>Budget EUR</span><b>${money(m.total*m.rate,'EUR')}</b></div>
      <div><span>Économie annuelle</span><b class="${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</b></div>
    </div>
    <div class="pricing-explainer"><div class="pricing-icon">$</div><div><b>Lecture du coût fixe</b><p>Le prix du forfait affiché est le tarif effectivement retenu selon la priorité : négocié sur l’allocation → négocié sur l’offre → référence interne → catalogue. La base de calcul montre comment ce prix contribue au coût fixe.</p></div></div>
    <div class="detail-section-title"><span>02</span><div><h3>Détail par domaine</h3><p>Offres, licences, prix du forfait, engagements et structure des coûts.</p></div></div>
    <div class="domain-detail-list">${groups.length?groups.map(g=>`<section class="domain-detail-card">
      <div class="domain-detail-head"><div><span class="domain-label">DOMAINE</span><h3>${esc(g.domain)}</h3></div><div class="domain-totals"><span>${num(g.licenses)} licences</span><b>${money(g.total)}</b></div></div>
      <div class="tablewrap"><table class="detail-table"><thead><tr><th>Fournisseur</th><th>Offre</th><th>Licences</th><th>Prix forfait</th><th>Base calcul fixe</th><th>Engagement</th><th>Mois facturés</th><th>Fixe</th><th>Variable</th><th>Total</th></tr></thead><tbody>${g.rows.map(r=>`<tr><td><b>${esc(r.provider)}</b></td><td>${esc(r.offer)}${r.unresolved?' <span class="badge warn">À confirmer</span>':''}</td><td class="num">${num(r.licenses)}</td><td class="num"><b>${r.unitPrice?money(r.unitPrice):'—'}</b>${r.unitPrice?`<small class="price-period">/ licence / ${esc(r.unitPeriod)}</small><small class="price-source">${esc(r.priceSource)}</small>`:''}</td><td><span class="fixed-basis">${esc(r.fixedBasis)}</span></td><td class="num">${r.engagement?num(r.engagement)+' mois':'—'}</td><td class="num">${r.billed?num(r.billed):'—'}</td><td class="num">${money(r.fixed)}</td><td class="num">${money(r.variable)}</td><td class="num"><b>${money(r.total)}</b></td></tr>`).join('')}</tbody><tfoot><tr><td colspan="7">Sous-total ${esc(g.domain)}</td><td class="num">${money(g.fixed)}</td><td class="num">${money(g.variable)}</td><td class="num"><b>${money(g.total)}</b></td></tr></tfoot></table></div>
    </section>`).join(''):'<div class="empty-state">Aucune allocation sur ce scénario.</div>'}</div>
    <div class="detail-grand-total"><div><span>Total scénario</span><small>${num(m.licenses)} licences · ${groups.length} domaines</small></div><div><b>${money(m.total)}</b><span>${money(m.total*m.rate,'EUR')}</span></div></div>
  </div>`;
}
function openScenarioDetailV36(sid){
  const m=model(sid),host=document.getElementById('scenarioDetailModal');if(!m?.s||!host)return;
  host.innerHTML=`<div class="modal-backdrop scenario-detail-backdrop">
    <div class="scenario-detail-modal" role="dialog" aria-modal="true" aria-label="Détail du scénario">
      <div class="detail-modal-toolbar"><div><b>Détail du scénario</b><span>Vue imprimable</span></div><div class="detail-modal-actions"><button id="closeScenarioDetail" class="btn secondary">Fermer</button><button id="openScenarioHtml" class="btn secondary">🌐 Ouvrir en HTML</button><button id="printScenarioDetail" class="btn primary">🖨 Imprimer le détail</button></div></div>
      <div class="scenario-detail-scroll">${scenarioDetailHtmlV36(m)}</div>
    </div>
  </div>`;
  document.getElementById('closeScenarioDetail').onclick=()=>host.innerHTML='';
  host.querySelector('.scenario-detail-backdrop').onclick=e=>{if(e.target===e.currentTarget)host.innerHTML=''};
  document.getElementById('openScenarioHtml').onclick=()=>openScenarioHtmlV41(sid);
  document.getElementById('printScenarioDetail').onclick=()=>printScenarioDetailV36(sid);
}
function safeFilenameV41(value){
  return String(value||'scenario')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9_-]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .replace(/-+/g,'-') || 'scenario';
}
function scenarioHtmlDocumentV41(m){
  const reportTitle=`FinOps - ${m.s.Nom}`;
  const filename=`FinOps_${safeFilenameV41(m.s.Nom)}_${new Date().toISOString().slice(0,10)}.html`;
  const body=`<div class="html-report-toolbar no-print">
      <div><b>Synthèse FinOps IA</b><span>Rapport HTML autonome · ${esc(m.s.Nom)}</span></div>
      <div class="html-report-actions"><button id="htmlPrint">🖨 Imprimer / PDF</button><button id="htmlSave">💾 Enregistrer le fichier HTML</button></div>
    </div>
    <main class="html-report-page">
      <div class="print-cover"><div><h1>Synthèse FinOps IA</h1><p>Détail du scénario · ${esc(m.s.Nom)}</p></div><div>Édité le ${new Date().toLocaleDateString('fr-FR')}</div></div>
      ${scenarioDetailHtmlV36(m,true)}
    </main>`;
  const screenCss=`
    body{background:#eef2f7;padding:0 0 36px;font-size:12px}
    .html-report-toolbar{position:sticky;top:0;z-index:20;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px 18px;background:#10213e;color:#fff;box-shadow:0 5px 18px rgba(15,23,42,.18)}
    .html-report-toolbar>div:first-child{display:flex;flex-direction:column;gap:2px}.html-report-toolbar span{font-size:11px;color:#cbd5e1}
    .html-report-actions{display:flex;gap:8px;flex-wrap:wrap}.html-report-actions button{border:0;border-radius:9px;padding:9px 13px;font-weight:700;cursor:pointer}.html-report-actions button:first-child{background:#fff;color:#10213e}.html-report-actions button:last-child{background:#635bdb;color:#fff}
    .html-report-page{width:min(1460px,calc(100% - 32px));margin:24px auto;background:#fff;padding:22px;border-radius:16px;box-shadow:0 12px 34px rgba(15,23,42,.10)}
    @media(max-width:760px){.html-report-toolbar{align-items:flex-start;flex-direction:column}.html-report-actions{width:100%}.html-report-actions button{flex:1 1 220px}.html-report-page{width:calc(100% - 12px);margin:8px auto;padding:10px}}
    @media print{.no-print{display:none!important}.html-report-page{width:auto;margin:0;padding:0;box-shadow:none;border-radius:0}body{padding:0;background:#fff}}
  `;
  const js=`
    const REPORT_FILENAME=${JSON.stringify(filename)};
    document.getElementById('htmlPrint').addEventListener('click',()=>window.print());
    document.getElementById('htmlSave').addEventListener('click',()=>{
      const source='<!doctype html>\\n'+document.documentElement.outerHTML;
      const blob=new Blob([source],{type:'text/html;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=REPORT_FILENAME;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    });
  `;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(reportTitle)}</title><style>${PRINT_CSS_V36}${screenCss}</style></head><body>${body}<script>${js}<\/script></body></html>`;
}
function openScenarioHtmlV41(sid){
  const m=model(sid);if(!m?.s)return;
  const w=window.open('','_blank');
  if(!w){toast("Le navigateur a bloqué l’ouverture du rapport HTML.",true);return}
  w.document.open();
  w.document.write(scenarioHtmlDocumentV41(m));
  w.document.close();
}
function printWindowV36(title,body){
  const w=window.open('','_blank','width=1280,height=900');
  if(!w){toast("Le navigateur a bloqué la fenêtre d'impression.",true);return}
  w.document.open();
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS_V36}</style></head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),180)<\/script></body></html>`);
  w.document.close();
}
const PRINT_CSS_V36=`
@page{size:A4 landscape;margin:12mm}
*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#10213e;margin:0;background:#fff;font-size:10px}
h1,h2,h3,p{margin-top:0}.print-cover{display:flex;justify-content:space-between;align-items:end;border-bottom:3px solid #5b4df5;padding-bottom:12px;margin-bottom:18px}.print-cover h1{font-size:26px;margin-bottom:4px}.print-cover p{color:#64748b;margin:0}
.scenario-detail-document{max-width:none}.detail-hero{display:flex;justify-content:space-between;gap:20px;padding:18px;border-radius:14px;background:#f5f7ff;margin-bottom:12px}.scenario-eyebrow,.domain-label{font-size:9px;letter-spacing:.12em;color:#635bdb;font-weight:700}.detail-hero h2{font-size:24px;margin:5px 0}.detail-meta{display:flex;gap:7px;flex-wrap:wrap}.detail-meta span{padding:4px 7px;border-radius:99px;background:#fff;border:1px solid #dbe3ef}.detail-total{text-align:right}.detail-total small,.detail-total span{display:block;color:#64748b}.detail-total strong{display:block;font-size:25px;margin:4px 0}.detail-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0 18px}.detail-kpis>div{border:1px solid #dbe3ef;border-radius:10px;padding:10px}.detail-kpis span{display:block;color:#64748b}.detail-kpis b{font-size:15px}.detail-section-title{display:flex;gap:10px;align-items:start;margin:16px 0 8px}.detail-section-title>span{font-size:20px;color:#635bdb;font-weight:800}.detail-section-title h3{margin-bottom:2px}.detail-section-title p{color:#64748b}.pricing-explainer{display:flex;gap:8px;padding:9px;border:1px solid #dedcff;border-radius:9px;margin-bottom:12px;background:#f8f7ff}.pricing-icon{width:25px;height:25px;border-radius:7px;background:#635bdb;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}.pricing-explainer p{margin:2px 0 0;color:#64748b}.price-period,.price-source{display:block;font-size:7px;color:#64748b}.price-source{color:#635bdb}.fixed-basis{font-size:8px;line-height:1.3}
.domain-detail-card{border:1px solid #dbe3ef;border-radius:12px;margin:0 0 12px;overflow:hidden;break-inside:avoid}.domain-detail-head{display:flex;justify-content:space-between;padding:10px 12px;background:#f8fafc}.domain-detail-head h3{margin:2px 0 0}.domain-totals{text-align:right}.domain-totals span,.domain-totals b{display:block}
table{width:100%;border-collapse:collapse}th,td{padding:7px 8px;border-top:1px solid #e7edf5;text-align:left}th{font-size:8px;text-transform:uppercase;color:#64748b;background:#fbfcfe}td.num,th.num{text-align:right}tfoot td{font-weight:700;background:#fbfcfe}.detail-grand-total{display:flex;justify-content:space-between;align-items:center;border-top:3px solid #10213e;padding:12px 4px;margin-top:16px}.detail-grand-total span,.detail-grand-total small{display:block}.detail-grand-total b{font-size:22px}.negative{color:#c62828}.badge{display:inline-block;padding:2px 5px;border-radius:99px;font-size:8px}.badge.ok{background:#eaf8ef;color:#08783d}.badge.warn{background:#fff4dd;color:#955900}
.summary-table{width:100%;margin-bottom:22px}.summary-table th,.summary-table td{padding:9px}.summary-table tbody tr{break-inside:avoid}.summary-total{font-weight:800;background:#f5f7ff}.page-break{break-before:page}.print-section-title{font-size:18px;margin:18px 0 10px}
`;
function printScenarioDetailV36(sid){
  const m=model(sid);if(!m?.s)return;
  const body=`<div class="print-cover"><div><h1>Synthèse FinOps IA</h1><p>Détail du scénario · ${esc(m.s.Nom)}</p></div><div>Édité le ${new Date().toLocaleDateString('fr-FR')}</div></div>${scenarioDetailHtmlV36(m,true)}`;
  printWindowV36(`FinOps - ${m.s.Nom}`,body);
}
function printSynthesisV36(){
  const ids=compareSelectedIds(),ms=ids.map(model).filter(m=>m?.s);
  if(!ms.length){toast('Sélectionne au moins un scénario.',true);return}
  const summary=`<div class="print-cover"><div><h1>Synthèse FinOps IA</h1><p>${ms.length} scénario(s) sélectionné(s)</p></div><div>Édité le ${new Date().toLocaleDateString('fr-FR')}</div></div>
    <h2 class="print-section-title">01 · Synthèse</h2>
    <table class="summary-table"><thead><tr><th>Scénario</th><th>Licences</th><th>Fixe</th><th>Variable</th><th>Budget USD</th><th>Budget EUR</th><th>Économie annuelle</th></tr></thead><tbody>${ms.map(m=>`<tr><td><b>${esc(m.s.Nom)}</b></td><td class="num">${num(m.licenses)}</td><td class="num">${money(m.fixed)}</td><td class="num">${money(m.over)}</td><td class="num"><b>${money(m.total)}</b></td><td class="num">${money(m.total*m.rate,'EUR')}</td><td class="num ${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</td></tr>`).join('')}</tbody></table>
    <div class="page-break"></div><h2 class="print-section-title">02 · Détails des scénarios</h2>${ms.map((m,i)=>`${i?'<div class="page-break"></div>':''}${scenarioDetailHtmlV36(m,true)}`).join('')}`;
  printWindowV36('Synthèse FinOps IA',summary);
}

let ROI_TIER_COUNT=0;
function roiTierCount(m){
  const byDomain={};
  (m.baselineDetails||[]).forEach(r=>(byDomain[r.Domaine]??=[]).push(r));
  const max=Math.max(1,...Object.values(byDomain).map(a=>a.length));
  if(!ROI_TIER_COUNT || ROI_TIER_COUNT<max)ROI_TIER_COUNT=max;
  return ROI_TIER_COUNT;
}
function roiDetailsByDomain(m){
  const out={};
  (m.baselineDetails||[]).forEach(r=>(out[r.Domaine]??=[]).push(r));
  Object.values(out).forEach(a=>a.sort((x,y)=>(+x.Ordre||0)-(+y.Ordre||0)||(+x.id||0)-(+y.id||0)));
  return out;
}
function renderROI(){
  const el=document.getElementById('v-roi'),m=CURRENT;
  const bmap=Object.fromEntries(m.baseline.map(b=>[b.Domaine,b]));
  const details=roiDetailsByDomain(m),tierCount=roiTierCount(m);
  const tierHeads=Array.from({length:tierCount},(_,i)=>`<th>Collaborateurs N-1 #${i+1}</th><th>TJM #${i+1} EUR</th>`).join('');
  const rowsHtml=Object.values(m.bd).map(x=>{
    const b=bmap[x.d.id],tiers=details[x.d.id]||[];
    const tierCells=Array.from({length:tierCount},(_,i)=>{
      const r=tiers[i]||{};
      return `<td class="roi-tier" data-tier="${i}" data-detail-id="${r.id||''}"><input class="admin-input roi-tier-edit" data-f="Nb_Collaborateurs_N_1" type="number" min="0" step="0.1" value="${+r.Nb_Collaborateurs_N_1||0}"></td><td class="roi-tier" data-tier="${i}" data-detail-id="${r.id||''}"><input class="admin-input roi-tier-edit" data-f="TJM_EUR" type="number" min="0" step="1" value="${+r.TJM_EUR||0}"></td>`;
    }).join('');
    return `<tr data-bid="${b?.id||''}" data-domain="${x.d.id}"><td><b>${esc(x.d.Nom)}</b></td>${tierCells}<td><input class="admin-input roi-root-edit" data-f="Jours_Ouvres_Override" type="number" min="0" value="${+b?.Jours_Ouvres_Override||0}" title="0 = utiliser le nombre de jours du scénario"></td><td class="num">${num(x.days)}</td><td class="num">${money(x.baselineAnnual,'EUR')}</td><td class="num">${money(x.eur,'EUR')}</td><td class="num">${money(x.budgetAnnualized,'EUR')}</td><td class="num ${x.savingPeriod<0?'negative':''}">${money(x.savingPeriod,'EUR')}</td><td class="num ${x.savingAnnual<0?'negative':''}"><b>${money(x.savingAnnual,'EUR')}</b></td><td class="num ${x.savingPct<0?'negative':''}">${pct(x.savingPct)}</td><td class="num">${num(x.daysEquivalent)}</td><td class="num">${x.fteEquivalent.toFixed(2).replace('.',',')}</td></tr>`;
  }).join('');
  el.innerHTML=`<div class="kpis roi-kpis"><div class="kpi roi"><div class="v">${money(m.baselineAnnual,'EUR')}</div><div class="l">Baseline N-1 annuelle</div></div><div class="kpi roi"><div class="v">${money(m.budgetAnnualizedEUR,'EUR')}</div><div class="l">Budget licences annualisé</div></div><div class="kpi roi"><div class="v ${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</div><div class="l">Économie annuelle</div></div><div class="kpi roi"><div class="v ${m.savingPct<0?'negative':''}">${pct(m.savingPct)}</div><div class="l">Taux d'économie</div></div></div><article class="card"><div class="cardhead"><div><h3>Baseline N-1 par domaine</h3><p>Chaque domaine peut contenir plusieurs couples Collaborateurs N-1 / TJM sur une seule ligne. Le coût annuel de référence est la somme des collaborateurs × TJM × jours ouvrés.</p></div><div class="table-actions read-only-exempt"><button id="addRoiTier" class="btn secondary">+ Ajouter un TJM</button><button id="removeRoiTier" class="btn secondary">− Retirer le dernier TJM</button><button id="saveAllBaseline" class="btn primary">Enregistrer les modifications</button></div></div><div class="tablewrap roi-tier-table"><table><thead><tr><th>Domaine</th>${tierHeads}<th>Override jours</th><th>Jours effectifs</th><th>Baseline annuelle</th><th>Licences période</th><th>Licences annualisées</th><th>Économie période</th><th>Économie annuelle</th><th>Économie %</th><th>Jours équiv.</th><th>ETP équiv.</th></tr></thead><tbody>${rowsHtml}<tr class="total"><td colspan="${1+tierCount*2+2}">TOTAL</td><td class="num">${money(m.baselineAnnual,'EUR')}</td><td class="num">${money(m.budgetPeriodEUR,'EUR')}</td><td class="num">${money(m.budgetAnnualizedEUR,'EUR')}</td><td class="num ${m.savingPeriod<0?'negative':''}">${money(m.savingPeriod,'EUR')}</td><td class="num ${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</td><td class="num ${m.savingPct<0?'negative':''}">${pct(m.savingPct)}</td><td colspan="2"></td></tr></tbody></table></div></article>`;
  document.getElementById('saveAllBaseline').onclick=saveAllBaselineV24;
  document.getElementById('addRoiTier').onclick=()=>{ROI_TIER_COUNT=tierCount+1;renderROI();applyUILabelsSafe()};
  document.getElementById('removeRoiTier').onclick=()=>{
    if(tierCount<=1){toast("Il faut conserver au moins un couple Collaborateurs / TJM.",true);return}
    const lastHasData=[...document.querySelectorAll(`#v-roi [data-tier="${tierCount-1}"] input`)].some(i=>+i.value>0);
    if(lastHasData&&!confirm("La dernière tranche contient des valeurs. La masquer sans enregistrer ne supprime pas les données. Continuer ?"))return;
    ROI_TIER_COUNT=tierCount-1;renderROI();applyUILabelsSafe();
  };
}
async function saveAllBaselineV24(){
  if(ACCESS.role!=='OWNER'){toast("Modification de la baseline réservée à l'Owner.",true);return}
  const rootActions=[],detailActions=[];
  document.querySelectorAll('#v-roi tr[data-domain]').forEach(tr=>{
    const domain=+tr.dataset.domain,bid=+tr.dataset.bid||0;
    const override=+tr.querySelector('[data-f="Jours_Ouvres_Override"]')?.value||0;
    const rootFields={Scenario:CURRENT.s.id,Domaine:domain,Jours_Ouvres_Override:override};
    rootActions.push(bid?["UpdateRecord",T.baseline,bid,rootFields]:["AddRecord",T.baseline,null,rootFields]);
    const pairs={};
    tr.querySelectorAll('.roi-tier').forEach(td=>{
      const idx=+td.dataset.tier,id=+td.dataset.detailId||0;
      const input=td.querySelector('input'); if(!input)return;
      pairs[idx]??={id};
      if(id)pairs[idx].id=id;
      pairs[idx][input.dataset.f]=+input.value||0;
    });
    Object.entries(pairs).forEach(([idx,p])=>{
      const fields={Scenario:CURRENT.s.id,Domaine:domain,Ordre:(+idx+1)*10,Nb_Collaborateurs_N_1:+p.Nb_Collaborateurs_N_1||0,TJM_EUR:+p.TJM_EUR||0};
      if((fields.Nb_Collaborateurs_N_1>0 || fields.TJM_EUR>0)){
        detailActions.push(p.id?["UpdateRecord",T.baselineDetails,p.id,fields]:["AddRecord",T.baselineDetails,null,fields]);
      }else if(p.id){
        detailActions.push(["RemoveRecord",T.baselineDetails,p.id]);
      }
    });
  });
  try{
    const allActions=[...rootActions,...detailActions];
    if(allActions.length)await apply(allActions);
    await reload();
    toast(`Baseline N-1 enregistrée et calculs actualisés (${detailActions.length} tranche(s) TJM traitée(s)).`);
  }catch(e){toast(e.message||String(e),true)}
}



let PRESIM_SELECTED_ID=0;
let PRESIM_DRAFT=null;
let PRESIM_DRAFT_RESOURCES=[];
let PRESIM_REMOVED_RESOURCE_IDS=[];

function preSimulationRows(){ return D[T.preSim]||[]; }
function preResourceRows(){ return D[T.preRes]||[]; }

function scopedPreSimulations(){
  return preSimulationRows().filter(r=>ACCESS.role==='OWNER'||ACCESS.domainIds.includes(+r.Domaine));
}

function selectedPreSimulation(){
  if(PRESIM_DRAFT) return PRESIM_DRAFT;
  const rows=scopedPreSimulations();
  let r=rows.find(x=>+x.id===+PRESIM_SELECTED_ID);
  if(!r && rows.length){
    r=rows[0];
    PRESIM_SELECTED_ID=+r.id;
  }
  return r||null;
}

function newPreSimulationDraft(){
  const domain=scopedDomains()[0];
  return {
    __draft:true,
    Nom:'Nouvelle pré-simulation',
    Domaine:+domain?.id||0,
    Scenario_Reference:0,
    Statut:'Travail',
    Responsable:'',
    Commentaire:''
  };
}

function newPreResourceDraft(){
  return {
    __draft:true,
    __key:`pres-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    Nom_Ressource:'',
    Profil:'',
    Offre:0,
    Commentaire:'',
    Actif:true
  };
}

function preSimOfferOptions(selected=0){
  const offers=(D[T.offers]||[])
    .filter(o=>o.Actif!==false)
    .slice()
    .sort((a,b)=>{
      const pa=D.providerById[+a.Fournisseur]?.Nom||'';
      const pb=D.providerById[+b.Fournisseur]?.Nom||'';
      return pa.localeCompare(pb,'fr') || String(a.Nom||'').localeCompare(String(b.Nom||''),'fr');
    });
  return `<option value="">— Choisir une offre —</option>`+
    offers.map(o=>{
      const provider=D.providerById[+o.Fournisseur];
      return `<option value="${o.id}" ${+selected===+o.id?'selected':''}>${esc(provider?.Nom||'')} — ${esc(o.Nom||'')}</option>`;
    }).join('');
}

function preSimCurrentResources(fiche){
  if(!fiche) return [];
  const existing=fiche.__draft ? [] : preResourceRows()
    .filter(r=>+r.Pre_Simulation===+fiche.id && !PRESIM_REMOVED_RESOURCE_IDS.includes(+r.id));
  return [...existing,...PRESIM_DRAFT_RESOURCES];
}

function preSimSummary(resources){
  const map=new Map();
  resources.filter(r=>r.Actif!==false && +r.Offre).forEach(r=>{
    const offer=D.offerById[+r.Offre];
    if(!offer) return;
    const provider=D.providerById[+offer.Fournisseur];
    const key=String(offer.id);
    const item=map.get(key)||{provider:provider?.Nom||'',offer:offer.Nom||'',count:0};
    item.count++;
    map.set(key,item);
  });
  return [...map.values()].sort((a,b)=>a.provider.localeCompare(b.provider,'fr')||a.offer.localeCompare(b.offer,'fr'));
}

function renderPreSimulation(){
  const el=document.getElementById('v-presim');
  if(!el) return;

  const fiches=scopedPreSimulations();
  const fiche=selectedPreSimulation();

  if(!fiche){
    el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Pré-simulation nominative</h3>
      <p>Crée une fiche rattachée à un domaine, puis affecte une offre IA à chaque ressource nominative, une personne à la fois.</p>
      </div><button id="newPreSim" class="btn primary">+ Nouvelle pré-simulation</button></div></article>`;
    document.getElementById('newPreSim').onclick=()=>{
      PRESIM_DRAFT=newPreSimulationDraft();
      PRESIM_DRAFT_RESOURCES=[];
      PRESIM_REMOVED_RESOURCE_IDS=[];
      renderPreSimulation();
    };
    return;
  }

  const resources=preSimCurrentResources(fiche);
  const summary=preSimSummary(resources);

  const ficheOptions=fiches.map(x=>
    `<option value="${x.id}" ${!PRESIM_DRAFT&&+x.id===+fiche.id?'selected':''}>${esc(x.Nom||'Sans nom')} — ${esc(D.domainById[+x.Domaine]?.Nom||'')}</option>`
  ).join('');

  const domainOptions=scopedDomains().map(d=>
    `<option value="${d.id}" ${+fiche.Domaine===+d.id?'selected':''}>${esc(d.Nom||'')}</option>`
  ).join('');

  const scenarioOptions=`<option value="">— Aucun / information facultative —</option>`+
    (D[T.scenarios]||[]).slice().sort((a,b)=>(+a.Annee||0)-(+b.Annee||0)||String(a.Nom||'').localeCompare(String(b.Nom||''),'fr'))
      .map(s=>`<option value="${s.id}" ${+fiche.Scenario_Reference===+s.id?'selected':''}>${esc(s.Nom||'')}</option>`).join('');

  const resourceRows=resources.map(r=>{
    const rowKey=r.__draft ? `data-pr-key="${esc(r.__key)}"` : `data-pr-id="${r.id}"`;
    return `<tr ${rowKey}>
      <td><input class="admin-input" data-f="Nom_Ressource" value="${esc(r.Nom_Ressource||'')}" placeholder="Nom ou identifiant"></td>
      <td><input class="admin-input" data-f="Profil" value="${esc(r.Profil||'')}" placeholder="Dev, PO, métier…"></td>
      <td><select class="admin-input" data-f="Offre">${preSimOfferOptions(r.Offre)}</select></td>
      <td><input class="admin-input" data-f="Commentaire" value="${esc(r.Commentaire||'')}"></td>
      <td><input type="checkbox" data-f="Actif" ${r.Actif===false?'':'checked'}></td>
      <td><button class="btn ghost removePreResource">Supprimer</button></td>
    </tr>`;
  }).join('');

  el.innerHTML=`
  <article class="card">
    <div class="cardhead">
      <div><h3>Pré-simulation nominative</h3>
      <p>Le domaine est obligatoire. Le scénario de référence est uniquement informatif : il ne crée ni ne modifie aucune allocation.</p></div>
      <div class="table-actions">
        <select id="preSimSelect" class="admin-input">
          <option value="">Choisir une fiche</option>${ficheOptions}
        </select>
        <button id="newPreSim" class="btn secondary">+ Nouvelle fiche</button>
        <button id="savePreSim" class="btn primary">Enregistrer la fiche</button>
      </div>
    </div>
    <div class="presim-meta">
      <label class="field">Nom de la fiche<input id="psNom" class="admin-input" value="${esc(fiche.Nom||'')}"></label>
      <label class="field">Domaine obligatoire<select id="psDomain" class="admin-input">${domainOptions}</select></label>
      <label class="field">Scénario de référence <small>informatif</small><select id="psScenario" class="admin-input">${scenarioOptions}</select></label>
      <label class="field">Statut<input id="psStatus" class="admin-input" value="${esc(fiche.Statut||'Travail')}"></label>
      <label class="field">Responsable<input id="psOwner" class="admin-input" value="${esc(fiche.Responsable||'')}"></label>
    </div>
    <label class="field presim-comment">Commentaire<textarea id="psComment" class="admin-input" rows="2">${esc(fiche.Commentaire||'')}</textarea></label>
  </article>

  <article class="card">
    <div class="cardhead">
      <div><h3>Ressources nominatives</h3><p>Une ligne = une personne = une décision d'affectation d'offre IA.</p></div>
      <button id="addPreResource" class="btn secondary">+ Ajouter une ressource</button>
    </div>
    <div class="tablewrap"><table>
      <thead><tr><th>Ressource</th><th>Profil</th><th>Offre IA</th><th>Commentaire</th><th>Actif</th><th></th></tr></thead>
      <tbody>${resourceRows||'<tr><td colspan="6">Aucune ressource pour le moment.</td></tr>'}</tbody>
    </table></div>
    <div class="table-actions presim-save"><button id="savePreResources" class="btn primary">Enregistrer les ressources</button></div>
  </article>

  <article class="card">
    <div class="cardhead"><div><h3>Synthèse des licences nominatives</h3>
      <p>Comptage automatique des ressources actives par fournisseur et offre pour cette fiche.</p></div></div>
    <div class="tablewrap"><table>
      <thead><tr><th>Domaine</th><th>Fournisseur</th><th>Offre</th><th>Licences nominatives</th></tr></thead>
      <tbody>${summary.length?summary.map(x=>`<tr>
        <td>${esc(D.domainById[+fiche.Domaine]?.Nom||'')}</td><td>${esc(x.provider)}</td><td>${esc(x.offer)}</td><td class="num"><b>${x.count}</b></td>
      </tr>`).join(''):'<tr><td colspan="4">Aucune offre affectée pour le moment.</td></tr>'}</tbody>
    </table></div>
  </article>`;

  document.getElementById('preSimSelect').onchange=e=>{
    PRESIM_DRAFT=null;
    PRESIM_DRAFT_RESOURCES=[];
    PRESIM_REMOVED_RESOURCE_IDS=[];
    PRESIM_SELECTED_ID=+e.target.value||0;
    renderPreSimulation();
  };
  document.getElementById('newPreSim').onclick=()=>{
    PRESIM_DRAFT=newPreSimulationDraft();
    PRESIM_DRAFT_RESOURCES=[];
    PRESIM_REMOVED_RESOURCE_IDS=[];
    renderPreSimulation();
  };
  document.getElementById('addPreResource').onclick=()=>{
    if(fiche.__draft){
      toast("Enregistre d'abord la fiche avant d'ajouter les ressources.",true);
      return;
    }
    PRESIM_DRAFT_RESOURCES.push(newPreResourceDraft());
    renderPreSimulation();
    const last=el.querySelector('tr[data-pr-key]:last-of-type input[data-f="Nom_Ressource"]');
    last?.focus();
  };
  document.getElementById('savePreSim').onclick=savePreSimulationV28;
  document.getElementById('savePreResources').onclick=savePreResourcesV28;

  el.querySelectorAll('.removePreResource').forEach(btn=>btn.onclick=()=>{
    const tr=btn.closest('tr');
    const id=+tr.dataset.prId||0;
    const key=tr.dataset.prKey||'';
    if(key) PRESIM_DRAFT_RESOURCES=PRESIM_DRAFT_RESOURCES.filter(r=>r.__key!==key);
    if(id) PRESIM_REMOVED_RESOURCE_IDS.push(id);
    renderPreSimulation();
  });
}

function readPreSimulationFields(){
  return {
    Nom:document.getElementById('psNom')?.value.trim()||'',
    Domaine:+document.getElementById('psDomain')?.value||0,
    Scenario_Reference:+document.getElementById('psScenario')?.value||0,
    Statut:document.getElementById('psStatus')?.value.trim()||'Travail',
    Responsable:document.getElementById('psOwner')?.value.trim()||'',
    Commentaire:document.getElementById('psComment')?.value.trim()||''
  };
}

async function savePreSimulationV28(){
  const fiche=selectedPreSimulation();
  const fields=readPreSimulationFields();
  if(!fields.Nom){toast('Le nom de la pré-simulation est obligatoire.',true);return}
  if(!fields.Domaine){toast('Le domaine est obligatoire.',true);return}
  if(!ACCESS.domainIds.includes(fields.Domaine) && ACCESS.role!=='OWNER'){toast("Ce domaine n'est pas autorisé.",true);return}
  try{
    if(fiche.__draft){
      await apply([["AddRecord",T.preSim,null,fields]]);
      PRESIM_DRAFT=null;
      await reload();
      const matches=scopedPreSimulations().filter(x=>x.Nom===fields.Nom&&+x.Domaine===fields.Domaine);
      PRESIM_SELECTED_ID=+(matches.sort((a,b)=>+b.id-+a.id)[0]?.id||0);
    }else{
      await apply([["UpdateRecord",T.preSim,+fiche.id,fields]]);
      await reload();
    }
    toast('Pré-simulation enregistrée.');
  }catch(e){toast(e.message||String(e),true)}
}

async function savePreResourcesV28(){
  const fiche=selectedPreSimulation();
  if(!fiche || fiche.__draft){toast("Enregistre d'abord la fiche de pré-simulation.",true);return}
  const root=document.getElementById('v-presim');
  const actions=[];
  const seenIds=new Set();

  for(const tr of root.querySelectorAll('tbody tr[data-pr-id],tbody tr[data-pr-key]')){
    const id=+tr.dataset.prId||0;
    const fields={
      Pre_Simulation:+fiche.id,
      Nom_Ressource:tr.querySelector('[data-f="Nom_Ressource"]')?.value.trim()||'',
      Profil:tr.querySelector('[data-f="Profil"]')?.value.trim()||'',
      Offre:+tr.querySelector('[data-f="Offre"]')?.value||0,
      Commentaire:tr.querySelector('[data-f="Commentaire"]')?.value.trim()||'',
      Actif:!!tr.querySelector('[data-f="Actif"]')?.checked
    };
    if(!fields.Nom_Ressource){toast('Chaque ressource doit avoir un nom ou un identifiant.',true);return}
    if(!fields.Offre){toast(`Choisis une offre IA pour ${fields.Nom_Ressource}.`,true);return}
    if(id){actions.push(["UpdateRecord",T.preRes,id,fields]);seenIds.add(id)}
    else actions.push(["AddRecord",T.preRes,null,fields]);
  }

  for(const id of [...new Set(PRESIM_REMOVED_RESOURCE_IDS)]) actions.push(["RemoveRecord",T.preRes,id]);

  try{
    if(actions.length) await apply(actions);
    PRESIM_DRAFT_RESOURCES=[];
    PRESIM_REMOVED_RESOURCE_IDS=[];
    await reload();
    toast(`${actions.length} modification(s) de ressources enregistrée(s).`);
  }catch(e){toast(e.message||String(e),true)}
}

let SCENARIO_FILTER={q:'',scenarioId:'',year:'',status:''};
let NEW_SCENARIOS=[];
function scenarioDefaults(){
  const now=new Date();
  return {__draft:true,__key:`draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    Nom:'Nouveau scénario',Annee:now.getFullYear(),Nb_Mois:12,Taux_USD_EUR:.86,
    Taux_Utilisation:1,Nb_Jours_Ouvres_Annuels:218,Statut:'Travail',Commentaire:''};
}

function scenarioUsage(scenarioId){
  const sid=+scenarioId||0;
  const allocations=(D[T.alloc]||[]).filter(r=>+r.Scenario===sid).length;
  const preSimulations=(D[T.preSim]||[]).filter(r=>+r.Scenario_Reference===sid).length;
  const enterprise=(D.Enterprise||D['Enterprise']||[]).filter(r=>+r.Scenario===sid).length;
  const individual=(D.Forfaits_Individuels||D['Forfaits_Individuels']||[]).filter(r=>+r.Scenario===sid).length;
  const baseline=(D[T.baseline]||[]).filter(r=>+r.Scenario===sid).length;
  const baselineDetails=(D[T.baselineDetails]||[]).filter(r=>+r.Scenario===sid).length;
  const simulation=allocations+enterprise+individual;
  const other=baseline+baselineDetails;
  return {
    allocations,preSimulations,enterprise,individual,baseline,baselineDetails,
    simulation,other,total:simulation+preSimulations+other
  };
}
function scenarioUsageReason(scenarioId){
  const u=scenarioUsage(scenarioId),parts=[];
  if(u.allocations)parts.push(`${u.allocations} allocation(s)`);
  if(u.enterprise)parts.push(`${u.enterprise} ligne(s) Enterprise historique`);
  if(u.individual)parts.push(`${u.individual} forfait(s) individuel(s)`);
  if(u.preSimulations)parts.push(`${u.preSimulations} pré-simulation(s) nominative(s)`);
  if(u.baseline||u.baselineDetails)parts.push(`${u.baseline+u.baselineDetails} donnée(s) ROI / baseline`);
  return parts.join(' · ');
}
function canDeleteScenario(scenarioId){
  return scenarioUsage(scenarioId).total===0;
}
async function deleteScenarioV35(scenarioId){
  const s=(D[T.scenarios]||[]).find(x=>+x.id===+scenarioId);
  if(!s)return;
  const usage=scenarioUsage(scenarioId);
  if(usage.total){
    toast(`Suppression impossible : ${scenarioUsageReason(scenarioId)}.`,true);
    return;
  }
  if(!canEditView('scenarios')){
    toast(readOnlyMessage(),true);
    return;
  }
  if(!confirm(`Supprimer définitivement le scénario "${s.Nom||scenarioId}" ?\n\nIl n'est rattaché à aucune simulation, pré-simulation nominative ni donnée ROI.`))return;
  try{
    await apply([["RemoveRecord",T.scenarios,+scenarioId]]);
    if(+selectedScenario()?.id===+scenarioId)PRESIM_SELECTED_ID=0;
    SCENARIO_FILTER.scenarioId='';
    await reload();
    toast('Scénario supprimé.');
  }catch(e){
    toast(`Suppression impossible : ${e.message||String(e)}`,true);
  }
}


function scenarioRowHtml(s){
  const draft=!!s.__draft;
  const attrs=draft?`data-draft="1" data-new-scenario="${esc(s.__key)}"`:`data-s="${s.id}"`;
  let action='';
  if(draft){
    action=`<button class="btn ghost cancelScenarioDraft" data-key="${esc(s.__key)}">Annuler</button>`;
  }else{
    const usage=scenarioUsage(s.id);
    if(usage.total){
      action=`<button type="button" class="btn ghost small scenario-delete blocked" data-delete-scenario="${s.id}" disabled title="${esc('Suppression impossible : '+scenarioUsageReason(s.id))}">🔒 Utilisé</button>`;
    }else{
      action=`<button type="button" class="btn danger small scenario-delete" data-delete-scenario="${s.id}" title="Supprimer ce scénario non utilisé">Supprimer</button>`;
    }
  }
  return `<tr ${attrs}>
    <td><input class="admin-input" data-f="Nom" value="${esc(s.Nom)}"></td>
    <td><input class="admin-input" data-f="Annee" type="number" value="${+s.Annee||0}"></td>
    <td><input class="admin-input" data-f="Nb_Mois" type="number" min="1" max="12" value="${+s.Nb_Mois||0}"></td>
    <td><input class="admin-input" data-f="Taux_USD_EUR" type="number" step="0.001" value="${+s.Taux_USD_EUR||0}"></td>
    <td><input class="admin-input" data-f="Taux_Utilisation" type="number" step="0.05" min="0" value="${+s.Taux_Utilisation||0}"></td>
    <td><input class="admin-input" data-f="Nb_Jours_Ouvres_Annuels" type="number" min="1" value="${+s.Nb_Jours_Ouvres_Annuels||218}"></td>
    <td><input class="admin-input" data-f="Statut" value="${esc(s.Statut||'')}"></td>
    <td class="scenario-action">${action}</td>
  </tr>`;
}

function renderScenarios(){
  const el=document.getElementById('v-scenarios');
  if(!el)return;

  const allExisting=(D[T.scenarios]||[]).slice().sort((a,b)=>
    (+b.Annee||0)-(+a.Annee||0) || String(a.Nom||'').localeCompare(String(b.Nom||''),'fr')
  );

  const years=[...new Set(allExisting.map(s=>String(s.Annee||'')).filter(Boolean))].sort((a,b)=>+b-+a);
  const statuses=[...new Set(allExisting.map(s=>String(s.Statut||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));

  const q=String(SCENARIO_FILTER.q||'').trim().toLowerCase();
  const filtered=allExisting.filter(s=>{
    const text=[s.Nom,s.Annee,s.Statut,s.Commentaire].map(v=>String(v||'').toLowerCase()).join(' ');
    const okQ=!q || text.includes(q);
    const okScenario=!SCENARIO_FILTER.scenarioId || String(s.id)===String(SCENARIO_FILTER.scenarioId);
    const okYear=!SCENARIO_FILTER.year || String(s.Annee||'')===String(SCENARIO_FILTER.year);
    const okStatus=!SCENARIO_FILTER.status || String(s.Statut||'')===String(SCENARIO_FILTER.status);
    return okQ && okScenario && okYear && okStatus;
  });

  const rows=[...filtered,...NEW_SCENARIOS];

  el.innerHTML=`<article class="card">
    <div class="cardhead">
      <div>
        <h3>Scénarios</h3>
        <p>Modifie, ajoute ou supprime les scénarios non utilisés. Un scénario rattaché à une simulation, une pré-simulation nominative ou des données ROI est protégé.</p>
      </div>
      <div class="table-actions">
        <button id="saveScenarios" class="btn primary">Enregistrer les modifications</button>
        <button id="addScenario" class="btn secondary">+ Nouveau</button>
      </div>
    </div>

    <div class="scenario-filters read-only-exempt">
      <label class="scenario-search">
        <span>Rechercher</span>
        <input id="scenarioSearch" class="admin-input" type="search"
          placeholder="Nom, année, statut, commentaire…"
          value="${esc(SCENARIO_FILTER.q||'')}">
      </label>

      <label>
        <span>Scénario</span>
        <select id="scenarioIdFilter" class="admin-input">
          <option value="">Tous les scénarios</option>
          ${allExisting.map(s=>`<option value="${s.id}" ${String(SCENARIO_FILTER.scenarioId)===String(s.id)?'selected':''}>${esc(s.Nom||'Sans nom')}</option>`).join('')}
        </select>
      </label>

      <label>
        <span>Année</span>
        <select id="scenarioYearFilter" class="admin-input">
          <option value="">Toutes les années</option>
          ${years.map(y=>`<option value="${esc(y)}" ${String(SCENARIO_FILTER.year)===y?'selected':''}>${esc(y)}</option>`).join('')}
        </select>
      </label>

      <label>
        <span>Statut</span>
        <select id="scenarioStatusFilter" class="admin-input">
          <option value="">Tous les statuts</option>
          ${statuses.map(s=>`<option value="${esc(s)}" ${String(SCENARIO_FILTER.status)===s?'selected':''}>${esc(s)}</option>`).join('')}
        </select>
      </label>

      <div class="scenario-filter-actions">
        <button id="resetScenarioFilters" class="btn ghost" type="button">Réinitialiser</button>
        <span class="scenario-count">${filtered.length} scénario(s) affiché(s) sur ${allExisting.length}</span>
      </div>
    </div>

    <div class="tablewrap"><table>
      <thead><tr>
        <th>Nom</th><th>Année</th><th>Mois</th><th>USD/EUR</th><th>Utilisation</th><th>Jours ouvrés/an</th><th>Statut</th><th></th>
      </tr></thead>
      <tbody>
        ${rows.length ? rows.map(s=>scenarioRowHtml(s)).join('') : `
          <tr><td colspan="8" class="empty-state">Aucun scénario ne correspond aux filtres.</td></tr>
        `}
      </tbody>
    </table></div>
  </article>`;

  document.getElementById('saveScenarios').onclick=saveAllScenariosV26;

  el.querySelectorAll('.scenario-delete:not(.blocked)').forEach(btn=>{
    btn.onclick=()=>deleteScenarioV35(+btn.dataset.deleteScenario);
  });

  document.getElementById('addScenario').onclick=()=>{
    NEW_SCENARIOS.push(scenarioDefaults());
    renderScenarios();
    const last=el.querySelector('tr[data-new-scenario]:last-of-type input[data-f="Nom"]');
    last?.focus();
    last?.select();
  };

  const updateFilters=()=>{
    SCENARIO_FILTER={
      q:document.getElementById('scenarioSearch')?.value||'',
      scenarioId:document.getElementById('scenarioIdFilter')?.value||'',
      year:document.getElementById('scenarioYearFilter')?.value||'',
      status:document.getElementById('scenarioStatusFilter')?.value||''
    };
    renderScenarios();
  };

  document.getElementById('scenarioSearch')?.addEventListener('input',()=>{
    SCENARIO_FILTER.q=document.getElementById('scenarioSearch').value||'';
    renderScenarios();
    const search=document.getElementById('scenarioSearch');
    search?.focus();
    if(search) search.setSelectionRange(search.value.length,search.value.length);
  });
  document.getElementById('scenarioIdFilter')?.addEventListener('change',updateFilters);
  document.getElementById('scenarioYearFilter')?.addEventListener('change',updateFilters);
  document.getElementById('scenarioStatusFilter')?.addEventListener('change',updateFilters);
  document.getElementById('resetScenarioFilters')?.addEventListener('click',()=>{
    SCENARIO_FILTER={q:'',scenarioId:'',year:'',status:''};
    renderScenarios();
  });

  el.querySelectorAll('[data-cancel-new-scenario]').forEach(btn=>btn.onclick=()=>{
    const key=btn.dataset.cancelNewScenario;
    NEW_SCENARIOS=NEW_SCENARIOS.filter(s=>String(s.__key)!==String(key));
    renderScenarios();
  });
}

async function saveAllScenariosV26(){
  const root=document.getElementById('v-scenarios'),actions=[];
  for(const tr of root.querySelectorAll('tbody tr')){
    const fields=readFields(tr);
    if(!String(fields.Nom||'').trim()){toast('Le nom du scénario est obligatoire.',true);return}
    if((+fields.Nb_Mois||0)<1){toast('Le nombre de mois doit être supérieur à 0.',true);return}
    if(tr.dataset.s) actions.push(["UpdateRecord",T.scenarios,+tr.dataset.s,fields]);
    else if(tr.dataset.draft) actions.push(["AddRecord",T.scenarios,null,{...fields,Commentaire:''}]);
  }
  if(!actions.length){toast('Aucun scénario à enregistrer.');return}
  try{
    await apply(actions);
    NEW_SCENARIOS=[];
    await reload();
    toast(`${actions.length} scénario(s) enregistré(s).`);
  }catch(e){
    // Keep drafts visible so the user does not lose typed values.
    if(String(e?.message||e).toLowerCase().includes('permission')){
      toast("Création refusée par les règles d'accès Grist. Applique la règle Scenarios +CRU de la V26.",true);
    }
  }
}

async function saveGenericRow(sel,table,id){const tr=document.querySelector(sel);if(!tr)return;await apply([["UpdateRecord",table,id,readFields(tr)]]);toast('Enregistré.');await reload()}
function ynBadge(v){return `<span class="badge ${v==='Oui'?'ok':v==='Non'?'no':'warn'}">${esc(v||'A confirmer')}</span>`}

const OFFER_COLUMNS=[
  {key:'Fournisseur',label:'Fournisseur',kind:'ref-provider'},
  {key:'Nom',label:'Nom',kind:'text'},{key:'Code',label:'Code',kind:'text'},{key:'Famille',label:'Famille',kind:'text'},
  {key:'Periodicite_Prix',label:'Périodicité',kind:'text'},{key:'Devise',label:'Devise',kind:'text'},
  {key:'Tarif_Catalogue_Mensuel',label:'Catalogue / mois',kind:'money'},{key:'Tarif_Catalogue_Annuel',label:'Catalogue / an',kind:'money'},
  {key:'Tarif_Reference_Mensuel',label:'Référence / mois',kind:'money'},{key:'Tarif_Reference_Annuel',label:'Référence / an',kind:'money'},
  {key:'Tarif_Negocie_Mensuel',label:'Négocié / mois',kind:'money'},{key:'Tarif_Negocie_Annuel',label:'Négocié / an',kind:'money'},
  {key:'Enveloppe_Usage_Incluse_Mois_Licence',label:'Usage inclus / mois / licence',kind:'money'},
  {key:'Usage_Inclus_Description',label:'Description usage inclus',kind:'text-long'},
  {key:'Overage_Disponible',label:'Overage disponible',kind:'bool'},{key:'Facturer_Engagement_Minimum',label:'Facturer engagement minimum',kind:'bool'},
  {key:'Engagement_Defaut_Mois',label:'Engagement par défaut (mois)',kind:'int'},{key:'Mois_Factures_Defaut',label:'Mois facturés par défaut',kind:'int'},
  {key:'Compatible_Devis',label:'Compatible devis',kind:'bool'},{key:'Compatible_PO',label:'Compatible PO',kind:'bool'},
  {key:'Compatible_Facture',label:'Compatible facture',kind:'bool'},{key:'Compatible_Virement',label:'Compatible virement',kind:'bool'},
  {key:'Compatible_Prepaiement',label:'Compatible prépaiement',kind:'bool'},{key:'Statut_Tarif',label:'Statut tarif',kind:'text'},
  {key:'Source_Tarif',label:'Source tarif',kind:'text-long'},{key:'Note_Procurement',label:'Note procurement',kind:'text-long'},{key:'Actif',label:'Actif',kind:'bool'}
];
function offerColumnConfig(view){
  const rows=D[T.offerCols]||[],byKey=new Map(rows.map(r=>[r.Cle_Colonne,r]));
  return OFFER_COLUMNS.map((c,i)=>{
    const r=byKey.get(c.key);
    const viewOrder=view==='read'?r?.Ordre_Lecture:r?.Ordre_Admin;
    const fallbackOrder=r?.Ordre;
    const order=Number.isFinite(+viewOrder)?+viewOrder:(Number.isFinite(+fallbackOrder)?+fallbackOrder:i*10);
    return {...c,label:(r?.Libelle||c.label),order,visible:view==='read'?(r?r.Visible_Lecture!==false:true):(r?r.Visible_Admin!==false:true)}
  }).sort((a,b)=>a.order-b.order||String(a.label).localeCompare(String(b.label),'fr'))
}
function offerVisibleColumns(view){return offerColumnConfig(view).filter(c=>c.visible)}
function offerCellRead(o,c){const v=o[c.key];if(c.kind==='ref-provider')return esc(D.providerById[v]?.Nom||'');if(c.kind==='money')return +v?money(v):'—';if(c.kind==='bool')return ynBadge(v);if(c.kind==='int')return num(+v||0);if(c.key==='Statut_Tarif')return v==='Devis à confirmer'?'<span class="badge warn">Devis à confirmer</span>':`<span class="badge ok">${esc(v||'')}</span>`;return esc(v??'')}
function offerCellAdmin(o,c,providers){const v=o[c.key];if(c.kind==='ref-provider'){const opts=providers.map(p=>`<option value="${p.id}" ${+v===+p.id?'selected':''}>${esc(p.Nom)}</option>`).join('');return `<select class="admin-input" data-f="${c.key}"><option value="">—</option>${opts}</select>`}if(c.kind==='bool')return `<input data-f="${c.key}" type="checkbox" ${v!==false?'checked':''}>`;if(c.kind==='money')return `<input class="admin-input" data-f="${c.key}" type="number" step="0.01" value="${+v||0}">`;if(c.kind==='int')return `<input class="admin-input" data-f="${c.key}" type="number" min="0" step="1" value="${+v||0}">`;if(c.kind==='text-long')return `<textarea class="admin-input admin-textarea" data-f="${c.key}">${esc(v||'')}</textarea>`;if(c.key==='Periodicite_Prix')return `<select class="admin-input" data-f="${c.key}"><option ${v==='Mensuel'?'selected':''}>Mensuel</option><option ${v==='Annuel'?'selected':''}>Annuel</option><option ${v==='Devis'?'selected':''}>Devis</option></select>`;return `<input class="admin-input" data-f="${c.key}" value="${esc(v||'')}">`}

function canSaveOfferColumnView(){
  return isOwner() || ACCESS.role===APP_ROLES.ADMINISTRATEUR;
}
function columnPickerHtml(view){
  const cols=offerColumnConfig(view);
  return `<details class="column-picker read-only-exempt">
    <summary class="btn secondary">Colonnes</summary>
    <div class="column-picker-panel">
      <div class="column-picker-help">Sélectionne les colonnes puis utilise ↑ / ↓ pour définir leur ordre dans cette vue.</div>
      <div class="column-order-list" data-col-order-list="${view}">
        ${cols.map((c,i)=>`<div class="column-order-row" data-order-key="${c.key}">
          <label class="column-order-label">
            <input type="checkbox" data-col-view="${view}" data-col-key="${c.key}" ${c.visible?'checked':''}>
            <span>${esc(c.label)}</span>
          </label>
          <div class="column-order-actions">
            <button type="button" class="mini-btn" data-col-up="${view}" data-col-key="${c.key}" ${i===0?'disabled':''} title="Monter la colonne">↑</button>
            <button type="button" class="mini-btn" data-col-down="${view}" data-col-key="${c.key}" ${i===cols.length-1?'disabled':''} title="Descendre la colonne">↓</button>
          </div>
        </div>`).join('')}
      </div>
      <div class="column-picker-actions">
        <button class="btn small secondary" data-col-all="${view}">Tout afficher</button>
        <button class="btn small secondary" data-col-none="${view}">Tout masquer</button>
        ${canSaveOfferColumnView()?`<button class="btn small primary" data-col-save="${view}">Enregistrer la vue</button>`:
          `<span class="column-save-note">Personnalisation locale uniquement</span>`}
      </div>
    </div>
  </details>`;
}
function currentColumnOrder(view){
  return [...document.querySelectorAll(`[data-col-order-list="${view}"] .column-order-row`)].map((row,i)=>({
    key:row.dataset.orderKey,
    order:i*10
  }));
}
function refreshColumnOrderButtons(view){
  const rows=[...document.querySelectorAll(`[data-col-order-list="${view}"] .column-order-row`)];
  rows.forEach((row,i)=>{
    const up=row.querySelector(`[data-col-up="${view}"]`);
    const down=row.querySelector(`[data-col-down="${view}"]`);
    if(up)up.disabled=i===0;
    if(down)down.disabled=i===rows.length-1;
  });
}
function moveColumnOrder(view,key,delta){
  const list=document.querySelector(`[data-col-order-list="${view}"]`);
  const row=list?.querySelector(`.column-order-row[data-order-key="${CSS.escape(key)}"]`);
  if(!list||!row)return;
  const rows=[...list.querySelectorAll('.column-order-row')];
  const idx=rows.indexOf(row),next=idx+delta;
  if(next<0||next>=rows.length)return;
  if(delta<0)list.insertBefore(row,rows[next]);
  else list.insertBefore(rows[next],row);
  refreshColumnOrderButtons(view);
  applyColumnOrderLocally(view);
}
function bindColumnPicker(view){
  document.querySelectorAll(`[data-col-view="${view}"]`).forEach(cb=>cb.onchange=()=>applyColumnVisibilityLocally(view));
  document.querySelector(`[data-col-all="${view}"]`)?.addEventListener('click',e=>{
    e.preventDefault();
    document.querySelectorAll(`[data-col-view="${view}"]`).forEach(x=>x.checked=true);
    applyColumnVisibilityLocally(view);
  });
  document.querySelector(`[data-col-none="${view}"]`)?.addEventListener('click',e=>{
    e.preventDefault();
    document.querySelectorAll(`[data-col-view="${view}"]`).forEach(x=>x.checked=false);
    applyColumnVisibilityLocally(view);
  });
  document.querySelectorAll(`[data-col-up="${view}"]`).forEach(b=>b.addEventListener('click',e=>{
    e.preventDefault();moveColumnOrder(view,b.dataset.colKey,-1);
  }));
  document.querySelectorAll(`[data-col-down="${view}"]`).forEach(b=>b.addEventListener('click',e=>{
    e.preventDefault();moveColumnOrder(view,b.dataset.colKey,1);
  }));
  document.querySelector(`[data-col-save="${view}"]`)?.addEventListener('click',async e=>{
    e.preventDefault();
    await saveOfferColumnView(view);
  });
}
function applyColumnVisibilityLocally(view){
  const checked=new Set([...document.querySelectorAll(`[data-col-view="${view}"]:checked`)].map(x=>x.dataset.colKey));
  const root=document.getElementById(view==='read'?'v-offers':'v-offersadmin');
  root?.querySelectorAll('[data-col]').forEach(el=>el.style.display=checked.has(el.dataset.col)?'':'none');
}
function applyColumnOrderLocally(view){
  const root=document.getElementById(view==='read'?'v-offers':'v-offersadmin');
  const table=root?.querySelector('table');
  if(!table)return;
  const order=currentColumnOrder(view).map(x=>x.key);
  const head=table.querySelector('thead tr');
  const bodyRows=[...table.querySelectorAll('tbody tr')];

  order.forEach(key=>{
    const th=head?.querySelector(`th[data-col="${CSS.escape(key)}"]`);
    if(th)head.appendChild(th);
    bodyRows.forEach(tr=>{
      const td=tr.querySelector(`td[data-col="${CSS.escape(key)}"]`);
      if(td)tr.appendChild(td);
    });
  });

  // Keep the admin action column at the end.
  const actionHead=head?.querySelector('th:not([data-col])');
  if(actionHead)head.appendChild(actionHead);
  bodyRows.forEach(tr=>{
    const action=tr.querySelector('td.row-action');
    if(action)tr.appendChild(action);
  });
}
async function saveOfferColumnView(view){
  if(!canSaveOfferColumnView()){
    toast("Votre rôle ne permet pas d'enregistrer une configuration de colonnes partagée.",true);
    return;
  }

  const state=new Map([...document.querySelectorAll(`[data-col-view="${view}"]`)].map(x=>[x.dataset.colKey,x.checked]));
  const order=new Map(currentColumnOrder(view).map(x=>[x.key,x.order]));
  const existing=new Map((D[T.offerCols]||[]).map(r=>[r.Cle_Colonne,r]));
  const actions=[];

  OFFER_COLUMNS.forEach((c,i)=>{
    const r=existing.get(c.key);
    const orderField=view==='read'?'Ordre_Lecture':'Ordre_Admin';
    const visibleField=view==='read'?'Visible_Lecture':'Visible_Admin';
    const fields={
      Libelle:r?.Libelle||c.label,
      [orderField]:order.has(c.key)?order.get(c.key):i*10,
      [visibleField]:!!state.get(c.key)
    };

    if(r){
      actions.push(['UpdateRecord',T.offerCols,r.id,fields]);
    }else{
      actions.push(['AddRecord',T.offerCols,null,{
        Cle_Colonne:c.key,
        Libelle:c.label,
        Ordre:i*10,
        Ordre_Lecture:view==='read'?(order.get(c.key)??i*10):i*10,
        Ordre_Admin:view==='admin'?(order.get(c.key)??i*10):i*10,
        Visible_Lecture:view==='read'?!!state.get(c.key):true,
        Visible_Admin:view==='admin'?!!state.get(c.key):true
      }]);
    }
  });

  try{
    await apply(actions);
    toast('Vue enregistrée : visibilité et ordre des colonnes sauvegardés.');
    await reload();
  }catch(e){
    toast(e.message||String(e),true);
  }
}

function serviceOfferRowsHtml(edit=false){const view=edit?'admin':'read',cols=offerVisibleColumns(view),providers=D[T.providers].filter(p=>p.Actif!==false).sort((a,b)=>String(a.Nom||'').localeCompare(String(b.Nom||''),'fr'));return D[T.offers].slice().sort((a,b)=>{const pa=D.providerById[a.Fournisseur]?.Nom||'',pb=D.providerById[b.Fournisseur]?.Nom||'';return pa.localeCompare(pb,'fr')||String(a.Nom||'').localeCompare(String(b.Nom||''),'fr')}).map(o=>edit?offerAdminRow(o,providers,cols):offerReadOnlyRow(o,cols)).join('')}
function offerReadOnlyRow(o,cols=offerVisibleColumns('read')){return `<tr>${cols.map(c=>`<td data-col="${c.key}">${offerCellRead(o,c)}</td>`).join('')}</tr>`}
function renderOffersReadOnly(){const el=document.getElementById('v-offers');if(!el)return;const cols=offerVisibleColumns('read');el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Offre de service</h3><p>Lecture seule de la table Grist <b>Offres</b>. Même jeu de colonnes que l'écran de paramétrage.</p></div><div>${columnPickerHtml('read')}</div></div><div class="tablewrap service-offers-table"><table><thead><tr>${cols.map(c=>`<th data-col="${c.key}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${serviceOfferRowsHtml(false)}</tbody></table></div></article>`;bindColumnPicker('read')}
function offerAdminRow(o={},providers=[],cols=offerVisibleColumns('admin')){const isNew=!o.id,id=o.id||'';return `<tr data-o="${id}" data-new="${isNew?'1':'0'}">${cols.map(c=>`<td data-col="${c.key}">${offerCellAdmin(o,c,providers)}</td>`).join('')}<td class="row-action"><button class="btn danger small offer-delete">${isNew?'Annuler':'Supprimer'}</button></td></tr>`}
function renderOffersAdmin(){const el=document.getElementById('v-offersadmin');if(!el)return;const providers=D[T.providers].filter(p=>p.Actif!==false).sort((a,b)=>String(a.Nom||'').localeCompare(String(b.Nom||''),'fr')),cols=offerVisibleColumns('admin');el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Paramétrage offre de service</h3><p>Édition de la même table Grist <b>Offres</b> et du même dictionnaire de colonnes que la vue en lecture.</p></div><div class="table-actions">${columnPickerHtml('admin')}<button id="newOffer" class="btn secondary">+ Nouvelle offre</button><button id="saveAllOffers" class="btn primary">Enregistrer les modifications</button></div></div><div class="offer-schema-note"><b>Une seule source de vérité :</b> les deux écrans lisent exactement les mêmes colonnes de <code>Offres</code>. Seul le mode d'affichage change : lecture ou édition.</div><div class="tablewrap service-offers-admin"><table><thead><tr>${cols.map(c=>`<th data-col="${c.key}">${esc(c.label)}</th>`).join('')}<th></th></tr></thead><tbody id="offersAdminBody">${D[T.offers].map(o=>offerAdminRow(o,providers,cols)).join('')}</tbody></table></div></article>`;document.getElementById('newOffer').onclick=()=>{document.getElementById('offersAdminBody').insertAdjacentHTML('beforeend',offerAdminRow({Actif:true,Devise:'USD',Periodicite_Prix:'Mensuel',Overage_Disponible:false,Facturer_Engagement_Minimum:false,Compatible_Devis:false,Compatible_PO:false,Compatible_Facture:false,Compatible_Virement:false,Compatible_Prepaiement:false},providers,cols));bindOfferDeleteButtons()};document.getElementById('saveAllOffers').onclick=saveAllOffersV22;bindOfferDeleteButtons();bindColumnPicker('admin')}
function bindOfferDeleteButtons(){document.querySelectorAll('#offersAdminBody .offer-delete').forEach(btn=>btn.onclick=async()=>{const tr=btn.closest('tr');if(tr.dataset.new==='1'){tr.remove();return}const id=+tr.dataset.o,offer=D[T.offers].find(o=>+o.id===id);if(!confirm(`Supprimer l'offre "${offer?.Nom||id}" ?\n\nLa suppression échouera si cette offre est encore référencée dans des allocations.`))return;try{await apply([['RemoveRecord',T.offers,id]]);toast('Offre supprimée.');await reload()}catch(e){toast('Suppression impossible : '+(e.message||String(e)),true)}})}
async function saveAllOffersV22(){const actions=[];let invalid=false;const codes=[];document.querySelectorAll('#offersAdminBody tr').forEach(tr=>{const id=+tr.dataset.o||0,original=id?(D[T.offers].find(o=>+o.id===id)||{}):{},fields={...original};tr.querySelectorAll('[data-f]').forEach(el=>{const k=el.dataset.f;if(el.type==='checkbox')fields[k]=el.checked;else if(el.type==='number')fields[k]=Number(el.value||0);else fields[k]=el.value});delete fields.id;fields.Fournisseur=+fields.Fournisseur||0;fields.Nom=String(fields.Nom||'').trim();fields.Code=String(fields.Code||'').trim();fields.Famille=String(fields.Famille||'').trim();fields.Devise=String(fields.Devise||'USD').trim()||'USD';fields.Statut_Tarif=String(fields.Statut_Tarif||'').trim();fields.Source_Tarif=String(fields.Source_Tarif||'').trim();fields.Note_Procurement=String(fields.Note_Procurement||'').trim();fields.Usage_Inclus_Description=String(fields.Usage_Inclus_Description||'').trim();if(!fields.Fournisseur||!fields.Nom||!fields.Code){invalid=true;if(!fields.Nom)tr.querySelector('[data-f="Nom"]')?.classList.add('input-error');if(!fields.Code)tr.querySelector('[data-f="Code"]')?.classList.add('input-error');if(!fields.Fournisseur)tr.querySelector('[data-f="Fournisseur"]')?.classList.add('input-error');return}codes.push(fields.Code.toLocaleLowerCase());actions.push(id?['UpdateRecord',T.offers,id,fields]:['AddRecord',T.offers,null,fields])});if(invalid){toast('Fournisseur, nom et code sont obligatoires pour chaque offre.',true);return}if(new Set(codes).size!==codes.length){toast('Deux offres utilisent le même code.',true);return}if(!actions.length){toast('Aucune modification à enregistrer.');return}try{await apply(actions);toast('Offre de service enregistrée.');await reload()}catch(e){toast(e.message||String(e),true)}}

function renderDomainsAdmin(){
  const el=document.getElementById('v-domains');
  el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Domaines</h3><p>Créer, activer/désactiver et maintenir les domaines de référence.</p></div><div class="table-actions"><button id="newDomain" class="btn secondary">+ Nouveau domaine</button><button id="saveAllDomains" class="btn primary">Enregistrer les modifications</button></div></div><div class="tablewrap"><table><thead><tr><th>Nom</th><th>Responsable</th><th>Actif</th><th></th></tr></thead><tbody id="domainsBody">${D[T.domains].map(r=>domainAdminRow(r)).join('')}</tbody></table></div></article>`;
  document.getElementById('newDomain').onclick=addDomainDraft;
  document.getElementById('saveAllDomains').onclick=saveAllDomainsV17;
  bindDomainDeleteButtons();
}
function domainAdminRow(r={}){
  const id=r.id||'',isNew=!r.id;
  return `<tr data-r="${id}" data-new="${isNew?'1':'0'}"><td><input class="admin-input" data-f="Nom" value="${esc(r.Nom||'')}" placeholder="Nom du domaine"></td><td><input class="admin-input" data-f="Responsable" value="${esc(r.Responsable||'')}" placeholder="Responsable"></td><td><input data-f="Actif" type="checkbox" ${r.Actif!==false?'checked':''}></td><td><button class="btn danger small domain-delete" title="${isNew?'Annuler':'Supprimer'}">${isNew?'Annuler':'Supprimer'}</button></td></tr>`;
}
function addDomainDraft(){
  const tbody=document.getElementById('domainsBody');
  tbody.insertAdjacentHTML('beforeend',domainAdminRow({Actif:true}));
  bindDomainDeleteButtons();
  const rows=tbody.querySelectorAll('tr');
  rows[rows.length-1]?.querySelector('[data-f="Nom"]')?.focus();
}
function bindDomainDeleteButtons(){
  document.querySelectorAll('#domainsBody .domain-delete').forEach(btn=>btn.onclick=async()=>{
    const tr=btn.closest('tr');
    if(tr.dataset.new==='1'){tr.remove();return}
    const id=+tr.dataset.r;
    const domain=D[T.domains].find(d=>+d.id===id);
    if(!confirm(`Supprimer le domaine "${domain?.Nom||id}" ?\n\nLa suppression échouera si des références existent encore dans Grist.`))return;
    try{
      await apply([["RemoveRecord",T.domains,id]]);
      toast("Domaine supprimé.");
      await boot();
    }catch(e){toast("Suppression impossible : "+(e.message||String(e)),true)}
  });
}
async function saveAllDomainsV17(){
  const actions=[];
  let invalid=false;
  document.querySelectorAll('#domainsBody tr').forEach(tr=>{
    const id=+tr.dataset.r||0;
    const fields=readFields(tr,'[data-f]');
    fields.Nom=String(fields.Nom||'').trim();
    fields.Responsable=String(fields.Responsable||'').trim();
    if(!fields.Nom){invalid=true;tr.querySelector('[data-f="Nom"]')?.classList.add('input-error');return}
    actions.push(id?["UpdateRecord",T.domains,id,fields]:["AddRecord",T.domains,null,fields]);
  });
  if(invalid){toast("Chaque domaine doit avoir un nom.",true);return}
  const names=[...document.querySelectorAll('#domainsBody [data-f="Nom"]')].map(x=>x.value.trim().toLocaleLowerCase('fr'));
  if(new Set(names).size!==names.length){toast("Deux domaines portent le même nom.",true);return}
  if(!actions.length){toast("Aucune modification à enregistrer.");return}
  try{
    await apply(actions);
    toast("Domaines enregistrés.");
    await boot();
  }catch(e){toast(e.message||String(e),true)}
}

function renderMenuAdmin(){
  const el=document.getElementById('v-menuadmin');if(!el)return;
  const rows=menuConfigAllRows();
  el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Configuration du menu <span class="badge ok">V14</span></h3><p>Configuration globale stockée dans Grist. Tu peux changer l’ordre, le libellé, l’activation et le niveau d’accès de chaque onglet, puis enregistrer l’ensemble. Cet écran est réservé à l’Owner.</p></div><div class="table-actions"><button id="saveMenuConfig" class="btn primary">Enregistrer les modifications</button><button id="resetMenuConfig" class="btn secondary">Ordre et noms par défaut</button></div></div><div class="tablewrap"><table class="menu-admin-table"><thead><tr><th class="drag-col"></th><th>Item technique</th><th>Libellé affiché</th><th>Actif</th><th>Accès</th></tr></thead><tbody id="menuAdminBody">${rows.map(r=>`<tr draggable="true" data-menu-id="${r.id||''}" data-menu-key="${esc(r.Cle)}"><td class="menu-row-grip" title="Déplacer">⋮⋮</td><td><code>${esc(r.Cle)}</code></td><td><input class="admin-input" data-f="Libelle" value="${esc(r.Libelle||DEFAULT_MENU_LABELS[r.Cle]||r.Cle)}" maxlength="60"></td><td><input data-f="Actif" type="checkbox" ${r.Actif!==false?'checked':''}></td><td><select class="admin-input menu-access-select" data-f="Owner_Seulement"><option value="false" ${!r.Owner_Seulement?'selected':''}>Utilisateurs autorisés</option><option value="true" ${r.Owner_Seulement?'selected':''}>Owner uniquement</option></select></td></tr>`).join('')}</tbody></table></div><div class="menu-admin-note">La visibilité métier reste contrôlée par les droits de l’application et les Access Rules Grist. Désactiver un item ici le masque globalement.</div></article>`;
  initMenuAdminSorting();
  document.getElementById('saveMenuConfig').onclick=saveMenuConfig;
  document.getElementById('resetMenuConfig').onclick=resetMenuConfigDraft;
}
function initMenuAdminSorting(){
  const tbody=document.getElementById('menuAdminBody');if(!tbody)return;
  let dragged=null;
  tbody.querySelectorAll('tr[draggable="true"]').forEach(tr=>{
    tr.addEventListener('dragstart',e=>{dragged=tr;tr.classList.add('dragging');if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',tr.dataset.menuKey||'')}});
    tr.addEventListener('dragend',()=>{tr.classList.remove('dragging');tbody.querySelectorAll('.drag-over-before,.drag-over-after').forEach(x=>x.classList.remove('drag-over-before','drag-over-after'));dragged=null});
    tr.addEventListener('dragover',e=>{if(!dragged||dragged===tr)return;e.preventDefault();const rect=tr.getBoundingClientRect(),before=e.clientY<rect.top+rect.height/2;tr.classList.toggle('drag-over-before',before);tr.classList.toggle('drag-over-after',!before)});
    tr.addEventListener('dragleave',()=>tr.classList.remove('drag-over-before','drag-over-after'));
    tr.addEventListener('drop',e=>{if(!dragged||dragged===tr)return;e.preventDefault();const rect=tr.getBoundingClientRect(),before=e.clientY<rect.top+rect.height/2;tr.classList.remove('drag-over-before','drag-over-after');tbody.insertBefore(dragged,before?tr:tr.nextSibling)});
  });
}
async function saveMenuConfig(){
  if(!roleCanEditAdvancedMenus()){toast("Action réservée à l’Owner.",true);return}
  const actions=[];
  [...document.querySelectorAll('#menuAdminBody tr[data-menu-key]')].forEach((tr,index)=>{
    const id=+tr.dataset.menuId||0;
    const key=tr.dataset.menuKey;
    const label=(tr.querySelector('[data-f="Libelle"]')?.value||'').trim()||DEFAULT_MENU_LABELS[key]||key;
    const active=!!tr.querySelector('[data-f="Actif"]')?.checked;
    const ownerOnly=tr.querySelector('[data-f="Owner_Seulement"]')?.value==='true';
    const fields={Cle:key,Libelle:label,Ordre:(index+1)*10,Actif:active,Owner_Seulement:ownerOnly};
    actions.push(id?["UpdateRecord",T.menu,id,fields]:["AddRecord",T.menu,null,fields]);
  });
  if(!actions.length){toast('Aucune configuration à enregistrer.');return}
  try{await apply(actions);toast("Configuration du menu enregistrée dans Grist.");await boot()}catch(e){toast(e.message,true)}
}
function resetMenuConfigDraft(){
  const defaults=[
    ['dashboard','Dashboard'],['simulation','Simulation'],['compare','Comparaison'],['roi','ROI / Économies'],
    ['scenarios','Scénarios'],['offers','Offre de service'],['offersadmin','Paramétrage offre de service'],['domains','Domaines'],['rights','Droits utilisateurs'],['menuadmin','Configuration du menu'],['labelsadmin','Paramétrage des libellés'],['acladmin','ACL / Sécurité']
  ];
  const tbody=document.getElementById('menuAdminBody');if(!tbody)return;
  const byKey=Object.fromEntries([...tbody.querySelectorAll('tr[data-menu-key]')].map(tr=>[tr.dataset.menuKey,tr]));
  defaults.forEach(([key,label])=>{const tr=byKey[key];if(!tr)return;const input=tr.querySelector('[data-f="Libelle"]');if(input)input.value=label;const active=tr.querySelector('[data-f="Actif"]');if(active)active.checked=true;const access=tr.querySelector('[data-f="Owner_Seulement"]');if(access)access.value=['offersadmin','domains','rights','menuadmin','labelsadmin','acladmin'].includes(key)?'true':'false';tbody.appendChild(tr)});
  toast("Valeurs par défaut chargées. Clique sur Enregistrer pour les appliquer.");
}



function uiLabelRows(){return D?.[T.uiLabels]||[]}
function uiLabelMap(){
  const m=new Map();
  uiLabelRows().filter(r=>r.Actif!==false).forEach(r=>{
    const screen=String(r.Ecran||'*'),def=String(r.Libelle_Defaut||'').trim();
    if(def)m.set(`${screen}||${def}`,String(r.Libelle||def));
  });
  return m;
}
function uiTextScreen(el){
  const view=el.closest?.('.view');
  return view?.id?view.id.replace(/^v-/,''):'global';
}
function uiTextNodes(){
  const selector='h1,h2,h3,h4,p,th,button,label.field,summary,small,.status,.menu-admin-note,.offer-schema-note,.deniednote,.kpi .l,.field-label,.filter-title b,.mini-btn,.badge';
  const out=[];
  document.querySelectorAll(selector).forEach(el=>{
    if(el.closest('#v-labelsadmin'))return;
    const screen=uiTextScreen(el);
    [...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).forEach(n=>{
      const def=String(n.nodeValue||'').trim();
      if(def.length<2 || /^[-+]?\d+(?:[.,]\d+)?$/.test(def))return;
      out.push({screen,def,node:n});
    });
  });
  return out;
}
function applyUILabels(){
  const map=uiLabelMap();
  uiTextNodes().forEach(x=>{
    const val=map.get(`${x.screen}||${x.def}`)??map.get(`*||${x.def}`);
    if(val && val!==x.def){
      const raw=x.node.nodeValue||'',lead=raw.match(/^\s*/)?.[0]||'',trail=raw.match(/\s*$/)?.[0]||'';
      x.node.nodeValue=lead+val+trail;
    }
  });
}

let UI_LABEL_OBSERVER=null,UI_LABEL_PENDING=false,UI_LABEL_APPLYING=false;
function scheduleUILabelApply(){
  if(UI_LABEL_PENDING||UI_LABEL_APPLYING)return;
  UI_LABEL_PENDING=true;
  queueMicrotask(()=>{UI_LABEL_PENDING=false;applyUILabelsSafe()});
}
function applyUILabelsSafe(){
  if(UI_LABEL_APPLYING)return;
  UI_LABEL_APPLYING=true;
  try{applyUILabels()}finally{UI_LABEL_APPLYING=false}
}
function ensureUILabelObserver(){
  const root=document.getElementById('root');if(!root)return;
  if(UI_LABEL_OBSERVER)UI_LABEL_OBSERVER.disconnect();
  UI_LABEL_OBSERVER=new MutationObserver(muts=>{
    if(UI_LABEL_APPLYING)return;
    if(muts.some(m=>m.type==='childList'||m.type==='characterData'))scheduleUILabelApply();
  });
  UI_LABEL_OBSERVER.observe(root,{subtree:true,childList:true,characterData:true});
}

function slugLabel(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,70)}
function collectUILabelCandidates(){
  const uniq=new Map();
  uiTextNodes().forEach(x=>{const k=`${x.screen}||${x.def}`;if(!uniq.has(k))uniq.set(k,{Ecran:x.screen,Libelle_Defaut:x.def,Cle:`${x.screen}.${slugLabel(x.def)}`})});
  uiLabelRows().forEach(r=>{const k=`${r.Ecran||'*'}||${r.Libelle_Defaut||''}`;if(!uniq.has(k))uniq.set(k,{Ecran:r.Ecran||'*',Libelle_Defaut:r.Libelle_Defaut||'',Cle:r.Cle||`${r.Ecran}.${slugLabel(r.Libelle_Defaut)}`})});
  return [...uniq.values()].sort((a,b)=>String(a.Ecran).localeCompare(String(b.Ecran),'fr')||String(a.Libelle_Defaut).localeCompare(String(b.Libelle_Defaut),'fr'));
}

let LABEL_ADMIN_TAB='menu';
function renderLabelsAdmin(){
  const el=document.getElementById('v-labelsadmin');if(!el)return;
  const rows=uiLabelRows(),byPair=new Map(rows.map(r=>[`${r.Ecran||'*'}||${r.Libelle_Defaut||''}`,r]));
  const candidates=collectUILabelCandidates();
  const menuRows=menuConfigAllRows();
  const colRows=offerColumnConfig('read');
  const screens=[...new Set(candidates.map(c=>c.Ecran))].sort((a,b)=>String(a).localeCompare(String(b),'fr'));
  const screenOptions=['<option value="">Tous les écrans</option>',...screens.map(s=>`<option value="${esc(s)}">${esc(s==='global'?'Global':menuLabel(s)||s)}</option>`)].join('');

  el.innerHTML=`
  <article class="card labels-home">
    <div class="cardhead"><div><h3>Paramétrage des libellés</h3>
      <p>Choisis d'abord ce que tu veux renommer. Les noms des menus, les textes des écrans et les colonnes sont séparés pour éviter les doublons et rendre le paramétrage plus lisible.</p>
    </div></div>
    <div class="labels-tabs read-only-exempt">
      <button class="labels-tab ${LABEL_ADMIN_TAB==='menu'?'active':''}" data-label-tab="menu">Menus <span class="badge">${menuRows.length}</span></button>
      <button class="labels-tab ${LABEL_ADMIN_TAB==='screens'?'active':''}" data-label-tab="screens">Textes des écrans <span class="badge">${candidates.length}</span></button>
      <button class="labels-tab ${LABEL_ADMIN_TAB==='offers'?'active':''}" data-label-tab="offers">Colonnes offre <span class="badge">${colRows.length}</span></button>
    </div>
  </article>

  <article class="card labels-panel ${LABEL_ADMIN_TAB==='menu'?'':'hidden'}" data-label-panel="menu">
    <div class="cardhead"><div><h3>Libellés des menus</h3>
      <p>Tous les onglets sont affichés ici, y compris ceux qui sont désactivés. Le libellé enregistré est utilisé dans la barre latérale et comme titre de l'écran.</p>
    </div><button id="saveMenuLabelsFromLabels" class="btn primary">Enregistrer les menus</button></div>
    <div class="tablewrap"><table class="labels-menu-table"><thead><tr><th>Ordre</th><th>Clé technique</th><th>Libellé affiché</th><th>État</th><th>Accès</th></tr></thead>
    <tbody>${menuRows.map(r=>`<tr data-menu-label-id="${r.id||''}" data-menu-label-key="${esc(r.Cle)}">
      <td class="num">${+r.Ordre||0}</td>
      <td><code>${esc(r.Cle)}</code></td>
      <td><input class="admin-input wide" value="${esc(r.Libelle||DEFAULT_MENU_LABELS[r.Cle]||r.Cle)}"></td>
      <td>${r.Actif===false?'<span class="badge warn">Masqué</span>':'<span class="badge ok">Visible</span>'}</td>
      <td>${r.Owner_Seulement?'<span class="badge">Owner</span>':'<span class="badge ok">Utilisateurs autorisés</span>'}</td>
    </tr>`).join('')}</tbody></table></div>
    <div class="menu-admin-note">Pour modifier l'ordre, activer/masquer un onglet ou changer son niveau d'accès, utilise « Configuration du menu ». Ici, on ne modifie que les libellés.</div>
  </article>

  <article class="card labels-panel ${LABEL_ADMIN_TAB==='screens'?'':'hidden'}" data-label-panel="screens">
    <div class="cardhead"><div><h3>Textes des écrans</h3>
      <p>Titres, boutons, KPI, filtres, en-têtes et textes d'aide détectés dans les écrans du widget.</p>
    </div><div class="table-actions"><select id="labelScreenFilter" class="admin-input">${screenOptions}</select><input id="labelSearch" class="admin-input" placeholder="Rechercher un libellé"><button id="saveUILabels" class="btn primary">Enregistrer les textes</button></div></div>
    <div class="tablewrap labels-admin-wrap"><table class="labels-admin-table"><thead><tr><th>Écran</th><th>Clé</th><th>Valeur par défaut</th><th>Libellé affiché</th><th>Actif</th></tr></thead>
    <tbody id="uiLabelsBody">${candidates.map(c=>{const r=byPair.get(`${c.Ecran}||${c.Libelle_Defaut}`);return `<tr data-label-id="${r?.id||''}" data-screen="${esc(c.Ecran)}" data-default="${esc(c.Libelle_Defaut)}"><td><code>${esc(c.Ecran)}</code></td><td><code>${esc(r?.Cle||c.Cle)}</code></td><td>${esc(c.Libelle_Defaut)}</td><td><input class="admin-input wide" data-f="Libelle" value="${esc(r?.Libelle||c.Libelle_Defaut)}"></td><td><input type="checkbox" data-f="Actif" ${r?.Actif===false?'':'checked'}></td></tr>`}).join('')}</tbody></table></div>
  </article>

  <article class="card labels-panel ${LABEL_ADMIN_TAB==='offers'?'':'hidden'}" data-label-panel="offers">
    <div class="cardhead"><div><h3>Colonnes Offre de service</h3><p>Libellés communs à la vue lecture et à la vue de paramétrage.</p></div><button id="saveOfferColLabels" class="btn primary">Enregistrer les colonnes</button></div>
    <div class="tablewrap"><table><thead><tr><th>Clé colonne</th><th>Libellé affiché</th></tr></thead><tbody>${colRows.map(c=>`<tr data-offer-col-key="${esc(c.key)}"><td><code>${esc(c.key)}</code></td><td><input class="admin-input wide" value="${esc(c.label)}"></td></tr>`).join('')}</tbody></table></div>
  </article>`;

  el.querySelectorAll('[data-label-tab]').forEach(b=>b.onclick=()=>{
    LABEL_ADMIN_TAB=b.dataset.labelTab;
    renderLabelsAdmin();
  });

  document.getElementById('saveUILabels')?.addEventListener('click',saveUILabelsV23);
  document.getElementById('saveMenuLabelsFromLabels')?.addEventListener('click',saveMenuLabelsV27);
  document.getElementById('saveOfferColLabels')?.addEventListener('click',saveOfferColumnLabelsV23);

  const applyFilter=()=>{
    const q=String(document.getElementById('labelSearch')?.value||'').toLowerCase();
    const screen=String(document.getElementById('labelScreenFilter')?.value||'');
    document.querySelectorAll('#uiLabelsBody tr').forEach(tr=>{
      const okText=!q||tr.textContent.toLowerCase().includes(q);
      const okScreen=!screen||tr.dataset.screen===screen;
      tr.style.display=okText&&okScreen?'':'none';
    });
  };
  document.getElementById('labelSearch')?.addEventListener('input',applyFilter);
  document.getElementById('labelScreenFilter')?.addEventListener('change',applyFilter);
}

async function saveUILabelsV23(){
  if(!roleCanEditAdvancedMenus()){toast('Action réservée à l’Owner.',true);return}
  const actions=[];
  document.querySelectorAll('#uiLabelsBody tr').forEach((tr,i)=>{
    const id=+tr.dataset.labelId||0,screen=tr.dataset.screen||'*',def=tr.dataset.default||'',lib=tr.querySelector('[data-f="Libelle"]')?.value.trim()||def,active=!!tr.querySelector('[data-f="Actif"]')?.checked;
    const fields={Cle:`${screen}.${slugLabel(def)}`,Ecran:screen,Libelle_Defaut:def,Libelle:lib,Actif:active,Ordre:(i+1)*10};
    actions.push(id?["UpdateRecord",T.uiLabels,id,fields]:["AddRecord",T.uiLabels,null,fields]);
  });
  try{await apply(actions);toast('Libellés des écrans enregistrés.');await boot()}catch(e){toast(e.message||String(e),true)}
}

async function saveMenuLabelsV27(){
  if(!roleCanEditAdvancedMenus()){toast('Action réservée à l’Owner.',true);return}
  const current=Object.fromEntries(menuConfigAllRows().map(r=>[r.Cle,r])),actions=[];
  document.querySelectorAll('[data-menu-label-key]').forEach(tr=>{
    const key=tr.dataset.menuLabelKey,old=current[key]||{};
    const id=+tr.dataset.menuLabelId||+old.id||0;
    const lib=tr.querySelector('input')?.value.trim()||DEFAULT_MENU_LABELS[key]||key;
    const fields={Cle:key,Libelle:lib,Ordre:+old.Ordre||999,Actif:old.Actif!==false,Owner_Seulement:!!old.Owner_Seulement};
    actions.push(id?["UpdateRecord",T.menu,id,fields]:["AddRecord",T.menu,null,fields]);
  });
  try{
    await apply(actions);
    await boot();
    LABEL_ADMIN_TAB='menu';
    switchView('labelsadmin');
    toast('Tous les libellés de menu ont été enregistrés.');
  }catch(e){toast(e.message||String(e),true)}
}

async function saveMenuLabelsV23(){
  const actions=[];
  document.querySelectorAll('[data-menu-label-key]').forEach(tr=>{const id=+tr.dataset.menuLabelId||0,key=tr.dataset.menuLabelKey,old=menuConfigAllRows().find(r=>r.Cle===key)||{},lib=tr.querySelector('input')?.value.trim()||DEFAULT_MENU_LABELS[key]||key;const fields={Cle:key,Libelle:lib,Ordre:old.Ordre||999,Actif:old.Actif!==false,Owner_Seulement:!!old.Owner_Seulement};actions.push(id?["UpdateRecord",T.menu,id,fields]:["AddRecord",T.menu,null,fields])});
  try{await apply(actions);toast('Libellés du menu enregistrés.');await boot()}catch(e){toast(e.message||String(e),true)}
}
async function saveOfferColumnLabelsV23(){
  const existing=new Map((D[T.offerCols]||[]).map(r=>[r.Cle_Colonne,r])),actions=[];
  document.querySelectorAll('[data-offer-col-key]').forEach((tr,i)=>{const key=tr.dataset.offerColKey,r=existing.get(key),lib=tr.querySelector('input')?.value.trim()||OFFER_COLUMNS.find(c=>c.key===key)?.label||key;const fields={Cle_Colonne:key,Libelle:lib,Ordre:r?.Ordre??i*10,Visible_Lecture:r?.Visible_Lecture!==false,Visible_Admin:r?.Visible_Admin!==false};actions.push(r?["UpdateRecord",T.offerCols,r.id,fields]:["AddRecord",T.offerCols,null,fields])});
  try{await apply(actions);toast('Libellés des colonnes enregistrés.');await boot()}catch(e){toast(e.message||String(e),true)}
}

const FINOPS_ACL_TAG="FINOPS_V16";
const FINOPS_ACL_RESOURCES=[
  {tableId:"Scenarios",colIds:"*",kind:"scenario",mode:"userEdit"},
  {tableId:"Configuration_Menu",colIds:"*",kind:"global",mode:"config"},
  {tableId:"Configuration_Libelles_UI",colIds:"*",kind:"global",mode:"config"},
  {tableId:"Configuration_Colonnes_Offres",colIds:"*",kind:"global",mode:"config"},
  {tableId:"Fournisseurs",colIds:"*",kind:"global",mode:"adminEdit"},
  {tableId:"Offres",colIds:"*",kind:"global",mode:"adminEdit"},
  {tableId:"Allocations",colIds:"*",kind:"domain",mode:"userEdit"},
  {tableId:"Baseline_N_1",colIds:"*",kind:"domain",mode:"userEdit"},
  {tableId:"Baseline_N_1_Details",colIds:"*",kind:"domain",mode:"userEdit"},
  {tableId:"Pre_Simulations",colIds:"*",kind:"domain",mode:"userEdit"},
  {tableId:"Pre_Simulation_Ressources",colIds:"*",kind:"presimdomain",mode:"userEdit"},
  {tableId:"Enterprise",colIds:"*",kind:"domain",mode:"read"},
  {tableId:"Forfaits_Individuels",colIds:"*",kind:"domain",mode:"read"},
  {tableId:"Domaines",colIds:"*",kind:"domains",mode:"domains"},
  {tableId:"Droits_Utilisateurs",colIds:"*",kind:"rights",mode:"rights"},
  {tableId:"Presence_Utilisateurs",colIds:"*",kind:"presence",mode:"presence"}
];
function internalRows(t){return rows(t)}
async function readAclMeta(){
  const [resources,rules]=await Promise.all([
    grist.docApi.fetchTable("_grist_ACLResources"),
    grist.docApi.fetchTable("_grist_ACLRules")
  ]);
  return{resources:internalRows(resources),rules:internalRows(rules)};
}
function finopsUserAttribute(){
  return JSON.stringify({name:"Droits",tableId:"Droits_Utilisateurs",lookupColId:"Email",charId:"Email"});
}

function aclRoleFormula(roles){
  const vals=roles.map(r=>JSON.stringify(r)).join(',');
  return `user.Droits is not None and user.Droits.Actif and user.Droits.Role_App in [${vals}]`;
}
function aclFormulaFor(kind,roles){
  const base=aclRoleFormula(roles);
  if(kind==="global"||kind==="scenario"||kind==="presence")return base;
  if(kind==="domain")return `${base} and rec.Domaine in user.Droits.Domaines_Autorises`;
  if(kind==="presimdomain")return `${base} and rec.Pre_Simulation.Domaine in user.Droits.Domaines_Autorises`;
  if(kind==="domains")return `${base} and rec.id in user.Droits.Domaines_Autorises`;
  if(kind==="rights")return base;
  return "False";
}
function aclRulesForSpec(spec){
  const reader=["LECTEUR","CONTRIBUTEUR","OBSERVATEUR","CONTRIBUTEUR_AVANCE","ADMINISTRATEUR"];
  const contributors=["CONTRIBUTEUR","CONTRIBUTEUR_AVANCE","ADMINISTRATEUR"];
  if(spec.mode==="userEdit"){
    return [
      {roles:contributors,perm:"+CRUD",tag:"WRITE"},
      {roles:reader,perm:"+R",tag:"READ"}
    ];
  }
  if(spec.mode==="adminEdit"||spec.mode==="config"){
    return [
      {roles:["ADMINISTRATEUR"],perm:"+CRUD",tag:"ADMIN_WRITE"},
      {roles:reader,perm:"+R",tag:"READ"}
    ];
  }
  if(spec.mode==="domains"){
    return [
      {roles:["ADMINISTRATEUR"],perm:"+CRUD",tag:"ADMIN_WRITE_GLOBAL",formula:aclRoleFormula(["ADMINISTRATEUR"])},
      {roles:["LECTEUR","CONTRIBUTEUR","OBSERVATEUR","CONTRIBUTEUR_AVANCE"],perm:"+R",tag:"READ"}
    ];
  }
  if(spec.mode==="rights"){
    return [
      {roles:["ADMINISTRATEUR"],perm:"+CRUD",tag:"ADMIN_WRITE_ALL",formula:aclRoleFormula(["ADMINISTRATEUR"])},
      {roles:["OBSERVATEUR","CONTRIBUTEUR_AVANCE"],perm:"+R",tag:"ADV_READ_ALL",formula:aclRoleFormula(["OBSERVATEUR","CONTRIBUTEUR_AVANCE"])},
      {roles:["LECTEUR","CONTRIBUTEUR"],perm:"+R",tag:"SELF_READ",formula:`${aclRoleFormula(["LECTEUR","CONTRIBUTEUR"])} and rec.Email == user.Email`}
    ];
  }
  if(spec.mode==="presence"){
    return [
      {roles:reader,perm:"+CRUD",tag:"SELF_WRITE",formula:`${aclRoleFormula(reader)} and rec.Email == user.Email`},
      {roles:reader,perm:"+R",tag:"READ_ALL",formula:aclRoleFormula(reader)}
    ];
  }
  return [{roles:reader,perm:"+R",tag:"READ"}];
}

function aclPlan(meta){
  const resources=meta.resources||[],rules=meta.rules||[];
  const defaultRes=resources.find(r=>r.tableId==="*"&&r.colIds==="*");
  const byKey=Object.fromEntries(resources.map(r=>[`${r.tableId}|${r.colIds}`,r]));
  const existingUserAttr=rules.find(r=>String(r.userAttributes||"").includes('"name":"Droits"')||String(r.userAttributes||"").includes('"name": "Droits"'));
  const existingTagged=rules.filter(r=>String(r.memo||"").startsWith(FINOPS_ACL_TAG));
  const missingResources=FINOPS_ACL_RESOURCES.filter(x=>!byKey[`${x.tableId}|${x.colIds}`]);
  return{defaultRes,byKey,existingUserAttr,existingTagged,missingResources};
}
function aclAuditHtml(meta){
  const p=aclPlan(meta);
  const ua=p.existingUserAttr?'<span class="badge ok">Droits trouvé</span>':'<span class="badge warn">Droits absent</span>';
  const defaultR=p.defaultRes?'<span class="badge ok">Ressource *:* trouvée</span>':'<span class="badge warn">Ressource *:* absente</span>';
  const mr=p.missingResources.length?p.missingResources.map(x=>`<code>${esc(x.tableId)}</code>`).join(', '):'<span class="badge ok">Aucune</span>';
  return `<div class="acl-audit-grid"><div><b>Attribut utilisateur</b><div>${ua}</div></div><div><b>Ressource globale</b><div>${defaultR}</div></div><div><b>Règles FinOps existantes</b><div>${p.existingTagged.length}</div></div><div><b>Ressources à créer</b><div>${mr}</div></div></div>`;
}
function renderAclAdmin(){
  const el=document.getElementById('v-acladmin');if(!el)return;
  el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>ACL / Sécurité <span class="badge warn">Owner uniquement</span></h3><p>Audit et réconciliation des règles d'accès FinOps dans les métadonnées ACL Grist. L'application ne modifie rien tant que tu ne cliques pas sur Appliquer.</p></div></div><div class="acl-warning"><b>Important.</b> Les ACL sont des métadonnées internes Grist. Une sauvegarde JSON est proposée avant application. Une modification d'ACL peut provoquer le rechargement immédiat du document.</div><div class="table-actions"><button id="aclAudit" class="btn secondary">Auditer les ACL</button><button id="aclExport" class="btn secondary">Exporter la sauvegarde JSON</button><button id="aclApply" class="btn primary">Appliquer / réconcilier FinOps</button></div><div id="aclAuditResult" class="acl-result">Clique sur <b>Auditer les ACL</b> pour commencer.</div><article class="acl-matrix"><h4>Matrice cible</h4><table><thead><tr><th>Table</th><th>Utilisateur autorisé</th><th>Périmètre</th></tr></thead><tbody>${FINOPS_ACL_RESOURCES.map(x=>`<tr><td><code>${x.tableId}</code></td><td>${esc(x.perm)}</td><td>${x.kind==="domain"?"Ses domaines":x.kind==="presimdomain"?"Domaine de la pré-simulation":x.kind==="domains"?"Domaines autorisés":x.kind==="self"?"Sa ligne":x.kind==="global"?"Global":"-"}</td></tr>`).join('')}</tbody></table></article></article>`;
  document.getElementById('aclAudit').onclick=auditFinopsAcl;
  document.getElementById('aclExport').onclick=exportFinopsAcl;
  document.getElementById('aclApply').onclick=applyFinopsAcl;
}
async function auditFinopsAcl(){
  const box=document.getElementById('aclAuditResult');
  try{
    box.innerHTML='Lecture des métadonnées ACL…';
    const meta=await readAclMeta();
    box.innerHTML=aclAuditHtml(meta);
    window.__finopsAclLastMeta=meta;
  }catch(e){
    box.innerHTML=`<span class="badge warn">Lecture impossible</span><p>${esc(e.message||String(e))}</p>`;
    toast("Impossible de lire les ACL. Vérifie que tu es Owner.",true);
  }
}
async function exportFinopsAcl(){
  try{
    const meta=window.__finopsAclLastMeta||await readAclMeta();
    const payload={exportedAt:new Date().toISOString(),tag:FINOPS_ACL_TAG,resources:meta.resources,rules:meta.rules};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`finops-acl-backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    toast("Sauvegarde ACL exportée.");
  }catch(e){toast(e.message||String(e),true)}
}
async function applyFinopsAcl(){
  if(ACCESS.role!=="OWNER"){toast("Action réservée à l’Owner.",true);return}
  const ok=confirm("Appliquer les ACL FinOps ?\n\nCette opération modifie les règles d’accès Grist et peut recharger immédiatement le document. Fais une sauvegarde JSON avant de continuer.");
  if(!ok)return;
  const box=document.getElementById('aclAuditResult');
  try{
    const meta=await readAclMeta(),plan=aclPlan(meta);
    window.__finopsAclLastMeta=meta;
    if(!plan.defaultRes){
      await grist.docApi.applyUserActions([["AddRecord","_grist_ACLResources",null,{tableId:"*",colIds:"*"}]]);
    }
    // Create missing resources first so we can obtain their row IDs reliably.
    const resourceActions=plan.missingResources.map(x=>["AddRecord","_grist_ACLResources",null,{tableId:x.tableId,colIds:x.colIds}]);
    if(resourceActions.length)await grist.docApi.applyUserActions(resourceActions);

    const meta2=await readAclMeta(),p2=aclPlan(meta2);
    const defaultRes=p2.defaultRes;
    if(!defaultRes)throw new Error("Impossible de créer ou retrouver la ressource ACL globale *:*.");

    // Remove only FinOps-tagged rules; unrelated ACLs are preserved.
    const remove=p2.existingTagged.map(r=>["RemoveRecord","_grist_ACLRules",r.id]);
    if(remove.length)await grist.docApi.applyUserActions(remove);

    const meta3=await readAclMeta(),p3=aclPlan(meta3);
    const actions=[];
    if(!p3.existingUserAttr){
      actions.push(["AddRecord","_grist_ACLRules",null,{
        resource:p3.defaultRes.id,
        userAttributes:finopsUserAttribute(),
        memo:`${FINOPS_ACL_TAG}:USERATTR`
      }]);
    }

    for(const spec of FINOPS_ACL_RESOURCES){
      const res=p3.byKey[`${spec.tableId}|${spec.colIds}`];
      if(!res)throw new Error(`Ressource ACL manquante: ${spec.tableId}`);
      actions.push(["AddRecord","_grist_ACLRules",null,{
        resource:res.id,
        aclFormula:"user.Access in [OWNER]",
        permissionsText:"all",
        memo:`${FINOPS_ACL_TAG}:${spec.tableId}:OWNER`
      }]);
      for(const rule of aclRulesForSpec(spec)){
        actions.push(["AddRecord","_grist_ACLRules",null,{
          resource:res.id,
          aclFormula:rule.formula||aclFormulaFor(spec.kind,rule.roles),
          permissionsText:rule.perm,
          memo:`${FINOPS_ACL_TAG}:${spec.tableId}:${rule.tag}`
        }]);
      }
      actions.push(["AddRecord","_grist_ACLRules",null,{
        resource:res.id,
        aclFormula:"",
        permissionsText:"none",
        memo:`${FINOPS_ACL_TAG}:${spec.tableId}:DEFAULT`
      }]);
    }

    // Special restriction: non-owners must not edit schema.
    const special=meta3.resources.find(r=>r.tableId==="*SPECIAL"&&r.colIds==="SchemaEdit");
    if(special){
      actions.push(["AddRecord","_grist_ACLRules",null,{
        resource:special.id,
        aclFormula:"user.Access in [OWNER]",
        permissionsText:"+S",
        memo:`${FINOPS_ACL_TAG}:SPECIAL:SCHEMA_OWNER`
      }]);
      actions.push(["AddRecord","_grist_ACLRules",null,{
        resource:special.id,
        aclFormula:"",
        permissionsText:"-S",
        memo:`${FINOPS_ACL_TAG}:SPECIAL:SCHEMA_DEFAULT`
      }]);
    }
    box.innerHTML=`Application de ${actions.length} règle(s)…`;
    await grist.docApi.applyUserActions(actions);
    box.innerHTML='<span class="badge ok">Réconciliation appliquée</span><p>Le document peut se recharger automatiquement. Relance ensuite un audit.</p>';
    toast("ACL FinOps appliquées.");
  }catch(e){
    box.innerHTML=`<span class="badge warn">Échec de la réconciliation</span><p>${esc(e.message||String(e))}</p>`;
    toast(e.message||String(e),true);
  }
}


function renderRightsAdmin(){
  const el=document.getElementById('v-rights');
  if(!el)return;
  el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Droits utilisateurs</h3><p>La présence d’un utilisateur actif dans cette table est obligatoire pour accéder à FinOps. Les domaines définissent son périmètre de données.</p></div><div class="table-actions"><button id="newRightUser" class="btn secondary">+ Nouvel utilisateur</button><button id="saveAllRights" class="btn primary">Enregistrer les modifications</button></div></div>
  <div class="rights-role-help">
    <div><b>Lecteur</b><span>Menus utilisateurs · lecture seule</span></div>
    <div><b>Contributeur</b><span>Menus utilisateurs · modification</span></div>
    <div><b>Observateur</b><span>Tous les menus · lecture seule</span></div>
    <div><b>Contributeur avancé</b><span>Menus utilisateurs modifiables · autres menus en lecture</span></div>
    <div><b>Administrateur</b><span>Tous les menus · modification</span></div>
  </div>
  <div class="tablewrap"><table><thead><tr><th>Email</th><th>Domaines autorisés</th><th>Rôle applicatif</th><th>Actif</th><th>Commentaire</th><th></th></tr></thead><tbody id="rightsBody">${D[T.rights].map(r=>rightsAdminRow(r)).join('')}</tbody></table></div></article>`;
  document.getElementById('newRightUser').onclick=addRightsDraft;
  document.getElementById('saveAllRights').onclick=saveAllRightsV18;
  bindRightsDeleteButtons();
}
function rightsAdminRow(r={}){
  const multi=refListIds(r.Domaines_Autorises);
  const selected=new Set(multi.length?multi:(+r.Domaine?[+r.Domaine]:[]));
  const id=r.id||'',isNew=!r.id;
  const role=normalizeAppRole(r.Role_App||'Lecteur');
  const options=[
    [APP_ROLES.LECTEUR,'Lecteur'],
    [APP_ROLES.CONTRIBUTEUR,'Contributeur'],
    [APP_ROLES.OBSERVATEUR,'Observateur'],
    [APP_ROLES.CONTRIBUTEUR_AVANCE,'Contributeur avancé'],
    [APP_ROLES.ADMINISTRATEUR,'Administrateur']
  ];
  return `<tr data-r="${id}" data-new="${isNew?'1':'0'}">
    <td><input class="admin-input" data-f="Email" value="${esc(r.Email||'')}" placeholder="prenom.nom@domaine.fr"></td>
    <td><div class="domain-multiselect">${D[T.domains].filter(d=>d.Actif!==false).map(d=>`<label class="domain-chip"><input type="checkbox" data-domain-id="${d.id}" ${selected.has(+d.id)?'checked':''}><span>${esc(d.Nom)}</span></label>`).join('')}</div></td>
    <td><select class="admin-input" data-f="Role_App">${options.map(([value,label])=>`<option value="${value}" ${role===value?'selected':''}>${label}</option>`).join('')}</select></td>
    <td><input data-f="Actif" type="checkbox" ${r.Actif!==false?'checked':''}></td>
    <td><input class="admin-input" data-f="Commentaire" value="${esc(r.Commentaire||'')}" placeholder="Commentaire"></td>
    <td><button class="btn danger small rights-delete" title="${isNew?'Annuler':'Supprimer'}">${isNew?'Annuler':'Supprimer'}</button></td>
  </tr>`;
}

function addRightsDraft(){
  const tbody=document.getElementById('rightsBody');
  tbody.insertAdjacentHTML('beforeend',rightsAdminRow({Actif:true,Role_App:APP_ROLES.LECTEUR}));
  bindRightsDeleteButtons();
  const rows=tbody.querySelectorAll('tr');
  rows[rows.length-1]?.querySelector('[data-f="Email"]')?.focus();
}
function bindRightsDeleteButtons(){
  document.querySelectorAll('#rightsBody .rights-delete').forEach(btn=>btn.onclick=async()=>{
    if(!roleCanEditAdvancedMenus()){toast(readOnlyMessage(),true);return}
    const tr=btn.closest('tr');
    if(tr.dataset.new==='1'){tr.remove();return}
    const id=+tr.dataset.r;
    const user=D[T.rights].find(r=>+r.id===id);
    if(!confirm(`Supprimer les droits de "${user?.Email||id}" ?`))return;
    try{
      await apply([["RemoveRecord",T.rights,id]]);
      toast("Utilisateur supprimé des droits.");
      await boot();
    }catch(e){toast("Suppression impossible : "+(e.message||String(e)),true)}
  });
}
async function saveAllRightsV18(){
  if(!roleCanEditAdvancedMenus()){toast(readOnlyMessage(),true);return}
  const actions=[];
  let invalid=false;
  const emails=[];
  document.querySelectorAll('#rightsBody tr').forEach(tr=>{
    const id=+tr.dataset.r||0;
    const fields=readFields(tr,'[data-f]');
    fields.Email=String(fields.Email||'').trim();
    fields.Commentaire=String(fields.Commentaire||'').trim();
    if(!fields.Email || !fields.Email.includes('@')){
      invalid=true;
      tr.querySelector('[data-f="Email"]')?.classList.add('input-error');
      return;
    }
    emails.push(fields.Email.toLocaleLowerCase());
    const ids=[...tr.querySelectorAll('input[data-domain-id]:checked')].map(x=>+x.dataset.domainId).filter(Boolean);
    fields.Domaines_Autorises=['L',...ids];
    fields.Domaine=ids[0]||0; // compatibilité historique
    actions.push(id?["UpdateRecord",T.rights,id,fields]:["AddRecord",T.rights,null,fields]);
  });
  if(invalid){toast("Chaque utilisateur doit avoir une adresse email valide.",true);return}
  if(new Set(emails).size!==emails.length){toast("Deux lignes utilisent la même adresse email.",true);return}
  if(!actions.length){toast("Aucune modification à enregistrer.");return}
  try{
    await apply(actions);
    toast("Droits utilisateurs enregistrés.");
    await boot();
  }catch(e){toast(e.message||String(e),true)}
}
