# FinOps V114 — ROI dans les cartes d'équipe

Dans le détail de Synthèse, le ROI par équipe est désormais intégré directement
dans les cartes budgétaires déjà affichées sous la répartition par équipe.

Chaque carte conserve :
- licences
- fixe
- variable
- total

et ajoute :
- RH N-1
- RH N
- économie RH
- coût annuel licences
- gain net annuel
- ROI / gain %

Le bloc ROI par équipe séparé introduit en V113 est supprimé afin d'éviter la
redondance.

Le même rendu est utilisé dans l'ouverture HTML du scénario.

Aucune migration Grist ni réconciliation ACL n'est nécessaire.
