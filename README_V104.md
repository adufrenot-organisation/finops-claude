# FinOps V104 — correction de l’auteur lors de la duplication

Le blocage `Impossible d’identifier l’utilisateur connecté comme auteur`
provenait du cas Owner.

Dans l’architecture FinOps, le véritable Owner est identifié par
`FinOps_Owner_Sentinel` et n’a pas obligatoirement de ligne personnelle dans
`Droits_Utilisateurs`. La V103 exigeait pourtant un `Responsable_User`, ce qui
rendait la duplication impossible pour l’Owner.

## V104

- utilisateur standard : auteur = email de l’utilisateur connecté ;
- Owner : auteur = `Owner Grist`, identifié par le sentinel ACL ;
- aucune ligne `Droits_Utilisateurs` n’est exigée pour l’Owner ;
- la création et la duplication utilisent la même résolution d’identité ;
- la copie reste privée : aucun droit supplémentaire de la fiche source n’est copié.

Aucune migration Grist ni réconciliation ACL n’est nécessaire.
