# FinOps V28 — Pré-simulation nominative

## Objectif

Ajouter un espace de pré-simulation indépendant des scénarios financiers.

Une pré-simulation :
- appartient obligatoirement à un domaine ;
- peut référencer un scénario existant, mais cette référence est strictement informative ;
- ne crée ni ne modifie aucune ligne d'Allocations.

## Saisie nominative

Chaque ligne représente une ressource individuelle :
- Nom / identifiant ressource
- Profil
- Offre IA
- Commentaire
- Actif

L'offre est choisie directement dans la table `Offres`, tous fournisseurs confondus.

## Synthèse automatique

L'écran affiche un tableau :
- Domaine
- Fournisseur
- Offre
- Nombre de licences nominatives

Le nombre est calculé à partir des ressources actives de la fiche.

## Tables ajoutées

- `Pre_Simulations`
- `Pre_Simulation_Ressources`

## Déploiement

1. Sauvegarder le document Grist.
2. Exécuter `migrate_presimulation_v28.py`.
3. Déployer le widget V28.
4. Dans `ACL / Sécurité`, auditer puis réconcilier les ACL FinOps.
5. Vérifier qu'un utilisateur autorisé ne voit et ne modifie que les pré-simulations de ses domaines.

## ACL V28

- `Pre_Simulations` : CRUD sur les domaines autorisés.
- `Pre_Simulation_Ressources` : CRUD lorsque la fiche parente appartient à un domaine autorisé.
- Owner : contrôle complet.

Le rattachement `Scenario_Reference` reste purement documentaire.
