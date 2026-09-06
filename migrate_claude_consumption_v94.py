#!/usr/bin/env python3
import json, os, urllib.request, urllib.error
BASE=os.environ.get('GRIST_BASE_URL','').rstrip('/')
DOC=os.environ.get('GRIST_DOC_ID','')
KEY=os.environ.get('GRIST_API_KEY','')
if not (BASE and DOC and KEY):
    raise SystemExit('Définir GRIST_BASE_URL, GRIST_DOC_ID et GRIST_API_KEY.')
def req(method,path,data=None):
    body=None if data is None else json.dumps(data).encode()
    r=urllib.request.Request(BASE+path,data=body,method=method,headers={'Authorization':'Bearer '+KEY,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(r) as f:return json.load(f)
    except urllib.error.HTTPError as e:
        txt=e.read().decode(); raise RuntimeError(f'{e.code} {txt}')
def tables(): return {t['id'] for t in req('GET',f'/api/docs/{DOC}/tables')['tables']}
def columns(table): return {c['id'] for c in req('GET',f'/api/docs/{DOC}/tables/{table}/columns')['columns']}
ts=tables()
if 'Claude_Organisations' not in ts: raise SystemExit('Claude_Organisations absente : installer d’abord la migration Enterprise V46.')
cols=columns('Claude_Organisations')
a=[]
if 'Mode_Facturation' not in cols:a.append(['AddColumn','Claude_Organisations','Mode_Facturation',{'type':'Text'}])
if 'Enveloppe_Engagee' not in cols:a.append(['AddColumn','Claude_Organisations','Enveloppe_Engagee',{'type':'Numeric'}])
if a:
    req('POST',f'/api/docs/{DOC}/apply',a); print('Colonnes Enterprise V94 ajoutées.')
if 'Claude_Consommations' not in ts:
    req('POST',f'/api/docs/{DOC}/apply',[["AddTable","Claude_Consommations",[
      {'id':'Scenario','fields':{'type':'Ref:Claude_Scenarios'}},
      {'id':'Organisation','fields':{'type':'Ref:Claude_Organisations'}},
      {'id':'Groupe','fields':{'type':'Ref:Claude_Groupes'}},
      {'id':'Ressource','fields':{'type':'Ref:Claude_Ressources'}},
      {'id':'Periode','fields':{'type':'Text'}},
      {'id':'Montant','fields':{'type':'Numeric'}},
      {'id':'Source','fields':{'type':'Text'}},
      {'id':'Commentaire','fields':{'type':'Text'}}
    ]]])
    print('Table Claude_Consommations créée.')
print('Migration V94 terminée. Déployer app.js puis réconcilier les ACL si votre configuration les gère explicitement.')
