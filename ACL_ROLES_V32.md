# ACL V32 — rôles applicatifs

La table `Droits_Utilisateurs` devient la source d'autorisation applicative.

Rôles :
- `LECTEUR` : menus utilisateurs, lecture seule.
- `CONTRIBUTEUR` : menus utilisateurs, modification.
- `OBSERVATEUR` : tous les menus, lecture seule.
- `CONTRIBUTEUR_AVANCE` : menus utilisateurs modifiables, menus avancés en lecture seule.
- `ADMINISTRATEUR` : tous les menus, modification.
- Owner Grist : contrôle complet et hors ACL applicatives.

Un compte actif sans ligne correspondante dans `Droits_Utilisateurs` obtient `none` sur les ressources FinOps.

Après migration des rôles, l'Owner doit ouvrir `ACL / Sécurité`, exporter une sauvegarde puis exécuter la réconciliation V32.
