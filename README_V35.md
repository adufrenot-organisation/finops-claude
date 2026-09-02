# FinOps V35 — suppression sécurisée des scénarios

Dans l'écran **Scénarios**, chaque scénario existant dispose maintenant d'une action.

## Suppression autorisée

Le bouton `Supprimer` est disponible uniquement si le scénario ne possède aucune référence dans :
- `Allocations` ;
- `Pre_Simulations.Scenario_Reference` ;
- anciennes lignes `Enterprise` ;
- anciennes lignes `Forfaits_Individuels` ;
- `Baseline_N_1` ;
- `Baseline_N_1_Details`.

Cette vérification évite de supprimer un scénario encore utilisé par une simulation,
une pré-simulation nominative ou des données ROI.

## Scénario utilisé

Le bouton devient `🔒 Utilisé` et son info-bulle indique les rattachements trouvés.

## Droits

Les profils ayant le droit de contribuer aux menus utilisateurs peuvent supprimer
un scénario éligible. Les rôles en lecture seule voient l'état mais ne peuvent pas agir.

La règle ACL `Scenarios` passe de `+CRU` à `+CRUD` pour les rôles contributeurs.

## Déploiement

Aucune migration de table n'est nécessaire.

Après déploiement V35 :
1. Owner > `ACL / Sécurité` ;
2. exporter une sauvegarde ACL ;
3. lancer la réconciliation V35 pour ajouter le droit `D` sur `Scenarios`.
