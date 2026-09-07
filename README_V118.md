# FinOps Claude v118

Cockpit FinOps Claude Enterprise ajouté à la vue d'ensemble.

## Ajouts
- Burn rate global et par groupe.
- Atterrissage prévisionnel au rythme observé.
- Date estimée d'épuisement.
- Besoin prévisionnel / capacité potentiellement libérable.
- Recommandations de réallocation entre groupes.
- Santé du groupe : Sain / À surveiller / Critique.
- Infobulles explicatives au survol avec formule et, pour le burn rate global, les valeurs utilisées.
- Conservation du tableau d'écart cumulé mensuel introduit en v117.

## Calculs
- Burn rate groupe = consommation cumulée / budget révisé théorique cumulé à date.
- Atterrissage = moyenne mensuelle observée × durée d'engagement.
- Besoin = max(0, atterrissage - budget révisé).
- Marge = max(0, budget révisé - atterrissage).
- Date d'épuisement = budget révisé / moyenne mensuelle observée, reporté depuis le début de période.

Aucune migration Grist supplémentaire n'est requise par rapport à la v117.
