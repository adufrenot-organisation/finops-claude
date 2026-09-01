# FinOps multi-fournisseurs — V18

## CRUD complet sur les droits utilisateurs

L'écran Owner **Droits utilisateurs** dispose désormais du même niveau de gestion que l'écran Domaines :

- `+ Nouvel utilisateur`
- création d'une nouvelle ligne de droits
- modification de l'email
- sélection multi-domaines
- choix du rôle `Domaine` / `Admin`
- activation/désactivation
- commentaire
- sauvegarde globale avec `Enregistrer les modifications`
- suppression ligne par ligne
- annulation d'une nouvelle ligne non encore enregistrée
- contrôle des emails invalides
- contrôle des doublons d'email

La colonne `Domaines_Autorises` reste la référence canonique multi-domaines.
La colonne historique `Domaine` est maintenue avec le premier domaine sélectionné pour compatibilité.

Aucune migration de schéma supplémentaire n'est nécessaire si V12+ est déjà appliquée.
