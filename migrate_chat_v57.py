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
table_ids={t["id"] for t in tables}
actions=[]

# General application configuration.
if "FinOps_Configuration" not in table_ids:
    actions.append(["AddTable","FinOps_Configuration",[
        {"id":"Cle","fields":{"type":"Text"}},
        {"id":"Valeur","fields":{"type":"Text"}},
        {"id":"Description","fields":{"type":"Text"}}
    ]])

if actions:
    req("POST",f"/api/docs/{DOC}/apply",actions)
    print("Table FinOps_Configuration créée.")

# Add soft-delete columns to existing chat messages table.
cols=req("GET",f"/api/docs/{DOC}/tables/FinOps_Messages/columns")["columns"]
col_ids={c["id"] for c in cols}
col_actions=[]
if "Supprime" not in col_ids:
    col_actions.append(["AddColumn","FinOps_Messages","Supprime",{"type":"Bool"}])
if "Supprime_Par" not in col_ids:
    col_actions.append(["AddColumn","FinOps_Messages","Supprime_Par",{"type":"Text"}])
if "Supprime_MS" not in col_ids:
    col_actions.append(["AddColumn","FinOps_Messages","Supprime_MS",{"type":"Numeric"}])
if col_actions:
    req("POST",f"/api/docs/{DOC}/apply",col_actions)
    print("Colonnes de suppression logique ajoutées à FinOps_Messages.")

# Seed default refresh interval when absent.
rows=req("GET",f"/api/docs/{DOC}/tables/FinOps_Configuration/records")["records"]
existing=next((r for r in rows if str(r["fields"].get("Cle") or "")=="CHAT_REFRESH_SECONDS"),None)
if not existing:
    req("POST",f"/api/docs/{DOC}/apply",[["AddRecord","FinOps_Configuration",None,{
        "Cle":"CHAT_REFRESH_SECONDS",
        "Valeur":"7",
        "Description":"Intervalle de rafraîchissement automatique de la messagerie FinOps, en secondes."
    }]])
    print("Paramètre CHAT_REFRESH_SECONDS initialisé à 7 secondes.")

print("Migration V57 terminée.")
print("Étape suivante : Owner > ACL / Sécurité > sauvegarde puis réconciliation V57.")
