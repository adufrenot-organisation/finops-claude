# FinOps multi-fournisseurs — V19

## Synchronisation immédiate des noms de scénarios

Correction du filtre global Scénario après renommage ou modification depuis l'écran **Scénarios**.

Désormais, après un enregistrement :
- le scénario actuellement sélectionné est mémorisé ;
- les données Grist sont rechargées ;
- la liste déroulante globale des scénarios est reconstruite ;
- le scénario courant est restauré s'il existe encore ;
- tous les écrans sont rerendus avec le nouveau libellé.

Le nouveau nom apparaît donc immédiatement dans les filtres des autres écrans, sans rechargement manuel du navigateur.

Le cache-busting passe à `?v=19`.
