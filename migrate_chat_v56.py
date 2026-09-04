import os, requests
BASE=os.environ.get("GRIST_BASE_URL","https://grist.numerique.gouv.fr").rstrip("/")
DOC=os.environ["GRIST_DOC_ID"]; KEY=os.environ["GRIST_API_KEY"]
H={"Authorization":f"Bearer {KEY}","Content-Type":"application/json"}
def req(method,path,payload=None):
    r=requests.request(method,f"{BASE}{path}",headers=H,json=payload,timeout=60)
    r.raise_for_status(); return r.json() if r.content else None
def table_ids(): return {t["id"] for t in req("GET",f"/api/docs/{DOC}/tables")["tables"]}
def add_table(name,cols):
    if name in table_ids(): print(name,"déjà présente"); return
    req("POST",f"/api/docs/{DOC}/apply",[["AddTable",name,[{"id":c,"fields":{"type":t}} for c,t in cols]]])
    print(name,"créée")
add_table("FinOps_Messages",[
    ("Canal","Text"),("Type","Text"),("Expediteur","Text"),("Destinataire","Text"),
    ("Texte","Text"),("Envoye_MS","Numeric")
])
add_table("FinOps_Chat_Lectures",[
    ("Email","Text"),("Canal","Text"),("Derniere_Lecture_MS","Numeric")
])
print("Migration V56 terminée.")
print("IMPORTANT : avant d'utiliser le chat, ouvrir FinOps en Owner puis ACL / Sécurité > sauvegarde > Appliquer / réconcilier FinOps.")
