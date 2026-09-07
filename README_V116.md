# FinOps V116 — correctif visuel des cartes équipe

La V115 contenait bien la nouvelle structure HTML, mais les styles écran de cette
structure n'étaient pas injectés dans le stylesheet dynamique utilisé par la
Synthèse. Le navigateur affichait donc pratiquement une mise en page verticale.

V116 injecte explicitement les styles dans `ensureSynthesisCurrencyStylesV64`.

Résultat attendu :
- Fixe / Variable / Total sur une seule ligne de 3 mini-KPI ;
- ROI sur une grille compacte de 6 KPI (3 × 2) ;
- ROI nommé simplement `ROI` ;
- valeurs positives en vert discret, négatives en rouge discret ;
- deux cartes équipes côte à côte lorsque la largeur le permet ;
- même structure dans l'HTML.

Aucune migration Grist ni réconciliation ACL n'est nécessaire.
