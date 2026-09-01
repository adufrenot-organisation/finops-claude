import requests

# ============================================================
# CONFIGURATION
# ============================================================
GRIST_URL = "https://grist.numerique.gouv.fr"
DOC_ID = "c4szVegcqKib"
API_KEY = "TA_CLE_API_ICI"

HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

def api(method, endpoint, payload=None):
    r = requests.request(method, f"{GRIST_URL}/api/docs/{DOC_ID}{endpoint}", headers=HEADERS, json=payload, timeout=30)
    if not r.ok:
        print("ERREUR", r.status_code, r.text)
        r.raise_for_status()
    return r.json() if r.text else None

def table_ids():
    return {t["id"] for t in api("GET", "/tables")["tables"]}

def create_table_if_missing(table_id, columns):
    if table_id in table_ids():
        print(f"Table {table_id}: déjà présente")
        return
    print(f"Création {table_id}")
    api("POST", "/tables", {"tables":[{"id":table_id,"columns":columns}]})

def records(table):
    return api("GET", f"/tables/{table}/records")["records"]

def add(table, fields):
    return api("POST", f"/tables/{table}/records", {"records":[{"fields":fields}]})

def rid(table, field, value):
    for r in records(table):
        if r["fields"].get(field) == value:
            return r["id"]
    return None

def add_if_missing(table, key_fields, fields):
    for r in records(table):
        if all(r["fields"].get(k) == v for k,v in key_fields.items()):
            return r["id"]
    result=add(table,fields)
    return result["records"][0]["id"]

# ============================================================
# NOUVELLES TABLES — les tables Claude historiques restent intactes
# ============================================================
create_table_if_missing("Fournisseurs", [
    {"id":"Nom","fields":{"type":"Text"}},
    {"id":"Actif","fields":{"type":"Bool"}},
    {"id":"Source","fields":{"type":"Text"}},
    {"id":"Commentaire","fields":{"type":"Text"}},
])

create_table_if_missing("Offres", [
    {"id":"Fournisseur","fields":{"type":"Ref:Fournisseurs"}},
    {"id":"Nom","fields":{"type":"Text"}},
    {"id":"Code","fields":{"type":"Text"}},
    {"id":"Famille","fields":{"type":"Choice"}},
    {"id":"Periodicite_Prix","fields":{"type":"Choice"}},
    {"id":"Devise","fields":{"type":"Text"}},
    {"id":"Tarif_Catalogue_Mensuel","fields":{"type":"Numeric"}},
    {"id":"Tarif_Catalogue_Annuel","fields":{"type":"Numeric"}},
    {"id":"Tarif_Reference_Mensuel","fields":{"type":"Numeric"}},
    {"id":"Tarif_Reference_Annuel","fields":{"type":"Numeric"}},
    {"id":"Tarif_Negocie_Mensuel","fields":{"type":"Numeric"}},
    {"id":"Tarif_Negocie_Annuel","fields":{"type":"Numeric"}},
    {"id":"Enveloppe_Usage_Incluse_Mois_Licence","fields":{"type":"Numeric"}},
    {"id":"Usage_Inclus_Description","fields":{"type":"Text"}},
    {"id":"Overage_Disponible","fields":{"type":"Bool"}},
    {"id":"Facturer_Engagement_Minimum","fields":{"type":"Bool"}},
    {"id":"Engagement_Defaut_Mois","fields":{"type":"Int"}},
    {"id":"Mois_Factures_Defaut","fields":{"type":"Int"}},
    {"id":"Compatible_Devis","fields":{"type":"Choice"}},
    {"id":"Compatible_PO","fields":{"type":"Choice"}},
    {"id":"Compatible_Facture","fields":{"type":"Choice"}},
    {"id":"Compatible_Virement","fields":{"type":"Choice"}},
    {"id":"Compatible_Prepaiement","fields":{"type":"Choice"}},
    {"id":"Statut_Tarif","fields":{"type":"Choice"}},
    {"id":"Source_Tarif","fields":{"type":"Text"}},
    {"id":"Note_Procurement","fields":{"type":"Text"}},
    {"id":"Actif","fields":{"type":"Bool"}},
])

