# FinOps multi-fournisseurs — V17

## Nouveautés

### Création de domaines

Dans l'écran Owner **Domaines** :
- bouton `+ Nouveau domaine` ;
- saisie du nom et du responsable ;
- activation/désactivation ;
- sauvegarde globale avec `Enregistrer les modifications` ;
- contrôle des noms vides ;
- contrôle des doublons de noms ;
- suppression ligne par ligne conservée.

La création utilise `AddRecord` sur la table Grist `Domaines`.

### Dashboard : filtre multi-domaines

Le filtre Domaine devient multi-sélection :
- un ou plusieurs domaines ;
- `Tous` pour sélectionner tous les domaines visibles ;
- `Aucun` revient au comportement global `Tous les domaines` ;
- le filtre Fournisseur reste combinable avec la sélection de domaines ;
- tous les KPI et graphiques du Dashboard sont recalculés sur la sélection.

Pour un utilisateur autorisé, seuls ses domaines accessibles sont proposés.

## Déploiement

Aucune migration de schéma n'est nécessaire pour V17.
Déployer simplement `index.html`, `app.js` et `styles.css`.
Le cache-busting passe à `?v=17`.
