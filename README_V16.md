# FinOps multi-fournisseurs — V16

## Gestionnaire ACL Owner

V16 ajoute un écran **ACL / Sécurité** visible uniquement par l'Owner.

Fonctions :
- audit des métadonnées `_grist_ACLResources` et `_grist_ACLRules` ;
- export JSON de sauvegarde avant modification ;
- réconciliation des règles FinOps ;
- conservation des règles non marquées `FINOPS_V16` ;
- création de l'attribut utilisateur `Droits` si absent ;
- prise en charge de `Domaines_Autorises` (`RefList:Domaines`) ;
- `Scenarios` en `RU` pour les utilisateurs autorisés ;
- autres tables métier en lecture seule ;
- `Configuration_Menu` en lecture globale pour les utilisateurs autorisés ;
- tables par domaine filtrées sur l'ensemble des domaines autorisés ;
- `Droits_Utilisateurs` lisible uniquement sur la propre ligne de l'utilisateur ;
- Owner en droits complets.

## Important

Après vérification de la documentation/code Grist, il n'existe pas aujourd'hui de point REST public dédié
à l'import/export des Access Rules. Les règles sont stockées dans les tables de métadonnées internes
`_grist_ACLResources` et `_grist_ACLRules`.

V16 applique donc les changements depuis le widget Owner avec
`grist.docApi.applyUserActions()`. Cette API est publique, mais la manipulation directe des tables ACL
internes reste une opération avancée : toujours exporter la sauvegarde JSON avant application.

Une modification d'une table utilisée comme attribut utilisateur peut provoquer un rechargement
immédiat du document Grist ; ce comportement est connu côté Grist.

## Déploiement

1. Sauvegarder/copier le document Grist.
2. Déployer les fichiers V16.
3. Ouvrir **ACL / Sécurité** en Owner.
4. Cliquer **Auditer les ACL**.
5. Cliquer **Exporter la sauvegarde JSON**.
6. Cliquer **Appliquer / réconcilier FinOps**.
7. Après éventuel rechargement, relancer l'audit.
8. Tester avec un compte utilisateur autorisé multi-domaines.

Le script `audit_acl_finops_v16.py` permet en plus de faire un audit externe en lecture seule à partir
du téléchargement du document.
