import os, requests

BASE=os.environ.get("GRIST_BASE_URL","https://grist.numerique.gouv.fr").rstrip("/")
DOC=os.environ["GRIST_DOC_ID"]
KEY=os.environ["GRIST_API_KEY"]
H={"Authorization":f"Bearer {KEY}","Content-Type":"application/json"}
TAG="FINOPS_V16"


def req(method,path,payload=None):
    r=requests.request(method,f"{BASE}{path}",headers=H,json=payload,timeout=60)
    r.raise_for_status()
    return r.json() if r.content else None


def table_ids():
    return {t["id"] for t in req("GET",f"/api/docs/{DOC}/tables")["tables"]}


def add_table(name, cols):
    if name in table_ids():
        print(name, "déjà présente")
        return
    actions=[["AddTable",name,[{"id":c,"fields":{"type":t}} for c,t in cols]]]
    req("POST",f"/api/docs/{DOC}/apply",actions)
    print(name,"créée")


def records(table):
    data=req("GET",f"/api/docs/{DOC}/tables/{table}/records") or {}
    return data.get("records",[])


def add_records(table, fields_list):
    if not fields_list:
        return
    req("POST",f"/api/docs/{DOC}/tables/{table}/records",{"records":[{"fields":f} for f in fields_list]})


def internal_rows(table):
    data=req("GET",f"/api/docs/{DOC}/tables/{table}/records") or {}
    out=[]
    for r in data.get("records",[]):
        row={"id":r.get("id")}
        row.update(r.get("fields",{}))
        out.append(row)
    return out


def ensure_acl_resource(table_id):
    resources=internal_rows("_grist_ACLResources")
    found=next((r for r in resources if r.get("tableId")==table_id and r.get("colIds")=="*"),None)
    if found:
        return found["id"]
    req("POST",f"/api/docs/{DOC}/apply",[["AddRecord","_grist_ACLResources",None,{"tableId":table_id,"colIds":"*"}]])
    resources=internal_rows("_grist_ACLResources")
    found=next((r for r in resources if r.get("tableId")==table_id and r.get("colIds")=="*"),None)
    if not found:
        raise RuntimeError(f"Impossible de créer la ressource ACL {table_id}:*")
    return found["id"]


def replace_bootstrap_rules(table_id, rules):
    res_id=ensure_acl_resource(table_id)
    existing=internal_rows("_grist_ACLRules")
    prefixes=(f"{TAG}:{table_id}:",f"FINOPS_V51_BOOTSTRAP:{table_id}:")
    remove=[["RemoveRecord","_grist_ACLRules",r["id"]] for r in existing if str(r.get("memo") or "").startswith(prefixes)]
    if remove:
        req("POST",f"/api/docs/{DOC}/apply",remove)
    actions=[]
    for tag,formula,perm in rules:
        actions.append(["AddRecord","_grist_ACLRules",None,{
            "resource":res_id,
            "aclFormula":formula,
            "permissionsText":perm,
            "memo":f"FINOPS_V51_BOOTSTRAP:{table_id}:{tag}"
        }])
    req("POST",f"/api/docs/{DOC}/apply",actions)
    print("ACL bootstrap sécurisées pour",table_id)


# 1) Tables techniques statiques : aucune trigger formula, aucune dépendance à l'iframe.
add_table("FinOps_Identites",[("Email","Text")])
add_table("FinOps_Owner_Sentinel",[("Cle","Text")])

# 2) Miroir minimal des utilisateurs actifs connus.
rights=records("Droits_Utilisateurs")
active_emails=[]
for r in rights:
    f=r.get("fields",{})
    if f.get("Actif") is False:
        continue
    email=str(f.get("Email") or "").strip().lower()
    if email and "@" in email:
        active_emails.append(email)
active_emails=sorted(set(active_emails))
existing_ids={str(r.get("fields",{}).get("Email") or "").strip().lower() for r in records("FinOps_Identites")}
missing=[{"Email":e} for e in active_emails if e not in existing_ids]
add_records("FinOps_Identites",missing)
print(f"FinOps_Identites : {len(active_emails)} identité(s) active(s), {len(missing)} ajoutée(s)")

# 3) Sentinel Owner unique.
sentinel=records("FinOps_Owner_Sentinel")
if not any(str(r.get("fields",{}).get("Cle") or "")=="OWNER" for r in sentinel):
    add_records("FinOps_Owner_Sentinel",[{"Cle":"OWNER"}])
    print("Sentinel Owner créé")
else:
    print("Sentinel Owner déjà présent")

# 4) ACL bootstrap AVANT déploiement V51 : aucune fenêtre où le sentinel serait visible aux non-Owners.
replace_bootstrap_rules("FinOps_Owner_Sentinel",[
    ("OWNER","user.Access in [OWNER]","all"),
    ("DEFAULT","","none"),
])
replace_bootstrap_rules("FinOps_Identites",[
    ("OWNER","user.Access in [OWNER]","all"),
    ("SELF","rec.Email == user.Email","+R"),
    ("DEFAULT","","none"),
])

print("\nMigration identité V51 terminée.")
print("Ordre recommandé :")
print("1. Déployer app.js + index.html V51")
print("2. Se reconnecter normalement en Owner : le sentinel doit rendre Owner Grist immédiatement")
print("3. Dans FinOps > ACL / Sécurité, exporter une sauvegarde puis Appliquer / réconcilier FinOps")
print("4. Tester Owner > Voir comme Lecteur > retour Owner")
print("FinOps_Identite_Session (V50) devient obsolète et peut rester en place ; V51 ne la lit plus.")
