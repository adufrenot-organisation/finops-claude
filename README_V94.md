# V94 — Pilotage FinOps de la consommation Claude Enterprise

La V94 complète le module Claude Enterprise de la V93 sans modifier la logique existante des plafonds utilisateurs.

## Principe fonctionnel

Deux notions restent strictement séparées :

- **plafonds** : plafond organisationnel mensuel, limite de groupe par utilisateur/mois et éventuelle dérogation individuelle ; ils représentent une exposition maximale autorisée et ne sont pas mutualisés entre utilisateurs ;
- **consommation réelle** : montants réellement consommés, qui diminuent l'enveloppe engagée de l'organisation.

## Deux modes de facturation

Chaque organisation Claude peut maintenant être configurée avec :

- `PO` : contrat / bon de commande. L'enveloppe engagée représente le montant budgétaire commandé ;
- `PREPAYE` : crédits prépayés. L'enveloppe engagée représente le solde initial de crédits acheté.

Ces modes sont volontairement distincts : l'application ne suppose pas que tous les contrats Enterprise sont prépayés.

## Nouvelles données Grist

Colonnes ajoutées à `Claude_Organisations` :

- `Mode_Facturation`
- `Enveloppe_Engagee`

Nouvelle table `Claude_Consommations` :

- `Scenario`
- `Organisation`
- `Groupe`
- `Ressource`
- `Periode` (`AAAA-MM`)
- `Montant`
- `Source`
- `Commentaire`

## Écran Claude Enterprise

Nouveautés :

- KPI Enveloppe engagée ;
- KPI Consommé réel ;
- KPI Reste budgétaire ;
- nouvel onglet **Consommation** ;
- saisie manuelle d'une consommation réelle par ressource et période ;
- journal des consommations ;
- agrégation du consommé par utilisateur ;
- calcul global `reste = enveloppe engagée - consommation réelle`.

La limite de groupe reste une limite **par utilisateur/mois**. Une ressource qui n'utilise pas son plafond ne transfère pas son reliquat à une autre ressource.

## Installation

1. Sauvegarder le document Grist.
2. Exécuter `migrate_claude_consumption_v94.py` avec `GRIST_BASE_URL`, `GRIST_DOC_ID` et `GRIST_API_KEY`.
3. Déployer le nouveau `app.js`.
4. Si vos ACL Grist sont gérées manuellement, donner à `Claude_Consommations` les mêmes droits fonctionnels que les autres tables Claude Enterprise.
5. Tester la création/modification d'une organisation, puis une saisie dans l'onglet Consommation.

## Limite actuelle

La V94 permet la saisie/importation du réel mais **n'appelle pas encore automatiquement l'API Anthropic**. La colonne `Source` est prévue pour distinguer ultérieurement les saisies manuelles, imports CSV, factures et synchronisations API.
