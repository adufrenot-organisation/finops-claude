# FinOps V106 — ROI global conditionné à la complétude RH

Le ROI global d'un scénario n'est plus calculé tant que tous les périmètres
participants ne sont pas complets.

## Périmètre participant
Un domaine participe dès qu'il possède au moins une allocation dans le scénario.

- si le domaine a une pré-simulation nominative avec équipes actives, chaque équipe
  devient un périmètre RH à compléter ;
- sinon, le domaine lui-même constitue le périmètre.

## Complétude
Un périmètre est complet si :
- RH N-1 contient au moins un palier avec `Nb_Ressources > 0` et `TJM_EUR > 0` ;
- RH N contient au moins un palier avec `Nb_Ressources > 0` et `TJM_EUR > 0`.

## Affichage
Tant que tout n'est pas complet :
- les calculs locaux par domaine/équipe restent visibles ;
- le ROI global est remplacé par `ROI global incomplet — X / Y périmètres renseignés`;
- la liste des domaines/services incomplets indique si RH N-1, RH N ou les deux manquent ;
- la même règle s'applique au détail du scénario et à son export HTML.

Dès que tous les périmètres sont complets, le ROI global consolidé s'affiche
automatiquement.

Aucune migration Grist ni réconciliation ACL n'est nécessaire.
