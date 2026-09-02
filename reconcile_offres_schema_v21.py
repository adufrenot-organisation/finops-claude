import os, requests, json

BASE=os.environ.get("GRIST_BASE_URL","https://grist.numerique.gouv.fr").rstrip("/")
DOC=os.environ["GRIST_DOC_ID"]
API_KEY=os.environ["GRIST_API_KEY"]
H={"Authorization":f"Bearer {API_KEY}","Content-Type":"application/json"}

def req(method,path,payload=None):
    r=requests.request(method,f"{BASE}{path}",headers=H,json=payload,timeout=60)
    r.raise_for_status()
    return r.json() if r.content else None

def get(path): return req("GET",path)
def post(path,payload): return req("POST",path,payload)

# Canonical persisted schema for the Service Offer editor.
# Every field visible/editable in the widget must be a real Grist column.
OFFRES_COLS = {
    "Fournisseur":{"type":"Ref:Fournisseurs"},
    "Nom":{"type":"Text"},
    "Code":{"type":"Text"},
    "Famille":{"type":"Choice"},
    "Periodicite_Prix":{"type":"Choice"},
    "Devise":{"type":"Text"},
    "Tarif_Catalogue_Mensuel":{"type":"Numeric"},
    "Tarif_Catalogue_Annuel":{"type":"Numeric"},
    "Tarif_Reference_Mensuel":{"type":"Numeric"},
    "Tarif_Reference_Annuel":{"type":"Numeric"},
    "Tarif_Negocie_Mensuel":{"type":"Numeric"},
    "Tarif_Negocie_Annuel":{"type":"Numeric"},
    "Enveloppe_Usage_Incluse_Mois_Licence":{"type":"Numeric"},
    "Usage_Inclus_Description":{"type":"Text"},
    "Overage_Disponible":{"type":"Bool"},
    "Facturer_Engagement_Minimum":{"type":"Bool"},
    "Engagement_Defaut_Mois":{"type":"Int"},
    "Mois_Factures_Defaut":{"type":"Int"},
    "Compatible_Devis":{"type":"Bool"},
    "Compatible_PO":{"type":"Bool"},
    "Compatible_Facture":{"type":"Bool"},
    "Compatible_Virement":{"type":"Bool"},
    "Compatible_Prepaiement":{"type":"Bool"},
    "Statut_Tarif":{"type":"Text"},
    "Source_Tarif":{"type":"Text"},
    "Note_Procurement":{"type":"Text"},
    "Actif":{"type":"Bool"},
}

tables=get(f"/api/docs/{DOC}/tables")
table_ids={t["id"] for t in tables["tables"]}
if "Offres" not in table_ids:
    raise RuntimeError("La table Offres n'existe pas. Exécutez d'abord la réconciliation V6.")

cols=get(f"/api/docs/{DOC}/tables/Offres/columns")["columns"]
existing={c["id"]:c for c in cols}

actions=[]
for col_id,fields in OFFRES_COLS.items():
    if col_id not in existing:
        actions.append(["AddColumn","Offres",col_id,fields])

if actions:
    post(f"/api/docs/{DOC}/apply",actions)
    print(f"{len(actions)} colonne(s) ajoutée(s) à Offres :")
    for a in actions:
        print(" -",a[2])
else:
    print("Schéma Offres déjà complet : aucune colonne à ajouter.")

# Audit useful calculation fields.
calc_fields=[
 "Fournisseur","Periodicite_Prix","Devise",
 "Tarif_Catalogue_Mensuel","Tarif_Catalogue_Annuel",
 "Tarif_Reference_Mensuel","Tarif_Reference_Annuel",
 "Tarif_Negocie_Mensuel","Tarif_Negocie_Annuel",
 "Enveloppe_Usage_Incluse_Mois_Licence",
 "Overage_Disponible","Facturer_Engagement_Minimum",
 "Engagement_Defaut_Mois","Mois_Factures_Defaut"
]
print("\nChamps Offres utilisés/consommés par les calculs d'allocation :")
for f in calc_fields:
    print(" -",f)

print("\nChamps complémentaires également persistés en table :")
for f in OFFRES_COLS:
    if f not in calc_fields:
        print(" -",f)
