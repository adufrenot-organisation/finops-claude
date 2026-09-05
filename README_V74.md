# V74 — Synthèse : répartition budgétaire par équipe

Dans le Dashboard / écran de synthèse, la table **Ventilation par domaine** détecte maintenant les pré-simulations enregistrées correspondant au scénario actif et au domaine.

Si la pré-simulation la plus récente contient :
- des équipes dans `Pre_Simulation_Equipes`,
- des ressources actives dans `Pre_Simulation_Ressources`,

un bouton **Détail équipes** apparaît sur la ligne du domaine.

Le détail affiche :
- Équipe
- Licences pré-simulées
- Budget réparti USD
- Budget réparti EUR
- Part du budget du domaine

## Règle de répartition

Pour chaque offre du domaine, le **budget complet de l'allocation FinOps** (`Budget_Total_USD`, donc fixe + usage inclus + overage) est réparti entre les équipes **au prorata du nombre de licences nominatives de cette offre dans la pré-simulation**.

Cette règle permet d'intégrer la part variable dans la ventilation analytique par équipe, même si la pré-simulation elle-même n'affiche plus de prix en V73.

Un indicateur de couverture compare les licences nominatives de la pré-simulation aux licences du scénario. Tout budget non couvert reste explicitement signalé comme **non réparti**.
