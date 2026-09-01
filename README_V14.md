# V14 — correctif de déploiement/cache

La V13 contient bien un sélecteur modifiable dans la colonne **Accès** de l'écran
**Configuration du menu**. Si les anciens libellés statiques apparaissent encore,
le navigateur ou GitHub Pages sert probablement une ancienne version de `app.js`.

V14 ajoute un cache-busting explicite :
- `app.js?v=14`
- `styles.css?v=14`

L'écran affiche également un badge `V14` à côté de "Configuration du menu".
Dans la colonne Accès, chaque ligne doit montrer une liste déroulante :
- Utilisateurs autorisés
- Owner uniquement
