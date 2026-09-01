# FinOps V11 — matrice de droits

| Zone / table | Owner | Utilisateur autorisé |
|---|---|---|
| Scenarios | CRUDS | RU |
| Configuration_Menu | CRUDS | R |
| Allocations | CRUDS | R (périmètre domaine) |
| Baseline_N_1 | CRUDS | R (périmètre domaine) |
| Fournisseurs | CRUDS | R |
| Offres | CRUDS | R |
| Domaines | CRUDS | R sur son domaine |
| Droits_Utilisateurs | CRUDS | R sur sa propre ligne si souhaité |
| Tables historiques Claude | CRUDS | R selon périmètre |

## Point important

Les utilisateurs autorisés peuvent modifier les champs d'un scénario existant.
Ils ne peuvent pas créer ni supprimer de scénario si les ACL leur donnent uniquement `RU`.

L'Owner conserve toutes les fonctions d'administration, y compris la configuration globale du menu.
