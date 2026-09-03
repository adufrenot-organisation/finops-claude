# FinOps V47 — menu compact et accordéon

Cette version est un patch à appliquer après V46.

## Changements

- Sidebar légèrement réduite afin de laisser davantage de largeur au contenu central.
- Police, espacements et hauteur des items de navigation légèrement réduits.
- Rubriques User/Admin en mode accordéon : ouvrir Admin referme User, et ouvrir User referme Admin.
- User reste ouverte par défaut et Admin fermée par défaut lorsqu’aucune préférence n’a encore été enregistrée.
- Lorsqu’un écran est ouvert par programmation/clic, sa rubrique est automatiquement ouverte et l’autre refermée.
- Une rubrique sans aucun item visible pour l’utilisateur reste absente, comme en V45/V46.
- Aucun changement de schéma Grist et aucune migration.

## Déploiement

Remplacer uniquement `app.js` et `index.html` dans le dépôt du widget. `styles.css` reste inchangé.

Le cache-bust de `index.html` passe à `?v=47`.
