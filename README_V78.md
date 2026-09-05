# V78 — Synthèse : coût équivalent annuel et économies N-1 par équipe

Dans `Synthèse > Voir le détail > Détail par domaine`, la ventilation issue de la pré-simulation est enrichie avec une seconde table annuelle par équipe.

Pour chaque équipe :
- Nombre total de licences
- Coût équivalent annuel en EUR
- Référence N-1 annuelle en EUR
- Économie annuelle en EUR
- Taux d'économie

## Calcul du coût équivalent annuel
Le budget réparti de l'équipe sur la durée du scénario est converti en EUR puis annualisé :

`Coût équivalent annuel = coût équipe période EUR × 12 / Nb_Mois du scénario`

## Comparaison N-1
La baseline N-1 existe au niveau du domaine, pas au niveau équipe. Pour obtenir une référence équipe cohérente, la V78 ventile la baseline annuelle du domaine entre les équipes au prorata du nombre de licences/ressources nominatives de la pré-simulation :

`Référence N-1 équipe = Baseline N-1 domaine × licences équipe / licences totales des équipes`

Puis :

`Économie annuelle équipe = Référence N-1 équipe - Coût équivalent annuel équipe`

Le total domaine reste cohérent avec les indicateurs ROI déjà calculés par FinOps.
