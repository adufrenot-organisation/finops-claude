# FinOps multi-fournisseurs — V23

## Paramétrage global et persistant des libellés

La V23 ajoute un écran Owner **Paramétrage des libellés**.

Il centralise trois familles de libellés :
- les textes statiques de tous les écrans (titres, descriptions, boutons, en-têtes, labels de filtres, etc.) dans `Configuration_Libelles_UI`;
- les noms des onglets dans `Configuration_Menu`;
- les libellés des colonnes Offre de service dans `Configuration_Colonnes_Offres`.

Les textes d'écran sont découverts automatiquement dans l'interface rendue. Chaque valeur conserve son libellé par défaut comme fallback. Les changements sont persistés dans Grist et réappliqués à chaque chargement, y compris pour les utilisateurs non-Owner autorisés en lecture.

### Migration
Exécuter une fois `migrate_ui_labels_v23.py`. Le script crée `Configuration_Libelles_UI` et ajoute l'entrée `labelsadmin` dans `Configuration_Menu`.

### ACL
`Configuration_Libelles_UI` doit être lisible globalement par les utilisateurs autorisés et modifiable uniquement par l'Owner. L'écran ACL/Sécurité V23 inclut cette table dans les ressources globales en lecture.

Cache-busting : `?v=23`.
