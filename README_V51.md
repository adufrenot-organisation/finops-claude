# FinOps V51 — identité fiable Owner / Voir comme

V51 remplace le mécanisme V50 basé sur `FinOps_Identite_Session`, qui ne fonctionne pas correctement dans l'instance Grist actuelle.

## Principe V51

L'identité n'est plus déduite de l'URL, du referrer, d'une trigger formula ou du nombre de lignes visibles dans `Droits_Utilisateurs`.

Deux petites tables techniques statiques sont utilisées :

- `FinOps_Owner_Sentinel` : contient une ligne `OWNER`. Les ACL rendent cette ligne visible uniquement au véritable Owner effectif. En mode « Voir comme », elle disparaît puisque les ACL de l'utilisateur simulé s'appliquent.
- `FinOps_Identites` : miroir minimal des emails autorisés. Les ACL ne rendent visible à un non-Owner que sa propre ligne (`rec.Email == user.Email`).

La résolution devient donc :

1. sentinel visible → `Owner Grist` ;
2. sinon une identité personnelle visible → recherche de cette adresse dans `Droits_Utilisateurs` et application exacte de `Role_App` ;
3. identité sans droit actif → accès refusé ;
4. aucun fallback ne peut promouvoir automatiquement un utilisateur en Owner.

## Migration obligatoire

Exécuter `migrate_identity_v51.py` avec les mêmes variables que les migrations précédentes :

- `GRIST_BASE_URL`
- `GRIST_DOC_ID`
- `GRIST_API_KEY`

Le script :

- crée `FinOps_Identites` et `FinOps_Owner_Sentinel` si nécessaire ;
- copie les emails actifs présents dans `Droits_Utilisateurs` ;
- crée le sentinel Owner ;
- pose immédiatement des ACL bootstrap restrictives sur ces deux tables avant le déploiement du widget.

`FinOps_Identite_Session` de V50 devient obsolète. Elle peut rester dans Grist ; V51 ne la lit plus et la réconciliation ACL la verrouille aux Owners.

## Ordre d'installation

1. Faire une copie / sauvegarde du document Grist.
2. Exécuter `migrate_identity_v51.py`.
3. Remplacer `app.js` et `index.html` par les fichiers V51.
4. Recharger le widget et vérifier que le compte Owner affiche `Owner Grist`.
5. Dans `ACL / Sécurité`, exporter la sauvegarde JSON puis `Appliquer / réconcilier FinOps`.
6. Tester obligatoirement la séquence : Owner → Voir comme Lecteur → retour Owner → Lecteur réel → utilisateur absent.

## Gestion future des utilisateurs

Quand un Administrateur ajoute une nouvelle ligne dans `Droits_Utilisateurs`, V51 tente aussi de créer l'entrée correspondante dans `FinOps_Identites`. Les anciennes identités techniques peuvent rester après une suppression : elles ne donnent aucun accès si aucune ligne active correspondante n'existe dans `Droits_Utilisateurs`.

## Fichiers V51

- `app.js`
- `index.html`
- `migrate_identity_v51.py`
- `README_V51.md`

Aucun changement de `styles.css`.
