# FinOps V59 — correction de l'ordre des règles ACL

## Erreur corrigée

Grist impose qu'une règle ACL par défaut (`aclFormula` vide) soit la dernière
règle de sa ressource.

L'erreur :

`ACLRule ... invalid because listed after default rule`

apparaissait lorsqu'une ressource FinOps possédait déjà une règle par défaut.
La réconciliation V58 ajoutait ensuite de nouvelles règles derrière celle-ci.

## Correction V59

Pour chaque ressource gérée par FinOps, la réconciliation :

1. conserve les règles conditionnelles non-FinOps existantes ;
2. supprime les anciennes règles FinOps ;
3. supprime la règle par défaut existante sur cette ressource ;
4. recrée les règles FinOps ;
5. recrée UNE règle `DEFAULT = none` en toute dernière position.

Aucune migration de table n'est nécessaire.

## Déploiement

1. Remplacer `app.js` et `index.html`.
2. Recharger FinOps.
3. Owner > ACL / Sécurité.
4. Exporter une sauvegarde JSON.
5. Cliquer **Appliquer / réconcilier FinOps**.
6. Relancer un audit ACL.

La V59 reprend les modifications de la V58, y compris le chat et les paramètres
application.
