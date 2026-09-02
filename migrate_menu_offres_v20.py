import os, requests

BASE=os.environ.get("GRIST_BASE_URL","https://grist.numerique.gouv.fr").rstrip("/")
DOC=os.environ["GRIST_DOC_ID"]
API_KEY=os.environ["GRIST_API_KEY"]
H={"Authorization":f"Bearer {API_KEY}","Content-Type":"application/json"}

def get(path):
    r=requests.get(f"{BASE}{path}",headers=H,timeout=60); r.raise_for_status(); return r.json()

def post(path,payload):
    r=requests.post(f"{BASE}{path}",headers=H,json=payload,timeout=60); r.raise_for_status(); return r.json()

rows=get(f"/api/docs/{DOC}/tables/Configuration_Menu/records")["records"]
by_key={r["fields"].get("Cle"):r for r in rows}
actions=[]
if "offers" in by_key:
    rid=by_key["offers"]["id"]
    actions.append(["UpdateRecord","Configuration_Menu",rid,{"Libelle":"Offre de service","Owner_Seulement":False}])
if "offersadmin" not in by_key:
    actions.append(["AddRecord","Configuration_Menu",None,{"Cle":"offersadmin","Libelle":"Paramétrage offre de service","Ordre":65,"Actif":True,"Owner_Seulement":True}])
if actions:
    post(f"/api/docs/{DOC}/apply",actions)
    print("Configuration_Menu V20 mise à jour.")
else:
    print("Aucune modification nécessaire.")
