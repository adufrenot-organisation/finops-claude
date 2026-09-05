# V85 — KPI ROI réutilisé dans la Synthèse

- Le ROI / gain % est présenté comme KPI principal sur l'écran ROI.
- Le Gain net annuel est également conservé comme KPI principal en valeur.
- Le détail de scénario et le détail par domaine utilisent désormais les calculs RH N-1 / RH N de `ROI_RH_Paliers`.
- Les anciens indicateurs `Coûts supprimés`, `Nouveau coût annuel` et l'ancienne baseline ne sont plus utilisés dans le bloc ROI du détail de scénario.
- Formule : Gain net annuel = RH N-1 - (RH N + coût annuel licences).
- ROI / gain % = Gain net annuel / RH N-1.
