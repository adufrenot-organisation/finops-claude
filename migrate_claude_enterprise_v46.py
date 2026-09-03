import os, requests
BASE=os.environ.get("GRIST_BASE_URL","https://grist.numerique.gouv.fr").rstrip("/")
DOC=os.environ["GRIST_DOC_ID"]; KEY=os.environ["GRIST_API_KEY"]
H={"Authorization":f"Bearer {KEY}","Content-Type":"application/json"}
def req(method,path,payload=None):
    r=requests.request(method,f"{BASE}{path}",headers=H,json=payload,timeout=60); r.raise_for_status(); return r.json() if r.content else None
def tables(): return {t["id"] for t in req("GET",f"/api/docs/{DOC}/tables")["tables"]}
def add_table(name,cols):
    if name in tables(): print(name,"déjà présente"); return
    req("POST",f"/api/docs/{DOC}/apply",[["AddTable",name,[{"id":c,"fields":{"type":t}} for c,t in cols]]]); print(name,"créée")
add_table("Claude_Scenarios",[("Nom","Text"),("Description","Text"),("Actif","Bool"),("Commentaire","Text")])
add_table("Claude_Organisations",[("Scenario","Ref:Claude_Scenarios"),("Nom","Text"),("Plafond_Global","Numeric"),("Actif","Bool"),("Commentaire","Text")])
add_table("Claude_Groupes",[("Scenario","Ref:Claude_Scenarios"),("Organisation","Ref:Claude_Organisations"),("Nom","Text"),("Limite_User_Mois","Numeric"),("Actif","Bool"),("Commentaire","Text")])
add_table("Claude_Ressources",[("Scenario","Ref:Claude_Scenarios"),("Nom","Text"),("Email","Text"),("Organisation","Ref:Claude_Organisations"),("Groupe","Ref:Claude_Groupes"),("Actif","Bool"),("Limite_Individuelle_Active","Bool"),("Limite_Individuelle","Numeric"),("Commentaire","Text")])
add_table("Claude_Configuration",[("Cle","Text"),("Valeur","Text")])
# Menu entry if absent
menu=req("GET",f"/api/docs/{DOC}/tables/Configuration_Menu/records")
records=menu.get('records',[])
if not any(r.get('fields',{}).get('Cle')=='claudeenterprise' for r in records):
    req("POST",f"/api/docs/{DOC}/tables/Configuration_Menu/records",{"records":[{"fields":{"Cle":"claudeenterprise","Libelle":"Claude Enterprise","Ordre":47,"Actif":True,"Owner_Seulement":False}}]})
    print("Entrée de menu Claude Enterprise créée")
# Config URL blank if absent
cfg=req("GET",f"/api/docs/{DOC}/tables/Claude_Configuration/records")
if not any(r.get('fields',{}).get('Cle')=='URL_MAQUETTE' for r in cfg.get('records',[])):
    req("POST",f"/api/docs/{DOC}/tables/Claude_Configuration/records",{"records":[{"fields":{"Cle":"URL_MAQUETTE","Valeur":""}}]})
    print("Clé URL_MAQUETTE créée")
print("Migration V46 terminée. Ensuite : ACL / Sécurité > sauvegarde > réconciliation, puis déployer app.js/index.html.")
