# ACL Grist — Configuration_Menu (V10)

La table `Configuration_Menu` doit être **lisible par les utilisateurs autorisés** afin que le widget puisse construire le menu, mais **modifiable uniquement par l'Owner**.

Dans les Access Rules Grist :

## Configuration_Menu

Ordre recommandé des règles :

1. Owner / propriétaire du document :
   - condition : `user.Access == "OWNER"`
   - permissions : `CRUDS`

2. Utilisateur applicatif autorisé :
   - condition : `user.Droits.Actif`
   - permissions : `R`

3. Défaut :
   - permissions : aucune

Ne donne pas `U`, `C`, `D` ni `S` aux utilisateurs de domaine.

## Interface

L'écran `Configuration du menu` n'est rendu que lorsque l'application détecte le profil Owner/Admin.

Important : le masquage dans le widget n'est pas une barrière de sécurité. La sécurité réelle reste assurée par les Access Rules Grist.


# V11 — droits fonctionnels des utilisateurs autorisés

Les utilisateurs applicatifs autorisés ont désormais le profil suivant :

- `Scenarios` : lecture + modification (`R` + `U`)
- toutes les autres tables métier : lecture seule (`R`)
- `Configuration_Menu` : lecture seule (`R`)
- l'Owner conserve les droits complets.

## Scenarios

Règles recommandées :

1. Owner :
   - condition : `user.Access == "OWNER"`
   - permissions : `CRUDS`

2. Utilisateur applicatif autorisé :
   - condition : `user.Droits.Actif`
   - permissions : `RU`

3. Défaut :
   - aucune permission

Si tu veux empêcher la création ou la suppression de scénarios par les utilisateurs autorisés, ne leur donne ni `C` ni `D`.

## Autres tables métier

Pour `Allocations`, `Baseline_N_1`, `Fournisseurs`, `Offres`, `Domaines`,
`Droits_Utilisateurs` et les tables historiques Claude :

- Owner : droits complets
- utilisateur autorisé : `R` uniquement, selon son périmètre lorsque la table est par domaine
- défaut : aucune permission

Pour les tables par domaine, conserve la condition de périmètre :
`user.Droits.Actif and rec.Domaine == user.Droits.Domaine`

Important : l'interface masque/désactive les contrôles d'édition hors Scénarios pour les non-Owners,
mais les Access Rules Grist restent la sécurité réelle.
