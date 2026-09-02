# ACL Scenarios V26

Pour que `+ Nouveau` fonctionne pour un utilisateur autorisé :

- Owner : `all`
- `user.Droits is not None and user.Droits.Actif` : `+CRU`
- défaut : `none`

`C` = création, `R` = lecture, `U` = modification.
Ne pas ajouter `D` si la suppression doit rester réservée à l'Owner.
