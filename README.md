# FinOps Claude — Widgets Grist

Deux pages statiques pour Grist :

- `index.html` — simulation & restitution
- `admin.html` — administration

## Tables attendues

Le code suppose les tables déjà créées : `Domaines`, `Scenarios`, `Tarifs`, `Enterprise`, `Forfaits_Individuels`.
Il utilise les colonnes créées dans le modèle FinOps Claude actuel.

Valeurs attendues dans `Tarifs.Offre` : `Enterprise`, `Pro`, `Max5x`, `Max20x`.

## Déployer sur GitHub Pages

1. Créez un dépôt GitHub, par exemple `finops-claude-grist`.
2. Copiez tous les fichiers de ce dossier à la racine du dépôt.
3. Dans GitHub : **Settings > Pages**.
4. Source : **Deploy from a branch** ; branche `main` ; dossier `/ (root)`.
5. GitHub publiera une URL du type :
   `https://VOTRE-COMPTE.github.io/finops-claude-grist/`

## Ajouter les deux widgets dans Grist

### Widget Restitution

URL :
`https://VOTRE-COMPTE.github.io/finops-claude-grist/index.html`

### Widget Administration

URL :
`https://VOTRE-COMPTE.github.io/finops-claude-grist/admin.html`

Pour les deux widgets, autorisez **Full document access / Accès complet au document**. Les pages lisent plusieurs tables ; elles peuvent aussi modifier les données.

## Fonctionnalités

### Restitution

- choix du scénario ;
- KPI Enterprise, usage, forfaits individuels, total USD et EUR ;
- vue globale ;
- budget par offre ;
- ventilation d'une offre par domaine ;
- matrice domaine × offre ;
- simulation éditable ;
- comparaison de deux scénarios.

### Administration

- édition des scénarios ;
- édition des tarifs ;
- édition et activation des domaines ;
- ajout d'un scénario ;
- ajout d'un domaine ;
- duplication d'un scénario avec ses allocations Enterprise et Pro/Max.

## Sécurité

Un widget avec accès complet au document peut lire et modifier le document Grist. Hébergez ce code uniquement sur un dépôt et un domaine que vous contrôlez.

## Architecture

Les calculs budgétaires de référence restent dans les formules Grist. Le JavaScript consolide les données pour l'affichage et écrit uniquement les hypothèses modifiables.
