const T={domains:"Domaines",scenarios:"Scenarios",providers:"Fournisseurs",offers:"Offres",alloc:"Allocations",baseline:"Baseline_N_1",baselineDetails:"Baseline_N_1_Details",roiServices:"ROI_Services",rights:"Droits_Utilisateurs",menu:"Configuration_Menu",offerCols:"Configuration_Colonnes_Offres",uiLabels:"Configuration_Libelles_UI",preSim:"Pre_Simulations",preRes:"Pre_Simulation_Ressources",preTeams:"Pre_Simulation_Equipes",preSimRights:"Pre_Simulation_Droits",presence:"Presence_Utilisateurs",claudeScenarios:"Claude_Scenarios",claudeOrgs:"Claude_Organisations",claudeGroups:"Claude_Groupes",claudeResources:"Claude_Ressources",claudeConfig:"Claude_Configuration",selfIdentity:"FinOps_Identites",ownerSentinel:"FinOps_Owner_Sentinel",chatMessages:"FinOps_Messages",chatReads:"FinOps_Chat_Lectures",appConfig:"FinOps_Configuration",roiRh:"ROI_RH_Paliers"};
const COLORS=["#2f6fed","#24b89a","#7c4de8","#e7a62c","#dc4c5a","#5a6b85","#42a5f5","#8bc34a"];
let D=null, ACCESS={role:"DENIED",domainIds:[]}, CURRENT=null, DASH_FILTER={domainIds:[],providerId:0};
let PRESENCE_INTERVAL=null;
let PRESENCE_RECORD_ID=0;
let PRESENCE_CURRENT_VIEW='dashboard';
let PRESENCE_ROWS=[];
const PRESENCE_HEARTBEAT_MS=20000;
const PRESENCE_TTL_MS=75000;
let CHAT_INTERVAL=null;
let CHAT_MESSAGES=[];
let CHAT_READS=[];
let CHAT_CHANNEL='GENERAL';
let CHAT_PEER='';
let CHAT_OPEN=false;
let CHAT_DRAFTS={};
const CHAT_DEFAULT_REFRESH_SECONDS=7;
function chatRefreshSecondsV57(){
  const row=(D?.[T.appConfig]||[]).find(r=>String(r.Cle||'')==='CHAT_REFRESH_SECONDS');
  const n=Number(row?.Valeur||CHAT_DEFAULT_REFRESH_SECONDS);
  return Math.max(3,Math.min(60,Number.isFinite(n)?n:CHAT_DEFAULT_REFRESH_SECONDS));
}
function chatRefreshMsV57(){return chatRefreshSecondsV57()*1000}
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
async function boot(){document.getElementById("root").innerHTML='<div class="splash">Chargement des données Grist…</div>';try{D=await fetchAll();deriveAccess();renderShell();if(ACCESS.role!=="DENIED"){populateScenario();renderAll();ensureUILabelObserver();applyUILabelsSafe();startPresence();startChatV56()}}catch(e){console.error(e);document.getElementById("root").innerHTML=`<div class="denied"><div class="deniedcard"><div class="lock">!</div><h1>Erreur de chargement</h1><p>${esc(e.message)}</p></div></div>`}}
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
function accessFromRightRow(row){
  const multi=refListIds(row.Domaines_Autorises);
  const ids=multi.length?multi:(+row.Domaine?[+row.Domaine]:[]);
  return {
    role:normalizeAppRole(row.Role_App),
    domainIds:[...new Set(ids.map(Number).filter(Boolean))],
    rights:[row],
    isOwner:false,
    ambiguous:false
  };
}
function deriveAccess(){
  const rr=(D[T.rights]||[]).filter(r=>r.Actif!==false);

  // V51 : détection purement par ACL Grist, sans URL, referrer ni trigger formula.
  // 1) Le sentinel n'est lisible que par le véritable Owner effectif.
  //    En mode « Voir comme », les ACL de l'utilisateur simulé s'appliquent et le sentinel disparaît.
  const ownerVisible=(D[T.ownerSentinel]||[]).length>0;
  if(ownerVisible){
    ACCESS={
      role:APP_ROLES.OWNER,
      domainIds:(D[T.domains]||[]).filter(d=>d.Actif!==false).map(d=>+d.id).filter(Boolean),
      rights:rr,
      isOwner:true,
      ambiguous:false,
      currentEmail:'',
      accessSource:'owner-sentinel'
    };
    return;
  }

  // 2) FinOps_Identites est une table miroir minimale (Email uniquement) dont les ACL
  //    n'autorisent chaque non-Owner à lire que sa propre ligne.
  const visibleIdentities=(D[T.selfIdentity]||[])
    .map(r=>String(r.Email||'').trim().toLowerCase())
    .filter(Boolean);
  const unique=[...new Set(visibleIdentities)];
  if(unique.length===1){
    const email=unique[0];
    const row=rr.find(r=>String(r.Email||'').trim().toLowerCase()===email);
    if(row){
      ACCESS={...accessFromRightRow(row),currentEmail:email,accessSource:'self-identity'};
      return;
    }
    // Une identité technique peut rester après suppression des droits : elle ne donne aucun accès.
    ACCESS={role:APP_ROLES.DENIED,domainIds:[],rights:[],isOwner:false,ambiguous:false,currentEmail:email,accessSource:'identity-no-active-rights'};
    return;
  }

  // 3) Compatibilité de secours uniquement lorsqu'une seule ligne de droits est réellement visible.
  //    Jamais de promotion Owner à partir de cette heuristique.
  const distinctEmails=[...new Set(rr.map(r=>String(r.Email||'').trim().toLowerCase()).filter(Boolean))];
  if(distinctEmails.length===1){
    const row=rr.find(r=>String(r.Email||'').trim().toLowerCase()===distinctEmails[0])||rr[0];
    ACCESS={...accessFromRightRow(row),currentEmail:distinctEmails[0],accessSource:'single-visible-right-fallback'};
    return;
  }

  ACCESS={
    role:APP_ROLES.DENIED,
    domainIds:[],
    rights:[],
    isOwner:false,
    ambiguous:unique.length>1||distinctEmails.length>1,
    accessSource:'identity-unresolved'
  };
}

function menuConfigAllRows(){
  const fallback=[
    {Cle:'dashboard',Libelle:'Dashboard',Ordre:10,Actif:true,Owner_Seulement:false},
    {Cle:'simulation',Libelle:'Simulation',Ordre:20,Actif:true,Owner_Seulement:false},
    {Cle:'compare',Libelle:'Comparaison',Ordre:30,Actif:true,Owner_Seulement:false},
    {Cle:'roi',Libelle:'ROI / Économies',Ordre:40,Actif:true,Owner_Seulement:false},
    {Cle:'presim',Libelle:'Pré-simulation nominative',Ordre:45,Actif:true,Owner_Seulement:false},
    {Cle:'claudeenterprise',Libelle:'Claude Enterprise',Ordre:47,Actif:true,Owner_Seulement:false},
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
  return {dashboard:'◧',simulation:'⌘',compare:'⇄',roi:'↗',presim:'♙',claudeenterprise:'✦',scenarios:'▤',offers:'¤',offersadmin:'⚙',domains:'◎',rights:'♙',menuadmin:'☷',labelsadmin:'✎',acladmin:'🔐'}[view]||'•';
}

function navGroupCollapsed(group){
  // V45 : état par défaut = User ouvert, Admin fermé.
  // Dès que l'utilisateur ouvre/ferme une rubrique, son choix est mémorisé localement.
  try{
    const stored=localStorage.getItem(`finopsNavGroup:${group}`);
    if(stored!==null)return stored==='1';
  }catch(_){}
  return group==='admin';
}
function setNavGroupCollapsed(group,collapsed){
  const section=document.querySelector(`.nav-group[data-nav-group="${group}"]`);if(!section)return;
  section.classList.toggle('collapsed',collapsed);
  const toggle=section.querySelector('.nav-group-toggle');
  if(toggle){toggle.setAttribute('aria-expanded',collapsed?'false':'true');const arrow=toggle.querySelector('.nav-group-arrow');if(arrow)arrow.textContent=collapsed?'›':'⌄'}
  try{localStorage.setItem(`finopsNavGroup:${group}`,collapsed?'1':'0')}catch(_){}
}
function bindNavGroups(){
  const sections=[...document.querySelectorAll('.nav-group')];
  sections.forEach(section=>{
    const group=section.dataset.navGroup;
    setNavGroupCollapsed(group,navGroupCollapsed(group));
    section.querySelector('.nav-group-toggle')?.addEventListener('click',()=>{
      const willOpen=section.classList.contains('collapsed');
      if(willOpen){
        // V47 : comportement accordéon. Ouvrir une rubrique referme les autres
        // afin de préserver un maximum de hauteur utile pour le menu central.
        sections.forEach(other=>{
          if(other!==section)setNavGroupCollapsed(other.dataset.navGroup,true);
        });
      }
      setNavGroupCollapsed(group,!section.classList.contains('collapsed'));
    });
  });
}
function revealNavGroupForView(view){
  const btn=document.querySelector(`.nav button[data-view="${CSS.escape(String(view||''))}"]`);
  const section=btn?.closest('.nav-group');
  if(!section)return;
  document.querySelectorAll('.nav-group').forEach(other=>setNavGroupCollapsed(other.dataset.navGroup,other!==section));
}
function ensureNavGroupStyles(){
  if(document.getElementById('finops-nav-group-styles'))return;
  const style=document.createElement('style');style.id='finops-nav-group-styles';
  style.textContent=`
    .nav-group{margin:2px 0 5px}.nav-group-toggle{width:100%;display:flex;align-items:center;gap:6px;padding:6px 9px;border:0;background:transparent;color:inherit;cursor:pointer;font:inherit;font-size:10px;font-weight:800;letter-spacing:.075em;text-transform:uppercase;opacity:.74}.nav-group-toggle:hover{opacity:1}.nav-group-title{flex:1;text-align:left}.nav-group-count{font-size:9px;opacity:.7}.nav-group-arrow{font-size:14px;line-height:1}.nav-group-items{display:flex;flex-direction:column;gap:1px}.nav-group.collapsed .nav-group-items{display:none}.sidebar-collapsed .nav-group-toggle{justify-content:center;padding:7px 4px}.sidebar-collapsed .nav-group-title,.sidebar-collapsed .nav-group-count{display:none}.sidebar-collapsed .nav-group-arrow{transform:none}.menu-section-badge{display:inline-block;min-width:50px;text-align:center;padding:3px 6px;border-radius:999px;font-size:9px;font-weight:800}.menu-section-badge.user{background:#e8f1ff;color:#2457a6}.menu-section-badge.admin{background:#f2ebff;color:#6a35a8}
    /* V47 : menu plus compact pour réserver davantage de largeur et de hauteur au contenu. */
    .shell:not(.sidebar-collapsed){grid-template-columns:minmax(178px,198px) minmax(0,1fr)!important}
    .shell:not(.sidebar-collapsed) .sidebar{width:auto!important;min-width:0!important;padding-left:8px!important;padding-right:8px!important}
    .shell:not(.sidebar-collapsed) .brand{gap:7px!important;padding-left:3px!important;padding-right:3px!important}
    .shell:not(.sidebar-collapsed) .brandtext h2{font-size:14px!important}
    .shell:not(.sidebar-collapsed) .brandtext small{font-size:8px!important;line-height:1.2!important}
    .app-author{display:block;margin:-2px 6px 8px 52px;font-size:8.5px;line-height:1.2;color:inherit;opacity:.68;font-weight:500;letter-spacing:0;white-space:nowrap;overflow:visible}.app-author strong{font-weight:700}.sidebar-collapsed .app-author{display:none!important}
    .shell:not(.sidebar-collapsed) .nav button[data-view]{padding:7px 8px!important;gap:7px!important;font-size:11px!important;line-height:1.18!important;min-height:30px!important}
    .shell:not(.sidebar-collapsed) .nav-icon{font-size:13px!important;min-width:16px!important}
    .shell:not(.sidebar-collapsed) .nav-label{font-size:11px!important;white-space:normal!important;overflow-wrap:anywhere}
    .shell:not(.sidebar-collapsed) .sidefoot{font-size:10px!important;line-height:1.25!important}
    @media (min-width:1500px){.shell:not(.sidebar-collapsed){grid-template-columns:190px minmax(0,1fr)!important}}
    @media (max-width:1180px) and (min-width:901px){.shell:not(.sidebar-collapsed){grid-template-columns:172px minmax(0,1fr)!important}.shell:not(.sidebar-collapsed) .nav button[data-view]{font-size:10.5px!important;padding:6px 7px!important}.shell:not(.sidebar-collapsed) .nav-label{font-size:10.5px!important}}

    /* V55 — responsive complet : tablette + mobile en tiroir, contenu fluide et contrôles empilables. */
    .mobile-nav-toggle,.mobile-nav-backdrop{display:none}
    @media (max-width:900px){
      .shell,.shell:not(.sidebar-collapsed),.shell.sidebar-collapsed{grid-template-columns:minmax(0,1fr)!important}
      .sidebar,.shell.sidebar-collapsed .sidebar{position:fixed!important;inset:0 auto 0 0!important;width:min(286px,86vw)!important;height:100dvh!important;z-index:1002!important;padding:14px 10px!important;transform:translateX(-105%);transition:transform .2s ease,box-shadow .2s ease;overflow-y:auto;box-shadow:none}
      .shell.mobile-nav-open .sidebar{transform:translateX(0);box-shadow:18px 0 40px rgba(10,24,48,.28)}
      .shell.sidebar-collapsed .brandtext,.shell.sidebar-collapsed .nav-label,.shell.sidebar-collapsed .sidefoot,.shell.sidebar-collapsed .app-author{display:block!important}
      .shell.sidebar-collapsed .nav-group-title,.shell.sidebar-collapsed .nav-group-count{display:inline!important}
      .shell.sidebar-collapsed .nav button[data-view]{justify-content:flex-start!important;padding:8px!important}
      .shell.sidebar-collapsed .nav-group-toggle{justify-content:flex-start!important;padding:7px 9px!important}
      .shell.sidebar-collapsed .sidebar-toggle,.sidebar-toggle{position:static!important;width:30px!important;height:30px!important;border-radius:8px!important;background:rgba(255,255,255,.07)!important;box-shadow:none!important}
      .app-author{margin:-2px 6px 8px 52px!important;white-space:normal!important}
      .mobile-nav-toggle{display:grid;place-items:center;position:fixed;left:12px;top:12px;z-index:1001;width:40px;height:40px;border:1px solid #d7deea;border-radius:11px;background:#fff;color:#172033;box-shadow:0 6px 18px rgba(15,35,66,.14);font-size:20px;cursor:pointer}
      .mobile-nav-backdrop{display:block;position:fixed;inset:0;z-index:1000;background:rgba(10,18,30,.38);opacity:0;pointer-events:none;transition:opacity .2s ease}
      .shell.mobile-nav-open .mobile-nav-backdrop{opacity:1;pointer-events:auto}
      .content,.shell.sidebar-collapsed .content{padding:14px!important;min-width:0!important;width:100%!important}
      .head{padding-top:48px!important;align-items:stretch!important;flex-direction:column!important;gap:10px!important}
      .head h1{font-size:clamp(22px,6vw,28px)!important}
      .head-right{width:100%!important;min-width:0!important}
      .session-strip{max-width:100%!important;overflow-x:auto!important;overscroll-behavior-inline:contain;padding-bottom:3px}
      .controls{width:100%!important;flex-wrap:wrap!important;align-items:end!important}
      .controls .field{flex:1 1 220px!important;min-width:0!important}
      .controls select{width:100%!important;min-width:0!important}
      .toolbar,.table-actions,.ce-actions{max-width:100%;flex-wrap:wrap!important}
      .toolbar .field{flex:1 1 180px;min-width:0}.toolbar select,.toolbar input{max-width:100%}
      .kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      .grid2,.grid3{grid-template-columns:1fr!important}
      .card{padding:14px!important}
      .tablewrap{max-width:100%;overflow-x:auto!important;-webkit-overflow-scrolling:touch;box-shadow:inset -12px 0 12px -16px rgba(15,35,66,.35)}
      table{min-width:max-content}
      th,td{white-space:nowrap}
      td .editor,td .admin-input{min-width:100px}
      .donutlayout{flex-direction:column;align-items:flex-start!important;min-height:0!important}
      .barrow{grid-template-columns:minmax(88px,110px) minmax(90px,1fr) 76px!important}
      .ce-scenario .field{min-width:min(230px,100%)!important;flex:1 1 210px}.ce-tabs{overflow-x:auto;white-space:nowrap}.ce-tab{flex:0 0 auto}
    }
    @media (max-width:560px){
      .content,.shell.sidebar-collapsed .content{padding:10px!important}
      .head{padding-top:50px!important}.head h1{font-size:22px!important}
      .kpis,.roi-kpis,.ce-kpis{grid-template-columns:1fr!important}
      .kpi,.ce-kpi{padding:13px!important}.kpi .v,.ce-kpi .v{font-size:20px!important}
      .card{padding:12px!important;border-radius:11px!important}
      .cardhead{align-items:stretch!important;flex-direction:column!important}
      .table-actions{justify-content:flex-start!important;width:100%!important}
      .table-actions .btn,.toolbar>.btn{flex:1 1 140px}
      .btn{padding:8px 10px!important}
      .session-strip{gap:6px!important}.session-ident{min-width:max-content}
      .controls{gap:7px!important}.controls .btn{flex:1 1 120px}
      .dashboard-filters{align-items:stretch!important;flex-direction:column!important}.dashboard-filters>.field,.dash-domain-field{width:100%!important}
      .dash-domain-picker,.dash-domain-btn{width:100%!important}.dash-domain-menu{max-width:calc(100vw - 28px)!important}
      .comparegrid{grid-template-columns:1fr!important}.checklist{gap:6px!important}.checkpill{width:100%;justify-content:flex-start}
      .ce-dialog{padding:8px!important}.ce-dialog-card{width:100%!important;max-height:96dvh!important;padding:14px!important;border-radius:12px!important}
      .ce-formgrid{grid-template-columns:1fr!important}.ce-formgrid .full{grid-column:auto!important}
      .denied{padding:12px!important}.deniedcard h1{font-size:28px!important}.deniedcard p{font-size:14px!important}.deniednote{margin:0 16px 24px!important}
    }
  `;
  document.head.appendChild(style);
}
function buildNavHtml(){
  const advanced=roleSeesAdvancedMenus();
  const visible=menuConfigRows().filter(r=>advanced || !r.Owner_Seulement);
  const groups=[
    {key:'user',label:'User',rows:visible.filter(r=>!r.Owner_Seulement)},
    {key:'admin',label:'Admin',rows:visible.filter(r=>!!r.Owner_Seulement)}
  ].filter(g=>g.rows.length);
  let first=true;
  return groups.map(g=>`<div class="nav-group" data-nav-group="${g.key}">
    <button type="button" class="nav-group-toggle" aria-expanded="true"><span class="nav-group-title">${g.label}</span><span class="nav-group-count">${g.rows.length}</span><span class="nav-group-arrow">⌄</span></button>
    <div class="nav-group-items">${g.rows.map(r=>{const active=first;first=false;return `<button class="${active?'active':''}" data-view="${esc(r.Cle)}"><span class="nav-icon">${navIcon(r.Cle)}</span><span class="nav-label">${esc(r.Libelle||r.Cle)}</span></button>`}).join('')}</div>
  </div>`).join('');
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
    const who=String(r.Email||'Utilisateur');
    return `<div class="presence-person ${mine?'mine':''}">
      <span class="presence-person-dot"></span>
      <div class="presence-person-main">
        <div class="presence-person-name">${esc(who)}${mine?' <span class="badge ok">vous</span>':''}</div>
        <div class="presence-person-meta">${esc(r.Role_App||'')} · <b>${esc(presencePageLabel(r.Page))}</b></div>
        <div class="presence-person-domain">${esc(r.Domaine_Texte||'')} · ${esc(presenceAgeLabel(r.Dernier_Heartbeat_MS))}</div>
      </div>
      ${mine?'':`<button type="button" class="presence-chat-btn" data-chat-with="${esc(who)}" title="Discuter avec ${esc(who)}" aria-label="Discuter avec ${esc(who)}">💬</button>`}
    </div>`;
  }).join(''):'<div class="presence-empty">Aucune autre session FinOps détectée.</div>';
  menu.querySelectorAll('[data-chat-with]').forEach(btn=>btn.addEventListener('click',e=>{
    e.stopPropagation();
    openDirectChatV56(btn.dataset.chatWith||'');
    menu.classList.add('hidden');
    document.getElementById('presenceToggle')?.setAttribute('aria-expanded','false');
  }));
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


function chatIdentityV56(){
  return isOwner()?'Owner Grist':String(ACCESS.currentEmail||currentRightRow()?.Email||currentUserLabel()).trim();
}
function chatChannelV56(a,b){
  return 'DM:'+ [String(a||'').trim().toLowerCase(),String(b||'').trim().toLowerCase()].sort().join('|');
}
function chatChannelLabelV56(channel){
  if(channel==='GENERAL')return 'Discussion générale FinOps';
  return CHAT_PEER?`Conversation avec ${CHAT_PEER}`:'Message direct';
}
async function fetchChatV56(){
  try{
    const [m,r]=await Promise.all([
      grist.docApi.fetchTable(T.chatMessages).catch(()=>({id:[]})),
      grist.docApi.fetchTable(T.chatReads).catch(()=>({id:[]}))
    ]);
    CHAT_MESSAGES=rows(m);CHAT_READS=rows(r);
  }catch(_){CHAT_MESSAGES=[];CHAT_READS=[]}
}
function chatReadAtV56(channel){
  const me=chatIdentityV56().toLowerCase();
  return Math.max(0,...CHAT_READS.filter(r=>String(r.Email||'').toLowerCase()===me&&String(r.Canal||'')===channel).map(r=>+r.Derniere_Lecture_MS||0));
}
function chatAccessibleMessagesV56(){
  const me=chatIdentityV56().toLowerCase();
  return CHAT_MESSAGES.filter(m=>{
    const ch=String(m.Canal||'');
    if(ch==='GENERAL')return true;
    return String(m.Expediteur||'').toLowerCase()===me||String(m.Destinataire||'').toLowerCase()===me||isOwner();
  });
}
function chatUnreadCountV56(){
  const me=chatIdentityV56().toLowerCase();
  const byChannel=new Map();
  for(const m of chatAccessibleMessagesV56()){
    if(String(m.Expediteur||'').toLowerCase()===me)continue;
    const ch=String(m.Canal||'GENERAL');
    if((+m.Envoye_MS||0)>chatReadAtV56(ch))byChannel.set(ch,(byChannel.get(ch)||0)+1);
  }
  return [...byChannel.values()].reduce((a,b)=>a+b,0);
}
function updateChatBadgeV56(){
  const n=chatUnreadCountV56();
  const badge=document.getElementById('chatUnreadCount');
  if(badge){badge.textContent=String(n);badge.classList.toggle('hidden',!n)}
}
function chatMessagesForChannelV56(channel){
  return chatAccessibleMessagesV56().filter(m=>String(m.Canal||'GENERAL')===channel).sort((a,b)=>(+a.Envoye_MS||0)-(+b.Envoye_MS||0));
}
function formatChatTimeV56(ms){
  if(!ms)return '';
  const d=new Date(+ms);const today=new Date();
  return d.toDateString()===today.toDateString()?d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):d.toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}
function ensureChatStylesV56(){
  if(document.getElementById('finops-chat-v56-style'))return;
  const st=document.createElement('style');st.id='finops-chat-v56-style';st.textContent=`
  .chat-header-btn{position:relative;display:flex;align-items:center;gap:6px;min-height:34px;padding:6px 9px;border:1px solid var(--line,#dbe3ef);border-radius:9px;background:#fff;color:inherit;cursor:pointer;font:inherit}.chat-header-btn:hover{background:var(--panel,#f8fafc)}
  .chat-unread{position:absolute;right:-5px;top:-7px;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:#635bdb;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center}.chat-unread.hidden{display:none}
  .presence-chat-btn{flex:0 0 auto;border:1px solid var(--line,#dbe3ef);background:#fff;border-radius:8px;width:32px;height:32px;cursor:pointer}.presence-chat-btn:hover{background:#f2f1ff;border-color:#c7c3ff}
  .finops-chat-layer{position:fixed;inset:0;z-index:1100;pointer-events:none}.finops-chat-layer.open{pointer-events:auto}.chat-shade{position:absolute;inset:0;background:rgba(15,23,42,.18);opacity:0;transition:opacity .16s}.finops-chat-layer.open .chat-shade{opacity:1}
  .chat-panel{position:absolute;right:0;top:0;bottom:0;width:min(410px,92vw);display:flex;flex-direction:column;background:#fff;border-left:1px solid #dfe5ed;box-shadow:-16px 0 44px rgba(15,23,42,.14);transform:translateX(102%);transition:transform .18s ease}.finops-chat-layer.open .chat-panel{transform:translateX(0)}
  .chat-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:16px;border-bottom:1px solid #e6ebf1}.chat-panel-head h3{margin:2px 0 0;font-size:1rem}.chat-kicker{font-size:.66rem;text-transform:uppercase;letter-spacing:.1em;color:#635bdb;font-weight:800}.chat-close{border:0;background:#f5f7fb;border-radius:9px;width:34px;height:34px;cursor:pointer;font-size:18px}
  .chat-tabs{display:flex;gap:6px;padding:10px 12px;border-bottom:1px solid #e8edf3;overflow-x:auto}.chat-tab{border:1px solid #dfe5ed;background:#fff;border-radius:99px;padding:7px 10px;font-size:.76rem;font-weight:700;white-space:nowrap;cursor:pointer}.chat-tab.active{background:#eeeeff;color:#5146d8;border-color:#cbc8ff}
  .chat-body{flex:1;overflow:auto;padding:12px;background:#f7f8fb}.chat-empty{padding:28px 16px;text-align:center;color:#667085;font-size:.84rem}
  .chat-message{display:flex;margin:7px 0}.chat-message.mine{justify-content:flex-end}.chat-bubble{max-width:82%;padding:9px 11px;border-radius:13px;background:#fff;border:1px solid #e1e6ed;box-shadow:0 1px 2px rgba(15,23,42,.03)}.chat-message.mine .chat-bubble{background:#eeeefe;border-color:#d7d4ff}.chat-author{font-size:.68rem;font-weight:800;color:#635bdb;margin-bottom:3px}.chat-text{font-size:.84rem;line-height:1.42;white-space:pre-wrap;overflow-wrap:anywhere}.chat-bubble.deleted{opacity:.72;background:#f8fafc!important;border-style:dashed}.chat-bubble.deleted .chat-text{color:#667085}.chat-message-foot{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:4px}.chat-time{font-size:.62rem;color:#8a94a4}.chat-delete-btn{border:0;background:transparent;color:#8a94a4;font-size:.62rem;font-weight:700;padding:0;cursor:pointer}.chat-delete-btn:hover{color:#b42318;text-decoration:underline}
  .chat-compose{padding:11px;border-top:1px solid #e1e6ed;background:#fff}.chat-compose textarea{width:100%;min-height:70px;max-height:150px;resize:vertical;border:1px solid #d7dee8;border-radius:11px;padding:9px 10px;font:inherit;font-size:.84rem;outline:none}.chat-compose textarea:focus{border-color:#8f88ef;box-shadow:0 0 0 3px rgba(99,91,219,.10)}.chat-compose-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:7px}.chat-compose-hint{font-size:.66rem;color:#8a94a4}.chat-send{border:0;background:#635bdb;color:#fff;border-radius:9px;padding:8px 13px;font-weight:750;cursor:pointer}.chat-send:disabled{opacity:.45;cursor:not-allowed}
  @media(max-width:900px){.finops-chat-layer .chat-shade{display:none}.chat-panel{width:100vw;border-left:0}.chat-panel-head{padding-top:max(14px,env(safe-area-inset-top))}.chat-body{padding-bottom:12px}.chat-compose{padding-bottom:max(11px,env(safe-area-inset-bottom))}.session-strip .chat-header-btn{min-width:42px;justify-content:center}.chat-header-label{display:none}}
  @media(max-width:560px){.chat-panel-head{padding:12px}.chat-tabs{padding:8px}.chat-body{padding:8px}.chat-bubble{max-width:90%}}.settings-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}.setting-inline{display:flex;align-items:center;gap:8px}.setting-inline input{max-width:120px}
  `;document.head.appendChild(st);
}

