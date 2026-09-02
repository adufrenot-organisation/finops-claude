const T={domains:"Domaines",scenarios:"Scenarios",providers:"Fournisseurs",offers:"Offres",alloc:"Allocations",baseline:"Baseline_N_1",baselineDetails:"Baseline_N_1_Details",rights:"Droits_Utilisateurs",menu:"Configuration_Menu",offerCols:"Configuration_Colonnes_Offres",uiLabels:"Configuration_Libelles_UI"};
const COLORS=["#2f6fed","#24b89a","#7c4de8","#e7a62c","#dc4c5a","#5a6b85","#42a5f5","#8bc34a"];
let D=null, ACCESS={role:"DENIED",domainIds:[]}, CURRENT=null, DASH_FILTER={domainIds:[],providerId:0};
grist.ready({requiredAccess:"full"}); document.addEventListener("DOMContentLoaded",boot);
function rows(t){if(!t||!Array.isArray(t.id))return[];return t.id.map((id,i)=>{const r={id};for(const[k,v]of Object.entries(t))if(k!=="id"&&Array.isArray(v))r[k]=v[i];return r})}
function money(v,c="USD"){return new Intl.NumberFormat("fr-FR",{style:"currency",currency:c,maximumFractionDigits:0}).format(Number(v||0))} function num(v){return new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(Number(v||0))} function pct(v){return new Intl.NumberFormat("fr-FR",{style:"percent",maximumFractionDigits:1}).format(Number(v||0))} function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function toast(m,e=false){const x=document.getElementById("toast");if(!x)return;x.textContent=m;x.className="toast show"+(e?" error":"");setTimeout(()=>x.className="toast",2400)}
async function fetchAll(){const names=Object.values(T),raw=await Promise.all(names.map(n=>grist.docApi.fetchTable(n).catch(()=>({id:[]}))));const o={};names.forEach((n,i)=>o[n]=rows(raw[i]));o.domainById=Object.fromEntries(o[T.domains].map(r=>[r.id,r]));o.scenarioById=Object.fromEntries(o[T.scenarios].map(r=>[r.id,r]));o.providerById=Object.fromEntries(o[T.providers].map(r=>[r.id,r]));o.offerById=Object.fromEntries(o[T.offers].map(r=>[r.id,r]));return o}
async function boot(){document.getElementById("root").innerHTML='<div class="splash">Chargement des données Grist…</div>';try{D=await fetchAll();deriveAccess();renderShell();if(ACCESS.role!=="DENIED"){populateScenario();renderAll();ensureUILabelObserver();applyUILabelsSafe()}}catch(e){console.error(e);document.getElementById("root").innerHTML=`<div class="denied"><div class="deniedcard"><div class="lock">!</div><h1>Erreur de chargement</h1><p>${esc(e.message)}</p></div></div>`}}
function refListIds(v){if(Array.isArray(v)){const a=v[0]==='L'?v.slice(1):v;return a.map(Number).filter(x=>Number.isFinite(x)&&x>0)}if(Number.isFinite(+v)&&+v>0)return[+v];return[]}
function deriveAccess(){const rr=D[T.rights].filter(r=>r.Actif!==false);if(rr.some(r=>String(r.Role_App).toLowerCase()==="admin")){ACCESS={role:"OWNER",domainIds:D[T.domains].map(d=>+d.id),rights:rr};return}if(rr.length){const ids=[];rr.forEach(r=>{const multi=refListIds(r.Domaines_Autorises);if(multi.length)ids.push(...multi);else if(+r.Domaine)ids.push(+r.Domaine)});ACCESS={role:"DOMAIN_USER",domainIds:[...new Set(ids)],rights:rr};return}const visibleDomains=[...new Set(D[T.alloc].map(r=>+r.Domaine).filter(Boolean))];if(D[T.domains].length>1&&visibleDomains.length>1){ACCESS={role:"OWNER",domainIds:D[T.domains].map(d=>+d.id),rights:[]};return}ACCESS={role:"DENIED",domainIds:[]}}
function menuConfigRows(){
  const fallback=[
    {Cle:'dashboard',Libelle:'Dashboard',Ordre:10,Actif:true,Owner_Seulement:false},
    {Cle:'simulation',Libelle:'Simulation',Ordre:20,Actif:true,Owner_Seulement:false},
    {Cle:'compare',Libelle:'Comparaison',Ordre:30,Actif:true,Owner_Seulement:false},
    {Cle:'roi',Libelle:'ROI / Économies',Ordre:40,Actif:true,Owner_Seulement:false},
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
    .filter(r=>r.Actif!==false)
    .sort((a,b)=>(+a.Ordre||9999)-(+b.Ordre||9999)||String(a.Cle).localeCompare(String(b.Cle)));
}
function menuLabel(view){
  const r=menuConfigRows().find(x=>x.Cle===view);
  return r?.Libelle||DEFAULT_MENU_LABELS[view]||view;
}
function navIcon(view){
  return {dashboard:'◧',simulation:'⌘',compare:'⇄',roi:'↗',scenarios:'▤',offers:'¤',offersadmin:'⚙',domains:'◎',rights:'♙',menuadmin:'☷',labelsadmin:'✎',acladmin:'🔐'}[view]||'•';
}
function buildNavHtml(admin){
  return menuConfigRows()
    .filter(r=>admin || !r.Owner_Seulement)
    .map((r,i)=>`<button class="${i===0?'active':''}" data-view="${esc(r.Cle)}"><span class="nav-icon">${navIcon(r.Cle)}</span><span class="nav-label">${esc(r.Libelle||r.Cle)}</span></button>`)
    .join('');
}
function renderShell(){
  if(ACCESS.role==="DENIED"){
    document.getElementById("root").innerHTML=`<div class="denied"><div class="deniedcard"><div class="lock">🔒</div><h1>Accès non autorisé</h1><p>Vous ne disposez pas des droits nécessaires pour accéder à ce module.</p><div class="deniednote">Si vous pensez devoir disposer de cet accès, veuillez contacter l’administrateur de la solution afin qu’il vérifie votre rattachement à un domaine.</div></div></div>`;
    return;
  }
  const admin=ACCESS.role==="OWNER";
  const navHtml=buildNavHtml(admin);
  document.getElementById("root").innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand"><div class="logo">F</div><div class="brandtext"><h2>FINOPS IA</h2><small>SIMULATEUR MULTI-FOURNISSEURS</small></div><button id="sidebarToggle" class="sidebar-toggle" title="Rétracter le menu" aria-label="Rétracter le menu">‹</button></div><nav class="nav">${navHtml}</nav><div class="sidefoot"><b>${admin?'Owner / Admin':'Utilisateur domaine'}</b><br><span id="sideScope"></span></div></aside><main class="content"><header class="head"><div><h1 id="title">${esc(menuLabel('dashboard'))}</h1><div class="sub">Claude · Mistral · Cursor</div><div id="scope" class="scope"></div></div><div class="controls"><label class="field">Scénario<select id="scenarioSelect"></select></label><button id="refresh" class="btn secondary">Actualiser</button></div></header><div id="status" class="status">Données synchronisées avec Grist.</div><section id="v-dashboard" class="view active"></section><section id="v-simulation" class="view"></section><section id="v-compare" class="view"></section><section id="v-roi" class="view"></section><section id="v-scenarios" class="view"></section><section id="v-offers" class="view"></section>${admin?'<section id="v-offersadmin" class="view"></section><section id="v-domains" class="view"></section><section id="v-rights" class="view"></section><section id="v-menuadmin" class="view"></section><section id="v-labelsadmin" class="view"></section><section id="v-acladmin" class="view"></section>':''}</main></div><div id="toast" class="toast"></div>`;
  document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  document.getElementById('refresh').onclick=boot;
  const toggle=document.getElementById('sidebarToggle');
  const initial=localStorage.getItem('finopsSidebarCollapsed')==='1';
  setSidebarCollapsed(initial);
  toggle.onclick=()=>setSidebarCollapsed(!document.querySelector('.shell').classList.contains('sidebar-collapsed'));
}

const AUTHORIZED_CAN_EDIT_SCENARIOS=true;
function isOwner(){return ACCESS.role==='OWNER'}
function canEditView(view){return isOwner() || (AUTHORIZED_CAN_EDIT_SCENARIOS && view==='scenarios')}
function enforceReadOnlyForNonOwner(){
  if(isOwner())return;
  document.querySelectorAll('.view').forEach(view=>{
    const key=(view.id||'').replace(/^v-/,'');
    if(key==='scenarios')return;
    view.querySelectorAll('input,select,textarea,button').forEach(el=>{
      // Keep harmless navigation/refresh controls outside views untouched.
      if(el.closest('.read-only-exempt'))return;
      if(el.matches('button')){
        // Hide action buttons in non-scenario business screens for non-owner users.
        if(!el.classList.contains('linklike')) el.style.display='none';
      }else{
        el.disabled=true;
        el.classList.add('readonly-control');
      }
    });
  });
}

const DEFAULT_MENU_LABELS={
  dashboard:'Dashboard',
  simulation:'Simulation',
  compare:'Comparaison',
  roi:'ROI / Économies',
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
function switchView(v){document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===v));document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));document.getElementById('v-'+v)?.classList.add('active');document.getElementById('title').textContent=menuLabel(v);const scenarioField=document.getElementById('scenarioSelect')?.closest('.field');if(scenarioField)scenarioField.style.display=['offers','offersadmin','domains','rights','menuadmin','labelsadmin','acladmin'].includes(v)?'none':''}
function scopedDomains(){return D[T.domains].filter(d=>d.Actif!==false&&ACCESS.domainIds.includes(+d.id))} function scopedAlloc(sid){return D[T.alloc].filter(r=>+r.Scenario===+sid&&ACCESS.domainIds.includes(+r.Domaine))} function scopedBaseline(sid){return D[T.baseline].filter(r=>+r.Scenario===+sid&&ACCESS.domainIds.includes(+r.Domaine))} function scopedBaselineDetails(sid){return (D[T.baselineDetails]||[]).filter(r=>+r.Scenario===+sid&&ACCESS.domainIds.includes(+r.Domaine))}
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
function renderAll(){CURRENT=model(selectedScenario()?.id);const names=scopedDomains().map(d=>d.Nom).join(', ');document.getElementById('scope').textContent=ACCESS.role==='OWNER'?'Périmètre : tous les domaines':`Périmètre : ${names}`;document.getElementById('sideScope').textContent=ACCESS.role==='OWNER'?'Tous les domaines':names;renderDashboard();renderSimulation();renderCompare();renderROI();renderScenarios();renderOffersReadOnly();if(ACCESS.role==='OWNER'){renderOffersAdmin();renderDomainsAdmin();renderRightsAdmin();renderMenuAdmin();renderLabelsAdmin();renderAclAdmin()}applyUILabels();enforceReadOnlyForNonOwner()}
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
function renderSimulation(){const el=document.getElementById('v-simulation'),m=CURRENT;el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Allocations du scénario</h3><p>Une ligne = un domaine + une offre. Modifie plusieurs lignes puis enregistre-les en une seule fois.</p></div><div class="table-actions"><button id="saveAllAlloc" class="btn primary">Enregistrer les modifications</button><button id="addAlloc" class="btn secondary">+ Ajouter une allocation</button></div></div><div class="tablewrap"><table><thead><tr><th>Domaine</th><th>Fournisseur</th><th>Offre</th><th>Licences</th><th>Mois facturés</th><th>Engagement</th><th>Tarif négocié mensuel</th><th>Tarif négocié annuel</th><th>Overage prévu /mois/lic.</th><th>Plafond overage</th><th>Total</th><th></th></tr></thead><tbody>${m.alloc.map(a=>allocRow(a)).join('')}</tbody></table></div></article><article id="newAllocCard" class="card hidden"></article>`;document.getElementById('addAlloc').onclick=showNewAlloc;document.getElementById('saveAllAlloc').onclick=saveAllAllocations;document.querySelectorAll('.delAlloc').forEach(b=>b.onclick=()=>delRecord(T.alloc,+b.dataset.id))}
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
function renderCompare(){const el=document.getElementById('v-compare');el.innerHTML=`<article class="card"><h3>Comparer les scénarios</h3><p>Sélectionne jusqu’à 6 scénarios. Les montants « devis à confirmer » ne sont pas artificiellement valorisés à zéro : le budget affiché est le budget connu.</p><div class="checklist">${D[T.scenarios].map((s,i)=>`<label class="checkpill"><input type="checkbox" class="cmp" value="${s.id}" ${i<Math.min(3,D[T.scenarios].length)?'checked':''}>${esc(s.Nom)}</label>`).join('')}</div><div id="cmpOut" style="margin-top:14px"></div></article>`;document.querySelectorAll('.cmp').forEach(x=>x.onchange=drawCompare);drawCompare()}
function drawCompare(){const ids=[...document.querySelectorAll('.cmp:checked')].slice(0,6).map(x=>+x.value),ms=ids.map(model);document.getElementById('cmpOut').innerHTML=`<div class="comparegrid">${ms.map(m=>`<div class="comparecard"><h4>${esc(m.s.Nom)}</h4><div class="big">${money(m.total)}</div><div class="muted">${money(m.total*m.rate,'EUR')} · ${num(m.licenses)} licences</div><div class="roi-line">Économie annuelle : <b class="${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</b> · ${pct(m.savingPct)}</div><div style="margin-top:8px">${m.unresolved?`<span class="badge warn">${m.unresolved} devis à confirmer</span>`:'<span class="badge ok">Chiffré</span>'}</div></div>`).join('')}</div><div class="tablewrap" style="margin-top:14px"><table><thead><tr><th>Scénario</th><th>Fixe</th><th>Overage</th><th>Budget connu USD</th><th>Budget connu EUR</th><th>Économie annuelle</th><th>Économie %</th><th>Tarifs à confirmer</th></tr></thead><tbody>${ms.map(m=>`<tr><td><b>${esc(m.s.Nom)}</b></td><td class="num">${money(m.fixed)}</td><td class="num">${money(m.over)}</td><td class="num">${money(m.total)}</td><td class="num">${money(m.total*m.rate,'EUR')}</td><td class="num ${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</td><td class="num ${m.savingPct<0?'negative':''}">${pct(m.savingPct)}</td><td class="num">${m.unresolved}</td></tr>`).join('')}</tbody></table></div>`}

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

function renderScenarios(){const el=document.getElementById('v-scenarios');el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Scénarios</h3><p>Modifie plusieurs scénarios puis enregistre-les en une seule fois.</p></div><div class="table-actions"><button id="saveAllScenarios" class="btn primary">Enregistrer les modifications</button><button id="newScenario" class="btn secondary">+ Nouveau</button></div></div><div class="tablewrap"><table><thead><tr><th>Nom</th><th>Année</th><th>Mois</th><th>USD/EUR</th><th>Utilisation</th><th>Jours ouvrés/an</th><th>Statut</th></tr></thead><tbody>${D[T.scenarios].map(s=>`<tr data-s="${s.id}"><td><input class="admin-input" data-f="Nom" value="${esc(s.Nom)}"></td><td><input class="admin-input" data-f="Annee" type="number" value="${+s.Annee||0}"></td><td><input class="admin-input" data-f="Nb_Mois" type="number" value="${+s.Nb_Mois||0}"></td><td><input class="admin-input" data-f="Taux_USD_EUR" type="number" step="0.001" value="${+s.Taux_USD_EUR||0}"></td><td><input class="admin-input" data-f="Taux_Utilisation" type="number" step="0.05" value="${+s.Taux_Utilisation||0}"></td><td><input class="admin-input" data-f="Nb_Jours_Ouvres_Annuels" type="number" min="1" value="${+s.Nb_Jours_Ouvres_Annuels||218}"></td><td><input class="admin-input" data-f="Statut" value="${esc(s.Statut||'')}"></td></tr>`).join('')}</tbody></table></div></article>`;document.getElementById('saveAllScenarios').onclick=()=>saveAllGeneric('v-scenarios',T.scenarios,'tr[data-s]','data-s','ligne(s) scénario');document.getElementById('newScenario').onclick=async()=>{await apply([["AddRecord",T.scenarios,null,{Nom:'Nouveau scénario',Annee:2027,Nb_Mois:12,Taux_USD_EUR:.86,Taux_Utilisation:1,Nb_Jours_Ouvres_Annuels:218,Statut:'Travail',Commentaire:''}]]);await reload()}}
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
  return OFFER_COLUMNS.map((c,i)=>{const r=byKey.get(c.key);return {...c,label:(r?.Libelle||c.label),order:r&&Number.isFinite(+r.Ordre)?+r.Ordre:i*10,visible:view==='read'?(r?r.Visible_Lecture!==false:true):(r?r.Visible_Admin!==false:true)}}).sort((a,b)=>a.order-b.order)
}
function offerVisibleColumns(view){return offerColumnConfig(view).filter(c=>c.visible)}
function offerCellRead(o,c){const v=o[c.key];if(c.kind==='ref-provider')return esc(D.providerById[v]?.Nom||'');if(c.kind==='money')return +v?money(v):'—';if(c.kind==='bool')return ynBadge(v);if(c.kind==='int')return num(+v||0);if(c.key==='Statut_Tarif')return v==='Devis à confirmer'?'<span class="badge warn">Devis à confirmer</span>':`<span class="badge ok">${esc(v||'')}</span>`;return esc(v??'')}
function offerCellAdmin(o,c,providers){const v=o[c.key];if(c.kind==='ref-provider'){const opts=providers.map(p=>`<option value="${p.id}" ${+v===+p.id?'selected':''}>${esc(p.Nom)}</option>`).join('');return `<select class="admin-input" data-f="${c.key}"><option value="">—</option>${opts}</select>`}if(c.kind==='bool')return `<input data-f="${c.key}" type="checkbox" ${v!==false?'checked':''}>`;if(c.kind==='money')return `<input class="admin-input" data-f="${c.key}" type="number" step="0.01" value="${+v||0}">`;if(c.kind==='int')return `<input class="admin-input" data-f="${c.key}" type="number" min="0" step="1" value="${+v||0}">`;if(c.kind==='text-long')return `<textarea class="admin-input admin-textarea" data-f="${c.key}">${esc(v||'')}</textarea>`;if(c.key==='Periodicite_Prix')return `<select class="admin-input" data-f="${c.key}"><option ${v==='Mensuel'?'selected':''}>Mensuel</option><option ${v==='Annuel'?'selected':''}>Annuel</option><option ${v==='Devis'?'selected':''}>Devis</option></select>`;return `<input class="admin-input" data-f="${c.key}" value="${esc(v||'')}">`}
function columnPickerHtml(view){const cols=offerColumnConfig(view);return `<details class="column-picker read-only-exempt"><summary class="btn secondary">Colonnes</summary><div class="column-picker-panel">${cols.map(c=>`<label><input type="checkbox" data-col-view="${view}" data-col-key="${c.key}" ${c.visible?'checked':''}> ${esc(c.label)}</label>`).join('')}<div class="column-picker-actions"><button class="btn small secondary" data-col-all="${view}">Tout afficher</button><button class="btn small secondary" data-col-none="${view}">Tout masquer</button>${ACCESS.role==='OWNER'?`<button class="btn small primary" data-col-save="${view}">Enregistrer la vue</button>`:''}</div></div></details>`}
function bindColumnPicker(view){document.querySelectorAll(`[data-col-view="${view}"]`).forEach(cb=>cb.onchange=()=>applyColumnVisibilityLocally(view));document.querySelector(`[data-col-all="${view}"]`)?.addEventListener('click',e=>{e.preventDefault();document.querySelectorAll(`[data-col-view="${view}"]`).forEach(x=>x.checked=true);applyColumnVisibilityLocally(view)});document.querySelector(`[data-col-none="${view}"]`)?.addEventListener('click',e=>{e.preventDefault();document.querySelectorAll(`[data-col-view="${view}"]`).forEach(x=>x.checked=false);applyColumnVisibilityLocally(view)});document.querySelector(`[data-col-save="${view}"]`)?.addEventListener('click',async e=>{e.preventDefault();await saveOfferColumnView(view)})}
function applyColumnVisibilityLocally(view){const checked=new Set([...document.querySelectorAll(`[data-col-view="${view}"]:checked`)].map(x=>x.dataset.colKey));const root=document.getElementById(view==='read'?'v-offers':'v-offersadmin');root?.querySelectorAll('[data-col]').forEach(el=>el.style.display=checked.has(el.dataset.col)?'':'none')}
async function saveOfferColumnView(view){if(ACCESS.role!=='OWNER')return;const state=new Map([...document.querySelectorAll(`[data-col-view="${view}"]`)].map(x=>[x.dataset.colKey,x.checked])),existing=new Map((D[T.offerCols]||[]).map(r=>[r.Cle_Colonne,r])),actions=[];OFFER_COLUMNS.forEach((c,i)=>{const r=existing.get(c.key),fields={Libelle:r?.Libelle||c.label,Ordre:r?.Ordre??i*10,[view==='read'?'Visible_Lecture':'Visible_Admin']:!!state.get(c.key)};if(r)actions.push(['UpdateRecord',T.offerCols,r.id,fields]);else actions.push(['AddRecord',T.offerCols,null,{Cle_Colonne:c.key,Libelle:c.label,Ordre:i*10,Visible_Lecture:view==='read'?!!state.get(c.key):true,Visible_Admin:view==='admin'?!!state.get(c.key):true}])});try{await apply(actions);toast('Configuration des colonnes enregistrée.');await reload()}catch(e){toast(e.message||String(e),true)}}
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
  const rows=menuConfigRows();
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
  if(ACCESS.role!=='OWNER'){toast("Action réservée à l’Owner.",true);return}
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
function renderLabelsAdmin(){
  const el=document.getElementById('v-labelsadmin');if(!el)return;
  const rows=uiLabelRows(),byPair=new Map(rows.map(r=>[`${r.Ecran||'*'}||${r.Libelle_Defaut||''}`,r]));
  const candidates=collectUILabelCandidates();
  const menuRows=menuConfigRows();
  const colRows=offerColumnConfig('read');
  el.innerHTML=`
  <article class="card"><div class="cardhead"><div><h3>Paramétrage des libellés</h3><p>Personnalise et persiste les textes visibles de toute l'application. Les libellés sont resynchronisés après chaque rerendu partiel, notamment sur le Dashboard.</p></div><div class="table-actions"><input id="labelSearch" class="admin-input" placeholder="Rechercher un écran ou un libellé"><button id="saveUILabels" class="btn primary">Enregistrer les textes</button></div></div>
    <div class="tablewrap labels-admin-wrap"><table class="labels-admin-table"><thead><tr><th>Écran</th><th>Clé</th><th>Libellé par défaut</th><th>Libellé affiché</th><th>Actif</th></tr></thead><tbody id="uiLabelsBody">${candidates.map(c=>{const r=byPair.get(`${c.Ecran}||${c.Libelle_Defaut}`);return `<tr data-label-id="${r?.id||''}" data-screen="${esc(c.Ecran)}" data-default="${esc(c.Libelle_Defaut)}"><td><code>${esc(c.Ecran)}</code></td><td><code>${esc(r?.Cle||c.Cle)}</code></td><td>${esc(c.Libelle_Defaut)}</td><td><input class="admin-input wide" data-f="Libelle" value="${esc(r?.Libelle||c.Libelle_Defaut)}"></td><td><input type="checkbox" data-f="Actif" ${r?.Actif===false?'':'checked'}></td></tr>`}).join('')}</tbody></table></div>
  </article>
  <article class="card"><div class="cardhead"><div><h3>Libellés du menu</h3><p>Les noms des onglets restent stockés dans Configuration_Menu et sont éditables ici également.</p></div><button id="saveMenuLabelsFromLabels" class="btn primary">Enregistrer le menu</button></div><div class="tablewrap"><table><thead><tr><th>Clé</th><th>Libellé</th></tr></thead><tbody>${menuRows.map(r=>`<tr data-menu-label-id="${r.id||''}" data-menu-label-key="${esc(r.Cle)}"><td><code>${esc(r.Cle)}</code></td><td><input class="admin-input wide" value="${esc(r.Libelle||DEFAULT_MENU_LABELS[r.Cle]||r.Cle)}"></td></tr>`).join('')}</tbody></table></div></article>
  <article class="card"><div class="cardhead"><div><h3>Colonnes Offre de service</h3><p>Ces libellés sont communs aux vues lecture et paramétrage et restent stockés dans Configuration_Colonnes_Offres.</p></div><button id="saveOfferColLabels" class="btn primary">Enregistrer les colonnes</button></div><div class="tablewrap"><table><thead><tr><th>Clé colonne</th><th>Libellé</th></tr></thead><tbody>${colRows.map(c=>`<tr data-offer-col-key="${esc(c.key)}"><td><code>${esc(c.key)}</code></td><td><input class="admin-input wide" value="${esc(c.label)}"></td></tr>`).join('')}</tbody></table></div></article>`;
  document.getElementById('saveUILabels').onclick=saveUILabelsV23;
  document.getElementById('saveMenuLabelsFromLabels').onclick=saveMenuLabelsV23;
  document.getElementById('saveOfferColLabels').onclick=saveOfferColumnLabelsV23;
  document.getElementById('labelSearch').oninput=e=>{const q=String(e.target.value||'').toLowerCase();document.querySelectorAll('#uiLabelsBody tr').forEach(tr=>tr.style.display=tr.textContent.toLowerCase().includes(q)?'':'none')};
}
async function saveUILabelsV23(){
  if(ACCESS.role!=='OWNER'){toast('Action réservée à l’Owner.',true);return}
  const actions=[];
  document.querySelectorAll('#uiLabelsBody tr').forEach((tr,i)=>{
    const id=+tr.dataset.labelId||0,screen=tr.dataset.screen||'*',def=tr.dataset.default||'',lib=tr.querySelector('[data-f="Libelle"]')?.value.trim()||def,active=!!tr.querySelector('[data-f="Actif"]')?.checked;
    const fields={Cle:`${screen}.${slugLabel(def)}`,Ecran:screen,Libelle_Defaut:def,Libelle:lib,Actif:active,Ordre:(i+1)*10};
    actions.push(id?["UpdateRecord",T.uiLabels,id,fields]:["AddRecord",T.uiLabels,null,fields]);
  });
  try{await apply(actions);toast('Libellés des écrans enregistrés.');await boot()}catch(e){toast(e.message||String(e),true)}
}
async function saveMenuLabelsV23(){
  const actions=[];
  document.querySelectorAll('[data-menu-label-key]').forEach(tr=>{const id=+tr.dataset.menuLabelId||0,key=tr.dataset.menuLabelKey,old=menuConfigRows().find(r=>r.Cle===key)||{},lib=tr.querySelector('input')?.value.trim()||DEFAULT_MENU_LABELS[key]||key;const fields={Cle:key,Libelle:lib,Ordre:old.Ordre||999,Actif:old.Actif!==false,Owner_Seulement:!!old.Owner_Seulement};actions.push(id?["UpdateRecord",T.menu,id,fields]:["AddRecord",T.menu,null,fields])});
  try{await apply(actions);toast('Libellés du menu enregistrés.');await boot()}catch(e){toast(e.message||String(e),true)}
}
async function saveOfferColumnLabelsV23(){
  const existing=new Map((D[T.offerCols]||[]).map(r=>[r.Cle_Colonne,r])),actions=[];
  document.querySelectorAll('[data-offer-col-key]').forEach((tr,i)=>{const key=tr.dataset.offerColKey,r=existing.get(key),lib=tr.querySelector('input')?.value.trim()||OFFER_COLUMNS.find(c=>c.key===key)?.label||key;const fields={Cle_Colonne:key,Libelle:lib,Ordre:r?.Ordre??i*10,Visible_Lecture:r?.Visible_Lecture!==false,Visible_Admin:r?.Visible_Admin!==false};actions.push(r?["UpdateRecord",T.offerCols,r.id,fields]:["AddRecord",T.offerCols,null,fields])});
  try{await apply(actions);toast('Libellés des colonnes enregistrés.');await boot()}catch(e){toast(e.message||String(e),true)}
}

