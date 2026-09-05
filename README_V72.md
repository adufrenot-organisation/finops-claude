# FinOps V72 — Pré-simulation : budgets par offre et par équipe

La synthèse de pré-simulation affiche désormais :
- par offre : nombre d’équipes, nombre de licences, prix unitaire retenu et budget prévisionnel ;
- par équipe et offre : licences, prix unitaire et budget de la combinaison ;
- par équipe : budget global toutes offres confondues et nombre total de licences.

## Règle de prix
Priorité : tarif négocié de l’offre → tarif de référence → catalogue. La périodicité de l’offre détermine mensuel/annuel. La durée vient du scénario de référence (`Nb_Mois`), sinon 12 mois. Le taux `Taux_USD_EUR` du scénario est utilisé pour afficher l’équivalent EUR lorsqu’il existe.

Un tarif absent est signalé « À confirmer » et n’est pas inventé.
