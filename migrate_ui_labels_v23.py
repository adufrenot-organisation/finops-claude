import os, requests
BASE=os.environ.get("GRIST_BASE_URL","https://grist.numerique.gouv.fr").rstrip("/")
DOC=os.environ["GRIST_DOC_ID"]
API_KEY=os.environ["GRIST_API_KEY"]
H={"Authorization":f"Bearer {API_KEY}","Content-Type":"application/json"}

def req(method,path,payload=None):
    r=requests.request(method,f"{BASE}{path}",headers=H,json=payload,timeout=60)
    r.raise_for_status()
    return r.json() if r.content else None

tables=req("GET",f"/api/docs/{DOC}/tables")["tables"]
ids={t["id"] for t in tables}
actions=[]
if "Configuration_Libelles_UI" not in ids:
    actions.append(["AddTable","Configuration_Libelles_UI",[
        {"id":"Cle","fields":{"type":"Text"}},
        {"id":"Ecran","fields":{"type":"Text"}},
        {"id":"Libelle_Defaut","fields":{"type":"Text"}},
        {"id":"Libelle","fields":{"type":"Text"}},
        {"id":"Actif","fields":{"type":"Bool"}},
        {"id":"Ordre","fields":{"type":"Int"}},
    ]])
if actions:
    req("POST",f"/api/docs/{DOC}/apply",actions)
    print("Table Configuration_Libelles_UI créée.")

rows=req("GET",f"/api/docs/{DOC}/tables/Configuration_Menu/records")["records"]
by_key={r["fields"].get("Cle"):r for r in rows}
menu_actions=[]
if "labelsadmin" not in by_key:
    menu_actions.append(["AddRecord","Configuration_Menu",None,{"Cle":"labelsadmin","Libelle":"Paramétrage des libellés","Ordre":95,"Actif":True,"Owner_Seulement":True}])
if menu_actions:
    req("POST",f"/api/docs/{DOC}/apply",menu_actions)
    print("Entrée labelsadmin ajoutée à Configuration_Menu.")
print("Migration V23 terminée.")
