# V27 — Paramétrage des libellés

La V27 corrige deux problèmes de conception.

## Tous les menus sont désormais gérables

Avant, `menuConfigRows()` supprimait les lignes `Actif=false`.
Conséquence : un menu masqué disparaissait également des écrans de configuration et ne pouvait plus être renommé facilement.

La V27 sépare :
- `menuConfigAllRows()` : tous les menus, actifs ou masqués ;
- `menuConfigRows()` : seulement les menus visibles, utilisé pour la navigation.

Les écrans Owner utilisent maintenant la liste complète.

## Écran Paramétrage des libellés réorganisé

L'écran est séparé en trois onglets :
1. **Menus** : tous les onglets, y compris masqués, avec libellé, état et accès ;
2. **Textes des écrans** : titres, boutons, KPI, filtres, en-têtes et aides, avec filtre par écran + recherche ;
3. **Colonnes offre** : libellés des colonnes de l'offre de service.

La sauvegarde des libellés de menu ne modifie plus accidentellement leur ordre, activation ou niveau d'accès.

Aucune migration Grist supplémentaire n'est nécessaire par rapport à V26.
Cache : `?v=27`.