function chatMessageHtmlV57(m,me){
  const mine=String(m.Expediteur||'').toLowerCase()===String(me||'').toLowerCase();
  const deleted=!!m.Supprime;
  const canDelete=!deleted&&(mine||isOwner());
  return `<div class="chat-message ${mine?'mine':''}" data-chat-message-id="${m.id}">
    <div class="chat-bubble ${deleted?'deleted':''}">
      ${mine?'':`<div class="chat-author">${esc(m.Expediteur||'')}</div>`}
      <div class="chat-text">${deleted?'<em>Message supprimé</em>':esc(m.Texte||'')}</div>
      <div class="chat-message-foot">
        <span class="chat-time">${esc(formatChatTimeV56(m.Envoye_MS))}</span>
        ${canDelete?`<button class="chat-delete-btn" type="button" data-chat-delete="${m.id}" title="Effacer définitivement ce message">Effacer</button>`:''}
      </div>
    </div>
  </div>`;
}
function bindChatDeleteButtonsV57(root=document){
  root.querySelectorAll?.('[data-chat-delete]').forEach(btn=>btn.addEventListener('click',()=>softDeleteChatMessageV57(+btn.dataset.chatDelete)));
}
function updateChatMessagesOnlyV57({forceBottom=false}={}){
  const body=document.getElementById('chatBody');if(!body)return;
  const messages=chatMessagesForChannelV56(CHAT_CHANNEL),me=chatIdentityV56();
  const distanceFromBottom=body.scrollHeight-body.scrollTop-body.clientHeight;
  const stickToBottom=forceBottom||distanceFromBottom<80;
  body.innerHTML=messages.length?messages.map(m=>chatMessageHtmlV57(m,me)).join(''):'<div class="chat-empty">Aucun message dans cette conversation.</div>';
  bindChatDeleteButtonsV57(body);
  if(stickToBottom)requestAnimationFrame(()=>{body.scrollTop=body.scrollHeight});
}
function saveCurrentChatDraftV57(){
  const input=document.getElementById('chatText');
  if(input)CHAT_DRAFTS[CHAT_CHANNEL]=input.value;
}
function renderChatPanelV56(){
  const host=document.getElementById('finopsChatHost');if(!host)return;
  const messages=chatMessagesForChannelV56(CHAT_CHANNEL),me=chatIdentityV56();
  const activePeers=activePresenceRows(PRESENCE_ROWS).map(r=>String(r.Email||'')).filter(x=>x&&x!==me);
  const draft=CHAT_DRAFTS[CHAT_CHANNEL]||'';
  host.innerHTML=`<div class="finops-chat-layer ${CHAT_OPEN?'open':''}" id="finopsChatLayer">
    <div class="chat-shade" id="chatShade"></div>
    <aside class="chat-panel" role="dialog" aria-modal="true" aria-label="Chat FinOps">
      <div class="chat-panel-head"><div><div class="chat-kicker">MESSAGERIE FINOPS</div><h3>${esc(chatChannelLabelV56(CHAT_CHANNEL))}</h3></div><button id="chatClose" class="chat-close" type="button" aria-label="Fermer">×</button></div>
      <div class="chat-tabs"><button class="chat-tab ${CHAT_CHANNEL==='GENERAL'?'active':''}" data-chat-general>Général</button>${activePeers.map(p=>`<button class="chat-tab ${CHAT_PEER===p?'active':''}" data-chat-peer="${esc(p)}">${esc(p)}</button>`).join('')}</div>
      <div class="chat-body" id="chatBody">${messages.length?messages.map(m=>chatMessageHtmlV57(m,me)).join(''):'<div class="chat-empty">Aucun message dans cette conversation.</div>'}</div>
      <div class="chat-compose"><textarea id="chatText" maxlength="2000" placeholder="Écrire un message…">${esc(draft)}</textarea><div class="chat-compose-actions"><span class="chat-compose-hint">Actualisation ${chatRefreshSecondsV57()} s · Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne</span><button id="chatSend" class="chat-send" type="button">Envoyer</button></div></div>
    </aside>
  </div>`;
  document.getElementById('chatClose')?.addEventListener('click',closeChatV56);
  document.getElementById('chatShade')?.addEventListener('click',closeChatV56);
  host.querySelector('[data-chat-general]')?.addEventListener('click',()=>{saveCurrentChatDraftV57();openGeneralChatV56()});
  host.querySelectorAll('[data-chat-peer]').forEach(b=>b.addEventListener('click',()=>{saveCurrentChatDraftV57();openDirectChatV56(b.dataset.chatPeer||'')}));
  const textarea=document.getElementById('chatText');
  document.getElementById('chatSend')?.addEventListener('click',sendChatV56);
  textarea?.addEventListener('input',()=>{CHAT_DRAFTS[CHAT_CHANNEL]=textarea.value});
  textarea?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatV56()}});
  bindChatDeleteButtonsV57(host);
  if(CHAT_OPEN){
    setTimeout(()=>{const body=document.getElementById('chatBody');if(body)body.scrollTop=body.scrollHeight;textarea?.focus()},30);
    markChatReadV56(CHAT_CHANNEL);
  }
}
async function markChatReadV56(channel){
  if(!channel)return;const me=chatIdentityV56(),now=Date.now();
  try{
    const own=CHAT_READS.find(r=>String(r.Email||'').toLowerCase()===me.toLowerCase()&&String(r.Canal||'')===channel);
    const fields={Email:me,Canal:channel,Derniere_Lecture_MS:now};
    await grist.docApi.applyUserActions([own?["UpdateRecord",T.chatReads,own.id,fields]:["AddRecord",T.chatReads,null,fields]]);
    await refreshChatV57(false);
  }catch(e){console.warn('Chat read marker failed',e)}
}
async function sendChatV56(){
  const input=document.getElementById('chatText');const text=String(input?.value||'').trim();if(!text)return;
  const me=chatIdentityV56();
  const fields={Canal:CHAT_CHANNEL,Type:CHAT_CHANNEL==='GENERAL'?'GENERAL':'DIRECT',Expediteur:me,Destinataire:CHAT_CHANNEL==='GENERAL'?'':CHAT_PEER,Texte:text,Envoye_MS:Date.now(),Supprime:false,Supprime_Par:'',Supprime_MS:0};
  try{
    await grist.docApi.applyUserActions([["AddRecord",T.chatMessages,null,fields]]);
    CHAT_DRAFTS[CHAT_CHANNEL]='';
    if(input)input.value='';
    await refreshChatV57(true,true);
    await markChatReadV56(CHAT_CHANNEL);
    input?.focus();
  }catch(e){toast('Message non envoyé : '+(e.message||String(e)),true)}
}

async function softDeleteChatMessageV57(id){
  const msg=CHAT_MESSAGES.find(m=>+m.id===+id);if(!msg)return;
  const me=chatIdentityV56();
  const mine=String(msg.Expediteur||'').toLowerCase()===String(me||'').toLowerCase();
  if(!mine&&!isOwner()){toast("Vous ne pouvez effacer que vos propres messages.",true);return}
  if(!confirm("Effacer définitivement ce message ?"))return;
  try{
    await grist.docApi.applyUserActions([["RemoveRecord",T.chatMessages,+id]]);
    CHAT_MESSAGES=CHAT_MESSAGES.filter(m=>+m.id!==+id);
    updateChatMessagesOnlyV57({forceBottom:false});updateChatBadgeV56();
    toast("Message effacé.");
  }catch(e){toast("Effacement impossible. Réconcilie les ACL V58 : "+(e.message||String(e)),true)}
}

function openGeneralChatV56(){CHAT_CHANNEL='GENERAL';CHAT_PEER='';CHAT_OPEN=true;renderChatPanelV56()}
function openDirectChatV56(peer){if(!peer)return;CHAT_PEER=peer;CHAT_CHANNEL=chatChannelV56(chatIdentityV56(),peer);CHAT_OPEN=true;renderChatPanelV56()}
function closeChatV56(){saveCurrentChatDraftV57();CHAT_OPEN=false;renderChatPanelV56()}
async function refreshChatV57(updateMessages=true,forceBottom=false){
  await fetchChatV56();
  updateChatBadgeV56();
  if(updateMessages&&CHAT_OPEN)updateChatMessagesOnlyV57({forceBottom});
}
async function refreshChatV56(rerender=true){return refreshChatV57(rerender,false)}
function restartChatIntervalV57(){
  if(CHAT_INTERVAL)clearInterval(CHAT_INTERVAL);
  CHAT_INTERVAL=setInterval(()=>refreshChatV57(true,false),chatRefreshMsV57());
}
function startChatV56(){
  ensureChatStylesV56();
  refreshChatV57(false);
  restartChatIntervalV57();
  if(!window.__finopsChatKeyBound){window.addEventListener('keydown',e=>{if(e.key==='Escape'&&CHAT_OPEN)closeChatV56()});window.__finopsChatKeyBound=true}
}

function renderShell(){
  if(ACCESS.role===APP_ROLES.DENIED){
    document.getElementById("root").innerHTML=`<div class="denied"><div class="deniedcard"><div class="lock">🔒</div><h1>Accès non autorisé</h1><p>Votre compte n’est pas inscrit comme utilisateur actif dans la table <b>Droits_Utilisateurs</b>.</p><div class="deniednote">Aucun menu FinOps n’est disponible. Demandez à un administrateur de vous ajouter dans la gestion des droits.</div></div></div>`;
    return;
  }

  const advanced=roleSeesAdvancedMenus();
  const navHtml=buildNavHtml();
  const advancedSections=advanced?'<section id="v-offersadmin" class="view"></section><section id="v-domains" class="view"></section><section id="v-rights" class="view"></section><section id="v-menuadmin" class="view"></section><section id="v-labelsadmin" class="view"></section><section id="v-appsettings" class="view"></section><section id="v-acladmin" class="view"></section>':'';

  document.getElementById("root").innerHTML=`<div class="shell">
    <button id="mobileNavToggle" class="mobile-nav-toggle" type="button" title="Ouvrir le menu" aria-label="Ouvrir le menu" aria-expanded="false">☰</button>
    <div id="mobileNavBackdrop" class="mobile-nav-backdrop" aria-hidden="true"></div>
    <aside class="sidebar">
      <div class="brand"><div class="logo">F</div><div class="brandtext"><h2>FINOPS IA</h2><small>SIMULATEUR MULTI-FOURNISSEURS</small></div><button id="sidebarToggle" class="sidebar-toggle" title="Rétracter le menu" aria-label="Rétracter le menu">‹</button></div><div class="app-author">Réalisé par <strong>Alex Dufrenot</strong></div>
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
            <button id="chatHeaderBtn" type="button" class="chat-header-btn" title="Ouvrir la messagerie FinOps"><span>💬</span><span class="chat-header-label">Messages</span><span id="chatUnreadCount" class="chat-unread hidden">0</span></button>
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
      <section id="v-dashboard" class="view active"></section><section id="v-simulation" class="view"></section><section id="v-compare" class="view"></section><section id="v-roi" class="view"></section><section id="v-presim" class="view"></section><section id="v-claudeenterprise" class="view"></section><section id="v-scenarios" class="view"></section><section id="v-offers" class="view"></section>${advancedSections}
    </main>
  </div><div id="finopsChatHost"></div><div id="toast" class="toast"></div>`;

  ensureNavGroupStyles();
  bindNavGroups();
  document.querySelectorAll('.nav button[data-view]').forEach(b=>b.onclick=()=>{switchView(b.dataset.view);closeMobileNav()});
  const mobileToggle=document.getElementById('mobileNavToggle');
  const mobileBackdrop=document.getElementById('mobileNavBackdrop');
  mobileToggle?.addEventListener('click',()=>toggleMobileNav());
  mobileBackdrop?.addEventListener('click',()=>closeMobileNav());
  document.getElementById('refresh').onclick=boot;
  document.getElementById('scenarioSelect').onchange=()=>{
    CURRENT=model(+selectedScenario()?.id||0);
    renderAll();
  };

  document.getElementById('chatHeaderBtn')?.addEventListener('click',()=>{if(CHAT_OPEN)closeChatV56();else openGeneralChatV56()});
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
  bindResponsiveShell();
  closeMobileNav();
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
  claudeenterprise:'Claude Enterprise',
  scenarios:'Scénarios',
  offers:'Offre de service',
  offersadmin:'Paramétrage offre de service',
  domains:'Domaines',
  rights:'Droits utilisateurs',
  menuadmin:'Configuration du menu',
  labelsadmin:'Paramétrage des libellés',
  appsettings:'Paramètres application',
  acladmin:'ACL / Sécurité'
};

