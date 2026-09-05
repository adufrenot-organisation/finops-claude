# V91 — Épuration du détail HTML

Dans `Ouvrir en HTML`, suppression des informations récapitulatives redondantes
dans l'en-tête de chaque détail de domaine :
- nombre de licences ;
- montant d'achat affiché à côté du domaine ;
- coût équivalent annuel dans cet en-tête.

Ces informations restent disponibles dans les sections structurées du rapport
(vue budgétaire, tableaux de détail et lecture économique/ROI).

Le bouton `Voir le détail` est conservé.

Le rendu dans l'application n'est pas supprimé par cette modification :
la suppression est ciblée sur le HTML autonome.

Aucune migration Grist supplémentaire.
