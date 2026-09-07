# FinOps V110 — prise en compte des services dans le ROI

Correction de l'écran ROI :

- les domaines restent limités aux domaines présents dans la Simulation du scénario ;
- lorsqu'une pré-simulation du même scénario + domaine contient un champ `Service`
  sur ses équipes, le libellé du périmètre ROI affiche désormais le **service**
  en priorité ;
- si aucun service n'est renseigné, le nom de l'équipe est utilisé ;
- si aucune équipe n'existe, le ROI reste au niveau du domaine ;
- la règle de complétude du ROI global utilise les mêmes libellés.

Le stockage RH reste attaché à l'équipe technique (`Equipe`) pour conserver la
compatibilité des données existantes ; seul le niveau fonctionnel affiché devient
le service lorsqu'il est renseigné.

Aucune migration Grist ni réconciliation ACL n'est nécessaire.
