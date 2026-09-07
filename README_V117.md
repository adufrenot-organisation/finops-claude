# FinOps V117 — pilotage mensuel Claude Enterprise + ressources

Base : V116 du ZIP utilisateur.

## Vue d’ensemble Claude Enterprise
- budget mensuel estimé par groupe = Affectation initiale / Durée d’engagement du groupe ;
- affichage de la durée par groupe ;
- tableau d’écart cumulé à fin de chaque mois ;
- écart cumulé = consommation réelle cumulée - budget cumulé théorique ;
- un écart positif signale une consommation en avance sur la trajectoire budgétaire ;
- la première période est déduite de la première consommation du scénario, à défaut le mois courant.

## Limites groupe -> utilisateurs
- la limite effective d’une ressource sans dérogation est calculée dynamiquement depuis `Claude_Groupes.Limite_User_Mois` ;
- toute modification de la limite du groupe se reflète donc immédiatement dans la vue Ressources ;
- une dérogation individuelle reste prioritaire ;
- l’écran Ressources distingue "Limite groupe", "Limite effective" et origine de la limite.

## Onglet Ressources
- restauration de `ceRenderResources`, absente du `app.js` V116 alors que l’onglet l’appelait ;
- ajout/modification/suppression des ressources à nouveau disponibles ;
- le dialogue ressource montre en direct la limite effective héritée ou dérogée.

## Durée d’engagement groupe
- le champ `Claude_Groupes.Duree_Engagement_Mois` (migration V101) est désormais utilisé dans Claude Enterprise ;
- il est éditable dans le dialogue Groupe ;
- il est conservé lors de la duplication d’un scénario ;
- fallback sur la durée du scénario puis 12 mois.

## Organisation
- libellé corrigé : plafond global (non mensuel).

Aucune nouvelle migration n’est nécessaire si la migration V101 a déjà été appliquée.
