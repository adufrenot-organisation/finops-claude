# FinOps V101 — estimation mensuelle Claude Enterprise

Dans **Claude Enterprise > Pilotage budgétaire consolidé**, le KPI
`Plafond global bloquant` est remplacé par :

**Estimation de la conso (par mois)**

Formule :
`Conso mensuelle = somme, pour chaque groupe, de (Affectation initiale / durée d'engagement)`.

## Durée d'engagement
Un champ `Durée d'engagement (mois)` est ajouté aux groupes Claude Enterprise.
- valeur par défaut pour les groupes existants : 12 mois ;
- minimum : 1 mois ;
- le champ est conservé lors de la duplication d'un scénario.

La structure affiche aussi l'estimation mensuelle issue de l'enveloppe de chaque groupe.

## Migration
Exécuter `migrate_claude_engagement_v101.py` avant de déployer le nouveau `app.js`.

Aucune nouvelle règle ACL n'est nécessaire.
