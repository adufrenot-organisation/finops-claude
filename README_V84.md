# V84 — ROI RH par paliers N-1 / N

Le modèle ROI est refondu.

## Principe
Chaque périmètre affiche deux blocs :
- RH N-1
- RH N

Chaque bloc peut contenir plusieurs paliers :
- nombre de ressources
- TJM
- jours/an
- coût RH annuel calculé

Il n'y a pas de TJM moyen.

## Niveau de calcul
- sans pré-simulation avec équipes : ROI au niveau Domaine ;
- avec pré-simulation contenant réellement des équipes et des ressources : ROI au niveau Domaine / Équipe.

## Formules
- Coût RH d'un palier = Nb ressources × TJM × jours/an
- RH N-1 = somme des paliers N-1
- RH N = somme des paliers N
- Économie RH = RH N-1 − RH N
- Coût total N = RH N + coût équivalent annuel des licences
- Gain net annuel = RH N-1 − Coût total N
- ROI / gain % = Gain net annuel / RH N-1

## Nouvelle table Grist
Créer `ROI_RH_Paliers` avant d'utiliser l'écran ROI V84.
Le ZIP contient :
- `SCHEMA_V84_ROI_RH_PALIERS.csv`
- `migration_v84_roi_rh.py`