create_table_if_missing("Allocations", [
    {"id":"Scenario","fields":{"type":"Ref:Scenarios"}},
    {"id":"Domaine","fields":{"type":"Ref:Domaines"}},
    {"id":"Offre","fields":{"type":"Ref:Offres"}},
    {"id":"Nb_Licences","fields":{"type":"Int"}},
    {"id":"Mois_Factures","fields":{"type":"Int"}},
    {"id":"Engagement_Mois","fields":{"type":"Int"}},
    {"id":"Tarif_Negocie_Mensuel","fields":{"type":"Numeric"}},
    {"id":"Tarif_Negocie_Annuel","fields":{"type":"Numeric"}},
    {"id":"Usage_Supplementaire_Prevu_Mois_Licence","fields":{"type":"Numeric"}},
    {"id":"Overage_Autorise","fields":{"type":"Bool"}},
    {"id":"Plafond_Overage_Mois_Licence","fields":{"type":"Numeric"}},
    {"id":"Tarif_Mensuel_Effectif","fields":{"type":"Numeric","isFormula":True,"formula":"$Tarif_Negocie_Mensuel if $Tarif_Negocie_Mensuel > 0 else ($Offre.Tarif_Negocie_Mensuel if $Offre.Tarif_Negocie_Mensuel > 0 else ($Offre.Tarif_Reference_Mensuel if $Offre.Tarif_Reference_Mensuel > 0 else $Offre.Tarif_Catalogue_Mensuel))"}},
    {"id":"Tarif_Annuel_Effectif","fields":{"type":"Numeric","isFormula":True,"formula":"$Tarif_Negocie_Annuel if $Tarif_Negocie_Annuel > 0 else ($Offre.Tarif_Negocie_Annuel if $Offre.Tarif_Negocie_Annuel > 0 else ($Offre.Tarif_Reference_Annuel if $Offre.Tarif_Reference_Annuel > 0 else $Offre.Tarif_Catalogue_Annuel))"}},
    {"id":"Mois_Fixes_Factures","fields":{"type":"Int","isFormula":True,"formula":"max($Mois_Factures, $Engagement_Mois) if $Offre.Facturer_Engagement_Minimum else $Mois_Factures"}},
    {"id":"Cout_Abonnement","fields":{"type":"Numeric","isFormula":True,"formula":"$Nb_Licences * (($Tarif_Annuel_Effectif / 12.0) * $Mois_Fixes_Factures if $Offre.Periodicite_Prix == 'Annuel' else $Tarif_Mensuel_Effectif * $Mois_Fixes_Factures)"}},
    {"id":"Usage_Inclus_Total","fields":{"type":"Numeric","isFormula":True,"formula":"$Nb_Licences * $Offre.Enveloppe_Usage_Incluse_Mois_Licence * $Scenario.Nb_Mois"}},
    {"id":"Overage_Effectif_Mois_Licence","fields":{"type":"Numeric","isFormula":True,"formula":"0 if not $Overage_Autorise else (min($Usage_Supplementaire_Prevu_Mois_Licence, $Plafond_Overage_Mois_Licence) if $Plafond_Overage_Mois_Licence >= 0 else $Usage_Supplementaire_Prevu_Mois_Licence)"}},
    {"id":"Cout_Overage","fields":{"type":"Numeric","isFormula":True,"formula":"$Nb_Licences * $Overage_Effectif_Mois_Licence * $Scenario.Nb_Mois"}},
    {"id":"Budget_Total_USD","fields":{"type":"Numeric","isFormula":True,"formula":"$Cout_Abonnement + $Cout_Overage"}},
    {"id":"Budget_Total_EUR","fields":{"type":"Numeric","isFormula":True,"formula":"$Budget_Total_USD * $Scenario.Taux_USD_EUR"}},
    {"id":"Tarif_A_Confirmer","fields":{"type":"Bool","isFormula":True,"formula":"($Tarif_Mensuel_Effectif <= 0 and $Tarif_Annuel_Effectif <= 0) or $Offre.Statut_Tarif == 'Devis à confirmer'"}},
])

