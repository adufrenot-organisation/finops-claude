# FinOps V113 — ROI par équipe dans la Synthèse

Correctif ciblé après vérification de l'HTML V112.

Le bloc ROI par équipe utilise maintenant directement `domainTeamBudgetBreakdown`,
c'est-à-dire exactement la même source que le tableau déjà visible
« Répartition budgétaire par équipe et par offre ».

Conséquence : si la synthèse affiche des équipes (par exemple Services aux patients
et Innovation & IA), le bloc ROI par équipe est généré juste après le ROI annuel
du domaine, à l'écran et dans l'HTML.

Le coût annuel licences par équipe est repris de cette même ventilation.
Les données RH N-1/N restent celles de l'équipe.

Aucune migration Grist ni réconciliation ACL.
