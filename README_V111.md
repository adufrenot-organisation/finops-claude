# FinOps V111 — ROI par service dans le détail de synthèse

Dans le détail d'un scénario, pour chaque domaine qui possède des services
dans la pré-simulation du même scénario :

- le ROI consolidé du domaine reste affiché ;
- un bloc **ROI par service du domaine** est ajouté juste dessous ;
- chaque service affiche :
  - RH N-1
  - RH N
  - Économie RH
  - Coût annuel licences
  - Gain net annuel
  - ROI / gain %

Le coût licences de chaque service respecte le chaînage V108 :
**Scénario → Simulation → ROI**.

Le même composant est utilisé dans l'ouverture HTML du scénario : l'écran
et l'HTML présentent donc la même disposition.

Si le domaine ne possède aucun service, aucun bloc supplémentaire n'est affiché.

Aucune migration Grist ni réconciliation ACL n'est nécessaire.
