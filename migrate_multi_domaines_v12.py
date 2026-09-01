import requests

GRIST_URL = "https://grist.numerique.gouv.fr"
DOC_ID = "REMPLACE_PAR_TON_DOC_ID"
API_KEY = "REMPLACE_PAR_TA_CLE_API"

TABLE = "Droits_Utilisateurs"
NEW_COL = "Domaines_Autorises"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

def api(method, endpoint, payload=None):
    url = f"{GRIST_URL}/api/docs/{DOC_ID}{endpoint}"
    r = requests.request(method, url, headers=HEADERS, json=payload, timeout=60)
    if not r.ok:
        print(f"ERREUR {r.status_code}: {method} {endpoint}")
        print(r.text)
        r.raise_for_status()
    return r.json() if r.text else None

def columns():
    return api("GET", f"/tables/{TABLE}/columns")["columns"]

def records():
    return api("GET", f"/tables/{TABLE}/records")["records"]

def reflist_ids(v):
    if isinstance(v, list):
        vals = v[1:] if v and v[0] == "L" else v
        return [x for x in vals if isinstance(x, int) and x > 0]
    return []

def ensure_column():
    existing = {c["id"]: c.get("fields", {}) for c in columns()}
    if NEW_COL not in existing:
        print(f"Création de {NEW_COL} (RefList:Domaines)...")
        api("POST", f"/tables/{TABLE}/columns", {"columns": [{
            "id": NEW_COL,
            "fields": {"type": "RefList:Domaines", "label": "Domaines autorisés"}
        }]})
    else:
        print(f"{NEW_COL} existe déjà.")

def migrate_existing():
    updates = []
    for r in records():
        f = r["fields"]
        current = reflist_ids(f.get(NEW_COL))
        old = f.get("Domaine")
        if not current and isinstance(old, int) and old > 0:
            updates.append({"id": r["id"], "fields": {NEW_COL: ["L", old]}})
    if updates:
        api("PATCH", f"/tables/{TABLE}/records", {"records": updates})
        print(f"{len(updates)} ligne(s) migrée(s).")
    else:
        print("Aucune ligne à migrer.")

def show():
    print("\nDroits utilisateurs :")
    for r in records():
        f = r["fields"]
        print(f"  {r['id']} | {f.get('Email')} | domaines={reflist_ids(f.get(NEW_COL))} | role={f.get('Role_App')} | actif={f.get('Actif')}")

if __name__ == "__main__":
    ensure_column()
    migrate_existing()
    show()
    print("\nMIGRATION V12 TERMINÉE.")
