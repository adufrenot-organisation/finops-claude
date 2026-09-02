import os, requests

BASE=os.environ.get("GRIST_BASE_URL","https://grist.numerique.gouv.fr").rstrip("/")
DOC=os.environ["GRIST_DOC_ID"]
KEY=os.environ["GRIST_API_KEY"]
H={"Authorization":f"Bearer {KEY}","Content-Type":"application/json"}

def req(method,path,payload=None):
    r=requests.request(method,f"{BASE}{path}",headers=H,json=payload,timeout=60)
    r.raise_for_status()
    return r.json() if r.content else None

cols=req("GET",f"/api/docs/{DOC}/tables/Configuration_Colonnes_Offres/columns")["columns"]
ids={c["id"] for c in cols}
actions=[]

if "Ordre_Lecture" not in ids:
    actions.append(["AddColumn","Configuration_Colonnes_Offres","Ordre_Lecture",{"type":"Int"}])
if "Ordre_Admin" not in ids:
    actions.append(["AddColumn","Configuration_Colonnes_Offres","Ordre_Admin",{"type":"Int"}])

if actions:
    req("POST",f"/api/docs/{DOC}/apply",actions)
    print("Colonnes d'ordre V33 créées.")

rows=req("GET",f"/api/docs/{DOC}/tables/Configuration_Colonnes_Offres/records")["records"]
updates=[]
for r in rows:
    f=r["fields"]
    base=int(f.get("Ordre") or 0)
    vals={}
    if not f.get("Ordre_Lecture") and base:
        vals["Ordre_Lecture"]=base
    if not f.get("Ordre_Admin") and base:
        vals["Ordre_Admin"]=base
    if vals:
        updates.append(["UpdateRecord","Configuration_Colonnes_Offres",r["id"],vals])

if updates:
    req("POST",f"/api/docs/{DOC}/apply",updates)
    print(f"{len(updates)} ligne(s) initialisée(s) depuis Ordre.")

print("Migration V33 terminée.")
