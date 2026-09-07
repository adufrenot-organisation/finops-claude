# FinOps V108 — chaînage ROI Scénario → Simulation → ROI

Le calcul ROI est maintenant verrouillé sur le chemin fonctionnel :

**Scénario → Simulation → ROI**

## Règles
- les coûts licences du ROI proviennent exclusivement des lignes `Allocations`
  du scénario courant ;
- pour un domaine, seules les allocations de ce scénario + ce domaine sont prises ;
- pour une équipe/service, la ventilation n'utilise qu'une pré-simulation dont
  `Scenario_Reference` correspond exactement au scénario courant et dont le
  `Domaine` correspond au domaine concerné ;
- le fallback historique vers une pré-simulation récente du même domaine mais
  associée à un autre scénario n'est plus utilisé pour le ROI ;
- le coût annuel est annualisé à partir du budget de la période de simulation.

Les données RH restent saisies au niveau domaine/équipe, mais elles sont désormais
rapprochées sans ambiguïté de la simulation du scénario associé.

Aucune migration Grist ni réconciliation ACL n'est nécessaire.
