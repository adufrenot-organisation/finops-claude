import os, requests

BASE=os.environ.get("GRIST_BASE_URL","https://grist.numerique.gouv.fr").rstrip("/")
DOC=os.environ["GRIST_DOC_ID"]
KEY=os.environ["GRIST_API_KEY"]
H={"Authorization":f"Bearer {KEY}","Content-Type":"application/json"}

def req(method,path,payload=None):
    r=requests.request(method,f"{BASE}{path}",headers=H,json=payload,timeout=60)
    r.raise_for_status()
    return r.json() if r.content else None

cols=req("GET",f"/api/docs/{DOC}/tables/Claude_Groupes/columns")["columns"]
ids={c["id"] for c in cols}

if "Duree_Engagement_Mois" not in ids:
    req("POST",f"/api/docs/{DOC}/apply",[[
        "AddColumn","Claude_Groupes","Duree_Engagement_Mois",{"type":"Int"}
    ]])
    print("Claude_Groupes.Duree_Engagement_Mois ajoutée.")
else:
    print("Claude_Groupes.Duree_Engagement_Mois déjà présente.")

rows=req("GET",f"/api/docs/{DOC}/tables/Claude_Groupes/records")["records"]
actions=[]
for r in rows:
    value=r["fields"].get("Duree_Engagement_Mois")
    if not value or int(value)<=0:
        actions.append(["UpdateRecord","Claude_Groupes",r["id"],{"Duree_Engagement_Mois":12}])

if actions:
    req("POST",f"/api/docs/{DOC}/apply",actions)
    print(f"{len(actions)} groupe(s) initialisé(s) à 12 mois.")

print("Migration V101 terminée.")
