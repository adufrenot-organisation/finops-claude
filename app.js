const T={domains:"Domaines",scenarios:"Scenarios",providers:"Fournisseurs",offers:"Offres",alloc:"Allocations",baseline:"Baseline_N_1",rights:"Droits_Utilisateurs",menu:"Configuration_Menu"};
const COLORS=["#2f6fed","#24b89a","#7c4de8","#e7a62c","#dc4c5a","#5a6b85","#42a5f5","#8bc34a"];
let D=null, ACCESS={role:"DENIED",domainIds:[]}, CURRENT=null, DASH_FILTER={domainId:0,providerId:0};
grist.ready({requiredAccess:"full"}); document.addEventListener("DOMContentLoaded",boot);
function rows(t){if(!t||!Array.isArray(t.id))return[];return t.id.map((id,i)=>{const r={id};for(const[k,v]of Object.entries(t))if(k!=="id"&&Array.isArray(v))r[k]=v[i];return r})}
function money(v,c="USD"){return new Intl.NumberFormat("fr-FR",{style:"currency",currency:c,maximumFractionDigits:0}).format(Number(v||0))} function num(v){return new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(Number(v||0))} function pct(v){return new Intl.NumberFormat("fr-FR",{style:"percent",maximumFractionDigits:1}).format(Number(v||0))} function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]))}
function toast(m,e=false){const x=document.getElementById("toast");if(!x)return;x.textContent=m;x.className="toast show"+(e?" error":"");setTimeout(()=>x.className="toast",2400)}
async function fetchAll(){const names=Object.values(T),raw=await Promise.all(names.map(n=>grist.docApi.fetchTable(n).catch(()=>({id:[]}))));const o={};names.forEach((n,i)=>o[n]=rows(raw[i]));o.domainById=Object.fromEntries(o[T.domains].map(r=>[r.id,r]));o.scenarioById=Object.fromEntries(o[T.scenarios].map(r=>[r.id,r]));o.providerById=Object.fromEntries(o[T.providers].map(r=>[r.id,r]));o.offerById=Object.fromEntries(o[T.offers].map(r=>[r.id,r]));return o}
async function boot(){document.getElementById("root").innerHTML='<div class="splash">Chargement des données Grist…</div>';try{D=await fetchAll();deriveAccess();renderShell();if(ACCESS.role!=="DENIED"){populateScenario();renderAll()}}catch(e){console.error(e);document.getElementById("root").innerHTML=`<div class="denied"><div class="deniedcard"><div class="lock">!</div><h1>Erreur de chargement</h1><p>${esc(e.message)}</p></div></div>`}}
function refListIds(v){if(Array.isArray(v)){const a=v[0]==='L'?v.slice(1):v;return a.map(Number).filter(x=>Number.isFinite(x)&&x>0)}if(Number.isFinite(+v)&&+v>0)return[+v];return[]}
function deriveAccess(){const rr=D[T.rights].filter(r=>r.Actif!==false);if(rr.some(r=>String(r.Role_App).toLowerCase()==="admin")){ACCESS={role:"OWNER",domainIds:D[T.domains].map(d=>+d.id),rights:rr};return}if(rr.length){const ids=[];rr.forEach(r=>{const multi=refListIds(r.Domaines_Autorises);if(multi.length)ids.push(...multi);else if(+r.Domaine)ids.push(+r.Domaine)});ACCESS={role:"DOMAIN_USER",domainIds:[...new Set(ids)],rights:rr};return}const visibleDomains=[...new Set(D[T.alloc].map(r=>+r.Domaine).filter(Boolean))];if(D[T.domains].length>1&&visibleDomains.length>1){ACCESS={role:"OWNER",domainIds:D[T.domains].map(d=>+d.id),rights:[]};return}ACCESS={role:"DENIED",domainIds:[]}}
function menuConfigRows(){
  const fallback=[
    {Cle:'dashboard',Libelle:'Dashboard',Ordre:10,Actif:true,Owner_Seulement:false},
    {Cle:'simulation',Libelle:'Simulation',Ordre:20,Actif:true,Owner_Seulement:false},
    {Cle:'compare',Libelle:'Comparaison',Ordre:30,Actif:true,Owner_Seulement:false},
    {Cle:'roi',Libelle:'ROI / Économies',Ordre:40,Actif:true,Owner_Seulement:false},
    {Cle:'scenarios',Libelle:'Scénarios',Ordre:50,Actif:true,Owner_Seulement:false},
    {Cle:'offers',Libelle:'Fournisseurs & offres',Ordre:60,Actif:true,Owner_Seulement:true},
    {Cle:'domains',Libelle:'Domaines',Ordre:70,Actif:true,Owner_Seulement:true},
    {Cle:'rights',Libelle:'Droits utilisateurs',Ordre:80,Actif:true,Owner_Seulement:true},
    {Cle:'menuadmin',Libelle:'Configuration du menu',Ordre:90,Actif:true,Owner_Seulement:true}
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
  return {dashboard:'◧',simulation:'⌘',compare:'⇄',roi:'↗',scenarios:'▤',offers:'¤',domains:'◎',rights:'♙',menuadmin:'☷'}[view]||'•';
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
  document.getElementById("root").innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand"><div class="logo">F</div><div class="brandtext"><h2>FINOPS IA</h2><small>SIMULATEUR MULTI-FOURNISSEURS</small></div><button id="sidebarToggle" class="sidebar-toggle" title="Rétracter le menu" aria-label="Rétracter le menu">‹</button></div><nav class="nav">${navHtml}</nav><div class="sidefoot"><b>${admin?'Owner / Admin':'Utilisateur domaine'}</b><br><span id="sideScope"></span></div></aside><main class="content"><header class="head"><div><h1 id="title">${esc(menuLabel('dashboard'))}</h1><div class="sub">Claude · Mistral · Cursor</div><div id="scope" class="scope"></div></div><div class="controls"><label class="field">Scénario<select id="scenarioSelect"></select></label><button id="refresh" class="btn secondary">Actualiser</button></div></header><div id="status" class="status">Données synchronisées avec Grist.</div><section id="v-dashboard" class="view active"></section><section id="v-simulation" class="view"></section><section id="v-compare" class="view"></section><section id="v-roi" class="view"></section><section id="v-scenarios" class="view"></section>${admin?'<section id="v-offers" class="view"></section><section id="v-domains" class="view"></section><section id="v-rights" class="view"></section><section id="v-menuadmin" class="view"></section>':''}</main></div><div id="toast" class="toast"></div>`;
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
  offers:'Fournisseurs & offres',
  domains:'Domaines',
  rights:'Droits utilisateurs',
  menuadmin:'Configuration du menu'
};

function setSidebarCollapsed(collapsed){const shell=document.querySelector('.shell'),toggle=document.getElementById('sidebarToggle');if(!shell)return;shell.classList.toggle('sidebar-collapsed',collapsed);if(toggle){toggle.textContent=collapsed?'›':'‹';toggle.title=collapsed?'Déployer le menu':'Rétracter le menu';toggle.setAttribute('aria-label',toggle.title)}try{localStorage.setItem('finopsSidebarCollapsed',collapsed?'1':'0')}catch(_){}}
function switchView(v){document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===v));document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));document.getElementById('v-'+v)?.classList.add('active');document.getElementById('title').textContent=menuLabel(v)}
function scopedDomains(){return D[T.domains].filter(d=>d.Actif!==false&&ACCESS.domainIds.includes(+d.id))} function scopedAlloc(sid){return D[T.alloc].filter(r=>+r.Scenario===+sid&&ACCESS.domainIds.includes(+r.Domaine))} function scopedBaseline(sid){return D[T.baseline].filter(r=>+r.Scenario===+sid&&ACCESS.domainIds.includes(+r.Domaine))}
function populateScenario(){const s=document.getElementById('scenarioSelect');s.innerHTML=D[T.scenarios].map(x=>`<option value="${x.id}">${esc(x.Nom)}</option>`).join('');s.onchange=renderAll}
function selectedScenario(){return D.scenarioById[+document.getElementById('scenarioSelect').value]}
function model(sid,filter=null){
const s=D.scenarioById[+sid];
const domainId=+(filter?.domainId||0),providerId=+(filter?.providerId||0);
const domains=scopedDomains().filter(d=>!domainId||+d.id===domainId);
const allowedDomainIds=new Set(domains.map(d=>+d.id));
const alloc=scopedAlloc(sid).filter(a=>{
  if(!allowedDomainIds.has(+a.Domaine))return false;
  if(!providerId)return true;
  const o=D.offerById[a.Offre];
  return +o?.Fournisseur===providerId;
});
const baseline=scopedBaseline(sid).filter(b=>allowedDomainIds.has(+b.Domaine));
const bd={},bo={},bp={};
for(const d of domains)bd[d.id]={d,total:0,eur:0,baselineAnnual:0,tjm:0,collabs:0,days:+s?.Nb_Jours_Ouvres_Annuels||0};
let fixed=0,included=0,over=0,total=0,unresolved=0,licenses=0;
for(const a of alloc){const o=D.offerById[a.Offre],p=D.providerById[o?.Fournisseur],d=bd[a.Domaine];if(!o||!p||!d)continue;const f=+a.Cout_Abonnement||0,i=+a.Usage_Inclus_Total||0,ov=+a.Cout_Overage||0,t=+a.Budget_Total_USD||0;fixed+=f;included+=i;over+=ov;total+=t;licenses+=+a.Nb_Licences||0;if(a.Tarif_A_Confirmer)unresolved++;d.total+=t;d.eur+=+a.Budget_Total_EUR||0;const ok=o.id,pk=p.id;bo[ok]??={o,p,licenses:0,fixed:0,included:0,over:0,total:0,unresolved:0};bo[ok].licenses+=+a.Nb_Licences||0;bo[ok].fixed+=f;bo[ok].included+=i;bo[ok].over+=ov;bo[ok].total+=t;if(a.Tarif_A_Confirmer)bo[ok].unresolved++;bp[pk]??={p,total:0,licenses:0};bp[pk].total+=t;bp[pk].licenses+=+a.Nb_Licences||0}
for(const b of baseline){const d=bd[b.Domaine];if(!d)continue;d.baselineAnnual+=+b.Cout_Reference_N_1_Annuel_EUR||0;d.tjm=+b.TJM_EUR||0;d.collabs=+b.Nb_Collaborateurs_N_1||0;d.days=+b.Jours_Ouvres_Effectifs||(+s?.Nb_Jours_Ouvres_Annuels||0)}
const months=Math.max(1,+s?.Nb_Mois||12),rate=+s?.Taux_USD_EUR||0;
let baselineAnnual=0,budgetPeriodEUR=total*rate,budgetAnnualizedEUR=0,baselinePeriod=0,savingPeriod=0,savingAnnual=0;
for(const d of Object.values(bd)){d.budgetAnnualized=d.eur*12/months;d.baselinePeriod=d.baselineAnnual*months/12;d.savingPeriod=d.baselinePeriod-d.eur;d.savingAnnual=d.baselineAnnual-d.budgetAnnualized;d.savingPct=d.baselineAnnual?d.savingAnnual/d.baselineAnnual:0;d.daysEquivalent=d.tjm>0?d.savingAnnual/d.tjm:0;d.fteEquivalent=(d.tjm>0&&d.days>0)?d.savingAnnual/(d.tjm*d.days):0;baselineAnnual+=d.baselineAnnual;budgetAnnualizedEUR+=d.budgetAnnualized;baselinePeriod+=d.baselinePeriod;savingPeriod+=d.savingPeriod;savingAnnual+=d.savingAnnual}
const savingPct=baselineAnnual?savingAnnual/baselineAnnual:0;
return{s,alloc,baseline,bd,bo,bp,fixed,included,over,total,licenses,unresolved,rate,months,baselineAnnual,budgetPeriodEUR,budgetAnnualizedEUR,baselinePeriod,savingPeriod,savingAnnual,savingPct}
}
function renderAll(){CURRENT=model(selectedScenario()?.id);const names=scopedDomains().map(d=>d.Nom).join(', ');document.getElementById('scope').textContent=ACCESS.role==='OWNER'?'Périmètre : tous les domaines':`Périmètre : ${names}`;document.getElementById('sideScope').textContent=ACCESS.role==='OWNER'?'Tous les domaines':names;renderDashboard();renderSimulation();renderCompare();renderROI();renderScenarios();if(ACCESS.role==='OWNER'){renderOffersAdmin();renderDomainsAdmin();renderRightsAdmin();renderMenuAdmin()}enforceReadOnlyForNonOwner()}
function dashboardFilterOptions(){
  const domains=scopedDomains().sort((a,b)=>String(a.Nom).localeCompare(String(b.Nom),'fr'));
  const providers=D[T.providers].filter(p=>p.Actif!==false).sort((a,b)=>String(a.Nom).localeCompare(String(b.Nom),'fr'));
  if(DASH_FILTER.domainId&&!domains.some(d=>+d.id===+DASH_FILTER.domainId))DASH_FILTER.domainId=0;
  if(DASH_FILTER.providerId&&!providers.some(p=>+p.id===+DASH_FILTER.providerId))DASH_FILTER.providerId=0;
  return{domains,providers};
}
function renderDashboard(){
  const opts=dashboardFilterOptions();
  const m=model(selectedScenario()?.id,DASH_FILTER);
  const el=document.getElementById('v-dashboard');
  const offers=Object.values(m.bo),domains=Object.values(m.bd).sort((a,b)=>b.total-a.total);
  const unresolved=m.unresolved?`<span class="badge warn">${m.unresolved} tarif(s) à confirmer</span>`:'<span class="badge ok">Tous les tarifs chiffrés</span>';
  const activeDomain=opts.domains.find(d=>+d.id===+DASH_FILTER.domainId);
  const activeProvider=opts.providers.find(p=>+p.id===+DASH_FILTER.providerId);
  const filterSummary=[activeDomain?`Domaine : ${esc(activeDomain.Nom)}`:'Tous les domaines',activeProvider?`Fournisseur : ${esc(activeProvider.Nom)}`:'Tous les fournisseurs'].join(' · ');
  el.innerHTML=`<div class="dashboard-filters read-only-exempt"><div class="filter-title"><b>Filtres du tableau de bord</b><span>${filterSummary}</span></div><label class="field">Domaine<select id="dashDomainFilter"><option value="0">Tous les domaines</option>${opts.domains.map(d=>`<option value="${d.id}" ${+DASH_FILTER.domainId===+d.id?'selected':''}>${esc(d.Nom)}</option>`).join('')}</select></label><label class="field">Fournisseur<select id="dashProviderFilter"><option value="0">Tous les fournisseurs</option>${opts.providers.map(p=>`<option value="${p.id}" ${+DASH_FILTER.providerId===+p.id?'selected':''}>${esc(p.Nom)}</option>`).join('')}</select></label><button id="dashResetFilters" class="btn secondary">Réinitialiser</button></div><div class="kpis"><div class="kpi"><div class="v">${num(m.licenses)}</div><div class="l">Licences</div></div><div class="kpi"><div class="v">${money(m.fixed)}</div><div class="l">Abonnements fixes</div></div><div class="kpi"><div class="v">${money(m.included)}</div><div class="l">Usage inclus valorisé</div></div><div class="kpi"><div class="v">${money(m.over)}</div><div class="l">Consommation supplémentaire</div></div><div class="kpi"><div class="v">${money(m.total)}</div><div class="l">Budget connu USD</div></div><div class="kpi"><div class="v">${money(m.total*m.rate,'EUR')}</div><div class="l">Budget connu EUR</div></div></div><div class="kpis roi-kpis"><div class="kpi roi"><div class="v">${money(m.baselineAnnual,'EUR')}</div><div class="l">Baseline N-1 annuelle</div></div><div class="kpi roi"><div class="v">${money(m.budgetAnnualizedEUR,'EUR')}</div><div class="l">Licences annualisées</div></div><div class="kpi roi"><div class="v ${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</div><div class="l">Économie annuelle</div></div><div class="kpi roi"><div class="v ${m.savingPct<0?'negative':''}">${pct(m.savingPct)}</div><div class="l">Taux d'économie</div></div></div><div class="card">${unresolved}</div><div class="grid2"><article class="card"><h3>Budget par fournisseur</h3><div id="providerDonut" class="donutlayout"></div></article><article class="card"><h3>Budget par domaine</h3><div id="domainBars"></div></article></div><article class="card"><h3>Vue budgétaire par offre</h3><p>Abonnement fixe, usage inclus, overage et ventilation fournisseur.</p><div class="tablewrap"><table><thead><tr><th>Fournisseur</th><th>Offre</th><th>Licences</th><th>Fixe</th><th>Usage inclus</th><th>Overage</th><th>Total USD</th><th>Total EUR</th><th>Statut</th></tr></thead><tbody>${offers.map(x=>`<tr class="${x.unresolved?'unresolved':''}"><td class="provider">${esc(x.p.Nom)}</td><td>${esc(x.o.Nom)}</td><td class="num">${num(x.licenses)}</td><td class="num">${money(x.fixed)}</td><td class="num">${money(x.included)}</td><td class="num">${money(x.over)}</td><td class="num"><b>${money(x.total)}</b></td><td class="num">${money(x.total*m.rate,'EUR')}</td><td>${x.unresolved?'<span class="badge warn">Devis à confirmer</span>':'<span class="badge ok">Chiffré</span>'}</td></tr>`).join('')}<tr class="total"><td colspan="6">TOTAL CONNU</td><td class="num">${money(m.total)}</td><td class="num">${money(m.total*m.rate,'EUR')}</td><td>${unresolved}</td></tr></tbody></table></div></article><article class="card"><h3>Ventilation par domaine</h3><div class="tablewrap"><table><thead><tr><th>Domaine</th><th>Budget USD</th><th>Budget EUR</th><th>Part</th></tr></thead><tbody>${domains.map(x=>`<tr><td><b>${esc(x.d.Nom)}</b></td><td class="num">${money(x.total)}</td><td class="num">${money(x.eur,'EUR')}</td><td class="num">${pct(m.total?x.total/m.total:0)}</td></tr>`).join('')}</tbody></table></div></article>`;
  const df=document.getElementById('dashDomainFilter'),pf=document.getElementById('dashProviderFilter'),reset=document.getElementById('dashResetFilters');
  df.onchange=()=>{DASH_FILTER.domainId=+df.value||0;renderDashboard()};
  pf.onchange=()=>{DASH_FILTER.providerId=+pf.value||0;renderDashboard()};
  reset.onclick=()=>{DASH_FILTER={domainId:0,providerId:0};renderDashboard()};
  renderCharts(m);
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
async function apply(actions){try{return await grist.docApi.applyUserActions(actions)}catch(e){toast(e.message,true);throw e}} async function reload(){D=await fetchAll();deriveAccess();renderAll()}
function renderCompare(){const el=document.getElementById('v-compare');el.innerHTML=`<article class="card"><h3>Comparer les scénarios</h3><p>Sélectionne jusqu’à 6 scénarios. Les montants « devis à confirmer » ne sont pas artificiellement valorisés à zéro : le budget affiché est le budget connu.</p><div class="checklist">${D[T.scenarios].map((s,i)=>`<label class="checkpill"><input type="checkbox" class="cmp" value="${s.id}" ${i<Math.min(3,D[T.scenarios].length)?'checked':''}>${esc(s.Nom)}</label>`).join('')}</div><div id="cmpOut" style="margin-top:14px"></div></article>`;document.querySelectorAll('.cmp').forEach(x=>x.onchange=drawCompare);drawCompare()}
function drawCompare(){const ids=[...document.querySelectorAll('.cmp:checked')].slice(0,6).map(x=>+x.value),ms=ids.map(model);document.getElementById('cmpOut').innerHTML=`<div class="comparegrid">${ms.map(m=>`<div class="comparecard"><h4>${esc(m.s.Nom)}</h4><div class="big">${money(m.total)}</div><div class="muted">${money(m.total*m.rate,'EUR')} · ${num(m.licenses)} licences</div><div class="roi-line">Économie annuelle : <b class="${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</b> · ${pct(m.savingPct)}</div><div style="margin-top:8px">${m.unresolved?`<span class="badge warn">${m.unresolved} devis à confirmer</span>`:'<span class="badge ok">Chiffré</span>'}</div></div>`).join('')}</div><div class="tablewrap" style="margin-top:14px"><table><thead><tr><th>Scénario</th><th>Fixe</th><th>Overage</th><th>Budget connu USD</th><th>Budget connu EUR</th><th>Économie annuelle</th><th>Économie %</th><th>Tarifs à confirmer</th></tr></thead><tbody>${ms.map(m=>`<tr><td><b>${esc(m.s.Nom)}</b></td><td class="num">${money(m.fixed)}</td><td class="num">${money(m.over)}</td><td class="num">${money(m.total)}</td><td class="num">${money(m.total*m.rate,'EUR')}</td><td class="num ${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</td><td class="num ${m.savingPct<0?'negative':''}">${pct(m.savingPct)}</td><td class="num">${m.unresolved}</td></tr>`).join('')}</tbody></table></div>`}
function renderROI(){const el=document.getElementById('v-roi'),m=CURRENT,bmap=Object.fromEntries(m.baseline.map(b=>[b.Domaine,b]));const rowsHtml=Object.values(m.bd).map(x=>{const b=bmap[x.d.id];return `<tr data-bid="${b?.id||''}" data-domain="${x.d.id}"><td><b>${esc(x.d.Nom)}</b></td><td><input class="admin-input roi-edit" data-f="Nb_Collaborateurs_N_1" type="number" min="0" step="0.1" value="${+b?.Nb_Collaborateurs_N_1||0}"></td><td><input class="admin-input roi-edit" data-f="TJM_EUR" type="number" min="0" step="1" value="${+b?.TJM_EUR||0}"></td><td><input class="admin-input roi-edit" data-f="Jours_Ouvres_Override" type="number" min="0" value="${+b?.Jours_Ouvres_Override||0}" title="0 = utiliser le nombre de jours du scénario"></td><td class="num">${num(x.days)}</td><td class="num">${money(x.baselineAnnual,'EUR')}</td><td class="num">${money(x.eur,'EUR')}</td><td class="num">${money(x.budgetAnnualized,'EUR')}</td><td class="num ${x.savingPeriod<0?'negative':''}">${money(x.savingPeriod,'EUR')}</td><td class="num ${x.savingAnnual<0?'negative':''}"><b>${money(x.savingAnnual,'EUR')}</b></td><td class="num ${x.savingPct<0?'negative':''}">${pct(x.savingPct)}</td><td class="num">${num(x.daysEquivalent)}</td><td class="num">${x.fteEquivalent.toFixed(2).replace('.',',')}</td></tr>`}).join('');
el.innerHTML=`<div class="kpis roi-kpis"><div class="kpi roi"><div class="v">${money(m.baselineAnnual,'EUR')}</div><div class="l">Baseline N-1 annuelle</div></div><div class="kpi roi"><div class="v">${money(m.budgetAnnualizedEUR,'EUR')}</div><div class="l">Budget licences annualisé</div></div><div class="kpi roi"><div class="v ${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</div><div class="l">Économie annuelle</div></div><div class="kpi roi"><div class="v ${m.savingPct<0?'negative':''}">${pct(m.savingPct)}</div><div class="l">Taux d'économie</div></div></div><article class="card"><div class="cardhead"><div><h3>Baseline N-1 par domaine</h3><p>Coût annuel de référence = collaborateurs N-1 × TJM × jours ouvrés. Une surcharge de jours à 0 utilise le paramètre du scénario (${num(m.s?.Nb_Jours_Ouvres_Annuels||0)} jours/an).</p></div><button id="saveAllBaseline" class="btn primary">Enregistrer les modifications</button></div><div class="tablewrap"><table><thead><tr><th>Domaine</th><th>Collaborateurs N-1</th><th>TJM EUR</th><th>Override jours</th><th>Jours effectifs</th><th>Baseline annuelle</th><th>Licences période</th><th>Licences annualisées</th><th>Économie période</th><th>Économie annuelle</th><th>Économie %</th><th>Jours équiv.</th><th>ETP équiv.</th></tr></thead><tbody>${rowsHtml}<tr class="total"><td colspan="5">TOTAL</td><td class="num">${money(m.baselineAnnual,'EUR')}</td><td class="num">${money(m.budgetPeriodEUR,'EUR')}</td><td class="num">${money(m.budgetAnnualizedEUR,'EUR')}</td><td class="num ${m.savingPeriod<0?'negative':''}">${money(m.savingPeriod,'EUR')}</td><td class="num ${m.savingAnnual<0?'negative':''}">${money(m.savingAnnual,'EUR')}</td><td class="num ${m.savingPct<0?'negative':''}">${pct(m.savingPct)}</td><td colspan="2"></td></tr></tbody></table></div></article>`;document.getElementById('saveAllBaseline').onclick=saveAllBaseline}
async function saveAllBaseline(){const actions=[];document.querySelectorAll('#v-roi tr[data-domain]').forEach(tr=>{const id=+tr.dataset.bid||0,fields={Scenario:CURRENT.s.id,Domaine:+tr.dataset.domain,...readFields(tr,'.roi-edit')};actions.push(id?["UpdateRecord",T.baseline,id,fields]:["AddRecord",T.baseline,null,fields])});if(!actions.length){toast('Aucune baseline à enregistrer.');return}try{await apply(actions);toast(`${actions.length} baseline(s) N-1 enregistrée(s).`);await reload()}catch(e){toast(e.message,true)}}
function renderScenarios(){const el=document.getElementById('v-scenarios');el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Scénarios</h3><p>Modifie plusieurs scénarios puis enregistre-les en une seule fois.</p></div><div class="table-actions"><button id="saveAllScenarios" class="btn primary">Enregistrer les modifications</button><button id="newScenario" class="btn secondary">+ Nouveau</button></div></div><div class="tablewrap"><table><thead><tr><th>Nom</th><th>Année</th><th>Mois</th><th>USD/EUR</th><th>Utilisation</th><th>Jours ouvrés/an</th><th>Statut</th></tr></thead><tbody>${D[T.scenarios].map(s=>`<tr data-s="${s.id}"><td><input class="admin-input" data-f="Nom" value="${esc(s.Nom)}"></td><td><input class="admin-input" data-f="Annee" type="number" value="${+s.Annee||0}"></td><td><input class="admin-input" data-f="Nb_Mois" type="number" value="${+s.Nb_Mois||0}"></td><td><input class="admin-input" data-f="Taux_USD_EUR" type="number" step="0.001" value="${+s.Taux_USD_EUR||0}"></td><td><input class="admin-input" data-f="Taux_Utilisation" type="number" step="0.05" value="${+s.Taux_Utilisation||0}"></td><td><input class="admin-input" data-f="Nb_Jours_Ouvres_Annuels" type="number" min="1" value="${+s.Nb_Jours_Ouvres_Annuels||218}"></td><td><input class="admin-input" data-f="Statut" value="${esc(s.Statut||'')}"></td></tr>`).join('')}</tbody></table></div></article>`;document.getElementById('saveAllScenarios').onclick=()=>saveAllGeneric('v-scenarios',T.scenarios,'tr[data-s]','data-s','ligne(s) scénario');document.getElementById('newScenario').onclick=async()=>{await apply([["AddRecord",T.scenarios,null,{Nom:'Nouveau scénario',Annee:2027,Nb_Mois:12,Taux_USD_EUR:.86,Taux_Utilisation:1,Nb_Jours_Ouvres_Annuels:218,Statut:'Travail',Commentaire:''}]]);await reload()}}
async function saveGenericRow(sel,table,id){const tr=document.querySelector(sel);if(!tr)return;await apply([["UpdateRecord",table,id,readFields(tr)]]);toast('Enregistré.');await reload()}
function ynBadge(v){return `<span class="badge ${v==='Oui'?'ok':v==='Non'?'no':'warn'}">${esc(v||'A confirmer')}</span>`}
function renderOffersAdmin(){const el=document.getElementById('v-offers');const rows=D[T.offers].map(o=>{const p=D.providerById[o.Fournisseur];return`<tr data-o="${o.id}" class="${o.Statut_Tarif==='Devis à confirmer'?'unresolved':''}"><td class="provider">${esc(p?.Nom)}</td><td><b>${esc(o.Nom)}</b><br><span class="muted">${esc(o.Code)}</span></td><td>${esc(o.Periodicite_Prix)}</td><td class="num">${o.Tarif_Catalogue_Mensuel?money(o.Tarif_Catalogue_Mensuel):'—'}</td><td class="num">${o.Tarif_Catalogue_Annuel?money(o.Tarif_Catalogue_Annuel):'—'}</td><td><input class="admin-input" data-f="Tarif_Negocie_Mensuel" type="number" step="0.01" value="${+o.Tarif_Negocie_Mensuel||0}"></td><td><input class="admin-input" data-f="Tarif_Negocie_Annuel" type="number" step="0.01" value="${+o.Tarif_Negocie_Annuel||0}"></td><td>${o.Statut_Tarif==='Devis à confirmer'?'<span class="badge warn">Devis à confirmer</span>':`<span class="badge ok">${esc(o.Statut_Tarif)}</span>`}</td><td><div class="proc-grid"><div class="proc">Devis<br>${ynBadge(o.Compatible_Devis)}</div><div class="proc">PO<br>${ynBadge(o.Compatible_PO)}</div><div class="proc">Facture<br>${ynBadge(o.Compatible_Facture)}</div><div class="proc">Virement<br>${ynBadge(o.Compatible_Virement)}</div><div class="proc">Prépayé<br>${ynBadge(o.Compatible_Prepaiement)}</div></div></td><td class="price-source">${esc(o.Source_Tarif||'')}</td></tr>`}).join('');el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Fournisseurs & offres</h3><p>Les tarifs Claude « Référence interne » sont conservés. Pour Mistral/Cursor Enterprise, saisis le prix négocié reçu au devis.</p></div><button id="saveAllOffers" class="btn primary">Enregistrer les modifications</button></div><div class="tablewrap"><table><thead><tr><th>Fournisseur</th><th>Offre</th><th>Période</th><th>Catalogue /mois</th><th>Catalogue /an</th><th>Négocié /mois</th><th>Négocié /an</th><th>Statut</th><th>Procurement</th><th>Source</th></tr></thead><tbody>${rows}</tbody></table></div></article>`;document.getElementById('saveAllOffers').onclick=()=>saveAllGeneric('v-offers',T.offers,'tr[data-o]','data-o','offre(s)')}
function renderDomainsAdmin(){const el=document.getElementById('v-domains');el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Domaines</h3><p>Les modifications de toutes les lignes sont enregistrées ensemble.</p></div><button id="saveAllDomains" class="btn primary">Enregistrer les modifications</button></div><div class="tablewrap"><table><thead><tr><th>Nom</th><th>Actif</th><th>Responsable</th></tr></thead><tbody>${D[T.domains].map(d=>`<tr data-d="${d.id}"><td><input class="admin-input" data-f="Nom" value="${esc(d.Nom)}"></td><td><input data-f="Actif" type="checkbox" ${d.Actif!==false?'checked':''}></td><td><input class="admin-input" data-f="Responsable" value="${esc(d.Responsable||'')}"></td></tr>`).join('')}</tbody></table></div></article>`;document.getElementById('saveAllDomains').onclick=()=>saveAllGeneric('v-domains',T.domains,'tr[data-d]','data-d','domaine(s)')}

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
    ['scenarios','Scénarios'],['offers','Fournisseurs & offres'],['domains','Domaines'],['rights','Droits utilisateurs'],['menuadmin','Configuration du menu']
  ];
  const tbody=document.getElementById('menuAdminBody');if(!tbody)return;
  const byKey=Object.fromEntries([...tbody.querySelectorAll('tr[data-menu-key]')].map(tr=>[tr.dataset.menuKey,tr]));
  defaults.forEach(([key,label])=>{const tr=byKey[key];if(!tr)return;const input=tr.querySelector('[data-f="Libelle"]');if(input)input.value=label;const active=tr.querySelector('[data-f="Actif"]');if(active)active.checked=true;const access=tr.querySelector('[data-f="Owner_Seulement"]');if(access)access.value=['offers','domains','rights','menuadmin'].includes(key)?'true':'false';tbody.appendChild(tr)});
  toast("Valeurs par défaut chargées. Clique sur Enregistrer pour les appliquer.");
}

function renderRightsAdmin(){
  const el=document.getElementById('v-rights');
  el.innerHTML=`<article class="card"><div class="cardhead"><div><h3>Droits utilisateurs</h3><p>Un utilisateur peut être rattaché à plusieurs domaines. Coche tous les domaines auxquels il doit avoir accès.</p></div><button id="saveAllRights" class="btn primary">Enregistrer les modifications</button></div><div class="tablewrap"><table><thead><tr><th>Email</th><th>Domaines autorisés</th><th>Rôle</th><th>Actif</th><th>Commentaire</th></tr></thead><tbody>${D[T.rights].map(r=>{const multi=refListIds(r.Domaines_Autorises),selected=new Set(multi.length?multi:(+r.Domaine?[+r.Domaine]:[]));return`<tr data-r="${r.id}"><td><input class="admin-input" data-f="Email" value="${esc(r.Email||'')}"></td><td><div class="domain-multiselect">${D[T.domains].filter(d=>d.Actif!==false).map(d=>`<label class="domain-chip"><input type="checkbox" data-domain-id="${d.id}" ${selected.has(+d.id)?'checked':''}><span>${esc(d.Nom)}</span></label>`).join('')}</div></td><td><select class="admin-input" data-f="Role_App"><option ${r.Role_App==='Domaine'?'selected':''}>Domaine</option><option ${r.Role_App==='Admin'?'selected':''}>Admin</option></select></td><td><input data-f="Actif" type="checkbox" ${r.Actif!==false?'checked':''}></td><td><input class="admin-input" data-f="Commentaire" value="${esc(r.Commentaire||'')}"></td></tr>`}).join('')}</tbody></table></div></article>`;
  document.getElementById('saveAllRights').onclick=saveAllRightsMultiDomain;
}
async function saveAllRightsMultiDomain(){
  const actions=[];
  document.querySelectorAll('#v-rights tr[data-r]').forEach(tr=>{
    const id=+tr.dataset.r;
    const fields=readFields(tr,'[data-f]');
    const ids=[...tr.querySelectorAll('input[data-domain-id]:checked')].map(x=>+x.dataset.domainId).filter(Boolean);
    fields.Domaines_Autorises=['L',...ids];
    fields.Domaine=ids[0]||0;
    actions.push(["UpdateRecord",T.rights,id,fields]);
  });
  if(!actions.length){toast('Aucun droit utilisateur à enregistrer.');return}
  try{await apply(actions);toast(`${actions.length} droit(s) utilisateur enregistrés.`);await reload()}catch(e){toast(e.message,true)}
}
