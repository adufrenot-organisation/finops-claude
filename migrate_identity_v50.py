import os, requests

BASE=os.environ.get("GRIST_BASE_URL","https://grist.numerique.gouv.fr").rstrip("/")
DOC=os.environ["GRIST_DOC_ID"]
KEY=os.environ["GRIST_API_KEY"]
H={"Authorization":f"Bearer {KEY}","Content-Type":"application/json"}

def req(method,path,payload=None):
    r=requests.request(method,f"{BASE}{path}",headers=H,json=payload,timeout=60)
    r.raise_for_status()
    return r.json() if r.content else None

def tables():
    return {t["id"] for t in req("GET",f"/api/docs/{DOC}/tables")["tables"]}

TABLE="FinOps_Identite_Session"
if TABLE not in tables():
    cols=[
        {"id":"Session_Id","fields":{"type":"Text"}},
        # Trigger formulas (data columns) evaluated by Grist on AddRecord.
        # recalcWhen=0 => DEFAULT: new records + declared dependencies.
        {"id":"Email","fields":{"type":"Text","isFormula":False,"formula":"user.Email","recalcWhen":0}},
        {"id":"Access","fields":{"type":"Text","isFormula":False,"formula":"user.Access","recalcWhen":0}},
    ]
    req("POST",f"/api/docs/{DOC}/apply",[["AddTable",TABLE,cols]])
    print(TABLE,"créée avec trigger formulas user.Email / user.Access")
else:
    print(TABLE,"déjà présente")
    # Reconcile formulas in case a prior partial test created plain columns.
    req("POST",f"/api/docs/{DOC}/apply",[
        ["ModifyColumn",TABLE,"Email",{"type":"Text","isFormula":False,"formula":"user.Email","recalcWhen":0}],
        ["ModifyColumn",TABLE,"Access",{"type":"Text","isFormula":False,"formula":"user.Access","recalcWhen":0}],
    ])
    print("Trigger formulas réconciliées")

print("Migration V50 terminée.")
print("Étape suivante OBLIGATOIRE : en Owner, ACL / Sécurité > Appliquer / réconcilier FinOps.")
print("Puis déployer app.js/index.html V50 et rafraîchir le widget.")
