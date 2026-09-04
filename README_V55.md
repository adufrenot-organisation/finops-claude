# FinOps IA — V55 Responsive complet

V55 est cumulative et reprend les évolutions V52, V53 et V54.

## Changements V55

- Nouvelle navigation mobile/tablette en tiroir latéral sous 900 px.
- Bouton menu flottant `☰` et fond d'écran cliquable pour fermer le tiroir.
- Fermeture automatique du menu après sélection d'un écran et avec la touche `Échap`.
- En-tête, session utilisateur et sélecteur de scénario adaptés aux petites largeurs.
- KPI : 2 colonnes sur tablette, 1 colonne sur mobile étroit.
- Grilles 2/3 colonnes repliées automatiquement sur une colonne.
- Tableaux conservés sous forme de tableaux avec défilement horizontal tactile, afin de ne pas perdre les colonnes métier.
- Barres d'actions, formulaires et boutons repliables sur plusieurs lignes.
- Claude Enterprise : KPI, onglets, formulaires et fenêtres modales adaptés au mobile.
- Écrans de connexion refusée et cartes adaptés aux petits écrans.
- La sidebar desktop reste inchangée au-dessus de 900 px.

## Seuils principaux

- > 900 px : interface desktop/laptop avec sidebar classique.
- <= 900 px : sidebar en tiroir mobile/tablette.
- <= 560 px : mise en page mobile compacte, KPI sur une colonne.

## Déploiement

Remplacer uniquement :

- `app.js`
- `index.html`

Aucune migration Grist et aucune modification du schéma ne sont nécessaires.

Le cache-busting passe à `v=55` dans `index.html`.