function setSidebarCollapsed(collapsed){const shell=document.querySelector('.shell'),toggle=document.getElementById('sidebarToggle');if(!shell)return;shell.classList.toggle('sidebar-collapsed',collapsed);if(toggle){toggle.textContent=collapsed?'›':'‹';toggle.title=collapsed?'Déployer le menu':'Rétracter le menu';toggle.setAttribute('aria-label',toggle.title)}try{localStorage.setItem('finopsSidebarCollapsed',collapsed?'1':'0')}catch(_){}}
function isMobileLayout(){return window.matchMedia?.('(max-width:900px)').matches}
function setMobileNav(open){const shell=document.querySelector('.shell'),btn=document.getElementById('mobileNavToggle');if(!shell)return;const effective=!!open&&isMobileLayout();shell.classList.toggle('mobile-nav-open',effective);if(btn){btn.setAttribute('aria-expanded',effective?'true':'false');btn.title=effective?'Fermer le menu':'Ouvrir le menu';btn.setAttribute('aria-label',btn.title);btn.textContent=effective?'×':'☰'}}
function toggleMobileNav(){setMobileNav(!document.querySelector('.shell')?.classList.contains('mobile-nav-open'))}
function closeMobileNav(){setMobileNav(false)}
function bindResponsiveShell(){if(window.__finopsResponsiveBound)return;let wasMobile=isMobileLayout();window.addEventListener('resize',()=>{const mobile=isMobileLayout();if(!mobile)closeMobileNav();if(mobile&&!wasMobile)closeMobileNav();wasMobile=mobile},{passive:true});window.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileNav()});window.__finopsResponsiveBound=true}
function switchView(v){
  document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===v));
  revealNavGroupForView(v);
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.getElementById('v-'+v)?.classList.add('active');
  const label=menuLabel(v);
  document.getElementById('title').textContent=label;
  const page=document.getElementById('sessionPage');if(page)page.textContent=label;
  const scenarioField=document.getElementById('scenarioSelect')?.closest('.field');
  const refresh=document.getElementById('refresh');
  // V75 : sur Synthèse/Comparaison, les scénarios se sélectionnent déjà dans l'écran.
  // Le sélecteur global du bandeau est donc masqué pour éviter un double filtre.
  const hideScenario=['compare','presim','claudeenterprise','scenarios','offers','offersadmin','domains','rights','menuadmin','labelsadmin','appsettings','acladmin'].includes(v);
  const hideRefresh=['presim','claudeenterprise','scenarios','offers','offersadmin','domains','rights','menuadmin','labelsadmin','appsettings','acladmin'].includes(v);
  if(scenarioField)scenarioField.style.display=hideScenario?'none':'';
  if(refresh)refresh.style.display=hideRefresh?'none':'';
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
const roiServices=(D[T.roiServices]||[]).filter(r=>+r.Scenario===+sid&&allowedDomainIds.has(+r.Domaine));
const bd={},bo={},bp={};
for(const d of domains)bd[d.id]={d,total:0,eur:0,baselineAnnual:0,removedAnnual:0,tjm:0,collabs:0,days:+s?.Nb_Jours_Ouvres_Annuels||0};
let fixed=0,included=0,over=0,total=0,unresolved=0,licenses=0;
for(const a of alloc){const o=D.offerById[a.Offre],p=D.providerById[o?.Fournisseur],d=bd[a.Domaine];if(!o||!p||!d)continue;const f=+a.Cout_Abonnement||0,i=+a.Usage_Inclus_Total||0,ov=+a.Cout_Overage||0,t=+a.Budget_Total_USD||0;fixed+=f;included+=i;over+=ov;total+=t;licenses+=+a.Nb_Licences||0;if(a.Tarif_A_Confirmer)unresolved++;d.total+=t;d.eur+=+a.Budget_Total_EUR||0;const ok=o.id,pk=p.id;bo[ok]??={o,p,licenses:0,fixed:0,included:0,over:0,total:0,unresolved:0};bo[ok].licenses+=+a.Nb_Licences||0;bo[ok].fixed+=f;bo[ok].included+=i;bo[ok].over+=ov;bo[ok].total+=t;if(a.Tarif_A_Confirmer)bo[ok].unresolved++;bp[pk]??={p,total:0,licenses:0};bp[pk].total+=t;bp[pk].licenses+=+a.Nb_Licences||0}
const detailsByDomain={};
for(const r of baselineDetails)(detailsByDomain[r.Domaine]??=[]).push(r);
for(const b of baseline){
  const d=bd[b.Domaine];if(!d)continue;
  d.removedAnnual=+b.Cout_Supprime_Annuel_EUR||0;
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
for(const d of Object.values(bd)){d.budgetAnnualized=d.eur*12/months;d.baselinePeriod=d.baselineAnnual*months/12;d.newAnnualCost=d.baselineAnnual-d.removedAnnual+d.budgetAnnualized;d.savingAnnual=d.removedAnnual-d.budgetAnnualized;d.savingPeriod=d.savingAnnual*months/12;d.savingPct=d.baselineAnnual?d.savingAnnual/d.baselineAnnual:0;d.daysEquivalent=d.tjm>0?d.savingAnnual/d.tjm:0;d.fteEquivalent=(d.tjm>0&&d.days>0)?d.savingAnnual/(d.tjm*d.days):0;baselineAnnual+=d.baselineAnnual;budgetAnnualizedEUR+=d.budgetAnnualized;baselinePeriod+=d.baselinePeriod;savingPeriod+=d.savingPeriod;savingAnnual+=d.savingAnnual}
const savingPct=baselineAnnual?savingAnnual/baselineAnnual:0;
return{s,alloc,baseline,baselineDetails,roiServices,bd,bo,bp,fixed,included,over,total,licenses,unresolved,rate,months,baselineAnnual,budgetPeriodEUR,budgetAnnualizedEUR,baselinePeriod,savingPeriod,savingAnnual,savingPct}
}
function renderAll(){
  CURRENT=model(selectedScenario()?.id);
  const names=scopedDomains().map(d=>d.Nom).join(', ');
  document.getElementById('scope').textContent=isOwner()?'Périmètre : tous les domaines':`Périmètre : ${names||'aucun domaine'}`;
  document.getElementById('sideScope').textContent=isOwner()?'Tous les domaines':(names||'Aucun domaine');
  renderDashboard();renderSimulation();renderCompare();renderROI();renderPreSimulation();renderClaudeEnterprise();renderScenarios();renderOffersReadOnly();
  if(roleSeesAdvancedMenus()){renderOffersAdmin();renderDomainsAdmin();renderRightsAdmin();renderMenuAdmin();renderLabelsAdmin();renderAppSettingsV58();renderAclAdmin()}
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

function preSimRefId(v){
  if(Array.isArray(v)){
    const a=v[0]==="L"?v.slice(1):v;
    const n=a.map(Number).find(Number.isFinite);
    return n||0;
  }
  const n=Number(v);return Number.isFinite(n)?n:0;
}
function savedPreSimWithTeamsForDomain(scenarioId,domainId){
  // V75 : le besoin est lié au DOMAINE.
  // On préfère une pré-simulation du scénario détaillé, puis on retombe sur
  // la pré-simulation enregistrée la plus récente du domaine ayant équipes + ressources.
  const candidates=scopedPreSimulations()
    .filter(f=>+f.Domaine===+domainId && f.Actif!==false)
    .sort((a,b)=>{
      const am=+a.Scenario_Reference===+scenarioId?1:0;
      const bm=+b.Scenario_Reference===+scenarioId?1:0;
      return bm-am || (+b.id)-(+a.id);
    });
  return candidates.find(f=>{
    const teams=preTeamRows().filter(t=>preSimRefId(t.Pre_Simulation)===+f.id&&t.Actif!==false);
    const resources=preResourceRows().filter(r=>preSimRefId(r.Pre_Simulation)===+f.id&&r.Actif!==false);
    return teams.length>0 && resources.length>0;
  })||null;
}
function domainTeamBudgetBreakdown(m,domainId){
  const scenarioId=+m?.s?.id||0;
  const fiche=savedPreSimWithTeamsForDomain(scenarioId,+domainId);
  if(!fiche)return null;

  const teams=preTeamRows().filter(t=>preSimRefId(t.Pre_Simulation)===+fiche.id&&t.Actif!==false);
  const resources=preResourceRows().filter(r=>preSimRefId(r.Pre_Simulation)===+fiche.id&&r.Actif!==false);
  if(!teams.length||!resources.length)return null;

  const teamById=Object.fromEntries(teams.map(t=>[+t.id,t]));
  const allocs=(m.alloc||[]).filter(a=>+a.Domaine===+domainId);
  if(!allocs.length)return null;

  const allocByOffer=new Map();
  for(const a of allocs){
    const oid=+a.Offre||0;if(!oid)continue;
    const cur=allocByOffer.get(oid)||{budget:0,licenses:0};
    cur.budget+=+a.Budget_Total_USD||0;
    cur.licenses+=+a.Nb_Licences||0;
    allocByOffer.set(oid,cur);
  }

  // Licences nominatives de la pré-simulation par équipe + offre effective.
  const counts=new Map(), preByOffer=new Map();
  for(const r of resources){
    const tid=preSimRefId(r.Equipe), oid=effectivePreSimOfferId(r,teamById);
    if(!tid||!oid||!teamById[tid])continue;
    const key=`${tid}|${oid}`;
    counts.set(key,(counts.get(key)||0)+1);
    preByOffer.set(oid,(preByOffer.get(oid)||0)+1);
  }

  const offerRows=[];
  const byTeam=new Map();
  let allocatedBudget=0;

  for(const [oid,a] of allocByOffer){
    const totalNamed=preByOffer.get(oid)||0;
    if(!totalNamed)continue;

    const offer=D.offerById[oid]||{};
    const provider=D.providerById[+offer.Fournisseur]||{};

    for(const t of teams){
      const n=counts.get(`${+t.id}|${oid}`)||0;
      if(!n)continue;

      const share=a.budget*(n/totalNamed);
      allocatedBudget+=share;

      offerRows.push({
        teamId:+t.id,
        team:t.Nom||`Équipe #${t.id}`,
        teamOrder:+t.Ordre||9999,
        offerId:oid,
        offer:offer.Nom||`Offre #${oid}`,
        provider:provider.Nom||"",
        licenses:n,
        budget:share
      });

      const row=byTeam.get(+t.id)||{
        teamId:+t.id,
        team:t.Nom||`Équipe #${t.id}`,
        licenses:0,
        budget:0,
        order:+t.Ordre||9999
      };
      row.licenses+=n;
      row.budget+=share;
      byTeam.set(+t.id,row);
    }
  }

  offerRows.sort((a,b)=>a.teamOrder-b.teamOrder||String(a.team).localeCompare(String(b.team),'fr')||String(a.provider).localeCompare(String(b.provider),'fr')||String(a.offer).localeCompare(String(b.offer),'fr'));

  const domainBudget=allocs.reduce((s,a)=>s+(+a.Budget_Total_USD||0),0);
  const scenarioLicenses=allocs.reduce((s,a)=>s+(+a.Nb_Licences||0),0);
  const matchedNamed=[...preByOffer.entries()]
    .filter(([oid])=>allocByOffer.has(oid))
    .reduce((s,[,n])=>s+n,0);

  const rows=[...byTeam.values()].sort((a,b)=>a.order-b.order||String(a.team).localeCompare(String(b.team),'fr'));
  const domainModel=m.bd?.[+domainId]||{};
  const months=Math.max(1,+m.months||12);
  const rate=+m.rate||0;
  const baselineAnnual=+domainModel.baselineAnnual||0;
  const totalTeamLicenses=rows.reduce((s,r)=>s+(+r.licenses||0),0);

  // V78 : coût équivalent annuel par équipe + comparaison N-1.
  // La baseline N-1 n'existe qu'au niveau domaine. On la ventile donc entre les équipes
  // au prorata du nombre de licences/ressources nominatives de la pré-simulation.
  rows.forEach(r=>{
    r.periodCostEUR=(+r.budget||0)*rate;
    r.annualEquivalentEUR=r.periodCostEUR*12/months;
    r.baselineAnnualEUR=0;
    r.savingAnnualEUR=0;
    r.savingPct=0;
  });

  return{
    fiche,
    rows,
    offerRows,
    domainBudget,
    allocatedBudget,
    unallocatedBudget:Math.max(0,domainBudget-allocatedBudget),
    scenarioLicenses,
    preSimLicenses:resources.length,
    matchedNamed,
    exactScenario:+fiche.Scenario_Reference===scenarioId,
    baselineAnnual,
    months
  };
}
function scenarioDomainTeamBudgetHtml(m,domainId){
  const x=domainTeamBudgetBreakdown(m,+domainId);
  if(!x||!x.offerRows.length)return "";
  const coverage=x.scenarioLicenses?Math.min(1,x.matchedNamed/x.scenarioLicenses):1;
  const coveragePct=Math.round(coverage*100);

  return `<div class="scenario-team-budget">
    <div class="scenario-team-budget-head">
      <div>
        <span class="domain-label">PRÉ-SIMULATION</span>
        <h4>Répartition budgétaire par équipe et par offre</h4>
        <p>${esc(x.fiche.Nom||`Pré-simulation #${x.fiche.id}`)} · ${x.preSimLicenses} ressource(s) nominative(s)${x.exactScenario?" · liée à ce scénario":" · dernière pré-simulation disponible pour ce domaine"}</p>
      </div>
      <span class="badge ${coveragePct>=100?'ok':'warn'}">Couverture : ${coveragePct}%</span>
    </div>

    <div class="tablewrap"><table class="scenario-team-budget-table">
      <thead><tr>
        <th>Équipe</th>
        <th>Fournisseur</th>
        <th>Type d'offre</th>
        <th>Licences</th>
        <th>Budget USD</th>
        <th>Budget EUR</th>
        <th>Part du domaine</th>
      </tr></thead>
      <tbody>
        ${x.offerRows.map(r=>`<tr>
          <td><b>${esc(r.team)}</b></td>
          <td>${esc(r.provider)}</td>
          <td>${esc(r.offer)}</td>
          <td class="num"><b>${num(r.licenses)}</b></td>
          <td class="num"><b>${money(r.budget)}</b></td>
          <td class="num">${money(r.budget*(+m.rate||0),'EUR')}</td>
          <td class="num">${pct(x.domainBudget?r.budget/x.domainBudget:0)}</td>
        </tr>`).join("")}
        <tr class="total">
          <td colspan="3">TOTAL RÉPARTI</td>
          <td class="num">${num(x.offerRows.reduce((s,r)=>s+r.licenses,0))}</td>
          <td class="num">${money(x.allocatedBudget)}</td>
          <td class="num">${money(x.allocatedBudget*(+m.rate||0),'EUR')}</td>
          <td class="num">${pct(x.domainBudget?x.allocatedBudget/x.domainBudget:0)}</td>
        </tr>
      </tbody>
    </table></div>

    <div class="scenario-team-totals">
      ${x.rows.map(r=>`<div class="scenario-team-total-card">
        <span>${esc(r.team)}</span>
        <small>${num(r.licenses)} licence(s) toutes offres</small>
        <b>${money(r.budget)} <small>≈ ${money(r.budget*(+m.rate||0),'EUR')}</small></b>
      </div>`).join("")}
    </div>

    <div class="scenario-team-annual"><div class="scenario-team-annual-head"><h4>Coût équivalent annuel par équipe</h4><p>Coût d’achat des licences ramené sur 12 mois. Le ROI N-1 est calculé au niveau Domaine / Service dans l’onglet ROI.</p></div><div class="tablewrap"><table class="scenario-team-annual-table"><thead><tr><th>Équipe</th><th>Licences</th><th>Coût équivalent annuel</th></tr></thead><tbody>${x.rows.map(r=>`<tr><td><b>${esc(r.team)}</b></td><td class="num">${num(r.licenses)}</td><td class="num"><b>${money(r.annualEquivalentEUR,'EUR')}</b></td></tr>`).join("")}</tbody></table></div></div>

    <p class="scenario-team-budget-note">Le détail par équipe n'apparaît que lorsqu'une pré-simulation enregistrée du domaine contient effectivement des équipes et des ressources. Il affiche les licences par équipe et par offre, ainsi que le coût équivalent annuel des licences par équipe.${x.unallocatedBudget>0.01?` <b>${money(x.unallocatedBudget)}</b> restent non répartis (offres ou licences non couvertes par la pré-simulation).`:""}</p>
  </div>`;
}
function renderDashboard(){
  const opts=dashboardFilterOptions();
  const m=model(selectedScenario()?.id,DASH_FILTER);
  const el=document.getElementById('v-dashboard');
  const offers=Object.values(m.bo),domains=Object.values(m.bd).sort((a,b)=>b.total-a.total);
  const unresolved=m.unresolved?`<span class="badge warn">${m.unresolved} ${compareLabelV71("tarif(s) à confirmer")}</span>`:'<span class="badge ok">Tous les tarifs chiffrés</span>';
  const selectedDomainSet=new Set((DASH_FILTER.domainIds||[]).map(Number));
  const activeDomains=opts.domains.filter(d=>selectedDomainSet.has(+d.id));
  const activeProvider=opts.providers.find(p=>+p.id===+DASH_FILTER.providerId);
  const domainSummary=activeDomains.length?activeDomains.map(d=>d.Nom).join(', '):'Tous les domaines';
  const filterSummary=[`Domaines : ${esc(domainSummary)}`,activeProvider?`Fournisseur : ${esc(activeProvider.Nom)}`:'Tous les fournisseurs'].join(' · ');
  el.innerHTML=`<div class="dashboard-filters read-only-exempt"><div class="filter-title"><b>Filtres du tableau de bord</b><span>${filterSummary}</span></div><div class="field dash-domain-field"><span class="field-label">Domaines</span><div class="dash-domain-picker"><button id="dashDomainPickerBtn" class="btn secondary dash-domain-btn">${activeDomains.length?`${activeDomains.length} domaine(s) sélectionné(s)`:'Tous les domaines'} ▾</button><div id="dashDomainMenu" class="dash-domain-menu hidden"><div class="dash-domain-actions"><button id="dashAllDomains" class="mini-btn">Tous</button><button id="dashNoDomains" class="mini-btn">Aucun</button></div>${opts.domains.map(d=>`<label class="dash-domain-option"><input type="checkbox" data-dash-domain="${d.id}" ${selectedDomainSet.has(+d.id)?'checked':''}><span>${esc(d.Nom)}</span></label>`).join('')}</div></div></div><label class="field">Fournisseur<select id="dashProviderFilter"><option value="0">Tous les fournisseurs</option>${opts.providers.map(p=>`<option value="${p.id}" ${+DASH_FILTER.providerId===+p.id?'selected':''}>${esc(p.Nom)}</option>`).join('')}</select></label><button id="dashResetFilters" class="btn secondary">Réinitialiser</button></div><div class="kpis"><div class="kpi"><div class="v">${num(m.licenses)}</div><div class="l">Licences</div></div><div class="kpi"><div class="v">${money(m.fixed)}</div><div class="l">Abonnements fixes</div></div><div class="kpi"><div class="v">${money(m.included)}</div><div class="l">Usage inclus valorisé</div></div><div class="kpi"><div class="v">${money(m.over)}</div><div class="l">Consommation supplémentaire</div></div><div class="kpi"><div class="v">${money(m.total)}</div><div class="l">Budget connu USD</div></div><div class="kpi"><div class="v">${money(m.total*m.rate,'EUR')}</div><div class="l">Budget connu EUR</div></div></div><div class="kpis roi-kpis"><div class="kpi roi"><div class="v">${money(m.baselineAnnual,'EUR')}</div><div class="l">Baseline N-1 annuelle</div></div><div class="kpi roi"><div class="v">${money(m.budgetAnnualizedEUR,'EUR')}</div><div class="l">Licences annualisées</div></div><div class="kpi roi"><div class="v ${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</div><div class="l">Économie annuelle</div></div><div class="kpi roi"><div class="v ${m.savingPct<0?'negative':''}">${pct(m.savingPct)}</div><div class="l">Taux d'économie</div></div></div><div class="card">${unresolved}</div><div class="grid2"><article class="card"><h3>Budget par fournisseur</h3><div id="providerDonut" class="donutlayout"></div></article><article class="card"><h3>Budget par domaine</h3><div id="domainBars"></div></article></div><article class="card"><h3>Vue budgétaire par offre</h3><p>Abonnement fixe, usage inclus, overage et ventilation fournisseur.</p><div class="tablewrap"><table><thead><tr><th>Fournisseur</th><th>Offre</th><th>Licences</th><th>Fixe</th><th>Usage inclus</th><th>Overage</th><th>Total USD</th><th>Total EUR</th><th>Statut</th></tr></thead><tbody>${offers.map(x=>`<tr class="${x.unresolved?'unresolved':''}"><td class="provider">${esc(x.p.Nom)}</td><td>${esc(x.o.Nom)}</td><td class="num">${num(x.licenses)}</td><td class="num">${money(x.fixed)}</td><td class="num">${money(x.included)}</td><td class="num">${money(x.over)}</td><td class="num"><b>${money(x.total)}</b></td><td class="num">${money(x.total*m.rate,'EUR')}</td><td>${x.unresolved?'<span class="badge warn">Devis à confirmer</span>':`<span class="badge ok">${esc(uiLabelValue("compare","Chiffré"))}</span>`}</td></tr>`).join('')}<tr class="total"><td colspan="6">TOTAL CONNU</td><td class="num">${money(m.total)}</td><td class="num">${money(m.total*m.rate,'EUR')}</td><td>${unresolved}</td></tr></tbody></table></div></article><article class="card"><h3>Ventilation par domaine</h3><div class="tablewrap"><table><thead><tr><th>Domaine</th><th>Budget USD</th><th>Budget EUR</th><th>Part</th></tr></thead><tbody>${domains.map(x=>`<tr><td><b>${esc(x.d.Nom)}</b></td><td class="num">${money(x.total)}</td><td class="num">${money(x.eur,'EUR')}</td><td class="num">${pct(m.total?x.total/m.total:0)}</td></tr>`).join('')}</tbody></table></div></article>`;
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
function renderSimulation(){const el=document.getElementById('v-simulation'),m=CURRENT;const activeScenario=selectedScenario();el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Allocations du scénario</h3><p>Scénario actif : <b>${esc(activeScenario?.Nom||'—')}</b> · ${m.alloc.length} allocation(s) liée(s). Une ligne = un domaine + une offre.</p></div><div class="table-actions"><button id="saveAllAlloc" class="btn primary">Enregistrer les modifications</button><button id="addAlloc" class="btn secondary">+ Ajouter une allocation</button></div></div><div class="tablewrap"><table><thead><tr><th>Domaine</th><th>Fournisseur</th><th>Offre</th><th>Licences</th><th>Mois facturés</th><th>Engagement</th><th>Tarif négocié mensuel</th><th>Tarif négocié annuel</th><th>Overage prévu /mois/lic.</th><th>Plafond overage</th><th>Total</th><th></th></tr></thead><tbody>${m.alloc.map(a=>allocRow(a)).join('')}</tbody></table></div></article><article id="newAllocCard" class="card hidden"></article>`;document.getElementById('addAlloc').onclick=showNewAlloc;document.getElementById('saveAllAlloc').onclick=saveAllAllocations;document.querySelectorAll('.delAlloc').forEach(b=>b.onclick=()=>delRecord(T.alloc,+b.dataset.id));document.querySelectorAll('.openPreSimLink').forEach(b=>b.onclick=()=>openPreSimulationForScenarioDomainV60(+b.dataset.scenario,+b.dataset.domain))}

function allocRow(a){
  const o=D.offerById[a.Offre],p=D.providerById[o?.Fournisseur],d=D.domainById[a.Domaine];
  const sid=+CURRENT?.s?.id||+a.Scenario||0;
  const linked=preSimMatchesForScenarioDomain(sid,+a.Domaine);
  const preLink=linked.length?`<button type="button" class="presim-link-btn openPreSimLink" data-scenario="${sid}" data-domain="${+a.Domaine}" title="Ouvrir la pré-simulation nominative de ${esc(d?.Nom||'ce domaine')}">👥${linked.length>1?`<span class="presim-link-count">${linked.length}</span>`:''}</button>`:'';
  return`<tr data-id="${a.id}" class="${a.Tarif_A_Confirmer?'unresolved':''}"><td><b>${esc(d?.Nom)}</b>${preLink}</td><td>${esc(p?.Nom)}</td><td>${esc(o?.Nom)}</td><td><input class="editor" data-f="Nb_Licences" type="number" min="0" value="${+a.Nb_Licences||0}"></td><td><input class="editor" data-f="Mois_Factures" type="number" min="0" value="${+a.Mois_Factures||0}"></td><td><input class="editor" data-f="Engagement_Mois" type="number" min="0" value="${+a.Engagement_Mois||0}"></td><td><input class="editor" data-f="Tarif_Negocie_Mensuel" type="number" min="0" step="0.01" value="${+a.Tarif_Negocie_Mensuel||0}"></td><td><input class="editor" data-f="Tarif_Negocie_Annuel" type="number" min="0" step="0.01" value="${+a.Tarif_Negocie_Annuel||0}"></td><td><input class="editor" data-f="Usage_Supplementaire_Prevu_Mois_Licence" type="number" min="0" step="1" value="${+a.Usage_Supplementaire_Prevu_Mois_Licence||0}"></td><td><input class="editor" data-f="Plafond_Overage_Mois_Licence" type="number" step="1" value="${Number(a.Plafond_Overage_Mois_Licence??-1)}" title="-1 = sans plafond, 0 = aucun overage"></td><td class="num"><b>${a.Tarif_A_Confirmer?'À chiffrer':money(a.Budget_Total_USD)}</b></td><td><button class="btn small danger delAlloc" data-id="${a.id}" title="Supprimer cette allocation">×</button></td></tr>`;
}

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
  D=await fetchAll();
  deriveAccess();
  populateScenario(previousScenarioId);
  CURRENT=model(selectedScenario()?.id);
  renderAll();
  applyUILabelsSafe?.();
}

let COMPARE_SELECTED_IDS=[];
function synthesisMoneyV64(usd,rate,{strong=false}={}){
  const u=Number(usd||0),r=Number(rate||0);
  const usdHtml=strong?`<b>${money(u)}</b>`:money(u);
  const eur=r?`<small class="synth-eur">≈ ${money(u*r,'EUR')}</small>`:'';
  return `<span class="synth-money">${usdHtml}${eur}</span>`;
}
function ensureSynthesisCurrencyStylesV64(){
  if(document.getElementById('synthesis-currency-v64-style'))return;
  const st=document.createElement('style');st.id='synthesis-currency-v64-style';st.textContent=`
    .synth-money{display:inline-flex;flex-direction:column;align-items:flex-end;line-height:1.18}
    .synth-eur{display:block;margin-top:2px;font-size:.7em;font-weight:600;color:#667085;white-space:nowrap}
    .scenario-budget .synth-money{align-items:flex-start}
    .cost-split-labels .synth-money{display:inline-flex;align-items:flex-start}
    .detail-kpis .synth-money{align-items:flex-start}
    .domain-totals .synth-money,.detail-grand-total .synth-money{align-items:flex-end}
    .detail-budget-grid{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:12px;margin:14px 0 18px}
    .detail-budget-card{border:1px solid #dbe3ef;border-radius:12px;padding:12px;background:#fff;min-width:0}
    .detail-section-title.compact{margin:0 0 10px}.detail-section-title.compact>span{font-size:.72rem}
    .detail-domain-budget{display:flex;flex-direction:column;gap:10px}.detail-domain-budget-row{display:grid;grid-template-columns:minmax(130px,1fr) minmax(100px,1.8fr) auto;align-items:center;gap:10px}
    .detail-domain-budget-label{display:flex;justify-content:space-between;gap:8px;min-width:0}.detail-domain-budget-label b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.detail-domain-budget-label span{color:#667085;font-size:.72rem}
    .detail-domain-budget-track{height:9px;border-radius:99px;background:#edf1f6;overflow:hidden}.detail-domain-budget-track>span{display:block;height:100%;border-radius:99px;background:#635bdb}
    .detail-domain-budget-values{text-align:right}.detail-budget-offer-table tfoot td{font-weight:800;background:#f8fafc}
    @media(max-width:980px){.detail-budget-grid{grid-template-columns:1fr}.detail-domain-budget-row{grid-template-columns:minmax(120px,1fr) minmax(90px,1.5fr) auto}}
    @media(max-width:620px){.detail-domain-budget-row{grid-template-columns:1fr auto}.detail-domain-budget-track{grid-column:1/-1}.detail-budget-card{padding:9px}}
    @media(max-width:720px){.synth-eur{font-size:.68em}}
  `;document.head.appendChild(st);
}

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
      domainId:+a.Domaine||0,
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
  return Object.entries(groups).map(([domain,rows])=>{
    const domainId=+rows[0]?.domainId||0;
    const dm=m.bd?.[domainId]||{};
    return {
      domain,
      domainId,
      rows,
      licenses:rows.reduce((s,r)=>s+r.licenses,0),
      fixed:rows.reduce((s,r)=>s+r.fixed,0),
      variable:rows.reduce((s,r)=>s+r.variable,0),
      total:rows.reduce((s,r)=>s+r.total,0),
      annualEquivalentEUR:+dm.budgetAnnualized||0,
      baselineAnnualEUR:+dm.baselineAnnual||0,
      removedAnnualEUR:+dm.removedAnnual||0,
      newAnnualCostEUR:+dm.newAnnualCost||0,
      savingAnnualEUR:+dm.savingAnnual||0,
      savingPct:+dm.savingPct||0
    };
  }).filter(g=>Math.abs(g.fixed)>0.000001||Math.abs(g.variable)>0.000001||Math.abs(g.total)>0.000001);
}
function renderCompare(){
  ensureSynthesisCurrencyStylesV64();
  const el=document.getElementById('v-compare');
  const scenarios=D[T.scenarios]||[];
  if(!COMPARE_SELECTED_IDS.length)COMPARE_SELECTED_IDS=scenarios.slice(0,Math.min(3,scenarios.length)).map(s=>+s.id);
  const selected=new Set(COMPARE_SELECTED_IDS);
  el.innerHTML=`<article class="card synthesis-card">
    <div class="cardhead synthesis-head"><div><h3>${esc(uiLabelValue("compare","Comparer les scénarios"))}</h3><p>${esc(uiLabelValue("compare","Sélectionne jusqu’à 6 scénarios. Clique sur une carte pour ouvrir le détail financier par domaine."))}</p></div>
      <button id="openSynthesisHtml" class="btn primary">🌐 ${esc(uiLabelValue("compare","Ouvrir en HTML"))}</button>
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
  document.getElementById('openSynthesisHtml').onclick=openSynthesisHtmlV42;
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
      <div class="scenario-card-top"><div><span class="scenario-eyebrow">${esc(uiLabelValue("compare","SCÉNARIO"))}</span><h4>${esc(m.s.Nom)}</h4></div>${m.unresolved?`<span class="badge warn">${m.unresolved} à confirmer</span>`:`<span class="badge ok">${esc(uiLabelValue("compare","Chiffré"))}</span>`}</div>
      <div class="scenario-budget">${money(m.total)}</div>
      <div class="scenario-eur">${money(m.total*m.rate,'EUR')}</div>
      <div class="scenario-metrics"><span><b>${num(m.licenses)}</b> ${esc(uiLabelValue("compare","licences"))}</span><span><b>${domainCount}</b> ${esc(uiLabelValue("compare","domaines"))}</span><span><b>${offerCount}</b> ${esc(uiLabelValue("compare","offres"))}</span></div>
      <div class="cost-split"><div class="cost-split-bar"><span class="fixed" style="width:${fixedPct}%"></span><span class="variable" style="width:${100-fixedPct}%"></span></div><div class="cost-split-labels"><span>Fixe ${synthesisMoneyV64(m.fixed,m.rate)}</span><span>Variable ${synthesisMoneyV64(m.over,m.rate)}</span></div></div>
      <div class="scenario-card-footer"><span>${esc(uiLabelValue("compare","Économie annuelle"))} <b class="${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</b></span><strong>${esc(uiLabelValue("compare","Voir le détail →"))}</strong></div>
    </button>`;
  }).join('')}</div>
  `;
  out.querySelectorAll('[data-open-scenario]').forEach(x=>x.onclick=()=>openScenarioDetailV36(+x.dataset.openScenario));
}

function scenarioBudgetViewsV67(m){
  const domainRows=Object.values(m.bd||{})
    .filter(x=>(+x.total||0)>0)
    .sort((a,b)=>(+b.total||0)-(+a.total||0));
  const offerRows=Object.values(m.bo||{})
    .filter(x=>(+x.total||0)>0 || (+x.fixed||0)>0 || (+x.over||0)>0)
    .sort((a,b)=>(+b.total||0)-(+a.total||0));
  const domainMax=Math.max(1,...domainRows.map(x=>+x.total||0));

  const domainHtml=`<section class="detail-budget-card">
    <div class="detail-section-title compact"><span>01A</span><div>
      <h3>${esc(uiLabelValue("compare","Vue budgétaire par domaine"))}</h3>
      <p>${esc(uiLabelValue("compare","Répartition du budget du scénario par domaine."))}</p>
    </div></div>
    <div class="detail-domain-budget">
      ${domainRows.length?domainRows.map(x=>{
        const total=+x.total||0,eur=total*(+m.rate||0);
        const share=m.total?total/m.total:0;
        return `<div class="detail-domain-budget-row">
          <div class="detail-domain-budget-label"><b>${esc(x.d?.Nom||'')}</b><span>${pct(share)}</span></div>
          <div class="detail-domain-budget-track"><span style="width:${Math.max(1,total/domainMax*100)}%"></span></div>
          <div class="detail-domain-budget-values">
            ${synthesisMoneyV64(total,m.rate,{strong:true})}
            <small class="domain-annual-equivalent">Coût équiv. annuel : <b>${money(+x.budgetAnnualized||0,'EUR')}</b> ${roiTip("Coût d'achat des licences ramené sur 12 mois.")}</small>
          </div>
        </div>`;
      }).join(''):`<div class="empty-state">${esc(uiLabelValue("compare","Aucun budget par domaine."))}</div>`}
    </div>
  </section>`;

  const offerHtml=`<section class="detail-budget-card">
    <div class="detail-section-title compact"><span>01B</span><div>
      <h3>${esc(uiLabelValue("compare","Vue budgétaire par offre"))}</h3>
      <p>${esc(uiLabelValue("compare","Abonnement fixe, variable et poids de chaque offre dans le scénario."))}</p>
    </div></div>
    <div class="tablewrap"><table class="detail-budget-offer-table">
      <thead><tr>
        <th>${esc(uiLabelValue("compare","Fournisseur"))}</th>
        <th>${esc(uiLabelValue("compare","Offre"))}</th>
        <th>${esc(uiLabelValue("compare","Licences"))}</th>
        <th>${esc(uiLabelValue("compare","Fixe"))}</th>
        <th>${esc(uiLabelValue("compare","Variable"))}</th>
        <th>${esc(uiLabelValue("compare","Total USD"))}</th>
        <th>${esc(uiLabelValue("compare","Total EUR"))}</th>
        <th>${esc(uiLabelValue("compare","Part"))}</th>
      </tr></thead>
      <tbody>${offerRows.length?offerRows.map(x=>{
        const total=+x.total||0;
        return `<tr>
          <td><b>${esc(x.p?.Nom||'')}</b></td>
          <td>${esc(x.o?.Nom||'')}</td>
          <td class="num">${num(x.licenses||0)}</td>
          <td class="num">${synthesisMoneyV64(+x.fixed||0,m.rate)}</td>
          <td class="num">${synthesisMoneyV64(+x.over||0,m.rate)}</td>
          <td class="num"><b>${money(total)}</b></td>
          <td class="num">${money(total*(+m.rate||0),'EUR')}</td>
          <td class="num">${pct(m.total?total/m.total:0)}</td>
        </tr>`;
      }).join(''):`<tr><td colspan="8">${esc(uiLabelValue("compare","Aucune offre budgétée."))}</td></tr>`}</tbody>
      ${offerRows.length?`<tfoot><tr>
        <td colspan="3">${esc(uiLabelValue("compare","TOTAL CONNU"))}</td>
        <td class="num">${synthesisMoneyV64(m.fixed,m.rate)}</td>
        <td class="num">${synthesisMoneyV64(m.over,m.rate)}</td>
        <td class="num"><b>${money(m.total)}</b></td>
        <td class="num">${money(m.total*(+m.rate||0),'EUR')}</td>
        <td class="num">100 %</td>
      </tr></tfoot>`:''}
    </table></div>
  </section>`;

  return `<div class="detail-budget-grid">${domainHtml}${offerHtml}</div>`;
}

function compareLabelV71(def){return esc(uiLabelValue("compare",def))}
function roiRhScenarioAggregateV85(m){
  const scopes=[];
  for(const dm of Object.values(m.bd||{})){
    const d=dm.d;if(!d)continue;
    const teams=teamRowsForDomainScenario(m,+d.id);
    if(teams.length){for(const t of teams)scopes.push(roiRhComputed(m,+d.id,+t.id));}
    else scopes.push(roiRhComputed(m,+d.id,0));
  }
  const n1=scopes.reduce((s,x)=>s+x.n1.cost,0),n=scopes.reduce((s,x)=>s+x.n.cost,0),lic=scopes.reduce((s,x)=>s+x.licenseAnnual,0);
  const hrSaving=n1-n,totalN=n+lic,gain=n1-totalN,roiPct=n1?gain/n1:0;
  return {n1,n,lic,hrSaving,totalN,gain,roiPct};
}
function roiRhDomainAggregateV85(m,domainId){
  const teams=teamRowsForDomainScenario(m,+domainId);
  const scopes=teams.length?teams.map(t=>roiRhComputed(m,+domainId,+t.id)):[roiRhComputed(m,+domainId,0)];
  const n1=scopes.reduce((s,x)=>s+x.n1.cost,0),n=scopes.reduce((s,x)=>s+x.n.cost,0),lic=scopes.reduce((s,x)=>s+x.licenseAnnual,0);
  const hrSaving=n1-n,totalN=n+lic,gain=n1-totalN,roiPct=n1?gain/n1:0;
  return {n1,n,lic,hrSaving,totalN,gain,roiPct};
}
function scenarioDetailHtmlV36(m,printMode=false){
  const groups=scenarioDomainGroups(m);
  const offerCount=Object.keys(m.bo).length;
  const roi=roiRhScenarioAggregateV85(m);
  return `<div class="scenario-detail-document ${printMode?'print-document':''}">
    <div class="detail-hero">
      <div><span class="scenario-eyebrow">${compareLabelV71("SYNTHÈSE FINOPS IA")}</span><h2>${esc(m.s.Nom)}</h2><div class="detail-meta"><span>${esc(String(m.s.Annee||''))}</span><span>${num(m.months)} mois</span><span>${num(m.licenses)} ${esc(uiLabelValue("compare","licences"))}</span><span>${groups.length} ${esc(uiLabelValue("compare","domaines"))}</span><span>${offerCount} ${esc(uiLabelValue("compare","offres"))}</span>${m.unresolved?`<span class="badge warn">${m.unresolved} ${compareLabelV71("tarif(s) à confirmer")}</span>`:`<span class="badge ok">${esc(uiLabelValue("compare","Chiffré"))}</span>`}</div></div>
      <div class="detail-total"><small>${esc(uiLabelValue("compare","Budget total"))}</small><strong>${money(m.total)}</strong><span>${money(m.total*m.rate,'EUR')}</span></div>
    </div>
    <div class="scenario-roi-summary">
      <div class="scenario-roi-summary-head">
        <div>
          <span class="scenario-eyebrow">ROI ANNUEL</span>
          <h3>Lecture économique du scénario</h3>
        </div>
      </div>
      <div class="scenario-roi-grid">
        <div class="scenario-roi-kpi"><span>RH N-1</span><b>${money(roi.n1,'EUR')}</b></div>
        <div class="scenario-roi-kpi"><span>RH N</span><b>${money(roi.n,'EUR')}</b></div>
        <div class="scenario-roi-kpi"><span>Économie RH</span><b>${money(roi.hrSaving,'EUR')}</b></div>
        <div class="scenario-roi-kpi"><span>Coût annuel licences</span><b>${money(roi.lic,'EUR')}</b></div>
        <div class="scenario-roi-kpi ${roi.gain<0?'negative':''}"><span>Gain net annuel</span><b>${money(roi.gain,'EUR')}</b></div>
        <div class="scenario-roi-kpi roi-primary-kpi ${roi.roiPct<0?'negative':''}"><span>ROI / gain %</span><b>${pct(roi.roiPct)}</b></div>
      </div>
    </div>
    <div class="detail-kpis">
      <div><span>${esc(uiLabelValue("compare","Coûts fixes"))}</span>${synthesisMoneyV64(m.fixed,m.rate,{strong:true})}</div>
      <div><span>${esc(uiLabelValue("compare","Coûts variables"))}</span>${synthesisMoneyV64(m.over,m.rate,{strong:true})}</div>
      <div><span>${esc(uiLabelValue("compare","Budget EUR"))}</span><b>${money(m.total*m.rate,'EUR')}</b></div>
      <div><span>ROI / gain %</span><b class="${roi.roiPct<0?'negative':''}">${pct(roi.roiPct)}</b></div>
    </div>
    <div class="pricing-explainer"><div class="pricing-icon">$</div><div><b>${compareLabelV71("Lecture du coût fixe")}</b><p>${compareLabelV71("Le prix du forfait affiché est le tarif effectivement retenu selon la priorité : négocié sur l’allocation → négocié sur l’offre → référence interne → catalogue. La base de calcul montre comment ce prix contribue au coût fixe.")}</p></div></div>
    ${scenarioBudgetViewsV67(m)}
    <div class="detail-section-title"><span>02</span><div><h3>${esc(uiLabelValue("compare","Détail par domaine"))}</h3><p>${esc(uiLabelValue("compare","Offres, licences, coûts annuels et ROI. Le détail par équipe n'apparaît que lorsqu'une pré-simulation du domaine contient effectivement des équipes ; le niveau Service reste conditionné à la présence de services dans cette pré-simulation."))}</p></div></div>
    <div class="domain-detail-list">${groups.length?groups.map(g=>`<section class="domain-detail-card">
      <div class="domain-detail-head"><div><span class="domain-label">${esc(uiLabelValue("compare","DOMAINE"))}</span><h3>${esc(g.domain)}</h3></div><div class="domain-totals"><span>${num(g.licenses)} ${esc(uiLabelValue("compare","licences"))}</span>${synthesisMoneyV64(g.total,m.rate,{strong:true})}<span class="domain-annual-kpi">Coût équivalent annuel ${roiTip("Coût d'achat des licences ramené sur 12 mois.")} <b>${money(g.annualEquivalentEUR,'EUR')}</b></span></div></div>
      ${(()=>{const dr=roiRhDomainAggregateV85(m,g.domainId);return `<div class="domain-roi-strip">
        <div><span>RH N-1</span><b>${money(dr.n1,'EUR')}</b></div>
        <div><span>RH N</span><b>${money(dr.n,'EUR')}</b></div>
        <div><span>Économie RH</span><b>${money(dr.hrSaving,'EUR')}</b></div>
        <div><span>Coût annuel licences</span><b>${money(dr.lic,'EUR')}</b></div>
        <div class="${dr.gain<0?'negative':''}"><span>Gain net annuel</span><b>${money(dr.gain,'EUR')}</b></div>
        <div class="roi-primary-kpi ${dr.roiPct<0?'negative':''}"><span>ROI / gain %</span><b>${pct(dr.roiPct)}</b></div>
      </div>`})()}
      <div class="tablewrap"><table class="detail-table"><thead><tr><th>${compareLabelV71("Fournisseur")}</th><th>${compareLabelV71("Offre")}</th><th>${compareLabelV71("Licences")}</th><th>${compareLabelV71("Prix forfait")}</th><th>${compareLabelV71("Base calcul fixe")}</th><th>${compareLabelV71("Engagement")}</th><th>${compareLabelV71("Mois facturés")}</th><th>${compareLabelV71("Fixe")}</th><th>${compareLabelV71("Variable")}</th><th>${compareLabelV71("Total")}</th></tr></thead><tbody>${g.rows.map(r=>`<tr><td><b>${esc(r.provider)}</b></td><td>${esc(r.offer)}${r.unresolved?` <span class="badge warn">${compareLabelV71("À confirmer")}</span>`:''}</td><td class="num">${num(r.licenses)}</td><td class="num">${r.unitPrice?synthesisMoneyV64(r.unitPrice,m.rate,{strong:true}):'—'}${r.unitPrice?`<small class="price-period">/ licence / ${esc(r.unitPeriod)}</small><small class="price-source">${esc(r.priceSource)}</small>`:''}</td><td><span class="fixed-basis">${esc(r.fixedBasis)}</span></td><td class="num">${r.engagement?num(r.engagement)+' '+uiLabelValue("compare","mois"):'—'}</td><td class="num">${r.billed?num(r.billed):'—'}</td><td class="num">${synthesisMoneyV64(r.fixed,m.rate)}</td><td class="num">${synthesisMoneyV64(r.variable,m.rate)}</td><td class="num">${synthesisMoneyV64(r.total,m.rate,{strong:true})}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="7">${compareLabelV71("Sous-total")} ${esc(g.domain)}</td><td class="num">${synthesisMoneyV64(g.fixed,m.rate)}</td><td class="num">${synthesisMoneyV64(g.variable,m.rate)}</td><td class="num">${synthesisMoneyV64(g.total,m.rate,{strong:true})}</td></tr></tfoot></table></div>
      ${g.domainId?scenarioDomainTeamBudgetHtml(m,g.domainId):""}
    </section>`).join(''):'<div class="empty-state">${esc(uiLabelValue("compare","Aucune allocation sur ce scénario."))}</div>'}</div>
    <div class="detail-grand-total"><div><span>${esc(uiLabelValue("compare","Total scénario"))}</span><small>${num(m.licenses)} ${compareLabelV71("licences")} · ${groups.length} ${compareLabelV71("domaines")}</small></div><div><b>${money(m.total)}</b><span>${money(m.total*m.rate,'EUR')}</span></div></div>
  </div>`;
}
function openScenarioDetailV36(sid){
  const m=model(sid),host=document.getElementById('scenarioDetailModal');if(!m?.s||!host)return;
  host.innerHTML=`<div class="modal-backdrop scenario-detail-backdrop">
    <div class="scenario-detail-modal" role="dialog" aria-modal="true" aria-label="Détail du scénario">
      <div class="detail-modal-toolbar"><div><b>${esc(uiLabelValue("compare","Détail du scénario"))}</b><span>${esc(uiLabelValue("compare","Vue détaillée"))}</span></div><div class="detail-modal-actions"><button id="closeScenarioDetail" class="btn secondary">${esc(uiLabelValue("compare","Fermer"))}</button><button id="openScenarioHtml" class="btn secondary">🌐 ${esc(uiLabelValue("compare","Ouvrir en HTML"))}</button></div></div>
      <div class="scenario-detail-scroll">${scenarioDetailHtmlV36(m)}</div>
    </div>
  </div>`;
  document.getElementById('closeScenarioDetail').onclick=()=>host.innerHTML='';
  host.querySelector('.scenario-detail-backdrop').onclick=e=>{if(e.target===e.currentTarget)host.innerHTML=''};
  document.getElementById('openScenarioHtml').onclick=()=>openScenarioHtmlV41(sid);
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
      <div><b>${compareLabelV71("Synthèse FinOps IA")}</b><span>${compareLabelV71("Rapport HTML autonome")} · ${esc(m.s.Nom)}</span></div>
      <div class="html-report-actions"><button id="htmlPrint">🖨 ${esc(uiLabelValue("compare","Imprimer / PDF"))}</button><button id="htmlSave">💾 ${esc(uiLabelValue("compare","Enregistrer le fichier HTML"))}</button></div>
    </div>
    <main class="html-report-page">
      <div class="print-cover"><div><h1>${compareLabelV71("Synthèse FinOps IA")}</h1><p>${compareLabelV71("Détail du scénario")} · ${esc(m.s.Nom)}</p></div><div>${compareLabelV71("Édité le")} ${new Date().toLocaleDateString('fr-FR')}</div></div>
      ${scenarioDetailHtmlV36(m,true)}
    <footer class="report-publisher">${esc(uiLabelValue("compare","Éditeur de l’outil"))} : <b>Alex Dufrenot</b></footer></main>`;
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
function synthesisHtmlDocumentV42(ms){
  const L=def=>compareLabelV71(def);
  const reportTitle=`FinOps - ${uiLabelValue("compare","Synthèse des scénarios")}`;
  const filename=`FinOps_Synthese_${new Date().toISOString().slice(0,10)}.html`;
  const summary=`<div class="print-cover"><div><h1>${L("Synthèse FinOps IA")}</h1><p>${ms.length} ${L("scénario(s) sélectionné(s)")}</p></div><div>${L("Édité le")} ${new Date().toLocaleDateString('fr-FR')}</div></div>
    <h2 class="print-section-title">01 · ${L("Synthèse")}</h2>
    <table class="summary-table"><thead><tr>
      <th>${L("Scénario")}</th>
      <th>${L("Licences")}</th>
      <th>${L("Fixe")}</th>
      <th>${L("Variable")}</th>
      <th>${L("Budget USD")}</th>
      <th>${L("Budget EUR")}</th>
      <th>${L("Économie annuelle")}</th>
    </tr></thead><tbody>${ms.map(m=>`<tr>
      <td><b>${esc(m.s.Nom)}</b></td>
      <td class="num">${num(m.licenses)}</td>
      <td class="num">${synthesisMoneyV64(m.fixed,m.rate)}</td>
      <td class="num">${synthesisMoneyV64(m.over,m.rate)}</td>
      <td class="num">${synthesisMoneyV64(m.total,m.rate,{strong:true})}</td>
      <td class="num">${money(m.total*m.rate,'EUR')}</td>
      <td class="num ${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</td>
    </tr>`).join('')}</tbody></table>
    <div class="page-break"></div>
    <h2 class="print-section-title">02 · ${L("Détails des scénarios")}</h2>
    ${ms.map((m,i)=>`${i?'<div class="page-break"></div>':''}${scenarioDetailHtmlV36(m,true)}`).join('')}
    <footer class="report-publisher">${L("Éditeur de l’outil")} : <b>Alex Dufrenot</b></footer>`;

  const body=`<div class="html-report-toolbar no-print">
      <div><b>${L("Synthèse FinOps IA")}</b><span>${L("Rapport HTML autonome")} · ${ms.length} ${L("scénario(s)")}</span></div>
      <div class="html-report-actions"><button id="htmlPrint">🖨 ${L("Imprimer / PDF")}</button><button id="htmlSave">💾 ${L("Enregistrer le fichier HTML")}</button></div>
    </div>
    <main class="html-report-page">${summary}</main>`;

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

function openSynthesisHtmlV42(){
  const ids=compareSelectedIds(),ms=ids.map(model).filter(m=>m?.s);
  if(!ms.length){toast('Sélectionne au moins un scénario.',true);return}
  const w=window.open('','_blank');
  if(!w){toast("Le navigateur a bloqué l’ouverture du rapport HTML.",true);return}
  w.document.open();
  w.document.write(synthesisHtmlDocumentV42(ms));
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
.synth-money{display:inline-flex;flex-direction:column;align-items:flex-end;line-height:1.15}.synth-eur{display:block;margin-top:2px;font-size:8px;font-weight:600;color:#64748b;white-space:nowrap}.report-publisher{margin-top:22px;padding-top:10px;border-top:1px solid #dbe3ef;color:#64748b;font-size:9px;text-align:right}
h1,h2,h3,p{margin-top:0}.print-cover{display:flex;justify-content:space-between;align-items:end;border-bottom:3px solid #5b4df5;padding-bottom:12px;margin-bottom:18px}.print-cover h1{font-size:26px;margin-bottom:4px}.print-cover p{color:#64748b;margin:0}
.scenario-detail-document{max-width:none}.detail-hero{display:flex;justify-content:space-between;gap:20px;padding:18px;border-radius:14px;background:#f5f7ff;margin-bottom:12px}
.detail-budget-grid{display:grid;grid-template-columns:38% 62%;gap:8px;margin:12px 0}.detail-budget-card{border:1px solid #dbe3ef;border-radius:10px;padding:9px}.detail-domain-budget{display:flex;flex-direction:column;gap:6px}.detail-domain-budget-row{display:grid;grid-template-columns:35% 40% 25%;align-items:center;gap:5px}.detail-domain-budget-label{display:flex;justify-content:space-between;gap:4px}.detail-domain-budget-label span{color:#64748b}.detail-domain-budget-track{height:7px;background:#edf1f6;border-radius:99px;overflow:hidden}.detail-domain-budget-track>span{display:block;height:100%;background:#635bdb}.detail-domain-budget-values{text-align:right}.detail-budget-offer-table tfoot td{font-weight:700;background:#f8fafc}.scenario-eyebrow,.domain-label{font-size:9px;letter-spacing:.12em;color:#635bdb;font-weight:700}.detail-hero h2{font-size:24px;margin:5px 0}.detail-meta{display:flex;gap:7px;flex-wrap:wrap}.detail-meta span{padding:4px 7px;border-radius:99px;background:#fff;border:1px solid #dbe3ef}.detail-total{text-align:right}.detail-total small,.detail-total span{display:block;color:#64748b}.detail-total strong{display:block;font-size:25px;margin:4px 0}.detail-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0 18px}.detail-kpis>div{border:1px solid #dbe3ef;border-radius:10px;padding:10px}.detail-kpis span{display:block;color:#64748b}.detail-kpis b{font-size:15px}.detail-section-title{display:flex;gap:10px;align-items:start;margin:16px 0 8px}.detail-section-title>span{font-size:20px;color:#635bdb;font-weight:800}.detail-section-title h3{margin-bottom:2px}.detail-section-title p{color:#64748b}.pricing-explainer{display:flex;gap:8px;padding:9px;border:1px solid #dedcff;border-radius:9px;margin-bottom:12px;background:#f8f7ff}.pricing-icon{width:25px;height:25px;border-radius:7px;background:#635bdb;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700}.pricing-explainer p{margin:2px 0 0;color:#64748b}.price-period,.price-source{display:block;font-size:7px;color:#64748b}.price-source{color:#635bdb}.fixed-basis{font-size:8px;line-height:1.3}
.domain-detail-card{border:1px solid #dbe3ef;border-radius:12px;margin:0 0 12px;overflow:hidden;break-inside:avoid}.domain-detail-head{display:flex;justify-content:space-between;padding:10px 12px;background:#f8fafc}.domain-detail-head h3{margin:2px 0 0}.domain-totals{text-align:right}.domain-totals span,.domain-totals b{display:block}
table{width:100%;border-collapse:separate;border-spacing:0}th,td{padding:10px 12px;border-top:1px solid #e7edf5;text-align:center;vertical-align:middle;line-height:1.35}th{font-size:8px;text-transform:uppercase;color:#64748b;background:#fbfcfe;letter-spacing:.03em}td.num,th.num{text-align:center}tfoot td{font-weight:700;background:#fbfcfe;text-align:center}.detail-grand-total{display:flex;justify-content:space-between;align-items:center;border-top:3px solid #10213e;padding:12px 4px;margin-top:16px}.detail-grand-total span,.detail-grand-total small{display:block}.detail-grand-total b{font-size:22px}.negative{color:#c62828}.badge{display:inline-block;padding:2px 5px;border-radius:99px;font-size:8px}.badge.ok{background:#eaf8ef;color:#08783d}.badge.warn{background:#fff4dd;color:#955900}
.summary-table{width:100%;margin:0 auto 24px}.summary-table th,.summary-table td,.detail-table th,.detail-table td,.detail-budget-offer-table th,.detail-budget-offer-table td,.scenario-team-budget-table th,.scenario-team-budget-table td,.scenario-team-annual-table th,.scenario-team-annual-table td{text-align:center!important;vertical-align:middle;line-height:1.4}.detail-table td,.detail-budget-offer-table td,.scenario-team-budget-table td,.scenario-team-annual-table td{padding-left:12px!important;padding-right:12px!important}.scenario-detail-document p,.scenario-detail-document small,.scenario-detail-document span{line-height:1.4}.scenario-detail-document h2,.scenario-detail-document h3,.scenario-detail-document h4{line-height:1.2}.domain-detail-card,.detail-budget-card,.scenario-roi-summary,.scenario-team-budget{margin-bottom:16px}.domain-detail-head,.detail-section-title,.scenario-team-budget-head,.scenario-roi-summary-head{margin-bottom:12px}.detail-meta{gap:8px 12px}.detail-meta span{padding:3px 0}.summary-table th,.summary-table td{padding:9px}.summary-table tbody tr{break-inside:avoid}.summary-total{font-weight:800;background:#f5f7ff}.page-break{break-before:page}.print-section-title{font-size:18px;margin:18px 0 10px}
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
function roiTip(text){
  return `<span class="roi-hover-help" tabindex="0" aria-label="${esc(text)}"><span class="roi-hover-tooltip" role="tooltip">${esc(text)}</span></span>`;
}
function roiServiceRows(m,domainId){
  const services=preSimServicesForDomain(m.s.id,domainId);if(!services.length)return [];
  const stored=(D[T.roiServices]||[]).filter(r=>+r.Scenario===+m.s.id&&+r.Domaine===+domainId);
  const fiche=savedPreSimWithTeamsForDomain(m.s.id,domainId);
  const resources=fiche?preResourceRows().filter(r=>preSimRefId(r.Pre_Simulation)===+fiche.id&&r.Actif!==false):[];
  const allTeams=fiche?preTeamRows().filter(t=>preSimRefId(t.Pre_Simulation)===+fiche.id&&t.Actif!==false):[];
  const teamById=Object.fromEntries(allTeams.map(t=>[+t.id,t]));
  const domain=m.bd[domainId]||{};
  const totalNamed=Math.max(1,resources.length);
  return services.map(s=>{
    const teamIds=new Set(s.teams.map(t=>+t.id));
    const n=resources.filter(r=>teamIds.has(preSimRefId(r.Equipe))).length;
    const rec=stored.find(r=>String(r.Service||'').trim()===s.name)||{};
    const licenseAnnual=(+domain.budgetAnnualized||0)*(n/totalNamed);
    const n1=+rec.Cout_N_1_Annuel_EUR||0,removed=+rec.Cout_Supprime_Annuel_EUR||0;
    const newCost=n1-removed+licenseAnnual,saving=removed-licenseAnnual;
    return {id:+rec.id||0,service:s.name,licenses:n,licenseAnnual,n1,removed,newCost,saving,savingPct:n1?saving/n1:0};
  });
}

function roiRhRows(){
  return (D[T.roiRh]||[]).filter(r=>r.Actif!==false);
}
function roiRhScopeRows(scenarioId,domainId,teamId=0){
  return roiRhRows().filter(r=>
    +r.Scenario===+scenarioId &&
    +r.Domaine===+domainId &&
    (+r.Equipe||0)===(+teamId||0)
  );
}
function roiRhGroupCost(rows,period,daysDefault){
  const periodRows=rows.filter(r=>String(r.Periode||'').toUpperCase()===period);
  let cost=0,resources=0;
  for(const r of periodRows){
    const n=+r.Nb_Ressources||0;
    const tjm=+r.TJM_EUR||0;
    const days=(+r.Jours_Annuels||0)||(+daysDefault||0);
    resources+=n;
    cost+=n*tjm*days;
  }
  return {rows:periodRows,cost,resources};
}
function teamRowsForDomainScenario(m,domainId){
  const fiche=savedPreSimWithTeamsForDomain(+m.s?.id||0,+domainId);
  if(!fiche)return [];
  const teams=preTeamRows().filter(t=>preSimRefId(t.Pre_Simulation)===+fiche.id&&t.Actif!==false);
  const resources=preResourceRows().filter(r=>preSimRefId(r.Pre_Simulation)===+fiche.id&&r.Actif!==false);
  if(!teams.length||!resources.length)return [];
  const activeTeamIds=new Set(resources.map(r=>preSimRefId(r.Equipe)).filter(Boolean));
  return teams.filter(t=>activeTeamIds.has(+t.id)).sort((a,b)=>(+a.Ordre||9999)-(+b.Ordre||9999)||String(a.Nom||'').localeCompare(String(b.Nom||''),'fr'));
}
function annualLicenseCostForScope(m,domainId,teamId=0){
  const dm=m.bd?.[+domainId]||{};
  if(!teamId)return +dm.budgetAnnualized||0;
  const x=domainTeamBudgetBreakdown(m,+domainId);
  if(!x)return 0;
  const row=x.rows.find(r=>+r.teamId===+teamId);
  return +row?.annualEquivalentEUR||0;
}
function roiRhComputed(m,domainId,teamId=0){
  const dm=m.bd?.[+domainId]||{};
  const daysDefault=+dm.days||+m.s?.Nb_Jours_Ouvres_Annuels||0;
  const rows=roiRhScopeRows(+m.s?.id||0,+domainId,+teamId);
  const n1=roiRhGroupCost(rows,"N-1",daysDefault);
  const n=roiRhGroupCost(rows,"N",daysDefault);
  const licenseAnnual=annualLicenseCostForScope(m,+domainId,+teamId);
  const hrSaving=n1.cost-n.cost;
  const totalN=n.cost+licenseAnnual;
  const gain=n1.cost-totalN;
  const roiPct=n1.cost?gain/n1.cost:0;
  return {rows,n1,n,licenseAnnual,hrSaving,totalN,gain,roiPct,daysDefault};
}
function roiRhScopeLabel(domain,team){
  return team?`${domain} · ${team}`:domain;
}
function roiRhPaliersTable(scopeKey,period,rows,daysDefault){
  const label=period==="N-1"?"RH N-1":"RH N";
  return `<section class="roi-rh-period">
    <div class="roi-rh-period-head">
      <div><span class="scenario-eyebrow">${label}</span><h4>${label}</h4></div>
      <button type="button" class="mini-btn read-only-exempt" data-roi-rh-add="${scopeKey}" data-period="${period}">+ Ajouter un palier</button>
    </div>
    <div class="tablewrap"><table class="roi-rh-table">
      <thead><tr><th>Nb ressources</th><th>TJM EUR</th><th>Jours/an</th><th>Coût RH annuel</th><th></th></tr></thead>
      <tbody>
        ${rows.length?rows.map(r=>{
          const days=(+r.Jours_Annuels||0)||daysDefault;
          const cost=(+r.Nb_Ressources||0)*(+r.TJM_EUR||0)*days;
          return `<tr data-roi-rh-row data-id="${r.id}" data-scope="${scopeKey}" data-period="${period}">
            <td><input class="admin-input" data-f="Nb_Ressources" type="number" min="0" step="0.1" value="${+r.Nb_Ressources||0}"></td>
            <td><input class="admin-input" data-f="TJM_EUR" type="number" min="0" step="1" value="${+r.TJM_EUR||0}"></td>
            <td><input class="admin-input" data-f="Jours_Annuels" type="number" min="0" step="1" value="${+r.Jours_Annuels||0}" placeholder="${daysDefault||0}"></td>
            <td class="num"><b>${money(cost,'EUR')}</b></td>
            <td><button type="button" class="mini-btn danger read-only-exempt" data-roi-rh-del="${r.id}">×</button></td>
          </tr>`;
        }).join(""):`<tr><td colspan="5">Aucun palier ${label}.</td></tr>`}
      </tbody>
    </table></div>
  </section>`;
}
function roiRhScopeCard(m,domain,team=null){
  const domainId=+domain.id,teamId=+team?.id||0;
  const x=roiRhComputed(m,domainId,teamId);
  const scopeKey=`${domainId}|${teamId}`;
  return `<article class="card roi-rh-scope" data-roi-rh-scope="${scopeKey}">
    <div class="cardhead">
      <div>
        <h3>${esc(roiRhScopeLabel(domain.Nom||"Domaine",team?.Nom||""))}</h3>
        <p>${team?"Comparaison RH par équipe.":"Comparaison RH au niveau du domaine."}</p>
      </div>
    </div>
    <div class="roi-rh-period-grid">
      ${roiRhPaliersTable(scopeKey,"N-1",x.n1.rows,x.daysDefault)}
      ${roiRhPaliersTable(scopeKey,"N",x.n.rows,x.daysDefault)}
    </div>
    <div class="roi-rh-summary">
      <div><span>RH N-1</span><b>${money(x.n1.cost,'EUR')}</b></div>
      <div><span>RH N</span><b>${money(x.n.cost,'EUR')}</b></div>
      <div><span>Économie RH</span><b class="${x.hrSaving<0?'negative':''}">${money(x.hrSaving,'EUR')}</b></div>
      <div><span>Coût annuel licences</span><b>${money(x.licenseAnnual,'EUR')}</b></div>
      <div><span>Coût total N</span><b>${money(x.totalN,'EUR')}</b></div>
      <div><span>Gain net annuel</span><b class="${x.gain<0?'negative':''}">${money(x.gain,'EUR')}</b></div>
      <div><span>ROI / gain %</span><b class="${x.roiPct<0?'negative':''}">${pct(x.roiPct)}</b></div>
    </div>
  </article>`;
}
async function saveRoiRhV84(){
  const actions=[];
  document.querySelectorAll('[data-roi-rh-row]').forEach(tr=>{
    const id=+tr.dataset.id||0;
    const fields={};
    tr.querySelectorAll('[data-f]').forEach(inp=>{
      fields[inp.dataset.f]=+inp.value||0;
    });
    if(id)actions.push(["UpdateRecord",T.roiRh,id,fields]);
  });
  if(!actions.length){toast("Aucune modification RH à enregistrer.");return}
  try{await apply(actions);toast("Paliers RH enregistrés.");await reload()}catch(e){toast(e.message||String(e),true)}
}
async function addRoiRhPalierV84(scopeKey,period){
  const [domainId,teamId]=String(scopeKey).split("|").map(Number);
  const fields={
    Scenario:+CURRENT.s.id,
    Domaine:+domainId,
    Equipe:+teamId||0,
    Periode:period,
    Nb_Ressources:0,
    TJM_EUR:0,
    Jours_Annuels:0,
    Actif:true
  };
  try{await apply([["AddRecord",T.roiRh,null,fields]]);await reload();toast("Palier RH ajouté.")}catch(e){toast(e.message||String(e),true)}
}
async function deleteRoiRhPalierV84(id){
  try{await apply([["RemoveRecord",T.roiRh,+id]]);await reload();toast("Palier RH supprimé.")}catch(e){toast(e.message||String(e),true)}
}

function renderROI(){
  const el=document.getElementById('v-roi'),m=CURRENT;
  const domains=Object.values(m.bd||{}).map(x=>x.d).filter(Boolean);
  const cards=[];
  for(const d of domains){
    const teams=teamRowsForDomainScenario(m,+d.id);
    if(teams.length){
      for(const t of teams)cards.push(roiRhScopeCard(m,d,t));
    }else{
      cards.push(roiRhScopeCard(m,d,null));
    }
  }

  const allComputed=[];
  for(const d of domains){
    const teams=teamRowsForDomainScenario(m,+d.id);
    if(teams.length){
      for(const t of teams)allComputed.push(roiRhComputed(m,+d.id,+t.id));
    }else allComputed.push(roiRhComputed(m,+d.id,0));
  }

  const totalN1=allComputed.reduce((s,x)=>s+x.n1.cost,0);
  const totalN=allComputed.reduce((s,x)=>s+x.n.cost,0);
  const totalLic=allComputed.reduce((s,x)=>s+x.licenseAnnual,0);
  const hrSaving=totalN1-totalN;
  const gain=totalN1-(totalN+totalLic);
  const roiPct=totalN1?gain/totalN1:0;

  el.innerHTML=`
    <div class="kpis roi-kpis">
      <div class="kpi roi"><div class="v">${money(totalN1,'EUR')}</div><div class="l">RH N-1</div></div>
      <div class="kpi roi"><div class="v">${money(totalN,'EUR')}</div><div class="l">RH N</div></div>
      <div class="kpi roi"><div class="v ${hrSaving<0?'negative':''}">${money(hrSaving,'EUR')}</div><div class="l">Économie RH</div></div>
      <div class="kpi roi"><div class="v">${money(totalLic,'EUR')}</div><div class="l">Coût annuel licences</div></div>
      <div class="kpi roi"><div class="v ${gain<0?'negative':''}">${money(gain,'EUR')}</div><div class="l">Gain net annuel</div></div>
      <div class="kpi roi"><div class="v ${roiPct<0?'negative':''}">${pct(roiPct)}</div><div class="l">ROI / gain %</div></div>
    </div>
    <article class="card roi-rh-explainer">
      <div class="cardhead"><div><h3>Comparaison RH N-1 / N</h3><p>Chaque ligne représente un regroupement de ressources partageant un même TJM. Le coût RH annuel d'un palier = nombre de ressources × TJM × jours/an.</p></div><button id="saveRoiRh" class="btn primary read-only-exempt">Enregistrer les modifications</button></div>
      <div class="roi-formulas">
        <span>Économie RH = RH N-1 − RH N</span>
        <span>Coût total N = RH N + coût annuel des licences</span>
        <span>Gain net annuel = RH N-1 − coût total N</span>
        <span>ROI / gain % = gain net annuel / RH N-1</span>
      </div>
    </article>
    ${cards.join("")}
  `;

  document.getElementById('saveRoiRh')?.addEventListener('click',saveRoiRhV84);
  document.querySelectorAll('[data-roi-rh-add]').forEach(btn=>btn.onclick=()=>addRoiRhPalierV84(btn.dataset.roiRhAdd,btn.dataset.period));
  document.querySelectorAll('[data-roi-rh-del]').forEach(btn=>btn.onclick=()=>deleteRoiRhPalierV84(+btn.dataset.roiRhDel));
  applyUILabelsSafe?.();
}
function preSimulationRows(){ return D[T.preSim]||[]; }
function preResourceRows(){ return D[T.preRes]||[]; }
function preTeamRows(){ return D[T.preTeams]||[]; }


function preSimEmail(){return String(ACCESS.currentEmail||currentRightRow()?.Email||'').trim().toLowerCase()}
function tokenHasEmail(token,email=preSimEmail()){
  const e=String(email||'').trim().toLowerCase();if(!e)return false;
  return String(token||'').toLowerCase().includes(`|${e}|`);
}
function preSimCanView(fiche){
  if(!fiche)return false;
  if(isOwner())return true;
  if(!ACCESS.domainIds.includes(+fiche.Domaine))return false;
  return tokenHasEmail(fiche.Acces_Lecture_Emails)||tokenHasEmail(fiche.Acces_Modification_Emails);
}
function preSimCanModify(fiche){
  if(!fiche)return false;
  if(isOwner())return true;
  if(!roleCanEditUserMenus())return false;
  if(!ACCESS.domainIds.includes(+fiche.Domaine))return false;
  return tokenHasEmail(fiche.Acces_Modification_Emails);
}
function preSimCanManageRights(fiche){
  return isOwner()||ACCESS.role===APP_ROLES.ADMINISTRATEUR;
}
function scopedPreSimulations(){
  // V63 : aucune fiche non autorisée ne doit apparaître dans la liste,
  // même si elle est techniquement présente dans les données chargées par le widget.
  return preSimulationRows().filter(fiche=>{
    if(isOwner())return true;
    if(!ACCESS.domainIds.includes(+fiche.Domaine))return false;
    return preSimCanView(fiche);
  });
}

function selectedPreSimulation(){
  if(PRESIM_DRAFT)return PRESIM_DRAFT;
  const visible=scopedPreSimulations();
  let r=visible.find(x=>+x.id===+PRESIM_SELECTED_ID);
  if(!r){
    PRESIM_SELECTED_ID=0;
    if(visible.length){
      r=visible[0];
      PRESIM_SELECTED_ID=+r.id;
    }
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
    Responsable_User:+currentRightRow()?.id||0,
    Responsable_Email:preSimEmail(),
    Acces_Lecture_Emails:preSimEmail()?`|${preSimEmail()}|`:'',
    Acces_Modification_Emails:preSimEmail()?`|${preSimEmail()}|`:'',
    Commentaire:''
  };
}
function newPreResourceDraft(){
  return {
    __draft:true,
    __key:`pres-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    Nom_Ressource:'',
    Profil:'',
    Equipe:0,
    Offre:0,
    Commentaire:'',
    Actif:true
  };
}
function newPreTeamDraft(){
  return {
    __draft:true,
    __key:`pteam-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    Nom:'Nouvelle équipe',
    Service:'',
    Offre_Defaut:0,
    Ordre:10,
    Actif:true,
    Commentaire:''
  };
}
function preSimOfferOptions(selected=0,inheritLabel='— Choisir une offre —'){
  const offers=(D[T.offers]||[])
    .filter(o=>o.Actif!==false)
    .slice()
    .sort((a,b)=>{
      const pa=D.providerById[+a.Fournisseur]?.Nom||'';
      const pb=D.providerById[+b.Fournisseur]?.Nom||'';
      return pa.localeCompare(pb,'fr') || String(a.Nom||'').localeCompare(String(b.Nom||''),'fr');
    });
  return `<option value="">${esc(inheritLabel)}</option>`+
    offers.map(o=>{
      const provider=D.providerById[+o.Fournisseur];
      return `<option value="${o.id}" ${+selected===+o.id?'selected':''}>${esc(provider?.Nom||'')} — ${esc(o.Nom||'')}</option>`;
    }).join('');
}
function preSimCurrentTeams(fiche){
  if(!fiche)return [];
  const existing=fiche.__draft?[]:preTeamRows()
    .filter(r=>+r.Pre_Simulation===+fiche.id && !PRESIM_REMOVED_TEAM_IDS.includes(+r.id));
  return [...existing,...PRESIM_DRAFT_TEAMS];
}
function preSimCurrentResources(fiche){
  if(!fiche) return [];
  const existing=fiche.__draft ? [] : preResourceRows()
    .filter(r=>+r.Pre_Simulation===+fiche.id && !PRESIM_REMOVED_RESOURCE_IDS.includes(+r.id));
  return [...existing,...PRESIM_DRAFT_RESOURCES];
}
function preSimTeamById(fiche){
  return Object.fromEntries(preSimCurrentTeams(fiche).filter(t=>!t.__draft).map(t=>[+t.id,t]));
}
function effectivePreSimOfferId(resource,teamById){
  if(+resource.Offre)return +resource.Offre;
  const team=teamById[+resource.Equipe];
  return +team?.Offre_Defaut||0;
}
function offerDisplayName(offerId){
  const o=D.offerById[+offerId];if(!o)return '—';
  const p=D.providerById[+o.Fournisseur];
  return `${p?.Nom||''} — ${o.Nom||''}`;
}
function preSimPricingContext(fiche){
  const scenario=D.scenarioById[+fiche?.Scenario_Reference]||{};
  return {months:+scenario.Nb_Mois||12,rate:+scenario.Taux_USD_EUR||0};
}
function preSimOfferPrice(offer){
  if(!offer)return {amount:0,period:'',source:'À confirmer',kind:'monthly'};
  const monthly=[[+offer.Tarif_Negocie_Mensuel||0,'Négocié offre'],[+offer.Tarif_Reference_Mensuel||0,'Référence interne'],[+offer.Tarif_Catalogue_Mensuel||0,'Catalogue']].find(([v])=>v>0)||[0,'À confirmer'];
  const annual=[[+offer.Tarif_Negocie_Annuel||0,'Négocié offre'],[+offer.Tarif_Reference_Annuel||0,'Référence interne'],[+offer.Tarif_Catalogue_Annuel||0,'Catalogue']].find(([v])=>v>0)||[0,'À confirmer'];
  const periodicity=String(offer.Periodicite_Prix||'').toLowerCase();
  if(periodicity.includes('annuel')||(!monthly[0]&&annual[0]))return {amount:annual[0],period:'an',source:annual[1],kind:'annual'};
  return {amount:monthly[0],period:'mois',source:monthly[1],kind:'monthly'};
}
function preSimLicenseBudget(offer,count,fiche){
  const price=preSimOfferPrice(offer),ctx=preSimPricingContext(fiche);
  const total=price.kind==='annual'?price.amount*count*(ctx.months/12):price.amount*count*ctx.months;
  return {...price,total,months:ctx.months,rate:ctx.rate,unresolved:!price.amount};
}
function preSimSummary(resources,teamById,fiche){
  const map=new Map();
  resources.filter(r=>r.Actif!==false).forEach(r=>{
    const oid=effectivePreSimOfferId(r,teamById),offer=D.offerById[oid];if(!offer)return;
    const provider=D.providerById[+offer.Fournisseur],key=String(offer.id);
    const item=map.get(key)||{offerId:+offer.id,provider:provider?.Nom||'',offer:offer.Nom||'',count:0,teamIds:new Set()};
    item.count++;if(+r.Equipe)item.teamIds.add(+r.Equipe);map.set(key,item);
  });
  return [...map.values()].map(x=>({...x,teams:x.teamIds.size,...preSimLicenseBudget(D.offerById[x.offerId],x.count,fiche)})).sort((a,b)=>a.provider.localeCompare(b.provider,'fr')||a.offer.localeCompare(b.offer,'fr'));
}
function preSimTeamSummary(resources,teams,fiche){
  const teamById=Object.fromEntries(teams.filter(t=>!t.__draft).map(t=>[+t.id,t])),map=new Map();
  resources.filter(r=>r.Actif!==false).forEach(r=>{
    const tid=+r.Equipe||0,team=teamById[tid],oid=effectivePreSimOfferId(r,teamById),o=D.offerById[oid],p=D.providerById[+o?.Fournisseur],key=`${tid}|${oid}`;
    const item=map.get(key)||{teamId:tid,offerId:oid,team:team?.Nom||'Sans équipe',provider:p?.Nom||'—',offer:o?.Nom||'Non affectée',count:0,teamOrder:+team?.Ordre||9999};
    item.count++;map.set(key,item);
  });
  return [...map.values()].map(x=>({...x,...preSimLicenseBudget(D.offerById[x.offerId],x.count,fiche)})).sort((a,b)=>a.teamOrder-b.teamOrder||a.team.localeCompare(b.team,'fr')||a.offer.localeCompare(b.offer,'fr'));
}
function preSimTeamBudgets(teamSummary){
  const map=new Map();
  for(const x of teamSummary){const k=String(x.teamId),v=map.get(k)||{teamId:x.teamId,team:x.team,licenses:0,total:0,unresolved:0,teamOrder:x.teamOrder};v.licenses+=x.count;v.total+=x.total;if(x.unresolved)v.unresolved++;map.set(k,v)}
  return [...map.values()].sort((a,b)=>a.teamOrder-b.teamOrder||a.team.localeCompare(b.team,'fr'));
}
function preSimBudgetMoney(x,rate){return x?`${money(x)}${rate?` <small class="presim-eur">≈ ${money(x*rate,'EUR')}</small>`:''}`:'—'}
function preSimMatchesForScenarioDomain(scenarioId,domainId){
  return scopedPreSimulations()
    .filter(p=>+p.Scenario_Reference===+scenarioId && +p.Domaine===+domainId)
    .sort((a,b)=>+b.id-+a.id);
}
function openPreSimulationForScenarioDomainV60(scenarioId,domainId){
  const matches=preSimMatchesForScenarioDomain(scenarioId,domainId);
  if(!matches.length){toast('Aucune pré-simulation nominative liée à ce scénario et ce domaine.',true);return}
  PRESIM_DRAFT=null;PRESIM_DRAFT_RESOURCES=[];PRESIM_REMOVED_RESOURCE_IDS=[];PRESIM_DRAFT_TEAMS=[];PRESIM_REMOVED_TEAM_IDS=[];
  PRESIM_SELECTED_ID=+matches[0].id;
  switchView('presim');
  renderPreSimulation();
  if(matches.length>1)toast(`${matches.length} fiches trouvées : ouverture de la plus récente.`);
}
function ensurePreSimTeamStylesV60(){
  if(document.getElementById('presim-team-v60-style'))return;
  const st=document.createElement('style');st.id='presim-team-v60-style';st.textContent=`
    .presim-link-btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;margin-left:7px;border:1px solid #cbc8ff;background:#f4f3ff;color:#5146d8;border-radius:8px;min-width:30px;height:28px;padding:0 7px;cursor:pointer;font-weight:800}
    .presim-link-btn:hover{background:#eae8ff}.presim-link-count{font-size:.65rem;background:#635bdb;color:white;border-radius:99px;min-width:15px;height:15px;display:inline-flex;align-items:center;justify-content:center}
    .team-management-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}.team-plan-badge{display:inline-block;padding:4px 7px;border-radius:8px;background:#f2f1ff;color:#5146d8;font-size:.72rem;font-weight:700}
    .effective-plan{font-size:.78rem;font-weight:700;color:#344054;min-width:170px}.effective-plan.inherited:before{content:"↳ ";color:#635bdb}
    .team-summary-name{display:flex;align-items:center;gap:7px}.team-dot{width:8px;height:8px;border-radius:50%;background:#635bdb;display:inline-block}
    .presim-access-card{border-color:#dedcff}.presim-access-card .cardhead{background:linear-gradient(135deg,#faf9ff,#fff)}
    @media(max-width:900px){.presim-link-btn{margin-left:4px}.effective-plan{min-width:140px}}
  `;document.head.appendChild(st);
}



function preSimRightsRows(fiche){
  if(!fiche||fiche.__draft)return [];
  return (D[T.preSimRights]||[]).filter(r=>+r.Pre_Simulation===+fiche.id&&!PRESIM_REMOVED_RIGHT_IDS.includes(+r.id));
}
function currentPreSimRights(fiche){return [...preSimRightsRows(fiche),...PRESIM_DRAFT_RIGHTS]}
function rightUserRow(id){return (D[T.rights]||[]).find(r=>+r.id===+id)}
function rightUserEmail(id){return String(rightUserRow(id)?.Email||'').trim().toLowerCase()}
function userHasDomain(right,domainId){
  if(!right||right.Actif===false)return false;
  const ids=refListIds(right.Domaines_Autorises);
  return ids.includes(+domainId)||(+right.Domaine===+domainId);
}
function eligiblePreSimUsers(domainId){
  return (D[T.rights]||[]).filter(r=>userHasDomain(r,domainId)).sort((a,b)=>String(a.Email||'').localeCompare(String(b.Email||''),'fr'));
}
function preSimResponsibleOptions(fiche){
  const eligible=eligiblePreSimUsers(+fiche.Domaine);
  const current=+fiche.Responsable_User||0;
  const rows=[...eligible];
  if(current&&!rows.some(r=>+r.id===current)){
    const r=rightUserRow(current);if(r)rows.unshift(r);
  }
  return `<option value="">— Responsable obligatoire —</option>`+rows.map(r=>`<option value="${r.id}" ${+r.id===current?'selected':''}>${esc(r.Email||'')}</option>`).join('');
}
function buildPreSimAccessTokens(responsibleId,rights){
  const resp=rightUserEmail(responsibleId);
  const read=new Set(),modify=new Set();
  if(resp){read.add(resp);modify.add(resp)}
  (rights||[]).filter(r=>r.Actif!==false).forEach(r=>{
    const email=rightUserEmail(r.Utilisateur);if(!email)return;
    read.add(email);
    if(String(r.Niveau_Acces||'LECTURE').toUpperCase()==='MODIFICATION')modify.add(email);
  });
  const token=set=>[...set].sort().map(e=>`|${e}|`).join('');
  return {read:token(read),modify:token(modify),resp};
}
function resetPreSimDraftStateV62(){
  PRESIM_DRAFT=null;PRESIM_DRAFT_RESOURCES=[];PRESIM_REMOVED_RESOURCE_IDS=[];
  PRESIM_DRAFT_TEAMS=[];PRESIM_REMOVED_TEAM_IDS=[];PRESIM_DRAFT_RIGHTS=[];PRESIM_REMOVED_RIGHT_IDS=[];
}
function addPreSimRightDraftV62(){
  const fiche=selectedPreSimulation();if(!fiche||fiche.__draft)return;
  PRESIM_DRAFT_RIGHTS.push({__draft:true,__key:`pright-${Date.now()}-${Math.random().toString(36).slice(2)}`,Utilisateur:0,Niveau_Acces:'LECTURE',Actif:true,Commentaire:''});
  renderPreSimulation();
}
async function savePreSimRightsV62(){
  const fiche=selectedPreSimulation();
  if(!fiche||fiche.__draft){toast("Enregistre d'abord la fiche.",true);return}
  if(!preSimCanManageRights(fiche)){toast("La gestion des accès est réservée à l’Owner ou à un Administrateur.",true);return}
  const root=document.getElementById('v-presim'),actions=[],virtual=[];
  for(const tr of root.querySelectorAll('tr[data-par-id],tr[data-par-key]')){
    const id=+tr.dataset.parId||0;
    const fields={
      Pre_Simulation:+fiche.id,
      Utilisateur:+tr.querySelector('[data-f="Utilisateur"]')?.value||0,
      Niveau_Acces:String(tr.querySelector('[data-f="Niveau_Acces"]')?.value||'LECTURE'),
      Actif:!!tr.querySelector('[data-f="Actif"]')?.checked,
      Commentaire:String(tr.querySelector('[data-f="Commentaire"]')?.value||'').trim()
    };
    if(!fields.Utilisateur){toast("Choisis un utilisateur pour chaque droit d'accès.",true);return}
    const u=rightUserRow(fields.Utilisateur);
    if(!userHasDomain(u,+fiche.Domaine)){toast(`${u?.Email||'Cet utilisateur'} n'a pas accès au domaine de la fiche.`,true);return}
    virtual.push(fields);
    actions.push(id?["UpdateRecord",T.preSimRights,id,fields]:["AddRecord",T.preSimRights,null,fields]);
  }
  for(const id of [...new Set(PRESIM_REMOVED_RIGHT_IDS)])actions.push(["RemoveRecord",T.preSimRights,id]);
  const authorId=+fiche.Responsable_User||0;
  const tokens=buildPreSimAccessTokens(authorId,virtual);
  actions.push(["UpdateRecord",T.preSim,+fiche.id,{
    Acces_Lecture_Emails:tokens.read,Acces_Modification_Emails:tokens.modify
  }]);
  try{
    await apply(actions);PRESIM_DRAFT_RIGHTS=[];PRESIM_REMOVED_RIGHT_IDS=[];await reload();
    toast("Droits de la pré-simulation enregistrés.");
  }catch(e){toast(e.message||String(e),true)}
}
function presimHtmlDocumentV62(fiche){
  if(!preSimCanView(fiche))return '';
  const teams=preSimCurrentTeams(fiche),resources=preSimCurrentResources(fiche),teamById=preSimTeamById(fiche);
  const teamSummary=preSimTeamSummary(resources,teams,fiche),summary=preSimSummary(resources,teamById,fiche),teamBudgets=preSimTeamBudgets(teamSummary),pricing=preSimPricingContext(fiche);
  const domain=D.domainById[+fiche.Domaine]?.Nom||'';
  const scenario=D.scenarioById[+fiche.Scenario_Reference]?.Nom||'Aucun';
  const resp=rightUserEmail(+fiche.Responsable_User)||fiche.Responsable_Email||'—';
  const resourceRows=resources.filter(r=>r.Actif!==false).map(r=>{
    const team=teamById[+r.Equipe],effective=effectivePreSimOfferId(r,teamById);
    return `<tr><td>${esc(r.Nom_Ressource||'')}</td><td>${esc(r.Profil||'')}</td><td>${esc(team?.Nom||'Sans équipe')}</td><td>${esc(+r.Offre?offerDisplayName(r.Offre):'Hérité')}</td><td><b>${esc(offerDisplayName(effective))}</b></td><td>${esc(r.Commentaire||'')}</td></tr>`;
  }).join('');
  const filename=`FinOps_PreSimulation_${safeFilenameV41(fiche.Nom)}_${new Date().toISOString().slice(0,10)}.html`;
  const css=`*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;background:#eef2f7;color:#10213e}.bar{position:sticky;top:0;display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 18px;background:#10213e;color:white}.bar button{border:0;border-radius:8px;padding:9px 12px;font-weight:700;cursor:pointer}.page{width:min(1400px,calc(100% - 30px));margin:22px auto;background:white;padding:26px;border-radius:16px}.hero{display:flex;justify-content:space-between;gap:20px;padding-bottom:16px;border-bottom:3px solid #635bdb}.hero h1{margin:3px 0}.meta{display:flex;gap:7px;flex-wrap:wrap}.meta span{background:#f3f4f8;padding:5px 8px;border-radius:99px;font-size:12px}.section{margin-top:24px}.section h2{font-size:18px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #e4e9f0;text-align:left;font-size:12px}th{background:#f8fafc}.num{text-align:right}.sig{margin-top:25px;color:#667085;font-size:11px}@media(max-width:720px){.bar{align-items:flex-start;flex-direction:column}.page{width:calc(100% - 10px);margin:5px auto;padding:12px;overflow:auto}.hero{flex-direction:column}table{min-width:760px}}@media print{.bar{display:none}.page{width:auto;margin:0;padding:0;border-radius:0}body{background:white}@page{size:A4 landscape;margin:12mm}}`;
  const body=`<div class="bar"><div><b>Pré-simulation nominative</b><div>${esc(fiche.Nom)}</div></div><div><button id="print">🖨 ${esc(uiLabelValue("compare","Imprimer / PDF"))}</button> <button id="save">💾 ${esc(uiLabelValue("compare","Enregistrer le fichier HTML"))}</button></div></div>
  <main class="page"><div class="hero"><div><small>FINOPS IA · PRÉ-SIMULATION NOMINATIVE</small><h1>${esc(fiche.Nom)}</h1><div class="meta"><span>Domaine : ${esc(domain)}</span><span>Scénario : ${esc(scenario)}</span><span>${esc(uiLabelValue("presim","Auteur"))} : ${esc(resp)}</span><span>Statut : ${esc(fiche.Statut||'')}</span></div></div><div>Édité le ${new Date().toLocaleDateString('fr-FR')}</div></div>
  <section class="section"><h2>${esc(uiLabelValue("presim","Équipes"))}</h2><table><thead><tr><th>Équipe</th><th>Plan par défaut</th><th>Ressources actives</th></tr></thead><tbody>${teams.filter(t=>t.Actif!==false).map(t=>`<tr><td><b>${esc(t.Nom||'')}</b></td><td>${esc(offerDisplayName(t.Offre_Defaut))}</td><td class="num">${resources.filter(r=>r.Actif!==false&&+r.Equipe===+t.id).length}</td></tr>`).join('')||'<tr><td colspan="3">Aucune équipe</td></tr>'}</tbody></table></section>
  <section class="section"><h2>${esc(uiLabelValue("presim","Ressources nominatives"))}</h2><table><thead><tr><th>Ressource</th><th>Profil</th><th>Équipe</th><th>Plan individuel</th><th>Plan effectif</th><th>Commentaire</th></tr></thead><tbody>${resourceRows||'<tr><td colspan="6">Aucune ressource active</td></tr>'}</tbody></table></section>
  <section class="section"><h2>${esc(uiLabelValue("presim","Synthèse par équipe"))}</h2><table><thead><tr><th>Équipe</th><th>Fournisseur</th><th>Plan</th><th>Licences</th></tr></thead><tbody>${teamSummary.map(x=>`<tr><td>${esc(x.team)}</td><td>${esc(x.provider)}</td><td>${esc(x.offer)}</td><td class="num"><b>${x.count}</b></td></tr>`).join('')||'<tr><td colspan="4">Aucune donnée</td></tr>'}</tbody></table></section>
  <section class="section"><h2>${esc(uiLabelValue("presim","Synthèse consolidée des licences"))}</h2><table><thead><tr><th>Fournisseur</th><th>Offre</th><th>Équipes</th><th>Licences</th></tr></thead><tbody>${summary.map(x=>`<tr><td>${esc(x.provider)}</td><td>${esc(x.offer)}</td><td class="num">${x.teams}</td><td class="num"><b>${x.count}</b></td></tr>`).join('')||'<tr><td colspan="4">Aucune donnée</td></tr>'}</tbody></table></section>
  <div class="sig">FinOps IA — Réalisé par Alex Dufrenot</div></main>`;
  const js=`const F=${JSON.stringify(filename)};document.getElementById('print').onclick=()=>window.print();document.getElementById('save').onclick=()=>{const b=new Blob(['<!doctype html>\\n'+document.documentElement.outerHTML],{type:'text/html;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=F;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(fiche.Nom)}</title><style>${css}</style></head><body>${body}<script>${js}<\/script></body></html>`;
}
function openPreSimHtmlV62(){
  const fiche=selectedPreSimulation();if(!fiche||fiche.__draft||!preSimCanView(fiche)){toast("Cette fiche n'est pas accessible.",true);return}
  const doc=presimHtmlDocumentV62(fiche),w=window.open('','_blank');
  if(!w){toast("Le navigateur a bloqué l’ouverture HTML.",true);return}
  w.document.open();w.document.write(doc);w.document.close();
}

function renderPreSimulation(){
  const el=document.getElementById('v-presim');if(!el)return;
  ensurePreSimTeamStylesV60();
  const fiches=scopedPreSimulations(),fiche=selectedPreSimulation();

  if(!fiche){
    el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Pré-simulation nominative</h3>
      <p>Crée une fiche pour un domaine, organise les ressources en équipes puis définis le plan IA hérité par chaque équipe. La liste n’affiche que les fiches auxquelles l’utilisateur courant est autorisé.</p>
      </div><button id="newPreSim" class="btn primary">+ Nouvelle pré-simulation</button></div></article>`;
    document.getElementById('newPreSim').onclick=()=>{
      PRESIM_DRAFT=newPreSimulationDraft();PRESIM_DRAFT_RESOURCES=[];PRESIM_REMOVED_RESOURCE_IDS=[];PRESIM_DRAFT_TEAMS=[];PRESIM_REMOVED_TEAM_IDS=[];PRESIM_DRAFT_RIGHTS=[];PRESIM_REMOVED_RIGHT_IDS=[];renderPreSimulation();
    };return;
  }

  const teams=preSimCurrentTeams(fiche);
  const resources=preSimCurrentResources(fiche);
  const teamById=preSimTeamById(fiche);
  const summary=preSimSummary(resources,teamById,fiche);
  const teamSummary=preSimTeamSummary(resources,teams,fiche);
  const teamBudgets=preSimTeamBudgets(teamSummary),pricing=preSimPricingContext(fiche);

  const ficheOptions=fiches.map(x=>`<option value="${x.id}" ${!PRESIM_DRAFT&&+x.id===+fiche.id?'selected':''}>${esc(x.Nom||'Sans nom')} — ${esc(D.domainById[+x.Domaine]?.Nom||'')}</option>`).join('');
  const domainOptions=scopedDomains().map(d=>`<option value="${d.id}" ${+fiche.Domaine===+d.id?'selected':''}>${esc(d.Nom||'')}</option>`).join('');
  const scenarioOptions=`<option value="">— Aucun / information facultative —</option>`+
    (D[T.scenarios]||[]).slice().sort((a,b)=>(+a.Annee||0)-(+b.Annee||0)||String(a.Nom||'').localeCompare(String(b.Nom||''),'fr'))
      .map(s=>`<option value="${s.id}" ${+fiche.Scenario_Reference===+s.id?'selected':''}>${esc(s.Nom||'')}</option>`).join('');

  const teamRows=teams.map((t,idx)=>{
    const key=t.__draft?`data-pt-key="${esc(t.__key)}"`:`data-pt-id="${t.id}"`;
    return `<tr ${key}>
      <td><input class="admin-input" data-f="Nom" value="${esc(t.Nom||'')}" placeholder="Nom de l'équipe"></td>
      <td><input class="admin-input" data-f="Service" value="${esc(t.Service||'')}" placeholder="Service (optionnel)"></td>
      <td><select class="admin-input" data-f="Offre_Defaut">${preSimOfferOptions(t.Offre_Defaut,'— Plan par défaut —')}</select></td>
      <td><input class="admin-input" data-f="Ordre" type="number" min="0" value="${+t.Ordre||((idx+1)*10)}"></td>
      <td><input class="admin-input" data-f="Commentaire" value="${esc(t.Commentaire||'')}"></td>
      <td><input type="checkbox" data-f="Actif" ${t.Actif===false?'':'checked'}></td>
      <td><button class="btn ghost removePreTeam">${t.__draft?'Annuler':'Supprimer'}</button></td>
    </tr>`;
  }).join('');

  const savedTeams=teams.filter(t=>!t.__draft&&t.Actif!==false);
  const teamOptions=(selected=0)=>`<option value="">— Sans équipe —</option>`+savedTeams
    .slice().sort((a,b)=>(+a.Ordre||0)-(+b.Ordre||0)||String(a.Nom||'').localeCompare(String(b.Nom||''),'fr'))
    .map(t=>`<option value="${t.id}" ${+selected===+t.id?'selected':''}>${esc(t.Nom||'')}</option>`).join('');

  const resourceRows=resources.map(r=>{
    const rowKey=r.__draft?`data-pr-key="${esc(r.__key)}"`:`data-pr-id="${r.id}"`;
    const effective=effectivePreSimOfferId(r,teamById);
    const inherited=!+r.Offre&&!!effective;
    return `<tr ${rowKey}>
      <td><input class="admin-input" data-f="Nom_Ressource" value="${esc(r.Nom_Ressource||'')}" placeholder="Nom ou identifiant"></td>
      <td><input class="admin-input" data-f="Profil" value="${esc(r.Profil||'')}" placeholder="Dev, PO, métier…"></td>
      <td><select class="admin-input pre-resource-team" data-f="Equipe">${teamOptions(r.Equipe)}</select></td>
      <td><select class="admin-input pre-resource-offer" data-f="Offre">${preSimOfferOptions(r.Offre,"— Hériter du plan de l'équipe —")}</select></td>
      <td><span class="effective-plan ${inherited?'inherited':''}" data-effective-plan>${esc(offerDisplayName(effective))}</span></td>
      <td><input class="admin-input" data-f="Commentaire" value="${esc(r.Commentaire||'')}"></td>
      <td><input type="checkbox" data-f="Actif" ${r.Actif===false?'':'checked'}></td>
      <td><button class="btn ghost removePreResource">Supprimer</button></td>
    </tr>`;
  }).join('');

  el.innerHTML=`
  <article class="card">
    <div class="cardhead"><div><h3>Pré-simulation nominative</h3>
      <p>Le domaine est obligatoire. Le scénario de référence reste informatif pour le budget, mais permet depuis Simulation d'ouvrir directement cette fiche pour le domaine concerné.</p></div>
      <div class="table-actions"><select id="preSimSelect" class="admin-input"><option value="">Choisir une fiche</option>${ficheOptions}</select>
        <button id="newPreSim" class="btn secondary">+ Nouvelle fiche</button>${fiche.__draft?'':`<button id="openPreSimHtml" class="btn secondary">🌐 ${esc(uiLabelValue("compare","Ouvrir en HTML"))}</button>`}<button id="savePreSim" class="btn primary">Enregistrer la fiche</button></div></div>
    <div class="presim-meta">
      <label class="field">Nom de la fiche<input id="psNom" class="admin-input" value="${esc(fiche.Nom||'')}"></label>
      <label class="field">Domaine obligatoire<select id="psDomain" class="admin-input">${domainOptions}</select></label>
      <label class="field">Scénario de référence <small>navigation informative</small><select id="psScenario" class="admin-input">${scenarioOptions}</select></label>
      <label class="field">Statut<input id="psStatus" class="admin-input" value="${esc(fiche.Statut||'Travail')}"></label>
      <label class="field">Auteur <small>utilisateur connecté</small><input id="psAuthor" class="admin-input" value="${esc(fiche.__draft?preSimEmail():(fiche.Responsable_Email||rightUserEmail(+fiche.Responsable_User)||''))}" readonly></label>
    </div>
    <label class="field presim-comment">Commentaire<textarea id="psComment" class="admin-input" rows="2">${esc(fiche.Commentaire||'')}</textarea></label>
  </article>

  ${preSimCanManageRights(fiche)&&!fiche.__draft?`<article class="card presim-access-card">
    <div class="cardhead"><div><h3>Accès à la fiche</h3><p>L’auteur a toujours accès. Les droits supplémentaires ne sont valides que si l'utilisateur a aussi accès au domaine <b>${esc(D.domainById[+fiche.Domaine]?.Nom||'')}</b>.</p></div>
      <div class="table-actions"><button id="addPreSimRight" class="btn secondary">+ Ajouter un accès</button><button id="savePreSimRights" class="btn primary">Enregistrer les droits</button></div></div>
    <div class="tablewrap"><table><thead><tr><th>Utilisateur</th><th>Niveau</th><th>Actif</th><th>Commentaire</th><th></th></tr></thead><tbody>
      ${currentPreSimRights(fiche).map(r=>{const k=r.__draft?`data-par-key="${esc(r.__key)}"`:`data-par-id="${r.id}"`;const eligible=eligiblePreSimUsers(+fiche.Domaine);return `<tr ${k}><td><select class="admin-input" data-f="Utilisateur"><option value="">— Utilisateur —</option>${eligible.map(u=>`<option value="${u.id}" ${+u.id===+r.Utilisateur?'selected':''}>${esc(u.Email||'')}</option>`).join('')}</select></td><td><select class="admin-input" data-f="Niveau_Acces"><option value="LECTURE" ${String(r.Niveau_Acces||'LECTURE')==='LECTURE'?'selected':''}>Lecture</option><option value="MODIFICATION" ${String(r.Niveau_Acces||'')==='MODIFICATION'?'selected':''}>Modification</option></select></td><td><input type="checkbox" data-f="Actif" ${r.Actif===false?'':'checked'}></td><td><input class="admin-input" data-f="Commentaire" value="${esc(r.Commentaire||'')}"></td><td><button class="btn ghost removePreSimRight">${r.__draft?'Annuler':'Supprimer'}</button></td></tr>`}).join('')||'<tr><td colspan="5">Aucun accès supplémentaire. Seuls l’auteur et l’Owner peuvent accéder à la fiche.</td></tr>'}
    </tbody></table></div>
  </article>`:''}

  <article class="card">
    <div class="cardhead"><div><h3>Équipes du domaine</h3><p>Chaque équipe peut définir un plan IA par défaut. Les ressources de l'équipe l'héritent sauf dérogation nominative.</p></div>
      <div class="table-actions"><button id="addPreTeam" class="btn secondary">+ Ajouter une équipe</button><button id="savePreTeams" class="btn primary">Enregistrer les équipes</button></div></div>
    <div class="tablewrap"><table><thead><tr><th>Équipe</th><th>Service</th><th>Plan IA par défaut</th><th>Ordre</th><th>Commentaire</th><th>Actif</th><th></th></tr></thead>
      <tbody>${teamRows||'<tr><td colspan="7">Aucune équipe. Ajoute une équipe pour organiser les ressources.</td></tr>'}</tbody></table></div>
  </article>

  <article class="card">
    <div class="cardhead"><div><h3>Ressources nominatives</h3><p>Une ressource appartient à une équipe. Laisse Plan individuel vide pour hériter automatiquement du plan de l'équipe.</p></div>
      <button id="addPreResource" class="btn secondary">+ Ajouter une ressource</button></div>
    <div class="tablewrap"><table>
      <thead><tr><th>Ressource</th><th>Profil</th><th>Équipe</th><th>Plan individuel</th><th>Plan effectif</th><th>Commentaire</th><th>Actif</th><th></th></tr></thead>
      <tbody>${resourceRows||'<tr><td colspan="8">Aucune ressource pour le moment.</td></tr>'}</tbody>
    </table></div>
    <div class="table-actions presim-save"><button id="savePreResources" class="btn primary">Enregistrer les ressources</button></div>
  </article>

  <article class="card">
    <div class="cardhead"><div><h3>Synthèse par équipe</h3><p>Répartition des licences par équipe et par offre effective.</p></div></div>
    <div class="tablewrap"><table><thead><tr><th>Équipe</th><th>Fournisseur</th><th>Plan / offre effective</th><th>Licences</th></tr></thead>
      <tbody>${teamSummary.length?teamSummary.map(x=>`<tr><td><span class="team-summary-name"><span class="team-dot"></span><b>${esc(x.team)}</b></span></td><td>${esc(x.provider)}</td><td>${esc(x.offer)}</td><td class="num"><b>${x.count}</b></td></tr>`).join(''):'<tr><td colspan="4">Aucune ressource active pour le moment.</td></tr>'}</tbody>
    </table></div>
  </article>

  <article class="card">
    <div class="cardhead"><div><h3>Synthèse des licences nominatives</h3><p>Consolidation par offre : équipes concernées et nombre de licences.</p></div></div>
    <div class="tablewrap"><table><thead><tr><th>Domaine</th><th>Fournisseur</th><th>Offre</th><th>Équipes</th><th>Licences</th></tr></thead>
      <tbody>${summary.length?summary.map(x=>`<tr><td>${esc(D.domainById[+fiche.Domaine]?.Nom||'')}</td><td>${esc(x.provider)}</td><td>${esc(x.offer)}</td><td class="num">${x.teams}</td><td class="num"><b>${x.count}</b></td></tr>`).join(''):'<tr><td colspan="5">Aucun plan effectif pour le moment.</td></tr>'}</tbody>
    </table></div>
  </article>`;

  document.getElementById('preSimSelect').onchange=e=>{
    resetPreSimDraftStateV62();
    PRESIM_SELECTED_ID=+e.target.value||0;renderPreSimulation();
  };
  document.getElementById('newPreSim').onclick=()=>{
    PRESIM_DRAFT=newPreSimulationDraft();PRESIM_DRAFT_RESOURCES=[];PRESIM_REMOVED_RESOURCE_IDS=[];PRESIM_DRAFT_TEAMS=[];PRESIM_REMOVED_TEAM_IDS=[];renderPreSimulation();
  };
  document.getElementById('addPreTeam').onclick=()=>{
    if(fiche.__draft){toast("Enregistre d'abord la fiche avant d'ajouter les équipes.",true);return}
    PRESIM_DRAFT_TEAMS.push(newPreTeamDraft());renderPreSimulation();
  };
  document.getElementById('addPreResource').onclick=()=>{
    if(fiche.__draft){toast("Enregistre d'abord la fiche avant d'ajouter les ressources.",true);return}
    PRESIM_DRAFT_RESOURCES.push(newPreResourceDraft());renderPreSimulation();
    el.querySelector('tr[data-pr-key]:last-of-type input[data-f="Nom_Ressource"]')?.focus();
  };
  document.getElementById('savePreSim').onclick=savePreSimulationV28;
  document.getElementById('openPreSimHtml')?.addEventListener('click',openPreSimHtmlV62);
  document.getElementById('addPreSimRight')?.addEventListener('click',addPreSimRightDraftV62);
  document.getElementById('savePreSimRights')?.addEventListener('click',savePreSimRightsV62);
  el.querySelectorAll('.removePreSimRight').forEach(btn=>btn.onclick=()=>{
    const tr=btn.closest('tr'),id=+tr.dataset.parId||0,key=tr.dataset.parKey||'';
    if(key)PRESIM_DRAFT_RIGHTS=PRESIM_DRAFT_RIGHTS.filter(r=>r.__key!==key);
    if(id)PRESIM_REMOVED_RIGHT_IDS.push(id);
    renderPreSimulation();
  });
  document.getElementById('savePreTeams').onclick=savePreTeamsV60;
  document.getElementById('savePreResources').onclick=savePreResourcesV60;

  el.querySelectorAll('.removePreTeam').forEach(btn=>btn.onclick=()=>{
    const tr=btn.closest('tr'),id=+tr.dataset.ptId||0,key=tr.dataset.ptKey||'';
    if(key)PRESIM_DRAFT_TEAMS=PRESIM_DRAFT_TEAMS.filter(t=>t.__key!==key);
    if(id){
      const used=resources.some(r=>+r.Equipe===id&&!PRESIM_REMOVED_RESOURCE_IDS.includes(+r.id));
      if(used&&!confirm("Cette équipe contient des ressources. Sa suppression retirera l'équipe de ces ressources. Continuer ?"))return;
      PRESIM_REMOVED_TEAM_IDS.push(id);
    }
    renderPreSimulation();
  });
  el.querySelectorAll('.removePreResource').forEach(btn=>btn.onclick=()=>{
    const tr=btn.closest('tr'),id=+tr.dataset.prId||0,key=tr.dataset.prKey||'';
    if(key)PRESIM_DRAFT_RESOURCES=PRESIM_DRAFT_RESOURCES.filter(r=>r.__key!==key);
    if(id)PRESIM_REMOVED_RESOURCE_IDS.push(id);
    renderPreSimulation();
  });
  const updateEffective=tr=>{
    const teamId=+tr.querySelector('[data-f="Equipe"]')?.value||0;
    const explicit=+tr.querySelector('[data-f="Offre"]')?.value||0;
    const oid=explicit||(+teamById[teamId]?.Offre_Defaut||0);
    const target=tr.querySelector('[data-effective-plan]');
    if(target){target.textContent=offerDisplayName(oid);target.classList.toggle('inherited',!explicit&&!!oid)}
  };
  el.querySelectorAll('tr[data-pr-id],tr[data-pr-key]').forEach(tr=>{
    tr.querySelector('[data-f="Equipe"]')?.addEventListener('change',()=>updateEffective(tr));
    tr.querySelector('[data-f="Offre"]')?.addEventListener('change',()=>updateEffective(tr));
  });
}

function readPreSimulationFields(){
  const fiche=selectedPreSimulation();
  const authorId=fiche?.__draft?(+currentRightRow()?.id||0):(+fiche?.Responsable_User||0);
  const authorEmail=fiche?.__draft?preSimEmail():(String(fiche?.Responsable_Email||rightUserEmail(authorId)||'').trim().toLowerCase());
  return {
    Nom:document.getElementById('psNom')?.value.trim()||'',
    Domaine:+document.getElementById('psDomain')?.value||0,
    Scenario_Reference:+document.getElementById('psScenario')?.value||0,
    Statut:document.getElementById('psStatus')?.value.trim()||'Travail',
    Responsable_User:authorId,
    Responsable_Email:authorEmail,
    Commentaire:document.getElementById('psComment')?.value.trim()||''
  };
}


async function savePreSimulationV28(){
  const fiche=selectedPreSimulation(),fields=readPreSimulationFields();
  if(!fields.Nom){toast('Le nom de la pré-simulation est obligatoire.',true);return}
  if(!fields.Domaine){toast('Le domaine est obligatoire.',true);return}
  if(!fields.Responsable_User){toast('Le responsable de la fiche est obligatoire.',true);return}
  const responsible=rightUserRow(fields.Responsable_User);
  if(!userHasDomain(responsible,fields.Domaine)){toast("Le responsable doit être un utilisateur actif ayant accès au domaine de la fiche.",true);return}
  if(!ACCESS.domainIds.includes(fields.Domaine)&&ACCESS.role!=='OWNER'){toast("Ce domaine n'est pas autorisé.",true);return}
  if(fields.Scenario_Reference){
    const duplicate=scopedPreSimulations().find(x=>+x.Scenario_Reference===fields.Scenario_Reference&&+x.Domaine===fields.Domaine&&+x.id!==+fiche.id);
    if(duplicate){toast(`Une pré-simulation est déjà liée à ce scénario pour ce domaine : ${duplicate.Nom}.`,true);return}
  }
  const rights=fiche.__draft?[]:preSimRightsRows(fiche);
  const tokens=buildPreSimAccessTokens(fields.Responsable_User,rights);
  fields.Responsable=fields.Responsable_Email; // compatibilité historique
  fields.Acces_Lecture_Emails=tokens.read;
  fields.Acces_Modification_Emails=tokens.modify;
  try{
    if(fiche.__draft){
      await apply([["AddRecord",T.preSim,null,fields]]);PRESIM_DRAFT=null;await reload();
      const matches=preSimulationRows().filter(x=>x.Nom===fields.Nom&&+x.Domaine===fields.Domaine);
      PRESIM_SELECTED_ID=+(matches.sort((a,b)=>+b.id-+a.id)[0]?.id||0);
    }else{
      if(!preSimCanModify(fiche)&&!isOwner()){toast("Vous n'avez pas le droit de modifier cette fiche.",true);return}
      await apply([["UpdateRecord",T.preSim,+fiche.id,fields]]);await reload();
    }
    toast('Pré-simulation enregistrée.');
  }catch(e){toast(e.message||String(e),true)}
}

async function savePreTeamsV60(){
  const fiche=selectedPreSimulation();
  if(!fiche||fiche.__draft){toast("Enregistre d'abord la fiche de pré-simulation.",true);return}
  const root=document.getElementById('v-presim'),actions=[];
  for(const tr of root.querySelectorAll('tbody tr[data-pt-id],tbody tr[data-pt-key]')){
    const id=+tr.dataset.ptId||0;
    const fields={
      Pre_Simulation:+fiche.id,
      Nom:tr.querySelector('[data-f="Nom"]')?.value.trim()||'',
      Service:tr.querySelector('[data-f="Service"]')?.value.trim()||'',
      Offre_Defaut:+tr.querySelector('[data-f="Offre_Defaut"]')?.value||0,
      Ordre:+tr.querySelector('[data-f="Ordre"]')?.value||0,
      Commentaire:tr.querySelector('[data-f="Commentaire"]')?.value.trim()||'',
      Actif:!!tr.querySelector('[data-f="Actif"]')?.checked
    };
    if(!fields.Nom){toast("Chaque équipe doit avoir un nom.",true);return}
    if(!fields.Offre_Defaut){toast(`Choisis un plan IA par défaut pour l'équipe ${fields.Nom}.`,true);return}
    actions.push(id?["UpdateRecord",T.preTeams,id,fields]:["AddRecord",T.preTeams,null,fields]);
  }
  for(const id of [...new Set(PRESIM_REMOVED_TEAM_IDS)]){
    preResourceRows().filter(r=>+r.Pre_Simulation===+fiche.id&&+r.Equipe===id).forEach(r=>actions.push(["UpdateRecord",T.preRes,+r.id,{Equipe:0}]));
    actions.push(["RemoveRecord",T.preTeams,id]);
  }
  try{
    if(actions.length)await apply(actions);
    PRESIM_DRAFT_TEAMS=[];PRESIM_REMOVED_TEAM_IDS=[];await reload();toast(`${actions.length} modification(s) d'équipes enregistrée(s).`);
  }catch(e){toast(e.message||String(e),true)}
}
async function savePreResourcesV60(){
  const fiche=selectedPreSimulation();
  if(!fiche||fiche.__draft){toast("Enregistre d'abord la fiche de pré-simulation.",true);return}
  const root=document.getElementById('v-presim'),actions=[];
  const teamById=preSimTeamById(fiche);
  for(const tr of root.querySelectorAll('tbody tr[data-pr-id],tbody tr[data-pr-key]')){
    const id=+tr.dataset.prId||0;
    const fields={
      Pre_Simulation:+fiche.id,
      Nom_Ressource:tr.querySelector('[data-f="Nom_Ressource"]')?.value.trim()||'',
      Profil:tr.querySelector('[data-f="Profil"]')?.value.trim()||'',
      Equipe:+tr.querySelector('[data-f="Equipe"]')?.value||0,
      Offre:+tr.querySelector('[data-f="Offre"]')?.value||0,
      Commentaire:tr.querySelector('[data-f="Commentaire"]')?.value.trim()||'',
      Actif:!!tr.querySelector('[data-f="Actif"]')?.checked
    };
    if(!fields.Nom_Ressource){toast('Chaque ressource doit avoir un nom ou un identifiant.',true);return}
    const effective=fields.Offre||(+teamById[fields.Equipe]?.Offre_Defaut||0);
    if(!effective){toast(`Aucun plan effectif pour ${fields.Nom_Ressource} : choisis une équipe avec un plan ou un plan individuel.`,true);return}
    actions.push(id?["UpdateRecord",T.preRes,id,fields]:["AddRecord",T.preRes,null,fields]);
  }
  for(const id of [...new Set(PRESIM_REMOVED_RESOURCE_IDS)])actions.push(["RemoveRecord",T.preRes,id]);
  try{
    if(actions.length)await apply(actions);
    PRESIM_DRAFT_RESOURCES=[];PRESIM_REMOVED_RESOURCE_IDS=[];await reload();toast(`${actions.length} modification(s) de ressources enregistrée(s).`);
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
  return {allocations,preSimulations,enterprise,individual,baseline,baselineDetails};
}
function scenarioUsageReason(scenarioId){
  const u=scenarioUsage(scenarioId);
  return u.allocations?`${u.allocations} allocation(s)`:'';
}
function canDeleteScenario(scenarioId){
  // V63 : seule l'existence d'une allocation budgétaire bloque la suppression.
  return scenarioUsage(scenarioId).allocations===0;
}
async function deleteScenarioV35(scenarioId){
  const s=(D[T.scenarios]||[]).find(x=>+x.id===+scenarioId);
  if(!s)return;
  const usage=scenarioUsage(scenarioId);
  if(usage.allocations){
    toast(`Suppression impossible : ce scénario contient ${usage.allocations} allocation(s).`,true);
    return;
  }
  if(!canEditView('scenarios')){
    toast(readOnlyMessage(),true);
    return;
  }

  const info=[];
  if(usage.preSimulations)info.push(`${usage.preSimulations} pré-simulation(s) seront simplement détachée(s) du scénario`);
  if(usage.baseline||usage.baselineDetails)info.push(`les données ROI / baseline existantes ne bloquent pas la suppression`);
  if(usage.enterprise||usage.individual)info.push(`les anciennes lignes historiques ne bloquent pas la suppression`);

  const detail=info.length?`\n\n${info.join('. ')}.`:'';
  if(!confirm(`Supprimer définitivement le scénario "${s.Nom||scenarioId}" ?${detail}`))return;

  try{
    const actions=[];
    // La liaison Pré-simulation -> Scénario est informative : on la remet à vide.
    (D[T.preSim]||[])
      .filter(r=>+r.Scenario_Reference===+scenarioId)
      .forEach(r=>actions.push(["UpdateRecord",T.preSim,+r.id,{Scenario_Reference:0}]));

    actions.push(["RemoveRecord",T.scenarios,+scenarioId]);
    await apply(actions);

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
    action=`<button type="button" class="btn ghost cancelScenarioDraft" data-key="${esc(s.__key)}">Annuler</button>`;
  }else{
    const usage=scenarioUsage(s.id);
    if(!canDeleteScenario(s.id)){
      action=`<button type="button" class="btn ghost small scenario-delete blocked" data-delete-scenario="${s.id}" disabled title="${esc('Suppression impossible : '+scenarioUsageReason(s.id))}">🔒 Allocations</button>`;
    }else{
      const extra=usage.preSimulations?' · les pré-simulations liées seront détachées':'';
      action=`<button type="button" class="btn danger small scenario-delete" data-delete-scenario="${s.id}" title="Supprimer ce scénario sans allocation${esc(extra)}">Supprimer</button>`;
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
        <p>Modifie, ajoute ou supprime les scénarios. Seule la présence d’au moins une allocation budgétaire bloque la suppression ; les pré-simulations liées sont simplement détachées.</p>
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

  el.querySelectorAll('.cancelScenarioDraft').forEach(btn=>btn.onclick=()=>{
    const key=btn.dataset.key||'';
    NEW_SCENARIOS=NEW_SCENARIOS.filter(s=>String(s.__key)!==String(key));
    renderScenarios();
  });
}

function scenarioFieldsChangedV43(original,fields){
  const textKeys=['Nom','Statut'];
  const numberKeys=['Annee','Nb_Mois','Taux_USD_EUR','Taux_Utilisation','Nb_Jours_Ouvres_Annuels'];
  return textKeys.some(k=>String(original?.[k]??'').trim()!==String(fields?.[k]??'').trim()) ||
    numberKeys.some(k=>Number(original?.[k]||0)!==Number(fields?.[k]||0));
}
async function saveAllScenariosV26(){
  const root=document.getElementById('v-scenarios'),actions=[],labels=[];
  for(const tr of root.querySelectorAll('tbody tr')){
    if(!tr.dataset.s && !tr.dataset.draft)continue;
    const fields=readFields(tr);
    fields.Nom=String(fields.Nom||'').trim();
    fields.Statut=String(fields.Statut||'').trim();
    if(!fields.Nom){toast('Le nom du scénario est obligatoire.',true);tr.querySelector('[data-f="Nom"]')?.focus();return}
    if((+fields.Nb_Mois||0)<1){toast(`Le nombre de mois doit être supérieur à 0 pour « ${fields.Nom} ».`,true);return}
    if(tr.dataset.s){
      const id=+tr.dataset.s;
      const original=(D[T.scenarios]||[]).find(s=>+s.id===id);
      if(!scenarioFieldsChangedV43(original,fields))continue;
      actions.push(["UpdateRecord",T.scenarios,id,fields]);
      labels.push(fields.Nom||original?.Nom||`Scénario ${id}`);
    }else if(tr.dataset.draft){
      actions.push(["AddRecord",T.scenarios,null,{...fields,Commentaire:''}]);
      labels.push(fields.Nom||'Nouveau scénario');
    }
  }
  if(!actions.length){toast('Aucune modification de scénario à enregistrer.');return}
  try{
    await apply(actions);
    NEW_SCENARIOS=[];
    await reload();
    toast(`${actions.length} scénario(s) enregistré(s).`);
  }catch(e){
    const message=String(e?.message||e||'Erreur inconnue');
    console.error('Échec enregistrement scénarios', {message,scenarios:labels,actions,e});
    const permission=/permission|access|acl|denied|interdit|autorisation/i.test(message);
    const prefix=permission?'Droits Grist insuffisants':'Échec de l’enregistrement';
    toast(`${prefix} pour ${labels.length===1?'« '+labels[0]+' »':labels.length+' scénario(s)'} : ${message}`,true);
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
  el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Configuration du menu <span class="badge ok">V44</span></h3><p>Le classement est automatique : <b>Utilisateurs autorisés</b> place l’item dans la rubrique <b>User</b>, <b>Owner uniquement</b> le place dans <b>Admin</b>. Modifie l’accès puis enregistre.</p></div><div class="table-actions"><button id="saveMenuConfig" class="btn primary">Enregistrer les modifications</button><button id="resetMenuConfig" class="btn secondary">Ordre et noms par défaut</button></div></div><div class="tablewrap"><table class="menu-admin-table"><thead><tr><th class="drag-col"></th><th>Item technique</th><th>Libellé affiché</th><th>Rubrique</th><th>Actif</th><th>Accès</th></tr></thead><tbody id="menuAdminBody">${rows.map(r=>`<tr draggable="true" data-menu-id="${r.id||''}" data-menu-key="${esc(r.Cle)}"><td class="menu-row-grip" title="Déplacer">⋮⋮</td><td><code>${esc(r.Cle)}</code></td><td><input class="admin-input" data-f="Libelle" value="${esc(r.Libelle||DEFAULT_MENU_LABELS[r.Cle]||r.Cle)}" maxlength="60"></td><td><span class="menu-section-badge ${r.Owner_Seulement?'admin':'user'}" data-menu-section>${r.Owner_Seulement?'Admin':'User'}</span></td><td><input data-f="Actif" type="checkbox" ${r.Actif!==false?'checked':''}></td><td><select class="admin-input menu-access-select" data-f="Owner_Seulement"><option value="false" ${!r.Owner_Seulement?'selected':''}>Utilisateurs autorisés</option><option value="true" ${r.Owner_Seulement?'selected':''}>Owner uniquement</option></select></td></tr>`).join('')}</tbody></table></div><div class="menu-admin-note">La rubrique n’est pas un paramètre séparé : elle est toujours déduite de l’accès, ce qui évite les incohérences. L’ordre reste piloté par glisser-déposer.</div></article>`;
  initMenuAdminSorting();
  document.querySelectorAll('#menuAdminBody .menu-access-select').forEach(sel=>sel.addEventListener('change',()=>{const badge=sel.closest('tr')?.querySelector('[data-menu-section]');if(!badge)return;const admin=sel.value==='true';badge.textContent=admin?'Admin':'User';badge.classList.toggle('admin',admin);badge.classList.toggle('user',!admin)}));
  document.getElementById('saveMenuConfig').onclick=saveMenuConfig;
  document.getElementById('resetMenuConfig').onclick=resetMenuConfigDraft;
}


function renderAppSettingsV58(){
  const el=document.getElementById('v-appsettings');if(!el)return;
  const refresh=chatRefreshSecondsV57();
  el.innerHTML=`<article class="card">
    <div class="cardhead">
      <div><h3>Paramètres application</h3><p>Réglages globaux du widget FinOps. Ces paramètres s’appliquent à tous les utilisateurs.</p></div>
      <button id="saveAppSettingsV58" class="btn primary">Enregistrer les paramètres</button>
    </div>
    <div class="settings-grid">
      <label class="field">
        <span>Rafraîchissement de la messagerie</span>
        <div class="setting-inline"><input id="chatRefreshSecondsAdmin" class="admin-input" type="number" min="3" max="60" step="1" value="${refresh}"><span>secondes</span></div>
        <small>Entre 3 et 60 secondes. Le rafraîchissement n’efface jamais le message en cours de saisie.</small>
      </label>
    </div>
    <div class="soft" style="margin-top:14px"><b>Valeur actuelle :</b> ${refresh} seconde(s). Le nouvel intervalle est appliqué immédiatement après enregistrement.</div>
  </article>`;
  document.getElementById('saveAppSettingsV58')?.addEventListener('click',saveAppSettingsV57);
}
async function saveAppSettingsV57(){
  if(!roleCanEditAdvancedMenus()){toast(readOnlyMessage(),true);return}
  const input=document.getElementById('chatRefreshSecondsAdmin');
  const seconds=Math.max(3,Math.min(60,Math.round(Number(input?.value||CHAT_DEFAULT_REFRESH_SECONDS))));
  if(input)input.value=String(seconds);
  const existing=(D[T.appConfig]||[]).find(r=>String(r.Cle||'')==='CHAT_REFRESH_SECONDS');
  const fields={Cle:'CHAT_REFRESH_SECONDS',Valeur:String(seconds),Description:'Intervalle de rafraîchissement automatique de la messagerie FinOps, en secondes.'};
  try{
    await apply([existing?["UpdateRecord",T.appConfig,existing.id,fields]:["AddRecord",T.appConfig,null,fields]]);
    D=await fetchAll();restartChatIntervalV57();renderAppSettingsV58();
    toast(`Rafraîchissement réglé sur ${seconds} seconde(s).`);
  }catch(e){toast(e.message||String(e),true)}
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
    ['presim','Pré-simulation nominative'],['scenarios','Scénarios'],['offers','Offre de service'],['offersadmin','Paramétrage offre de service'],['domains','Domaines'],['rights','Droits utilisateurs'],['menuadmin','Configuration du menu'],['labelsadmin','Paramétrage des libellés'],['appsettings','Paramètres application'],['acladmin','ACL / Sécurité']
  ];
  const tbody=document.getElementById('menuAdminBody');if(!tbody)return;
  const byKey=Object.fromEntries([...tbody.querySelectorAll('tr[data-menu-key]')].map(tr=>[tr.dataset.menuKey,tr]));
  defaults.forEach(([key,label])=>{const tr=byKey[key];if(!tr)return;const input=tr.querySelector('[data-f="Libelle"]');if(input)input.value=label;const active=tr.querySelector('[data-f="Actif"]');if(active)active.checked=true;const access=tr.querySelector('[data-f="Owner_Seulement"]');if(access)access.value=['offersadmin','domains','rights','menuadmin','labelsadmin','appsettings','acladmin'].includes(key)?'true':'false';tbody.appendChild(tr)});
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
function uiLabelValue(screen,def){
  const d=String(def??'').trim();if(!d)return d;
  const map=uiLabelMap();
  return map.get(`${screen}||${d}`)??map.get(`*||${d}`)??d;
}
function uiTextScreen(el){
  const view=el?.closest?.('.view');
  return view?.id?view.id.replace(/^v-/,''):(el?.closest?.('[data-ui-screen]')?.dataset?.uiScreen||'global');
}
function uiTextNodes(){
  const root=document.getElementById('root');if(!root)return [];
  const out=[];
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
    acceptNode(node){
      const parent=node.parentElement;if(!parent)return NodeFilter.FILTER_REJECT;
      if(parent.closest('#v-labelsadmin'))return NodeFilter.FILTER_REJECT;
      if(parent.closest('script,style,noscript,textarea,select,option,code,pre'))return NodeFilter.FILTER_REJECT;
      const def=String(node.nodeValue||'').trim();
      if(def.length<2)return NodeFilter.FILTER_REJECT;
      if(/^[-+]?\d+(?:[.,]\d+)?(?:\s*[%€$])?$/.test(def))return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let node;
  while((node=walker.nextNode())){
    const def=String(node.nodeValue||'').trim(),parent=node.parentElement;
    out.push({screen:uiTextScreen(parent),def,node});
  }
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

const UI_LABEL_CATALOG_V65=[
  // Synthèse / comparaison + détail popup + rapport HTML (éléments transitoires)
  ['compare','Comparer les scénarios'],['compare','Sélectionne jusqu’à 6 scénarios. Clique sur une carte pour ouvrir le détail financier par domaine.'],
  ['compare','Ouvrir en HTML'],['compare','SCÉNARIO'],['compare','Chiffré'],['compare','à confirmer'],
  ['compare','licences'],['compare','domaines'],['compare','offres'],['compare','Fixe'],['compare','Variable'],
  ['compare','Économie annuelle'],['compare','Voir le détail →'],['compare','Détail du scénario'],['compare','Vue détaillée'],
  ['compare','Fermer'],['compare','SYNTHÈSE FINOPS IA'],['compare','Budget total'],['compare','Coûts fixes'],
  ['compare','Coûts variables'],['compare','Budget EUR'],['compare','01'],['compare','Structure du budget'],
  ['compare','02'],['compare','Détail par domaine'],['compare','Offres, licences, prix du forfait, engagements et structure des coûts.'],
  ['compare','DOMAINE'],['compare','Fournisseur'],['compare','Offre'],['compare','Licences'],['compare','Prix forfait'],
  ['compare','Base calcul fixe'],['compare','Engagement'],['compare','Mois facturés'],['compare','Total'],
  ['compare','Sous-total'],['compare','Total scénario'],['compare','Aucune allocation sur ce scénario.'],
  ['compare','Synthèse FinOps IA'],['compare','Rapport HTML autonome'],['compare','Imprimer / PDF'],
  ['compare','Enregistrer le fichier HTML'],['compare','Éditeur de l’outil'],['compare','Synthèse'],['compare','Détails des scénarios'],
  ['compare','Scénario'],['compare','Budget USD'],['compare','Économie annuelle'],['compare','Vue budgétaire par domaine'],['compare','Répartition du budget du scénario par domaine.'],['compare','Vue budgétaire par offre'],['compare','Abonnement fixe, variable et poids de chaque offre dans le scénario.'],['compare','Total USD'],['compare','Total EUR'],['compare','Part'],['compare','TOTAL CONNU'],['compare','Aucun budget par domaine.'],['compare','Aucune offre budgétée.'],['compare','Synthèse des scénarios'],['compare','scénario(s) sélectionné(s)'],['compare','scénario(s)'],['compare','Édité le'],['compare','tarif(s) à confirmer'],['compare','Lecture du coût fixe'],['compare','Le prix du forfait affiché est le tarif effectivement retenu selon la priorité : négocié sur l’allocation → négocié sur l’offre → référence interne → catalogue. La base de calcul montre comment ce prix contribue au coût fixe.'],['compare','À confirmer'],['compare','mois'],
  // Pré-simulation HTML / sécurité
  ['presim','Pré-simulation nominative'],['presim','Ouvrir en HTML'],['presim','Imprimer / PDF'],
  ['presim','Enregistrer le fichier HTML'],['presim','Équipes'],['presim','Ressources nominatives'],
  ['presim','Synthèse par équipe'],['presim','Synthèse consolidée des licences'],['presim','Responsable'],['presim','Auteur'],['presim','utilisateur connecté'],
  ['presim','Domaine'],['presim','Scénario'],['presim','Statut'],['presim','Plan par défaut'],['presim','Ressources actives'],
  ['presim','Ressource'],['presim','Profil'],['presim','Équipe'],['presim','Plan individuel'],['presim','Plan effectif'],
  ['presim','Commentaire'],['presim','Fournisseur'],['presim','Plan'],['presim','Ressources'],['presim','Licences'],
  // Global / modal common actions
  ['global','Fermer'],['global','Enregistrer'],['global','Annuler'],['global','Supprimer'],['global','Effacer'],
  ['global','Imprimer / PDF'],['global','Enregistrer le fichier HTML']
].map(([Ecran,Libelle_Defaut])=>({Ecran,Libelle_Defaut,Cle:`${Ecran}.${slugLabel(Libelle_Defaut)}`}));

function collectUILabelCandidates(){
  const uniq=new Map();
  const add=c=>{
    const screen=String(c.Ecran||'global'),def=String(c.Libelle_Defaut||'').trim();
    if(!def)return;
    const k=`${screen}||${def}`;
    if(!uniq.has(k))uniq.set(k,{Ecran:screen,Libelle_Defaut:def,Cle:c.Cle||`${screen}.${slugLabel(def)}`});
  };
  uiTextNodes().forEach(x=>add({Ecran:x.screen,Libelle_Defaut:x.def}));
  UI_LABEL_CATALOG_V65.forEach(add);
  uiLabelRows().forEach(r=>add({Ecran:r.Ecran||'*',Libelle_Defaut:r.Libelle_Defaut||'',Cle:r.Cle}));
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
      <p>Tous les textes visibles de l’application sont détectés automatiquement. Les fenêtres temporaires et rapports HTML sont aussi enregistrés dans un catalogue permanent afin qu’aucun libellé ne dépende de l’ouverture préalable d’un écran.</p>
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
  {tableId:"Pre_Simulations",colIds:"*",kind:"presimroot",mode:"presimroot"},
  {tableId:"Pre_Simulation_Ressources",colIds:"*",kind:"presimchild",mode:"presimchild"},
  {tableId:"Pre_Simulation_Equipes",colIds:"*",kind:"presimchild",mode:"presimchild"},
  {tableId:"Pre_Simulation_Droits",colIds:"*",kind:"presimrights",mode:"presimrights"},
  {tableId:"Enterprise",colIds:"*",kind:"domain",mode:"read"},
  {tableId:"Forfaits_Individuels",colIds:"*",kind:"domain",mode:"read"},
  {tableId:"Domaines",colIds:"*",kind:"domains",mode:"domains"},
  {tableId:"Droits_Utilisateurs",colIds:"*",kind:"rights",mode:"rights"},
  {tableId:"Presence_Utilisateurs",colIds:"*",kind:"presence",mode:"presence"},
  {tableId:"FinOps_Messages",colIds:"*",kind:"chatmessages",mode:"chatmessages"},
  {tableId:"FinOps_Chat_Lectures",colIds:"*",kind:"chatreads",mode:"chatreads"},
  {tableId:"FinOps_Configuration",colIds:"*",kind:"global",mode:"config"},
  {tableId:"FinOps_Identites",colIds:"*",kind:"selfidentity",mode:"selfidentity"},
  {tableId:"FinOps_Owner_Sentinel",colIds:"*",kind:"ownersentinel",mode:"owneronly"},
  {tableId:"FinOps_Identite_Session",colIds:"*",kind:"legacyidentity",mode:"owneronly"},
  {tableId:"Claude_Scenarios",colIds:"*",kind:"global",mode:"userEdit"},
  {tableId:"Claude_Organisations",colIds:"*",kind:"global",mode:"userEdit"},
  {tableId:"Claude_Groupes",colIds:"*",kind:"global",mode:"userEdit"},
  {tableId:"Claude_Ressources",colIds:"*",kind:"global",mode:"userEdit"},
  {tableId:"Claude_Configuration",colIds:"*",kind:"global",mode:"config"}
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
  if(kind==="global"||kind==="scenario"||kind==="presence"||kind==="selfidentity"||kind==="ownersentinel"||kind==="legacyidentity"||kind==="chatmessages"||kind==="chatreads")return base;
  if(kind==="domain")return `${base} and rec.Domaine in user.Droits.Domaines_Autorises`;
  if(kind==="presimdomain")return `${base} and rec.Pre_Simulation.Domaine in user.Droits.Domaines_Autorises`;
  if(kind==="presimroot")return `${base} and rec.Domaine in user.Droits.Domaines_Autorises`;
  if(kind==="presimchild"||kind==="presimrights")return `${base} and rec.Pre_Simulation.Domaine in user.Droits.Domaines_Autorises`;
  if(kind==="domains")return `${base} and rec.id in user.Droits.Domaines_Autorises`;
  if(kind==="rights")return base;
  return "False";
}
function aclRulesForSpec(spec){
  const reader=["LECTEUR","CONTRIBUTEUR","OBSERVATEUR","CONTRIBUTEUR_AVANCE","ADMINISTRATEUR"];
  const contributors=["CONTRIBUTEUR","CONTRIBUTEUR_AVANCE","ADMINISTRATEUR"];
  if(spec.mode==="presimroot"){
    const accessRead=`("|" + user.Email.lower() + "|") in rec.Acces_Lecture_Emails`;
    const accessWrite=`("|" + user.Email.lower() + "|") in rec.Acces_Modification_Emails`;
    return [
      {roles:contributors,perm:"+CRUD",tag:"PRESIM_WRITE",formula:`${aclRoleFormula(contributors)} and rec.Domaine in user.Droits.Domaines_Autorises and ${accessWrite}`},
      {roles:reader,perm:"+R",tag:"PRESIM_READ",formula:`${aclRoleFormula(reader)} and rec.Domaine in user.Droits.Domaines_Autorises and (${accessRead} or ${accessWrite})`}
    ];
  }
  if(spec.mode==="presimchild"){
    const accessRead=`("|" + user.Email.lower() + "|") in rec.Pre_Simulation.Acces_Lecture_Emails`;
    const accessWrite=`("|" + user.Email.lower() + "|") in rec.Pre_Simulation.Acces_Modification_Emails`;
    return [
      {roles:contributors,perm:"+CRUD",tag:"PRESIM_CHILD_WRITE",formula:`${aclRoleFormula(contributors)} and rec.Pre_Simulation.Domaine in user.Droits.Domaines_Autorises and ${accessWrite}`},
      {roles:reader,perm:"+R",tag:"PRESIM_CHILD_READ",formula:`${aclRoleFormula(reader)} and rec.Pre_Simulation.Domaine in user.Droits.Domaines_Autorises and (${accessRead} or ${accessWrite})`}
    ];
  }
  if(spec.mode==="presimrights"){
    return [
      {roles:["ADMINISTRATEUR"],perm:"+CRUD",tag:"PRESIM_RIGHTS_ADMIN",formula:`${aclRoleFormula(["ADMINISTRATEUR"])} and rec.Pre_Simulation.Domaine in user.Droits.Domaines_Autorises`}
    ];
  }
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
  if(spec.mode==="selfidentity"){
    return [
      {roles:["ADMINISTRATEUR"],perm:"+CRUD",tag:"ADMIN_SYNC_IDENTITIES",formula:aclRoleFormula(["ADMINISTRATEUR"])},
      {roles:["LECTEUR","CONTRIBUTEUR","OBSERVATEUR","CONTRIBUTEUR_AVANCE"],perm:"+R",tag:"READ_SELF_IDENTITY",formula:`${aclRoleFormula(["LECTEUR","CONTRIBUTEUR","OBSERVATEUR","CONTRIBUTEUR_AVANCE"])} and rec.Email == user.Email`}
    ];
  }
  if(spec.mode==="chatmessages"){
    return [
      {roles:reader,perm:"+C",tag:"CREATE_MESSAGE",formula:`${aclRoleFormula(reader)} and rec.Expediteur == user.Email`},
      {roles:reader,perm:"+U",tag:"UPDATE_OWN_MESSAGE",formula:`${aclRoleFormula(reader)} and rec.Expediteur == user.Email`},
      {roles:reader,perm:"+D",tag:"DELETE_OWN_MESSAGE",formula:`${aclRoleFormula(reader)} and rec.Expediteur == user.Email`},
      {roles:reader,perm:"+R",tag:"READ_ALLOWED_MESSAGES",formula:`${aclRoleFormula(reader)} and (rec.Canal == "GENERAL" or rec.Expediteur == user.Email or rec.Destinataire == user.Email)`}
    ];
  }
  if(spec.mode==="chatreads"){
    return [
      {roles:reader,perm:"+CRUD",tag:"OWN_READ_MARKERS",formula:`${aclRoleFormula(reader)} and rec.Email == user.Email`}
    ];
  }
  if(spec.mode==="owneronly"){
    // La règle Owner générique est ajoutée par applyFinopsAcl(); le défaut none ferme la table aux autres.
    return [];
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

    // Grist requires the default rule (empty aclFormula) to be the LAST rule
    // for a resource. A pre-existing default on a FinOps-managed resource would
    // therefore make any newly appended FinOps rule invalid ("listed after default rule").
    //
    // Keep unrelated conditional rules, but remove:
    //   1) all previously FinOps-tagged rules;
    //   2) every existing DEFAULT rule on a resource managed by FinOps.
    // We recreate one explicit "none" default at the very end of each managed resource.
    const managedResourceIds=new Set(
      FINOPS_ACL_RESOURCES
        .map(x=>p2.byKey[`${x.tableId}|${x.colIds}`]?.id)
        .filter(Boolean)
    );
    const schemaRes=p2.resources?.find?.(r=>r.tableId==="*SPECIAL"&&r.colIds==="SchemaEdit");
    if(schemaRes?.id)managedResourceIds.add(schemaRes.id);

    const removeIds=new Set(p2.existingTagged.map(r=>+r.id));
    (meta2.rules||[]).forEach(r=>{
      const isDefault=String(r.aclFormula||"").trim()==="" &&
                      !String(r.userAttributes||"").trim();
      if(isDefault && managedResourceIds.has(+r.resource))removeIds.add(+r.id);
    });
    const remove=[...removeIds].filter(Boolean).map(id=>["RemoveRecord","_grist_ACLRules",id]);
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
    const msg=e.message||String(e);
    const hint=/listed after default rule/i.test(msg)
      ? '<p><b>Cause :</b> une règle par défaut existait déjà avant les règles FinOps. V59 corrige automatiquement cet ordre ; recharge l’application puis relance la réconciliation.</p>'
      : '';
    box.innerHTML=`<span class="badge warn">Échec de la réconciliation</span><p>${esc(msg)}</p>${hint}`;
    toast(msg,true);
  }
}


async function syncFinopsIdentitiesV52(activeEmails){
  const desired=[...new Set((activeEmails||[])
    .map(x=>String(x||'').trim().toLowerCase())
    .filter(x=>x.includes('@')))];
  const rowsNow=D?.[T.selfIdentity]||[];
  const byEmail=new Map();
  rowsNow.forEach(r=>{
    const email=String(r.Email||'').trim().toLowerCase();
    if(email&&!byEmail.has(email))byEmail.set(email,r);
  });
  const desiredSet=new Set(desired);
  const actions=[];
  desired.forEach(email=>{
    if(!byEmail.has(email))actions.push(["AddRecord",T.selfIdentity,null,{Email:email}]);
  });
  rowsNow.forEach(r=>{
    const email=String(r.Email||'').trim().toLowerCase();
    if(email&&!desiredSet.has(email))actions.push(["RemoveRecord",T.selfIdentity,+r.id]);
  });
  if(!actions.length)return {added:0,removed:0};
  const added=actions.filter(a=>a[0]==='AddRecord').length;
  const removed=actions.filter(a=>a[0]==='RemoveRecord').length;
  await apply(actions);
  return {added,removed};
}

function renderRightsAdmin(){
  const el=document.getElementById('v-rights');
  if(!el)return;
  el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Droits utilisateurs</h3><p>La présence d’un utilisateur actif dans cette table est obligatoire pour accéder à FinOps. Les domaines définissent son périmètre de données. <span class="badge ok">Identité technique synchronisée automatiquement</span></p></div><div class="table-actions"><button id="newRightUser" class="btn secondary">+ Nouvel utilisateur</button><button id="saveAllRights" class="btn primary">Enregistrer les modifications</button></div></div>
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
      const remainingActive=(D[T.rights]||[])
        .filter(r=>+r.id!==id&&r.Actif!==false)
        .map(r=>String(r.Email||'').trim().toLowerCase())
        .filter(Boolean);
      await syncFinopsIdentitiesV52(remainingActive);
      toast("Utilisateur supprimé des droits et identité technique synchronisée.");
      await boot();
    }catch(e){toast("Suppression impossible : "+(e.message||String(e)),true)}
  });
}
async function saveAllRightsV18(){
  if(!roleCanEditAdvancedMenus()){toast(readOnlyMessage(),true);return}
  const actions=[];
  let invalid=false;
  const emails=[];
  const activeEmails=[];
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
    emails.push(fields.Email.toLowerCase());
    if(fields.Actif!==false)activeEmails.push(fields.Email.toLowerCase());
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
    const sync=await syncFinopsIdentitiesV52(activeEmails);
    const detail=(sync.added||sync.removed)?` · identités +${sync.added} / -${sync.removed}`:'';
    toast("Droits utilisateurs enregistrés"+detail+".");
    await boot();
  }catch(e){toast(e.message||String(e),true)}
}

// ─────────────────────────────────────────────────────────────
// V46 — Claude Enterprise : scénarios, organisations, groupes, ressources
// ─────────────────────────────────────────────────────────────
let CE_SELECTED_SCENARIO=0, CE_TAB='overview';
function ceRows(key){return D?.[T[key]]||[]}
function ceScenario(){const all=ceRows('claudeScenarios');return all.find(x=>+x.id===+CE_SELECTED_SCENARIO)||all[0]||null}
function ceScoped(sid){
  const orgs=ceRows('claudeOrgs').filter(x=>+x.Scenario===+sid), orgIds=new Set(orgs.map(x=>+x.id));
  const groups=ceRows('claudeGroups').filter(x=>+x.Scenario===+sid&&orgIds.has(+x.Organisation)), groupIds=new Set(groups.map(x=>+x.id));
  const resources=ceRows('claudeResources').filter(x=>+x.Scenario===+sid&&(orgIds.has(+x.Organisation)||groupIds.has(+x.Groupe)));
  return {orgs,groups,resources};
}
function ceLimit(r,groups){const g=groups.find(x=>+x.id===+r.Groupe);return r.Limite_Individuelle_Active?Math.max(0,+r.Limite_Individuelle||0):Math.max(0,+g?.Limite_User_Mois||0)}
function ceModel(sid){const s=ceRows('claudeScenarios').find(x=>+x.id===+sid),x=ceScoped(sid),active=x.resources.filter(r=>r.Actif!==false),exposure=active.reduce((a,r)=>a+ceLimit(r,x.groups),0),cap=x.orgs.reduce((a,o)=>a+Math.max(0,+o.Plafond_Global||0),0);return {...x,s,active,exposure,cap,margin:cap-exposure}}
function ceConfigUrl(){return String(ceRows('claudeConfig').find(x=>String(x.Cle||'').trim()==='URL_MAQUETTE')?.Valeur||'').trim()}
function ceCanEdit(){return canEditView('claudeenterprise')}
function ceStyles(){if(document.getElementById('ce-v46-style'))return;const st=document.createElement('style');st.id='ce-v46-style';st.textContent=`
.ce-hero{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:18px}.ce-hero h2{margin:0 0 5px;font-size:24px}.ce-hero p{margin:0;color:#667085}.ce-scenario{display:flex;gap:8px;align-items:end;flex-wrap:wrap;padding:14px 16px;margin-bottom:16px}.ce-scenario .field{min-width:230px}.ce-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:14px 0}.ce-kpi{border:1px solid var(--border);border-radius:14px;padding:16px;background:#fff}.ce-kpi .v{font-size:25px;font-weight:800;margin-top:6px}.ce-kpi .l,.ce-muted{color:#667085;font-size:12px}.ce-tabs{display:flex;gap:6px;border-bottom:1px solid var(--border);margin:8px 0 16px}.ce-tab{border:0;background:transparent;padding:10px 13px;font-weight:700;color:#667085;border-bottom:2px solid transparent}.ce-tab.active{color:#4f46e5;border-color:#4f46e5}.ce-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(280px,.8fr);gap:14px}.ce-org{border:1px solid var(--border);border-radius:13px;padding:14px;margin-top:10px}.ce-groups{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:9px;margin-top:10px}.ce-group{background:#f8f8fb;border:1px solid #ececf2;border-radius:12px;padding:12px}.ce-bar{height:8px;background:#ececf5;border-radius:999px;overflow:hidden;margin:12px 0}.ce-bar>i{display:block;height:100%;background:#635bff;border-radius:999px}.ce-actions{display:flex;gap:7px;flex-wrap:wrap}.ce-formgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ce-formgrid .full{grid-column:1/-1}.ce-dialog{position:fixed;inset:0;background:rgba(16,24,40,.28);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}.ce-dialog-card{width:min(650px,96vw);max-height:90vh;overflow:auto;background:#fff;border-radius:16px;padding:20px;box-shadow:0 24px 70px rgba(16,24,40,.2)}.ce-dialog-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.ce-danger{color:#b42318}.ce-origin{font-size:11px;padding:3px 7px;border-radius:999px;background:#f1f3f7}.ce-origin.override{background:#fff1df;color:#9a4b00}@media(max-width:1100px){.ce-kpis{grid-template-columns:repeat(2,1fr)}.ce-layout{grid-template-columns:1fr}}@media(max-width:650px){.ce-kpis,.ce-formgrid{grid-template-columns:1fr}.ce-formgrid .full{grid-column:auto}.ce-hero{display:block}.ce-hero .ce-actions{margin-top:10px}}
`;document.head.appendChild(st)}
function renderClaudeEnterprise(){
  const el=document.getElementById('v-claudeenterprise');if(!el)return;ceStyles();
  const scenarios=ceRows('claudeScenarios').filter(x=>x.Actif!==false);
  if(!CE_SELECTED_SCENARIO||!scenarios.some(x=>+x.id===+CE_SELECTED_SCENARIO))CE_SELECTED_SCENARIO=+scenarios[0]?.id||0;
  const m=ceModel(CE_SELECTED_SCENARIO),url=ceConfigUrl(),editable=ceCanEdit();
  if(!m.s){el.innerHTML=`<div class="ce-hero"><div><h2>Claude Enterprise</h2><p>Gouvernance des ressources, groupes et budgets.</p></div>${url?`<button id="ceOpenMock" class="btn secondary">↗ Ouvrir la maquette</button>`:''}</div><article class="card"><h3>Aucun scénario Claude Enterprise</h3><p>Créez le premier scénario pour commencer votre simulation.</p>${editable?'<button id="ceFirstScenario" class="btn primary">+ Nouveau scénario</button>':''}</article>`;document.getElementById('ceOpenMock')?.addEventListener('click',()=>window.open(url,'_blank','noopener'));document.getElementById('ceFirstScenario')?.addEventListener('click',()=>ceNewScenario());return}
  const pctCap=m.cap?Math.min(100,Math.max(0,m.exposure/m.cap*100)):0;
  el.innerHTML=`<div class="ce-hero"><div><h2>Claude Enterprise</h2><p>Simulez et conservez plusieurs configurations de ressources, groupes et budgets.</p></div><div class="ce-actions">${url?'<button id="ceOpenMock" class="btn secondary">↗ Ouvrir la maquette</button>':''}${roleCanEditAdvancedMenus()?'<button id="ceConfigUrl" class="btn secondary">⚙ URL maquette</button>':''}</div></div>
  <article class="card ce-scenario"><label class="field">Scénario<select id="ceScenarioSelect">${scenarios.map(s=>`<option value="${s.id}" ${+s.id===+m.s.id?'selected':''}>${esc(s.Nom)}</option>`).join('')}</select></label><div class="ce-actions">${editable?'<button id="ceNew" class="btn secondary">+ Nouveau</button><button id="ceDuplicate" class="btn secondary">Dupliquer</button><button id="ceRename" class="btn secondary">Renommer</button><button id="ceDeleteScenario" class="btn secondary ce-danger">Supprimer</button>':''}</div><span class="ce-muted">${esc(m.s.Description||m.s.Commentaire||'')}</span></article>
  <div class="ce-kpis"><div class="ce-kpi"><div class="ce-muted">RESSOURCES</div><div class="v">${num(m.resources.length)}</div><div class="l">${num(m.active.length)} actives</div></div><div class="ce-kpi"><div class="ce-muted">GROUPES</div><div class="v">${num(m.groups.length)}</div><div class="l">${num(m.orgs.length)} organisation(s)</div></div><div class="ce-kpi"><div class="ce-muted">PLAFOND ORGANISATION</div><div class="v">${money(m.cap,'EUR')}</div><div class="l">par mois</div></div><div class="ce-kpi"><div class="ce-muted">EXPOSITION THÉORIQUE</div><div class="v">${money(m.exposure,'EUR')}</div><div class="l">${m.cap?pct(m.exposure/m.cap):'—'} du plafond</div></div></div>
  <div class="ce-tabs"><button class="ce-tab ${CE_TAB==='overview'?'active':''}" data-ce-tab="overview">Vue d’ensemble</button><button class="ce-tab ${CE_TAB==='resources'?'active':''}" data-ce-tab="resources">Ressources</button><button class="ce-tab ${CE_TAB==='structure'?'active':''}" data-ce-tab="structure">Organisations & groupes</button></div><div id="ceTabBody"></div>`;
  document.getElementById('ceOpenMock')?.addEventListener('click',()=>window.open(url,'_blank','noopener'));
  document.getElementById('ceConfigUrl')?.addEventListener('click',ceConfigureUrl);
  document.getElementById('ceScenarioSelect').onchange=e=>{CE_SELECTED_SCENARIO=+e.target.value;renderClaudeEnterprise()};
  document.querySelectorAll('[data-ce-tab]').forEach(b=>b.onclick=()=>{CE_TAB=b.dataset.ceTab;renderClaudeEnterprise()});
  document.getElementById('ceNew')?.addEventListener('click',ceNewScenario);document.getElementById('ceDuplicate')?.addEventListener('click',()=>ceDuplicateScenario(m));document.getElementById('ceRename')?.addEventListener('click',()=>ceRenameScenario(m.s));document.getElementById('ceDeleteScenario')?.addEventListener('click',()=>ceDeleteScenario(m));
  if(CE_TAB==='resources')ceRenderResources(m);else if(CE_TAB==='structure')ceRenderStructure(m);else ceRenderOverview(m,pctCap);
}
function ceRenderOverview(m,pctCap){const body=document.getElementById('ceTabBody');body.innerHTML=`<div class="ce-layout"><article class="card"><h3>Architecture budgétaire</h3><p>Répartition par organisation et groupe.</p>${m.orgs.map(o=>{const gs=m.groups.filter(g=>+g.Organisation===+o.id);return `<div class="ce-org"><b>${esc(o.Nom)}</b><span class="ce-muted"> · plafond ${money(o.Plafond_Global,'EUR')} / mois</span><div class="ce-groups">${gs.map(g=>{const rs=m.active.filter(r=>+r.Groupe===+g.id),ex=rs.reduce((a,r)=>a+ceLimit(r,m.groups),0);return `<div class="ce-group"><b>${esc(g.Nom)}</b><div class="ce-muted">${rs.length} ressource(s)</div><div>${money(g.Limite_User_Mois,'EUR')} / user / mois</div><div class="ce-muted">Exposition : <b>${money(ex,'EUR')}</b></div></div>`}).join('')||'<span class="ce-muted">Aucun groupe</span>'}</div></div>`}).join('')||'<div class="ce-muted">Aucune organisation.</div>'}</article><article class="card"><h3>Budget</h3><div class="ce-muted">Plafond organisation</div><h2>${money(m.cap,'EUR')}</h2><div class="ce-bar"><i style="width:${pctCap}%"></i></div><div style="display:flex;justify-content:space-between"><span>Exposition théorique</span><b>${money(m.exposure,'EUR')}</b></div><div style="display:flex;justify-content:space-between;margin-top:10px"><span>Marge disponible</span><b class="${m.margin<0?'ce-danger':''}">${money(m.margin,'EUR')}</b></div><div class="status" style="margin-top:16px">Les plafonds définissent l’exposition maximale autorisée. Ils ne représentent ni une prévision ni une consommation réelle.</div></article></div>`}
function ceRenderResources(m){const body=document.getElementById('ceTabBody');body.innerHTML=`<article class="card"><div class="ce-hero"><div><h3>Ressources</h3><p>Liste des utilisateurs et de leurs limites effectives.</p></div>${ceCanEdit()?'<button id="ceAddResource" class="btn primary">+ Ajouter une ressource</button>':''}</div><div class="tablewrap"><table><thead><tr><th>Ressource</th><th>Organisation</th><th>Groupe</th><th>Limite effective</th><th>Origine</th><th>Statut</th><th></th></tr></thead><tbody>${m.resources.map(r=>{const o=m.orgs.find(x=>+x.id===+r.Organisation),g=m.groups.find(x=>+x.id===+r.Groupe),ov=!!r.Limite_Individuelle_Active;return `<tr><td><b>${esc(r.Nom)}</b><br><span class="ce-muted">${esc(r.Email||'')}</span></td><td>${esc(o?.Nom||'—')}</td><td>${esc(g?.Nom||'—')}</td><td><b>${money(ceLimit(r,m.groups),'EUR')} / mois</b></td><td><span class="ce-origin ${ov?'override':''}">${ov?'Dérogation':'Groupe'}</span></td><td>${r.Actif!==false?'<span class="badge ok">Actif</span>':'<span class="badge">Inactif</span>'}</td><td>${ceCanEdit()?`<button class="mini-btn" data-ce-edit-res="${r.id}">Modifier</button> <button class="mini-btn ce-danger" data-ce-del-res="${r.id}">Suppr.</button>`:''}</td></tr>`}).join('')||'<tr><td colspan="7">Aucune ressource.</td></tr>'}</tbody></table></div></article>`;document.getElementById('ceAddResource')?.addEventListener('click',()=>ceResourceDialog(m));body.querySelectorAll('[data-ce-edit-res]').forEach(b=>b.onclick=()=>ceResourceDialog(m,m.resources.find(r=>+r.id===+b.dataset.ceEditRes)));body.querySelectorAll('[data-ce-del-res]').forEach(b=>b.onclick=()=>ceDeleteRecord(T.claudeResources,+b.dataset.ceDelRes,'ressource'))}
function ceRenderStructure(m){const body=document.getElementById('ceTabBody');body.innerHTML=`<div class="ce-layout"><article class="card"><div class="ce-hero"><div><h3>Organisations</h3><p>Plafonds globaux du scénario.</p></div>${ceCanEdit()?'<button id="ceAddOrg" class="btn primary">+ Organisation</button>':''}</div>${m.orgs.map(o=>`<div class="ce-org"><div style="display:flex;justify-content:space-between;gap:8px"><div><b>${esc(o.Nom)}</b><div class="ce-muted">${money(o.Plafond_Global,'EUR')} / mois</div></div>${ceCanEdit()?`<div><button class="mini-btn" data-ce-org="${o.id}">Modifier</button> <button class="mini-btn ce-danger" data-ce-del-org="${o.id}">Suppr.</button></div>`:''}</div></div>`).join('')||'<p class="ce-muted">Aucune organisation.</p>'}</article><article class="card"><div class="ce-hero"><div><h3>Groupes</h3><p>Limite héritée par utilisateur.</p></div>${ceCanEdit()?'<button id="ceAddGroup" class="btn primary">+ Groupe</button>':''}</div>${m.groups.map(g=>{const o=m.orgs.find(x=>+x.id===+g.Organisation);return `<div class="ce-org"><b>${esc(g.Nom)}</b><div class="ce-muted">${esc(o?.Nom||'—')} · ${money(g.Limite_User_Mois,'EUR')} / user / mois</div>${ceCanEdit()?`<div style="margin-top:8px"><button class="mini-btn" data-ce-group="${g.id}">Modifier</button> <button class="mini-btn ce-danger" data-ce-del-group="${g.id}">Suppr.</button></div>`:''}</div>`}).join('')||'<p class="ce-muted">Aucun groupe.</p>'}</article></div>`;document.getElementById('ceAddOrg')?.addEventListener('click',()=>ceOrgDialog(m));document.getElementById('ceAddGroup')?.addEventListener('click',()=>ceGroupDialog(m));body.querySelectorAll('[data-ce-org]').forEach(b=>b.onclick=()=>ceOrgDialog(m,m.orgs.find(x=>+x.id===+b.dataset.ceOrg)));body.querySelectorAll('[data-ce-group]').forEach(b=>b.onclick=()=>ceGroupDialog(m,m.groups.find(x=>+x.id===+b.dataset.ceGroup)));body.querySelectorAll('[data-ce-del-org]').forEach(b=>b.onclick=()=>ceDeleteOrg(m,+b.dataset.ceDelOrg));body.querySelectorAll('[data-ce-del-group]').forEach(b=>b.onclick=()=>ceDeleteGroup(m,+b.dataset.ceDelGroup))}
function ceDialog(title,html,onSave){const d=document.createElement('div');d.className='ce-dialog';d.innerHTML=`<div class="ce-dialog-card"><div class="ce-dialog-head"><h3>${esc(title)}</h3><button class="mini-btn" data-close>✕</button></div><div>${html}</div><div class="ce-actions" style="justify-content:flex-end;margin-top:18px"><button class="btn secondary" data-close>Annuler</button><button class="btn primary" data-save>Enregistrer</button></div></div>`;document.body.appendChild(d);d.querySelectorAll('[data-close]').forEach(x=>x.onclick=()=>d.remove());d.querySelector('[data-save]').onclick=async()=>{try{await onSave(d);d.remove();await ceReload()}catch(e){console.error(e);toast(e.message||'Erreur Grist',true)}}}
async function ceReload(){D=await fetchAll();renderClaudeEnterprise();enforceRolePermissions()}
async function ceNewScenario(){const name=prompt('Nom du nouveau scénario Claude Enterprise :','Nouveau scénario');if(!name?.trim())return;const ids=await grist.docApi.applyUserActions([['AddRecord',T.claudeScenarios,null,{Nom:name.trim(),Description:'',Actif:true}]]);await ceReload();const all=ceRows('claudeScenarios');CE_SELECTED_SCENARIO=+all[all.length-1]?.id||CE_SELECTED_SCENARIO;renderClaudeEnterprise()}
async function ceRenameScenario(s){const name=prompt('Nouveau nom du scénario :',s.Nom||'');if(!name?.trim()||name.trim()===s.Nom)return;await grist.docApi.applyUserActions([['UpdateRecord',T.claudeScenarios,s.id,{Nom:name.trim()}]]);await ceReload()}
async function ceDuplicateScenario(m){const name=prompt('Nom de la copie :',`${m.s.Nom} - copie`);if(!name?.trim())return;try{await grist.docApi.applyUserActions([['AddRecord',T.claudeScenarios,null,{Nom:name.trim(),Description:m.s.Description||'',Actif:true}]]);D=await fetchAll();const ns=ceRows('claudeScenarios').slice().sort((a,b)=>+b.id-+a.id)[0];const actions=[],orgMap=new Map(),groupMap=new Map();for(const o of m.orgs){actions.push(['AddRecord',T.claudeOrgs,null,{Scenario:ns.id,Nom:o.Nom,Plafond_Global:+o.Plafond_Global||0,Actif:o.Actif!==false,Commentaire:o.Commentaire||''}])}if(actions.length)await grist.docApi.applyUserActions(actions);D=await fetchAll();const newOrgs=ceRows('claudeOrgs').filter(x=>+x.Scenario===+ns.id);m.orgs.forEach(o=>{const n=newOrgs.find(x=>x.Nom===o.Nom&&!Array.from(orgMap.values()).includes(x.id));if(n)orgMap.set(o.id,n.id)});const ga=m.groups.map(g=>['AddRecord',T.claudeGroups,null,{Scenario:ns.id,Organisation:orgMap.get(g.Organisation)||0,Nom:g.Nom,Limite_User_Mois:+g.Limite_User_Mois||0,Actif:g.Actif!==false,Commentaire:g.Commentaire||''}]);if(ga.length)await grist.docApi.applyUserActions(ga);D=await fetchAll();const newGroups=ceRows('claudeGroups').filter(x=>+x.Scenario===+ns.id);m.groups.forEach(g=>{const n=newGroups.find(x=>x.Nom===g.Nom&&+x.Organisation===+(orgMap.get(g.Organisation)||0)&&!Array.from(groupMap.values()).includes(x.id));if(n)groupMap.set(g.id,n.id)});const ra=m.resources.map(r=>['AddRecord',T.claudeResources,null,{Scenario:ns.id,Nom:r.Nom,Email:r.Email||'',Organisation:orgMap.get(r.Organisation)||0,Groupe:groupMap.get(r.Groupe)||0,Actif:r.Actif!==false,Limite_Individuelle_Active:!!r.Limite_Individuelle_Active,Limite_Individuelle:+r.Limite_Individuelle||0,Commentaire:r.Commentaire||''}]);if(ra.length)await grist.docApi.applyUserActions(ra);CE_SELECTED_SCENARIO=ns.id;await ceReload();toast('Scénario dupliqué avec sa configuration.')}catch(e){console.error(e);toast('Duplication impossible : '+(e.message||e),true)}}
async function ceDeleteScenario(m){if(!confirm(`Supprimer le scénario « ${m.s.Nom} » et toute sa configuration ?`))return;const actions=[...m.resources.map(r=>['RemoveRecord',T.claudeResources,r.id]),...m.groups.map(g=>['RemoveRecord',T.claudeGroups,g.id]),...m.orgs.map(o=>['RemoveRecord',T.claudeOrgs,o.id]),['RemoveRecord',T.claudeScenarios,m.s.id]];await grist.docApi.applyUserActions(actions);CE_SELECTED_SCENARIO=0;await ceReload()}
function ceOrgDialog(m,o=null){ceDialog(o?'Modifier l’organisation':'Nouvelle organisation',`<div class="ce-formgrid"><label class="field full">Nom<input id="ceFName" value="${esc(o?.Nom||'')}"></label><label class="field">Plafond mensuel (€)<input id="ceFCap" type="number" min="0" value="${+o?.Plafond_Global||0}"></label><label class="field">Actif<select id="ceFActive"><option value="1" ${o?.Actif!==false?'selected':''}>Oui</option><option value="0" ${o?.Actif===false?'selected':''}>Non</option></select></label></div>`,async d=>{const f={Scenario:m.s.id,Nom:d.querySelector('#ceFName').value.trim(),Plafond_Global:+d.querySelector('#ceFCap').value||0,Actif:d.querySelector('#ceFActive').value==='1'};if(!f.Nom)throw Error('Le nom est obligatoire.');await grist.docApi.applyUserActions([[o?'UpdateRecord':'AddRecord',T.claudeOrgs,o?.id||null,f]])})}
function ceGroupDialog(m,g=null){if(!m.orgs.length){toast('Créez d’abord une organisation.',true);return}ceDialog(g?'Modifier le groupe':'Nouveau groupe',`<div class="ce-formgrid"><label class="field">Organisation<select id="ceFOrg">${m.orgs.map(o=>`<option value="${o.id}" ${+g?.Organisation===+o.id?'selected':''}>${esc(o.Nom)}</option>`).join('')}</select></label><label class="field">Nom<input id="ceFName" value="${esc(g?.Nom||'')}"></label><label class="field">Limite / utilisateur / mois (€)<input id="ceFLimit" type="number" min="0" value="${+g?.Limite_User_Mois||0}"></label><label class="field">Actif<select id="ceFActive"><option value="1" ${g?.Actif!==false?'selected':''}>Oui</option><option value="0" ${g?.Actif===false?'selected':''}>Non</option></select></label></div>`,async d=>{const f={Scenario:m.s.id,Organisation:+d.querySelector('#ceFOrg').value,Nom:d.querySelector('#ceFName').value.trim(),Limite_User_Mois:+d.querySelector('#ceFLimit').value||0,Actif:d.querySelector('#ceFActive').value==='1'};if(!f.Nom)throw Error('Le nom est obligatoire.');await grist.docApi.applyUserActions([[g?'UpdateRecord':'AddRecord',T.claudeGroups,g?.id||null,f]])})}
function ceResourceDialog(m,r=null){if(!m.groups.length){toast('Créez d’abord une organisation et un groupe.',true);return}ceDialog(r?'Modifier la ressource':'Nouvelle ressource',`<div class="ce-formgrid"><label class="field">Nom<input id="ceFName" value="${esc(r?.Nom||'')}"></label><label class="field">Email<input id="ceFEmail" value="${esc(r?.Email||'')}"></label><label class="field">Groupe<select id="ceFGroup">${m.groups.map(g=>{const o=m.orgs.find(x=>+x.id===+g.Organisation);return `<option value="${g.id}" ${+r?.Groupe===+g.id?'selected':''}>${esc(o?.Nom||'')} — ${esc(g.Nom)}</option>`}).join('')}</select></label><label class="field">Statut<select id="ceFActive"><option value="1" ${r?.Actif!==false?'selected':''}>Actif</option><option value="0" ${r?.Actif===false?'selected':''}>Inactif</option></select></label><label class="field">Dérogation individuelle<select id="ceFOverride"><option value="0" ${!r?.Limite_Individuelle_Active?'selected':''}>Non</option><option value="1" ${r?.Limite_Individuelle_Active?'selected':''}>Oui</option></select></label><label class="field">Limite spécifique (€ / mois)<input id="ceFIndividual" type="number" min="0" value="${+r?.Limite_Individuelle||0}"></label></div>`,async d=>{const gid=+d.querySelector('#ceFGroup').value,g=m.groups.find(x=>+x.id===gid),f={Scenario:m.s.id,Nom:d.querySelector('#ceFName').value.trim(),Email:d.querySelector('#ceFEmail').value.trim(),Organisation:+g.Organisation,Groupe:gid,Actif:d.querySelector('#ceFActive').value==='1',Limite_Individuelle_Active:d.querySelector('#ceFOverride').value==='1',Limite_Individuelle:+d.querySelector('#ceFIndividual').value||0};if(!f.Nom)throw Error('Le nom est obligatoire.');await grist.docApi.applyUserActions([[r?'UpdateRecord':'AddRecord',T.claudeResources,r?.id||null,f]])})}
async function ceDeleteRecord(table,id,label){if(!confirm(`Supprimer cette ${label} ?`))return;await grist.docApi.applyUserActions([['RemoveRecord',table,id]]);await ceReload()}
async function ceDeleteGroup(m,id){if(m.resources.some(r=>+r.Groupe===+id)){toast('Ce groupe contient encore des ressources.',true);return}await ceDeleteRecord(T.claudeGroups,id,'groupe')}
async function ceDeleteOrg(m,id){if(m.groups.some(g=>+g.Organisation===+id)||m.resources.some(r=>+r.Organisation===+id)){toast('Cette organisation contient encore des groupes ou ressources.',true);return}await ceDeleteRecord(T.claudeOrgs,id,'organisation')}

async function ceConfigureUrl(){const old=ceConfigUrl(),value=prompt('URL de la maquette Claude Enterprise :',old);if(value===null)return;const row=ceRows('claudeConfig').find(x=>String(x.Cle||'').trim()==='URL_MAQUETTE');await grist.docApi.applyUserActions([[row?'UpdateRecord':'AddRecord',T.claudeConfig,row?.id||null,{Cle:'URL_MAQUETTE',Valeur:value.trim()}]]);await ceReload();toast('URL de la maquette enregistrée.')}
