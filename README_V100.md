# FinOps V100 — ventilation Fixe / Variable par équipe + parité HTML

Version construite directement à partir du ZIP `finops-claude-main(3).zip` fourni.

## Synthèse scénario — répartition par équipe et par offre

La ventilation budgétaire affiche maintenant, pour chaque couple équipe / offre :
- licences ;
- **Fixe** avec équivalent EUR ;
- **Variable** avec équivalent EUR ;
- budget total USD ;
- budget total EUR ;
- part du domaine.

Le total réparti reprend également Fixe et Variable.

Les cartes récapitulatives par équipe affichent désormais :
- Fixe ;
- Variable ;
- Total ;
avec les équivalents EUR.

Le fixe est ventilé à partir de `Cout_Abonnement`. Le variable est ventilé à partir de `Cout_Overage`, au prorata des ressources nominatives de l'offre dans chaque équipe, comme le budget total.

## Rapport HTML

Les styles de la ventilation par équipe sont embarqués dans le rapport HTML autonome :
- même grille de cartes par équipe ;
- mêmes séparations Fixe / Variable / Total ;
- même tableau de coût équivalent annuel ;
- mêmes dispositions principales que la vue écran.

Les nouveaux libellés sont également raccordés au paramétrage des libellés.

Aucune migration Grist ni réconciliation ACL n'est nécessaire.
