import io, json, sqlite3, zipfile, requests, argparse, datetime

def main():
    ap=argparse.ArgumentParser(description="Audit ACL FinOps Grist (lecture seule)")
    ap.add_argument("--url", default="https://grist.numerique.gouv.fr")
    ap.add_argument("--doc", required=True)
    ap.add_argument("--api-key", required=True)
    ap.add_argument("--out", default="finops_acl_audit.json")
    args=ap.parse_args()

    headers={"Authorization":f"Bearer {args.api_key}"}
    u=f"{args.url.rstrip('/')}/api/docs/{args.doc}/download"
    r=requests.get(u,headers=headers,timeout=120)
    r.raise_for_status()
    data=r.content

    # A .grist document is an SQLite file. Some deployments may wrap downloads.
    db_bytes=data
    if data[:2]==b"PK":
        z=zipfile.ZipFile(io.BytesIO(data))
        candidates=[n for n in z.namelist() if n.endswith(".grist") or n.endswith(".sqlite")]
        if not candidates:
            raise RuntimeError("Archive téléchargée sans fichier .grist/.sqlite identifiable.")
        db_bytes=z.read(candidates[0])

    tmp="finops_acl_tmp.grist"
    open(tmp,"wb").write(db_bytes)
    con=sqlite3.connect(tmp)
    con.row_factory=sqlite3.Row
    resources=[dict(r) for r in con.execute("select * from _grist_ACLResources")]
    rules=[dict(r) for r in con.execute("select * from _grist_ACLRules")]
    payload={"exportedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"resources":resources,"rules":rules}
    with open(args.out,"w",encoding="utf-8") as f: json.dump(payload,f,ensure_ascii=False,indent=2)
    print(f"Audit écrit dans {args.out}")
    print(f"{len(resources)} ressource(s), {len(rules)} règle(s).")
    con.close()

if __name__=="__main__":
    main()
