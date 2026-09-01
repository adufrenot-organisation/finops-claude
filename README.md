# FinOps Claude — Widget Grist V3

Interface unique avec 3 profils :
- Owner/Admin : dashboard, simulation, scénarios, tarifs, domaines, droits utilisateurs.
- Domain User : dashboard + simulation limités au domaine visible par les ACL Grist.
- Denied : page « Accès non autorisé ».

## Déploiement GitHub Pages
1. Mettre `index.html`, `styles.css`, `app.js` à la racine du dépôt.
2. GitHub > Settings > Pages > Deploy from a branch > `main` > `/root`.
3. Utiliser l'URL GitHub Pages comme URL du widget personnalisé Grist.
4. Donner au widget l'accès complet au document.

## Sécurité
Le front masque les écrans selon le rôle, mais la sécurité réelle doit être faite dans les Access Rules Grist.
Tables attendues : Domaines, Scenarios, Tarifs, Enterprise, Forfaits_Individuels, Droits_Utilisateurs.
