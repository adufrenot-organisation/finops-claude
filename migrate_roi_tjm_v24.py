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

if "Baseline_N_1_Details" not in ids:
    req("POST",f"/api/docs/{DOC}/apply",[["AddTable","Baseline_N_1_Details",[
        {"id":"Scenario","fields":{"type":"Ref:Scenarios"}},
        {"id":"Domaine","fields":{"type":"Ref:Domaines"}},
        {"id":"Ordre","fields":{"type":"Int"}},
        {"id":"Nb_Collaborateurs_N_1","fields":{"type":"Numeric"}},
        {"id":"TJM_EUR","fields":{"type":"Numeric"}}
    ]]])
    print("Table Baseline_N_1_Details créée.")
else:
    print("Table Baseline_N_1_Details déjà présente.")

roots=req("GET",f"/api/docs/{DOC}/tables/Baseline_N_1/records")["records"]
details=req("GET",f"/api/docs/{DOC}/tables/Baseline_N_1_Details/records")["records"]
existing={(r["fields"].get("Scenario"),r["fields"].get("Domaine"),r["fields"].get("Ordre")) for r in details}

actions=[]
for r in roots:
    f=r["fields"]
    s,d=f.get("Scenario"),f.get("Domaine")
    c=float(f.get("Nb_Collaborateurs_N_1") or 0)
    t=float(f.get("TJM_EUR") or 0)
    if (c>0 or t>0) and (s,d,10) not in existing:
        actions.append(["AddRecord","Baseline_N_1_Details",None,{
            "Scenario":s,"Domaine":d,"Ordre":10,
            "Nb_Collaborateurs_N_1":c,"TJM_EUR":t
        }])

if actions:
    req("POST",f"/api/docs/{DOC}/apply",actions)
    print(f"{len(actions)} ancienne(s) paire(s) Collaborateurs/TJM migrée(s) en tranche #1.")
else:
    print("Aucune paire historique à migrer.")

print("Migration V24 terminée.")
