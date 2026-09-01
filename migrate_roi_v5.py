import requests

# ============================================================
# FinOps IA V5 — ajout ROI / baseline N-1
# À lancer APRÈS la migration V4 multi-fournisseurs.
# ============================================================
GRIST_URL = "https://grist.numerique.gouv.fr"
DOC_ID = "c4szVegcqKib"
API_KEY = "TA_CLE_API_ICI"

HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

def api(method, endpoint, payload=None):
    r = requests.request(method, f"{GRIST_URL}/api/docs/{DOC_ID}{endpoint}", headers=HEADERS, json=payload, timeout=30)
    if not r.ok:
        print("ERREUR", r.status_code, r.text)
        r.raise_for_status()
    return r.json() if r.text else None

def table_ids():
    return {t["id"] for t in api("GET", "/tables")["tables"]}

def column_ids(table):
    info = api("GET", f"/tables/{table}/columns")
    return {c["id"] for c in info.get("columns", [])}

def add_column_if_missing(table, col_id, fields):
    if col_id in column_ids(table):
        print(f"{table}.{col_id}: déjà présente")
        return
    print(f"Ajout colonne {table}.{col_id}")
    api("POST", f"/tables/{table}/columns", {"columns": [{"id": col_id, "fields": fields}]})

def create_table_if_missing(table_id, columns):
    if table_id in table_ids():
        print(f"Table {table_id}: déjà présente")
        return
    print(f"Création {table_id}")
    api("POST", "/tables", {"tables": [{"id": table_id, "columns": columns}]})

def records(table):
    return api("GET", f"/tables/{table}/records")["records"]

def add(table, fields):
    return api("POST", f"/tables/{table}/records", {"records": [{"fields": fields}]})

def add_if_missing(table, key_fields, fields):
    for r in records(table):
        if all(r["fields"].get(k) == v for k, v in key_fields.items()):
            return r["id"]
    result = add(table, fields)
    return result["records"][0]["id"]

# 1) Paramètre annuel global porté par le scénario.
# 218 est une valeur de départ MODIFIABLE, pas une hypothèse imposée.
add_column_if_missing("Scenarios", "Nb_Jours_Ouvres_Annuels", {"type": "Int"})

# Initialise à 218 seulement lorsque la valeur est vide/0.
for r in records("Scenarios"):
    if not r["fields"].get("Nb_Jours_Ouvres_Annuels"):
        api("PATCH", "/tables/Scenarios/records", {
            "records": [{"id": r["id"], "fields": {"Nb_Jours_Ouvres_Annuels": 218}}]
        })
        print(f"Scénario {r['id']}: jours ouvrés initialisés à 218 (modifiable)")

# 2) Baseline N-1 par domaine et scénario.
create_table_if_missing("Baseline_N_1", [
    {"id": "Scenario", "fields": {"type": "Ref:Scenarios"}},
    {"id": "Domaine", "fields": {"type": "Ref:Domaines"}},
    {"id": "Nb_Collaborateurs_N_1", "fields": {"type": "Numeric"}},
    {"id": "TJM_EUR", "fields": {"type": "Numeric"}},
    {"id": "Jours_Ouvres_Override", "fields": {"type": "Int"}},
    {"id": "Jours_Ouvres_Effectifs", "fields": {
        "type": "Int", "isFormula": True,
        "formula": "$Jours_Ouvres_Override if $Jours_Ouvres_Override > 0 else $Scenario.Nb_Jours_Ouvres_Annuels"
    }},
    {"id": "Cout_Reference_N_1_Annuel_EUR", "fields": {
        "type": "Numeric", "isFormula": True,
        "formula": "$Nb_Collaborateurs_N_1 * $TJM_EUR * $Jours_Ouvres_Effectifs"
    }},
    {"id": "Commentaire", "fields": {"type": "Text"}},
])

# 3) Pré-crée une ligne vide pour chaque couple scénario/domaine.
# Cela simplifie la saisie dans le widget et n'altère aucun budget.
scenarios = records("Scenarios")
domains = records("Domaines")
for s in scenarios:
    for d in domains:
        add_if_missing(
            "Baseline_N_1",
            {"Scenario": s["id"], "Domaine": d["id"]},
            {
                "Scenario": s["id"],
                "Domaine": d["id"],
                "Nb_Collaborateurs_N_1": 0,
                "TJM_EUR": 0,
                "Jours_Ouvres_Override": 0,
                "Commentaire": "",
            },
        )

print("\nMigration ROI V5 terminée.")
print("Vérifie les jours ouvrés dans Scenarios, puis renseigne Nb_Collaborateurs_N_1 et TJM_EUR par domaine.")
