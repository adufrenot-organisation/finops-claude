# FinOps V49 — correction identité / « Voir comme » Grist

## Objectif
La V48 avait supprimé l’élévation automatique en Owner mais imposait un écran de sélection d’identité lorsque plusieurs lignes de `Droits_Utilisateurs` étaient visibles. Cela rendait l’utilisation normale de l’Owner trop intrusive.

## V49
- suppression de l’écran « Identité FinOps à confirmer » dans le fonctionnement normal ;
- détection prioritaire du mode Grist **Voir comme** via le paramètre officiel `aclAsUser_` ;
- si `aclAsUser_` correspond à un utilisateur actif dans `Droits_Utilisateurs`, FinOps applique exactement son `Role_App` et ses domaines ;
- si l’utilisateur simulé n’existe pas ou est inactif dans `Droits_Utilisateurs`, accès FinOps refusé ;
- hors « Voir comme » :
  - une seule ligne visible => profil applicatif de cette ligne ;
  - plusieurs lignes visibles => fonctionnement Owner transparent comme avant ;
  - aucune ligne visible => accès refusé ;
- le bandeau de session ajoute `· VUE COMME` lorsqu’un profil Grist simulé est détecté.

## Pourquoi
Grist indique que la fonction « View As » utilise des paramètres d’ACL dédiés (`aclAsUser_` / `aclAsUserId_`). La V49 exploite ce signal explicite au lieu de demander à l’Owner de choisir manuellement une identité.

## Migration
Aucune migration Grist.

## Fichiers modifiés / nouveaux
- `app.js`
- `index.html`
- `README_V49.md`

## Test recommandé
1. Ouvrir FinOps normalement en Owner : ouverture directe, rôle `Owner Grist`.
2. Utiliser Grist « Voir comme » avec un utilisateur `LECTEUR` : bandeau `Lecteur · VUE COMME`, rubrique Admin masquée, écrans en lecture seule.
3. Revenir à « Voir comme vous-même » : retour immédiat au profil Owner.
4. Tester un `OBSERVATEUR` et un `CONTRIBUTEUR`.
