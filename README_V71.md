# FinOps V71 — libellés paramétrables dans les rapports HTML

Correction de fond : les rapports HTML de Synthèse utilisaient encore plusieurs
libellés écrits directement dans le code.

V71 fait passer les textes du rapport par `Configuration_Libelles_UI`, notamment :
- Synthèse FinOps IA
- scénario(s) sélectionné(s)
- Édité le
- Scénario
- Licences
- Fixe / Variable
- Budget USD / EUR
- Économie annuelle
- Détails des scénarios
- Rapport HTML autonome
- Imprimer / PDF
- Enregistrer le fichier HTML
- Détail par domaine
- colonnes du détail financier
- Lecture du coût fixe
- À confirmer
- Sous-total
- Total scénario
- Vue budgétaire par domaine
- Vue budgétaire par offre
- Éditeur de l’outil

Les nouveaux libellés sont ajoutés au catalogue permanent de l'écran `compare`,
donc ils sont visibles dans Admin > Paramétrage des libellés même sans ouvrir le rapport.

Aucune migration Grist ni réconciliation ACL n'est nécessaire.
