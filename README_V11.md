# FinOps multi-fournisseurs — V11

Évolution des droits :

- **Scénarios** est maintenant visible par tous les utilisateurs autorisés.
- Les utilisateurs autorisés peuvent **modifier les scénarios existants**.
- Toutes les autres zones métier sont **en lecture seule** pour eux.
- L'Owner conserve les droits complets.
- La configuration du menu reste réservée à l'Owner.
- L'ordre et les libellés du menu restent stockés dans Grist.

Le widget désactive les contrôles d'édition hors Scénarios pour les non-Owners.
Les Access Rules Grist doivent également être mises à jour : voir `ACL_DROITS_V11.md`.

Aucune nouvelle table n'est nécessaire par rapport à V10.
Si `Configuration_Menu` existe déjà, il suffit de mettre `Owner_Seulement=False`
sur la ligne `scenarios` (ou de le faire depuis l'écran Owner).
