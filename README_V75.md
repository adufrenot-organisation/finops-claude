# V75 — Correction Synthèse / pré-simulation par équipe

## Répartition budgétaire par équipe

La V74 cherchait la répartition au mauvais endroit (Dashboard) et exigeait une correspondance stricte avec le scénario.

La V75 place la répartition là où elle est attendue :
**Synthèse > carte scénario > Voir le détail > Détail par domaine**.

Pour chaque domaine :
1. FinOps cherche une pré-simulation enregistrée avec équipes et ressources.
2. Il privilégie une pré-simulation liée au scénario détaillé.
3. S'il n'en existe pas, il utilise la plus récente pré-simulation accessible du domaine ayant des équipes et des ressources.
4. Pour chaque offre du scénario, le budget complet `Budget_Total_USD` est réparti entre les équipes au prorata des licences nominatives de cette offre dans la pré-simulation.
5. La part non couverte reste explicitement indiquée comme non répartie.

## Filtre scénario de la Synthèse

Le sélecteur global `Scénario` du bandeau est masqué sur l'écran Synthèse/Comparaison, car cet écran possède déjà sa propre sélection de scénarios à comparer.
Le bouton Actualiser reste disponible.
