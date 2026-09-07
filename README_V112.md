# FinOps V112 — ROI par équipe visible dans le détail de Synthèse

La V111 filtrant uniquement les équipes dont le champ `Service` était renseigné,
le bloc pouvait ne jamais apparaître.

V112 corrige la règle :

- dans **Synthèse > détail du scénario > domaine**, si le domaine possède des équipes
  dans la pré-simulation liée au même scénario, un bloc **ROI par équipe du domaine**
  est affiché ;
- le bloc utilise le nom de l'équipe, sans dépendre du champ `Service` ;
- chaque équipe affiche RH N-1, RH N, économie RH, coût annuel licences,
  gain net annuel et ROI / gain % ;
- le même bloc est rendu dans l'HTML du scénario.

Aucune migration Grist ni réconciliation ACL n'est nécessaire.