# ============================================================
# FOURNISSEURS
# ============================================================
providers = {
    "Claude": {"Source":"Référence interne AP-HP / simulateur historique", "Commentaire":"Ne pas écraser les tarifs Claude par des prix web."},
    "Mistral": {"Source":"https://mistral.ai/fr/pricing/", "Commentaire":"Tarifs catalogue vérifiés le 01/09/2026."},
    "Cursor": {"Source":"https://cursor.com/fr/pricing", "Commentaire":"Tarifs catalogue vérifiés le 01/09/2026."},
}
pids={}
for name,v in providers.items():
    pids[name]=add_if_missing("Fournisseurs",{"Nom":name},{"Nom":name,"Actif":True,**v})

# ============================================================
# OFFRES — Claude = référence interne existante, inchangée
# ============================================================
offers=[
# provider, name, code, period, cat_m, cat_a, ref_m, ref_a, included, overage, min_commit, commit, quote,po,invoice,wire,prepay,status,source,note
("Claude","Enterprise","CLAUDE_ENT","Annuel",0,0,0,240,0,True,True,12,"Oui","Oui","Oui","Oui","A confirmer","Référence interne","Simulateur FinOps Claude existant","240 $/siège/an + enveloppe usage par utilisateur/mois définie dans l'allocation."),
("Claude","Pro","CLAUDE_PRO","Mensuel",0,0,20,0,0,False,False,1,"Non","Non","Non","Non","Non","Référence interne","Simulateur FinOps Claude existant","Forfait individuel de référence 20 $/mois."),
("Claude","Max 5x","CLAUDE_MAX5","Mensuel",0,0,100,0,0,False,False,1,"Non","Non","Non","Non","Non","Référence interne","Simulateur FinOps Claude existant","Forfait individuel de référence 100 $/mois."),
("Claude","Max 20x","CLAUDE_MAX20","Mensuel",0,0,200,0,0,False,False,1,"Non","Non","Non","Non","Non","Référence interne","Simulateur FinOps Claude existant","Forfait individuel de référence 200 $/mois."),
("Mistral","Pro","MISTRAL_PRO","Mensuel",14.99,0,0,0,0,True,False,1,"Non","A confirmer","Oui","A confirmer","A confirmer","Catalogue","https://mistral.ai/fr/pricing/","Pro 14,99 $/mois; PAYG possible au-delà des limites. Modalités PO/virement à confirmer."),
("Mistral","Team","MISTRAL_TEAM","Mensuel",24.99,0,0,0,0,True,False,1,"Non","A confirmer","Oui","A confirmer","A confirmer","Catalogue","https://mistral.ai/fr/pricing/","Team 24,99 $/utilisateur/mois. Facturation mensuelle ou annuelle; modalités achat public à confirmer."),
("Mistral","Enterprise","MISTRAL_ENT","Devis",0,0,0,0,0,True,False,12,"Oui","A confirmer","Oui","A confirmer","A confirmer","Devis à confirmer","https://mistral.ai/fr/pricing/","Prix Enterprise non public : saisir le tarif négocié dès réception du devis."),
("Cursor","Teams Standard","CURSOR_TEAM_STD","Mensuel",40,0,0,0,0,True,False,1,"Non","Non","Non","Non","Non","Catalogue","https://cursor.com/fr/pricing","40 $/utilisateur/mois, usage inclus selon limites éditeur, puis on-demand."),
("Cursor","Teams Premium","CURSOR_TEAM_PREM","Mensuel",120,0,0,0,0,True,False,1,"Non","Non","Non","Non","Non","Catalogue","https://prod.cursor.com/docs/account/teams/pricing","120 $/utilisateur/mois, 5x usage Standard, puis on-demand."),
("Cursor","Enterprise","CURSOR_ENT","Devis",0,0,0,0,0,True,False,12,"Oui","Oui","Oui","Oui","A confirmer","Devis à confirmer","https://cursor.com/fr/pricing","Enterprise sur mesure; facture/PO et virement indiqués par Cursor. Pré-paiement à confirmer."),
]
oids={}
for x in offers:
    provider,name,code,period,catm,cata,refm,refa,included,overage,mincommit,commit,devis,po,invoice,wire,prepay,status,source,note=x
    fields={"Fournisseur":pids[provider],"Nom":name,"Code":code,"Famille":"Entreprise" if "ENT" in code else "Forfait","Periodicite_Prix":period,"Devise":"USD","Tarif_Catalogue_Mensuel":catm,"Tarif_Catalogue_Annuel":cata,"Tarif_Reference_Mensuel":refm,"Tarif_Reference_Annuel":refa,"Tarif_Negocie_Mensuel":0,"Tarif_Negocie_Annuel":0,"Enveloppe_Usage_Incluse_Mois_Licence":included,"Usage_Inclus_Description":"Usage inclus selon les limites du plan; valeur monétaire non renseignée lorsqu'elle n'est pas publiée.","Overage_Disponible":overage,"Facturer_Engagement_Minimum":mincommit,"Engagement_Defaut_Mois":commit,"Mois_Factures_Defaut":1,"Compatible_Devis":devis,"Compatible_PO":po,"Compatible_Facture":invoice,"Compatible_Virement":wire,"Compatible_Prepaiement":prepay,"Statut_Tarif":status,"Source_Tarif":source,"Note_Procurement":note,"Actif":True}
    oids[code]=add_if_missing("Offres",{"Code":code},fields)

