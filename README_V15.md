# FinOps multi-fournisseurs — V15

Ajout de filtres sur le **Dashboard** :

- filtre `Domaine`
- filtre `Fournisseur`
- les deux filtres peuvent être combinés
- bouton `Réinitialiser`
- les KPI, le budget par fournisseur, le budget par domaine, la vue par offre
  et la ventilation par domaine sont recalculés immédiatement
- le filtre Domaine ne propose que les domaines accessibles à l'utilisateur
- les filtres sont utilisables aussi par les utilisateurs autorisés en lecture seule
  (ils ne modifient aucune donnée Grist)

Le scénario reste piloté par le sélecteur global existant.

V15 ajoute aussi un cache-busting `?v=15` sur `app.js` et `styles.css`.
