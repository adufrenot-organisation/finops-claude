# FinOps V109 — périmètre ROI limité à la simulation du scénario

L'écran ROI n'affiche désormais que les domaines réellement présents dans
la **Simulation du scénario sélectionné**.

Règle :
`Domaines ROI = domaines distincts des lignes Allocations du scénario courant`.

Les domaines simplement autorisés à l'utilisateur mais absents de la simulation
ne sont plus affichés dans l'écran ROI.

Si le scénario ne possède aucune allocation, l'écran affiche un état vide
invitant à créer d'abord une allocation dans Simulation.

Cette règle est cohérente avec V108 :
**Scénario → Simulation → ROI**.

Aucune migration Grist ni réconciliation ACL n'est nécessaire.