# ============================================================
# MIGRATION DES DONNEES CLAUDE HISTORIQUES VERS ALLOCATIONS
# Aucune table historique n'est supprimée.
# ============================================================
existing_alloc=records("Allocations")
def alloc_exists(scenario,domain,offer):
    return any(r["fields"].get("Scenario")==scenario and r["fields"].get("Domaine")==domain and r["fields"].get("Offre")==offer for r in records("Allocations"))

if "Enterprise" in table_ids():
    for r in records("Enterprise"):
        f=r["fields"]; sid=f.get("Scenario"); did=f.get("Domaine")
        if not alloc_exists(sid,did,oids["CLAUDE_ENT"]):
            scen=next((x["fields"] for x in records("Scenarios") if x["id"]==sid),{})
            add("Allocations",{"Scenario":sid,"Domaine":did,"Offre":oids["CLAUDE_ENT"],"Nb_Licences":f.get("Nb_Sieges",0),"Mois_Factures":scen.get("Nb_Mois",0),"Engagement_Mois":12,"Tarif_Negocie_Mensuel":0,"Tarif_Negocie_Annuel":0,"Usage_Supplementaire_Prevu_Mois_Licence":f.get("Budget_Usage_User_Mois",0),"Overage_Autorise":True,"Plafond_Overage_Mois_Licence":-1})

if "Forfaits_Individuels" in table_ids():
    legacy_tarifs={r["id"]:r["fields"].get("Offre") for r in records("Tarifs")} if "Tarifs" in table_ids() else {}
    code_map={"Pro":"CLAUDE_PRO","Max5x":"CLAUDE_MAX5","Max20x":"CLAUDE_MAX20"}
    for r in records("Forfaits_Individuels"):
        f=r["fields"]; name=legacy_tarifs.get(f.get("Offre")); code=code_map.get(name)
        if not code: continue
        sid=f.get("Scenario");did=f.get("Domaine");oid=oids[code]
        if not alloc_exists(sid,did,oid):
            scen=next((x["fields"] for x in records("Scenarios") if x["id"]==sid),{})
            add("Allocations",{"Scenario":sid,"Domaine":did,"Offre":oid,"Nb_Licences":f.get("Nb_Utilisateurs",0),"Mois_Factures":scen.get("Nb_Mois",0),"Engagement_Mois":1,"Tarif_Negocie_Mensuel":0,"Tarif_Negocie_Annuel":0,"Usage_Supplementaire_Prevu_Mois_Licence":0,"Overage_Autorise":False,"Plafond_Overage_Mois_Licence":0})

print("\nMigration terminée.")
print("Tables historiques Claude conservées : Tarifs, Enterprise, Forfaits_Individuels.")
print("Nouvelles tables : Fournisseurs, Offres, Allocations.")
print("Claude : tarifs de référence préservés.")
print("Mistral/Cursor Enterprise : DEVIS A CONFIRMER.")
