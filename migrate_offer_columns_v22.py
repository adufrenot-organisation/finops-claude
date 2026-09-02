import os, requests
BASE=os.environ.get("GRIST_BASE_URL","https://grist.numerique.gouv.fr").rstrip("/")
DOC=os.environ["GRIST_DOC_ID"]; API_KEY=os.environ["GRIST_API_KEY"]
H={"Authorization":f"Bearer {API_KEY}","Content-Type":"application/json"}
COLS=[("Fournisseur","Fournisseur"),("Nom","Nom"),("Code","Code"),("Famille","Famille"),("Periodicite_Prix","Périodicité"),("Devise","Devise"),("Tarif_Catalogue_Mensuel","Catalogue / mois"),("Tarif_Catalogue_Annuel","Catalogue / an"),("Tarif_Reference_Mensuel","Référence / mois"),("Tarif_Reference_Annuel","Référence / an"),("Tarif_Negocie_Mensuel","Négocié / mois"),("Tarif_Negocie_Annuel","Négocié / an"),("Enveloppe_Usage_Incluse_Mois_Licence","Usage inclus / mois / licence"),("Usage_Inclus_Description","Description usage inclus"),("Overage_Disponible","Overage disponible"),("Facturer_Engagement_Minimum","Facturer engagement minimum"),("Engagement_Defaut_Mois","Engagement par défaut (mois)"),("Mois_Factures_Defaut","Mois facturés par défaut"),("Compatible_Devis","Compatible devis"),("Compatible_PO","Compatible PO"),("Compatible_Facture","Compatible facture"),("Compatible_Virement","Compatible virement"),("Compatible_Prepaiement","Compatible prépaiement"),("Statut_Tarif","Statut tarif"),("Source_Tarif","Source tarif"),("Note_Procurement","Note procurement"),("Actif","Actif")]
def req(method,path,payload=None):
 r=requests.request(method,f"{BASE}{path}",headers=H,json=payload,timeout=60);r.raise_for_status();return r.json() if r.content else None
tables=req("GET",f"/api/docs/{DOC}/tables")["tables"]; ids={t["id"] for t in tables}
if "Configuration_Colonnes_Offres" not in ids:
 req("POST",f"/api/docs/{DOC}/apply",[["AddTable","Configuration_Colonnes_Offres",[{"id":"Cle_Colonne","fields":{"type":"Text"}},{"id":"Libelle","fields":{"type":"Text"}},{"id":"Ordre","fields":{"type":"Int"}},{"id":"Visible_Lecture","fields":{"type":"Bool"}},{"id":"Visible_Admin","fields":{"type":"Bool"}}]]]);print("Table Configuration_Colonnes_Offres créée.")
rows=req("GET",f"/api/docs/{DOC}/tables/Configuration_Colonnes_Offres/records")["records"];existing={r["fields"].get("Cle_Colonne"):r for r in rows};seed=[]
for i,(key,label) in enumerate(COLS):
 if key not in existing: seed.append(["AddRecord","Configuration_Colonnes_Offres",None,{"Cle_Colonne":key,"Libelle":label,"Ordre":i*10,"Visible_Lecture":True,"Visible_Admin":True}])
if seed:req("POST",f"/api/docs/{DOC}/apply",seed);print(f"{len(seed)} colonnes configurables initialisées.")
else:print("Configuration des colonnes déjà initialisée.")
print("V22 prête.")
