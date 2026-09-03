# FinOps V50 — identité Grist fiable

## Pourquoi cette version
V49 essayait de détecter « Voir comme » via `aclAsUser_` dans l'URL/referrer du widget. Le referrer d'un iframe peut rester périmé après le retour au compte Owner : l'Owner pouvait donc rester bloqué avec le rôle du dernier utilisateur simulé.

V50 supprime totalement cette dépendance à l'URL.

## Nouvelle méthode
Une table technique `FinOps_Identite_Session` contient deux **trigger formulas Grist** :
- `Email = user.Email`
- `Access = user.Access`

Au chargement, le widget crée une ligne temporaire avec un identifiant aléatoire. Grist calcule côté serveur l'utilisateur effectif de l'action. Le widget relit cette ligne, mémorise l'identité puis la supprime.

Conséquences :
- Owner réel → `Owner Grist`, sans dépendre des lignes visibles dans `Droits_Utilisateurs` ;
- Lecteur/Contributeur/etc. → rôle applicatif de sa ligne `Droits_Utilisateurs` ;
- « Voir comme » → l'identité appliquée par Grist à l'action est utilisée ;
- plusieurs lignes visibles dans `Droits_Utilisateurs` ne donnent **jamais** automatiquement le rôle Owner.

Cette dernière règle corrige aussi un risque : `OBSERVATEUR` et `CONTRIBUTEUR_AVANCE` peuvent légitimement voir plusieurs lignes de droits et ne doivent jamais être promus Owner par heuristique.

## Installation — ordre important
1. Faire une copie/sauvegarde du document Grist.
2. Exécuter `migrate_identity_v50.py` avec `GRIST_DOC_ID`, `GRIST_API_KEY` et éventuellement `GRIST_BASE_URL`.
3. **Toujours en Owner**, ouvrir l'ancienne version du widget si nécessaire puis `ACL / Sécurité` > **Appliquer / réconcilier FinOps** afin d'ajouter les ACL de `FinOps_Identite_Session`.
4. Déployer `app.js` et `index.html` V50.
5. Forcer le rafraîchissement/cache. Le cache-bust est `?v=50`.

> Si V49 te bloque déjà en Lecteur, exécute d'abord la migration puis déploie V50. L'Owner du document garde les droits Grist natifs sur la nouvelle table ; V50 pourra donc le reconnaître avant même que les ACL FinOps soient réconciliées. Réconcilie ensuite les ACL pour les autres rôles.

## Tests indispensables
- connexion Owner normale → `Owner Grist` et menus Admin disponibles ;
- « Voir comme » un LECTEUR → `Lecteur`, uniquement les menus User autorisés et lecture seule ;
- retour Owner → retour immédiat à `Owner Grist` ;
- OBSERVATEUR / CONTRIBUTEUR_AVANCE → jamais promus Owner même s'ils peuvent lire plusieurs lignes de `Droits_Utilisateurs` ;
- utilisateur absent/inactif de `Droits_Utilisateurs` → accès refusé.

## Fichiers
- `app.js`
- `index.html`
- `migrate_identity_v50.py`
- `README_V50.md`

Aucun `styles.css` modifié.
