# FinOps V48 — correction stricte de la détection des droits

Patch à appliquer après V47.

## Correction de sécurité logique

- Suppression de l'heuristique qui classait automatiquement la session en `Owner Grist` dès que plusieurs emails actifs de `Droits_Utilisateurs` étaient visibles.
- Une seule identité visible : le rôle et les domaines de cette ligne sont appliqués normalement.
- Aucune identité visible : accès refusé.
- Plusieurs identités visibles : **deny-by-default**. FinOps affiche un écran de confirmation permettant de sélectionner explicitement l'identité à simuler pour cet onglet.
- Le profil simulé est stocké uniquement dans `sessionStorage` et le bandeau affiche `TEST` à côté du rôle.
- Aucun profil Owner n'est proposé automatiquement dans ce mode ambigu.

Cette situation est notamment utile pour les tests effectués depuis un compte privilégié/Owner lorsque Grist continue à exposer plusieurs lignes de droits au Custom Widget.

## Test recommandé

1. Ouvrir FinOps depuis le compte privilégié qui voyait auparavant tous les menus.
2. Si plusieurs identités sont visibles, sélectionner le compte ayant `Role_App = LECTEUR`.
3. Vérifier que le bandeau affiche `Lecteur · TEST`.
4. Vérifier que la rubrique Admin et les écrans avancés ne sont plus disponibles.
5. Vérifier que les écrans User sont en lecture seule.
6. Tester ensuite avec un vrai compte Lecteur : s'il ne voit que sa ligne ACL, aucune sélection ne doit être demandée et le bandeau doit afficher simplement `Lecteur`.

## Déploiement

Remplacer `app.js` et `index.html`. Aucune migration Grist n'est nécessaire.
Le cache-bust passe à `?v=48`.
