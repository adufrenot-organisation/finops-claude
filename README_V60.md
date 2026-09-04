# FinOps V60 — équipes dans la pré-simulation nominative

## Pré-simulation nominative
Une fiche reste liée à :
- un domaine obligatoire ;
- un scénario de référence facultatif.

La liaison au scénario reste **informative pour le budget**, mais sert maintenant
de navigation depuis l'écran Simulation.

### Équipes
Nouvelle table `Pre_Simulation_Equipes` :
- Pré-simulation
- Nom
- Plan/offre IA par défaut
- Ordre
- Actif
- Commentaire

Chaque ressource peut être affectée à une équipe.

### Plan effectif
Dans `Pre_Simulation_Ressources` :
- `Equipe` est ajoutée ;
- `Offre` devient le plan individuel facultatif.

Règle :
`Plan effectif = Offre individuelle si renseignée, sinon Offre_Defaut de l'équipe`.

Les données historiques restent compatibles : une ancienne ressource avec `Offre`
continue donc à utiliser cette offre.

### Synthèse
Deux synthèses sont affichées en bas :
1. **Synthèse par équipe** : équipe + fournisseur + plan effectif + nombre de ressources.
2. **Synthèse consolidée des licences** : fournisseur + offre + nombre total de licences.

## Lien depuis Simulation
Dans l'écran **Simulation**, sur la cellule Domaine de chaque allocation, l'icône
`👥` apparaît lorsqu'une pré-simulation existe pour :

`Scenario_Reference = scénario actif`
ET
`Domaine = domaine de la ligne`

Un clic ouvre directement la fiche correspondante dans Pré-simulation nominative.

V60 empêche également d'enregistrer deux pré-simulations avec le même couple
Scénario + Domaine.

## Installation
1. Backup Grist.
2. Exécuter `migrate_presimulation_equipes_v60.py`.
3. Déployer `app.js` et `index.html`.
4. Owner > ACL / Sécurité > sauvegarder les ACL.
5. Appliquer / réconcilier FinOps.
6. Tester création équipe → affectation ressources → scénario → icône 👥.

Responsive V55+ conservé.
