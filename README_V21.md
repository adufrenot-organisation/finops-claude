# FinOps multi-fournisseurs — V21

## Modèle de données de l'offre de service

Le paramétrage de l'offre de service est désormais formalisé autour de la table Grist `Offres`.

Principe :
- aucun champ éditable de l'écran ne doit être uniquement présent dans le HTML/JavaScript ;
- chaque champ affiché dans l'écran de paramétrage correspond à une vraie colonne persistée de `Offres`;
- les colonnes utilisées par les calculs d'`Allocations` restent la source de vérité du calcul ;
- les champs complémentaires de présentation/procurement sont eux aussi stockés en table.

### Champs de calcul
- Fournisseur
- Periodicite_Prix
- Devise
- tarifs Catalogue / Référence / Négociés mensuels et annuels
- Enveloppe_Usage_Incluse_Mois_Licence
- Overage_Disponible
- Facturer_Engagement_Minimum
- Engagement_Defaut_Mois
- Mois_Factures_Defaut

### Champs complémentaires persistés
- Nom / Code / Famille
- Usage_Inclus_Description
- Compatible_Devis
- Compatible_PO
- Compatible_Facture
- Compatible_Virement
- Compatible_Prepaiement
- Statut_Tarif
- Source_Tarif
- Note_Procurement
- Actif

Le script `reconcile_offres_schema_v21.py` vérifie le schéma existant et ajoute uniquement les colonnes manquantes. Il ne supprime aucune donnée et ne recrée pas la table.

Le cache-busting passe à `?v=21`.
