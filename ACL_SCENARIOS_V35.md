# ACL Scenarios V35

Pour `Scenarios` :
- Owner Grist : `all`
- Contributeur / Contributeur avancé / Administrateur : `+CRUD`
- Lecteur / Observateur : `+R`
- défaut : `none`

La sécurité métier supplémentaire est gérée dans le widget :
un scénario référencé par une simulation, une pré-simulation ou des données ROI
n'affiche pas d'action de suppression utilisable.

Toujours sauvegarder les ACL avant réconciliation.