const FINOPS_ACL_TAG="FINOPS_V16";
const FINOPS_ACL_RESOURCES=[
  {tableId:"Scenarios",colIds:"*",kind:"global",perm:"+RU"},
  {tableId:"Configuration_Menu",colIds:"*",kind:"global",perm:"+R"},
  {tableId:"Configuration_Libelles_UI",colIds:"*",kind:"global",perm:"+R"},
  {tableId:"Fournisseurs",colIds:"*",kind:"global",perm:"+R"},
  {tableId:"Offres",colIds:"*",kind:"global",perm:"+R"},
  {tableId:"Allocations",colIds:"*",kind:"domain",perm:"+R"},
  {tableId:"Baseline_N_1",colIds:"*",kind:"domain",perm:"+R"},
  {tableId:"Baseline_N_1_Details",colIds:"*",kind:"domain",perm:"+R"},
  {tableId:"Enterprise",colIds:"*",kind:"domain",perm:"+R"},
  {tableId:"Forfaits_Individuels",colIds:"*",kind:"domain",perm:"+R"},
  {tableId:"Domaines",colIds:"*",kind:"domains",perm:"+R"},
  {tableId:"Droits_Utilisateurs",colIds:"*",kind:"self",perm:"+R"},
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
function aclFormulaFor(kind){
  if(kind==="global")return "user.Droits is not None and user.Droits.Actif";
  if(kind==="domain")return "user.Droits is not None and user.Droits.Actif and rec.Domaine in user.Droits.Domaines_Autorises";
  if(kind==="domains")return "user.Droits is not None and user.Droits.Actif and rec.id in user.Droits.Domaines_Autorises";
  if(kind==="self")return "user.Droits is not None and user.Droits.Actif and rec.Email == user.Email";
  return "False";
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
  el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>ACL / Sécurité <span class="badge warn">Owner uniquement</span></h3><p>Audit et réconciliation des règles d'accès FinOps dans les métadonnées ACL Grist. L'application ne modifie rien tant que tu ne cliques pas sur Appliquer.</p></div></div><div class="acl-warning"><b>Important.</b> Les ACL sont des métadonnées internes Grist. Une sauvegarde JSON est proposée avant application. Une modification d'ACL peut provoquer le rechargement immédiat du document.</div><div class="table-actions"><button id="aclAudit" class="btn secondary">Auditer les ACL</button><button id="aclExport" class="btn secondary">Exporter la sauvegarde JSON</button><button id="aclApply" class="btn primary">Appliquer / réconcilier FinOps</button></div><div id="aclAuditResult" class="acl-result">Clique sur <b>Auditer les ACL</b> pour commencer.</div><article class="acl-matrix"><h4>Matrice cible</h4><table><thead><tr><th>Table</th><th>Utilisateur autorisé</th><th>Périmètre</th></tr></thead><tbody>${FINOPS_ACL_RESOURCES.map(x=>`<tr><td><code>${x.tableId}</code></td><td>${esc(x.perm)}</td><td>${x.kind==="domain"?"Ses domaines":x.kind==="domains"?"Domaines autorisés":x.kind==="self"?"Sa ligne":x.kind==="global"?"Global":"-"}</td></tr>`).join('')}</tbody></table></article></article>`;
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
      actions.push(["AddRecord","_grist_ACLRules",null,{
        resource:res.id,
        aclFormula:aclFormulaFor(spec.kind),
        permissionsText:spec.perm,
        memo:`${FINOPS_ACL_TAG}:${spec.tableId}:AUTHORIZED`
      }]);
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
  el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Droits utilisateurs</h3><p>Créer, modifier et supprimer les utilisateurs autorisés. Un utilisateur peut être rattaché à plusieurs domaines.</p></div><div class="table-actions"><button id="newRightUser" class="btn secondary">+ Nouvel utilisateur</button><button id="saveAllRights" class="btn primary">Enregistrer les modifications</button></div></div><div class="tablewrap"><table><thead><tr><th>Email</th><th>Domaines autorisés</th><th>Rôle</th><th>Actif</th><th>Commentaire</th><th></th></tr></thead><tbody id="rightsBody">${D[T.rights].map(r=>rightsAdminRow(r)).join('')}</tbody></table></div></article>`;
  document.getElementById('newRightUser').onclick=addRightsDraft;
  document.getElementById('saveAllRights').onclick=saveAllRightsV18;
  bindRightsDeleteButtons();
}
function rightsAdminRow(r={}){
  const multi=refListIds(r.Domaines_Autorises);
  const selected=new Set(multi.length?multi:(+r.Domaine?[+r.Domaine]:[]));
  const id=r.id||'',isNew=!r.id;
  return `<tr data-r="${id}" data-new="${isNew?'1':'0'}"><td><input class="admin-input" data-f="Email" value="${esc(r.Email||'')}" placeholder="prenom.nom@domaine.fr"></td><td><div class="domain-multiselect">${D[T.domains].filter(d=>d.Actif!==false).map(d=>`<label class="domain-chip"><input type="checkbox" data-domain-id="${d.id}" ${selected.has(+d.id)?'checked':''}><span>${esc(d.Nom)}</span></label>`).join('')}</div></td><td><select class="admin-input" data-f="Role_App"><option ${(!r.Role_App||r.Role_App==='Domaine')?'selected':''}>Domaine</option><option ${r.Role_App==='Admin'?'selected':''}>Admin</option></select></td><td><input data-f="Actif" type="checkbox" ${r.Actif!==false?'checked':''}></td><td><input class="admin-input" data-f="Commentaire" value="${esc(r.Commentaire||'')}" placeholder="Commentaire"></td><td><button class="btn danger small rights-delete" title="${isNew?'Annuler':'Supprimer'}">${isNew?'Annuler':'Supprimer'}</button></td></tr>`;
}
function addRightsDraft(){
  const tbody=document.getElementById('rightsBody');
  tbody.insertAdjacentHTML('beforeend',rightsAdminRow({Actif:true,Role_App:'Domaine'}));
  bindRightsDeleteButtons();
  const rows=tbody.querySelectorAll('tr');
  rows[rows.length-1]?.querySelector('[data-f="Email"]')?.focus();
}
function bindRightsDeleteButtons(){
  document.querySelectorAll('#rightsBody .rights-delete').forEach(btn=>btn.onclick=async()=>{
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
