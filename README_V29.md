# FinOps V29 — Correction Scénarios ↔ Allocations

## Correction

La liste globale des scénarios n'avait plus de gestionnaire `onchange`.
Le changement de scénario dans l'interface ne recalculait donc plus le modèle
et l'écran Simulation pouvait continuer à afficher les allocations du scénario précédent.

V29 :
- rétablit le `onchange` du sélecteur de scénario ;
- recalcule `CURRENT` immédiatement ;
- rerend tous les écrans dépendants du scénario ;
- renforce `scopedAlloc()` pour filtrer explicitement sur `Allocations.Scenario` ;
- affiche dans Simulation le scénario actif et le nombre d'allocations liées.

Aucune migration Grist n'est nécessaire.
