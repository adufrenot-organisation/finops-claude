# FinOps V33 — vues de colonnes

Corrections de la vue **Offre de service** / **Paramétrage offre de service**.

## Enregistrer la vue

Le bouton ne fonctionnait plus pour le rôle `ADMINISTRATEUR` après l'introduction
des nouveaux rôles V32 : la fonction de sauvegarde vérifiait encore uniquement
`ACCESS.role === OWNER`.

V33 autorise l'enregistrement pour :
- Owner Grist ;
- Administrateur.

Les autres rôles peuvent toujours masquer/afficher localement des colonnes sans
modifier la configuration partagée.

## Ordonnancement

Dans le sélecteur **Colonnes**, chaque colonne dispose maintenant de :
- case visible/masquée ;
- bouton `↑` ;
- bouton `↓`.

L'ordre est prévisualisé immédiatement dans la grille.

La sauvegarde enregistre à la fois :
- la visibilité ;
- l'ordre.

Deux ordres indépendants sont stockés :
- `Ordre_Lecture` pour Offre de service ;
- `Ordre_Admin` pour Paramétrage offre de service.

## Migration

Exécuter `migrate_offer_column_order_v33.py` une fois avant de déployer V33.

Les valeurs existantes de `Ordre` servent d'initialisation pour ne pas perdre
la disposition actuelle.
