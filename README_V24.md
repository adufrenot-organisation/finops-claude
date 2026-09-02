# FinOps multi-fournisseurs — V24

## Synchronisation de tous les libellés

La V24 corrige la perte de personnalisation après les rerendus partiels du Dashboard.
Un observateur réapplique automatiquement `Configuration_Libelles_UI` après les changements de filtres et autres rerendus locaux.

La détection couvre aussi les KPI, labels de filtres, badges, mini-boutons, titres, tableaux et textes d'aide.

## ROI multi-TJM par domaine

Nouvelle table : `Baseline_N_1_Details`

Chaque enregistrement contient :
- Scenario
- Domaine
- Ordre
- Nb_Collaborateurs_N_1
- TJM_EUR

Dans l'écran ROI, chaque domaine reste sur une seule ligne.
Le bouton **+ Ajouter un TJM** ajoute horizontalement un nouveau couple :
`Collaborateurs N-1 #N / TJM #N`.

Le nombre de couples n'est pas limité par un nombre fixe de colonnes en base.

Calcul annuel :
`Somme(Collaborateurs × TJM) × jours ouvrés`

La migration `migrate_roi_tjm_v24.py` crée la table et reprend l'ancien couple unique en tranche #1 sans doublon.

Cache : `?v=24`.
