import os, requests

BASE=os.environ.get("GRIST_BASE_URL","https://grist.numerique.gouv.fr").rstrip("/")
DOC=os.environ["GRIST_DOC_ID"]
KEY=os.environ["GRIST_API_KEY"]
H={"Authorization":f"Bearer {KEY}","Content-Type":"application/json"}

def req(method,path,payload=None):
    r=requests.request(method,f"{BASE}{path}",headers=H,json=payload,timeout=60)
    r.raise_for_status()
    return r.json() if r.content else None

tables=req("GET",f"/api/docs/{DOC}/tables")["tables"]
ids={t["id"] for t in tables}
actions=[]

if "Pre_Simulations" not in ids:
    actions.append(["AddTable","Pre_Simulations",[
      {"id":"Nom","fields":{"type":"Text"}},
      {"id":"Domaine","fields":{"type":"Ref:Domaines"}},
      {"id":"Scenario_Reference","fields":{"type":"Ref:Scenarios"}},
      {"id":"Statut","fields":{"type":"Text"}},
      {"id":"Responsable","fields":{"type":"Text"}},
      {"id":"Commentaire","fields":{"type":"Text"}}
    ]])

if "Pre_Simulation_Ressources" not in ids:
    actions.append(["AddTable","Pre_Simulation_Ressources",[
      {"id":"Pre_Simulation","fields":{"type":"Ref:Pre_Simulations"}},
      {"id":"Nom_Ressource","fields":{"type":"Text"}},
      {"id":"Profil","fields":{"type":"Text"}},
      {"id":"Offre","fields":{"type":"Ref:Offres"}},
      {"id":"Commentaire","fields":{"type":"Text"}},
      {"id":"Actif","fields":{"type":"Bool"}}
    ]])

if actions:
    req("POST",f"/api/docs/{DOC}/apply",actions)
    print("Tables V28 créées.")
else:
    print("Tables V28 déjà présentes.")

menu=req("GET",f"/api/docs/{DOC}/tables/Configuration_Menu/records")["records"]
existing=next((r for r in menu if r["fields"].get("Cle")=="presim"),None)
fields={
  "Cle":"presim",
  "Libelle":"Pré-simulation nominative",
  "Ordre":45,
  "Actif":True,
  "Owner_Seulement":False
}
action=["UpdateRecord","Configuration_Menu",existing["id"],fields] if existing else ["AddRecord","Configuration_Menu",None,fields]
req("POST",f"/api/docs/{DOC}/apply",[action])

print("Migration V28 terminée.")
