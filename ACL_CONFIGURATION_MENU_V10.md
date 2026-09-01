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
