# FinOps multi-fournisseurs — V20

## Séparation lecture / paramétrage de l'offre de service

L'offre de service est désormais explicitement indépendante des scénarios.

Deux onglets utilisent la même table Grist `Offres` :

- **Offre de service** : lecture seule, visible par défaut pour les utilisateurs autorisés ;
- **Paramétrage offre de service** : CRUD complet, Owner uniquement par défaut.

Les deux onglets peuvent être activés/désactivés, renommés, réordonnés et leur niveau d'accès peut être réglé depuis **Configuration du menu**.

## Paramétrage Owner

Le nouvel écran d'administration permet :
- d'ajouter une offre ;
- de modifier le fournisseur, le nom, le code, la famille, la périodicité et la devise ;
- de modifier les tarifs catalogue, référence et négociés ;
- de modifier l'usage inclus, la disponibilité d'overage et les paramètres d'engagement ;
- de modifier tous les indicateurs procurement ;
- de modifier le statut tarif, la source, la note procurement et l'état Actif ;
- de supprimer une offre.

Les contrôles empêchent l'enregistrement d'une ligne sans fournisseur, nom ou code, ainsi que les doublons de code.

## Scénario

Le sélecteur Scénario est masqué automatiquement dans les écrans indépendants du scénario :
`Offre de service`, `Paramétrage offre de service`, `Domaines`, `Droits utilisateurs`,
`Configuration du menu` et `ACL / Sécurité`.

## Migration Configuration_Menu

Comme `Configuration_Menu` existe déjà, le fallback V20 ne suffit pas à ajouter la nouvelle entrée en base.
Exécuter une fois :

`migrate_menu_offres_v20.py`

avec :
- `GRIST_DOC_ID`
- `GRIST_API_KEY`
- éventuellement `GRIST_BASE_URL`

Cette migration :
- rend `offers` accessible aux utilisateurs autorisés par défaut ;
- ajoute `offersadmin` en Owner uniquement.

Le cache-busting passe à `?v=20`.
