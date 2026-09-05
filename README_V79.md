# V79 — ROI Domaine / Service

## Principe
- Le **coût équivalent annuel** reste uniquement le coût d’achat des licences ramené sur 12 mois.
- **Nouveau coût annuel = coût N-1 − coûts supprimés + coût annuel licences**.
- **Économie annuelle = coûts supprimés − coût annuel licences**.
- **Taux d’économie = économie annuelle / coût N-1**.

## Niveau Service conditionnel
Le niveau Service apparaît uniquement lorsqu’une pré-simulation enregistrée du domaine contient au moins une équipe avec `Service` renseigné. Sinon, le ROI reste au niveau Domaine.

## Évolutions de schéma nécessaires
1. Ajouter la colonne texte `Service` dans `Pre_Simulation_Equipes`.
2. Ajouter la colonne numérique `Cout_Supprime_Annuel_EUR` dans `Baseline_N_1`.
3. Créer la table `ROI_Services` avec : `Scenario` (Ref Scenarios), `Domaine` (Ref Domaines), `Service` (Text), `Cout_N_1_Annuel_EUR` (Numeric), `Cout_Supprime_Annuel_EUR` (Numeric), `Actif` (Bool), `Commentaire` (Text).

Les CSV fournis servent de gabarit. Après import, configure les colonnes Scenario et Domaine comme références dans Grist.

## Infobulles
Des icônes ⓘ rappellent les définitions de coût N-1, coûts supprimés, coût équivalent annuel, nouveau coût annuel, économie annuelle et taux d’économie.
