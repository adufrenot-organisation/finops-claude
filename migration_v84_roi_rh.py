#!/usr/bin/env python3
import argparse, json, os, urllib.request, urllib.error

def req(method,url,key,payload=None):
    data=json.dumps(payload).encode() if payload is not None else None
    r=urllib.request.Request(url,data=data,method=method,headers={"Authorization":f"Bearer {key}","Content-Type":"application/json","Accept":"application/json"})
    try:
        with urllib.request.urlopen(r) as resp:
            body=resp.read().decode()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode(errors='replace')}")

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--base-url",default=os.getenv("GRIST_BASE_URL",""))
    p.add_argument("--doc-id",default=os.getenv("GRIST_DOC_ID",""))
    p.add_argument("--api-key",default=os.getenv("GRIST_API_KEY",""))
    p.add_argument("--dry-run",action="store_true")
    a=p.parse_args()
    if not all([a.base_url,a.doc_id,a.api_key]): raise SystemExit("base-url, doc-id et api-key requis")
    base=a.base_url.rstrip("/")
    tables=req("GET",f"{base}/api/docs/{a.doc_id}/tables",a.api_key).get("tables",[])
    if any(t.get("id")=="ROI_RH_Paliers" for t in tables):
        print("[OK] ROI_RH_Paliers existe déjà")
        return
    payload={"tables":[{"id":"ROI_RH_Paliers","columns":[
        {"id":"Scenario","fields":{"type":"Ref:Scenarios","label":"Scénario"}},
        {"id":"Domaine","fields":{"type":"Ref:Domaines","label":"Domaine"}},
        {"id":"Equipe","fields":{"type":"Ref:Pre_Simulation_Equipes","label":"Équipe"}},
        {"id":"Periode","fields":{"type":"Text","label":"Période"}},
        {"id":"Nb_Ressources","fields":{"type":"Numeric","label":"Nb ressources"}},
        {"id":"TJM_EUR","fields":{"type":"Numeric","label":"TJM EUR"}},
        {"id":"Jours_Annuels","fields":{"type":"Numeric","label":"Jours annuels"}},
        {"id":"Actif","fields":{"type":"Bool","label":"Actif"}},
        {"id":"Commentaire","fields":{"type":"Text","label":"Commentaire"}}
    ]}]}
    if a.dry_run:
        print(json.dumps(payload,ensure_ascii=False,indent=2))
    else:
        req("POST",f"{base}/api/docs/{a.doc_id}/tables",a.api_key,payload)
        print("[OK] ROI_RH_Paliers créée")

if __name__=="__main__":
    main()
