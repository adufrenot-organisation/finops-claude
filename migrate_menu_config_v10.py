import requests

# FinOps V10 - création / réconciliation de Configuration_Menu
GRIST_URL = "https://grist.numerique.gouv.fr"
DOC_ID = "REMPLACE_PAR_TON_DOC_ID"
API_KEY = "REMPLACE_PAR_TA_CLE_API"

TABLE = "Configuration_Menu"
HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

DEFAULTS = [
    ("dashboard", "Dashboard", 10, True, False),
    ("simulation", "Simulation", 20, True, False),
    ("compare", "Comparaison", 30, True, False),
    ("roi", "ROI / Économies", 40, True, False),
    ("scenarios", "Scénarios", 50, True, False),
    ("offers", "Fournisseurs & offres", 60, True, True),
    ("domains", "Domaines", 70, True, True),
    ("rights", "Droits utilisateurs", 80, True, True),
    ("menuadmin", "Configuration du menu", 90, True, True),
]

def api(method, endpoint, payload=None):
    url = f"{GRIST_URL}/api/docs/{DOC_ID}{endpoint}"
    r = requests.request(method, url, headers=HEADERS, json=payload, timeout=60)
    if not r.ok:
        print(f"ERREUR {r.status_code}: {method} {endpoint}")
        print(r.text)
        r.raise_for_status()
    return r.json() if r.text else None

def table_ids():
    return [t["id"] for t in api("GET", "/tables")["tables"]]

def column_map(table):
    return {c["id"]: c.get("fields", {}) for c in api("GET", f"/tables/{table}/columns")["columns"]}

def ensure_table():
    if TABLE not in table_ids():
        print(f"Création de {TABLE}...")
        api("POST", "/tables", {"tables": [{
            "id": TABLE,
            "columns": [
                {"id": "Cle", "fields": {"type": "Text"}},
                {"id": "Libelle", "fields": {"type": "Text"}},
                {"id": "Ordre", "fields": {"type": "Int"}},
                {"id": "Actif", "fields": {"type": "Bool"}},
                {"id": "Owner_Seulement", "fields": {"type": "Bool"}},
            ]
        }]})
    else:
        print(f"{TABLE} existe déjà.")

def ensure_columns():
    existing = column_map(TABLE)
    expected = {
        "Cle": {"type": "Text"},
        "Libelle": {"type": "Text"},
        "Ordre": {"type": "Int"},
        "Actif": {"type": "Bool"},
        "Owner_Seulement": {"type": "Bool"},
    }
    missing = [{"id": cid, "fields": fields} for cid, fields in expected.items() if cid not in existing]
    if missing:
        print("Ajout des colonnes manquantes:", ", ".join(x["id"] for x in missing))
        api("POST", f"/tables/{TABLE}/columns", {"columns": missing})

def get_records():
    return api("GET", f"/tables/{TABLE}/records")["records"]

def seed_missing():
    recs = get_records()
    by_key = {str(r["fields"].get("Cle") or ""): r for r in recs}
    adds = []
    for key, label, order, active, owner_only in DEFAULTS:
        if key not in by_key:
            adds.append({"fields": {
                "Cle": key, "Libelle": label, "Ordre": order,
                "Actif": active, "Owner_Seulement": owner_only
            }})
    if adds:
        print(f"Ajout de {len(adds)} item(s) de menu.")
        api("POST", f"/tables/{TABLE}/records", {"records": adds})
    else:
        print("Tous les items de menu existent déjà.")

def verify():
    recs = get_records()
    print("\nConfiguration_Menu:")
    for r in sorted(recs, key=lambda x: x["fields"].get("Ordre") or 9999):
        f = r["fields"]
        print(f"  {r['id']:>3} | {f.get('Ordre'):>3} | {f.get('Cle'):<12} | {f.get('Libelle')} | Owner={f.get('Owner_Seulement')} | Actif={f.get('Actif')}")

if __name__ == "__main__":
    ensure_table()
    ensure_columns()
    seed_missing()
    verify()
    print("\nMIGRATION V10 TERMINÉE.")
    print("Ensuite, ajoute les Access Rules décrites dans ACL_CONFIGURATION_MENU_V10.md.")
