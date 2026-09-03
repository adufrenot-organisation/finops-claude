# FinOps V46 — Claude Enterprise

## Nouveautés
- Nouveau menu **Claude Enterprise** dans la rubrique User.
- Scénarios Claude Enterprise persistants : créer, renommer, dupliquer, supprimer et recharger.
- La duplication copie organisations, groupes, ressources, limites et dérogations.
- CRUD organisations, groupes et ressources.
- Calcul de la limite effective : dérogation individuelle si active, sinon limite du groupe.
- Calcul de l'exposition théorique et de la marge par rapport aux plafonds d'organisation.
- Onglets Vue d'ensemble / Ressources / Organisations & groupes.
- URL de maquette configurable par Owner/Administrateur et bouton d'ouverture externe.
- Design intégré au widget FinOps existant et responsive.

## Installation
1. Sauvegarder/copier le document Grist.
2. Exécuter `migrate_claude_enterprise_v46.py` avec `GRIST_DOC_ID`, `GRIST_API_KEY` et éventuellement `GRIST_BASE_URL`.
3. Dans **ACL / Sécurité**, sauvegarder puis lancer la réconciliation : V46 ajoute les 5 tables Claude aux ressources ACL gérées.
4. Remplacer `app.js` et `index.html` dans le widget GitHub Pages.
5. Conserver le `styles.css` existant : V46 injecte uniquement les styles spécifiques Claude Enterprise depuis `app.js`.
6. Vérifier le cache-bust `?v=46`.

## Tables créées
`Claude_Scenarios`, `Claude_Organisations`, `Claude_Groupes`, `Claude_Ressources`, `Claude_Configuration`.

## Règle FinOps
La limite de groupe est une limite **par utilisateur**, pas une cagnotte partagée. Une dérogation individuelle remplace la limite héritée pour la ressource concernée. L'exposition affichée est donc théorique et ne représente pas une consommation réelle.
