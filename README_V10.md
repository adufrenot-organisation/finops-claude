# FinOps multi-fournisseurs — V10

## Menu global administré dans Grist

V10 remplace la personnalisation locale V8/V9 de l'ordre et des libellés du menu par une configuration globale stockée dans `Configuration_Menu`.

- nouvel écran Owner : **Configuration du menu** ;
- réordonnancement des lignes à la souris ;
- renommage des libellés ;
- activation/désactivation globale d'un item ;
- un seul bouton **Enregistrer les modifications** ;
- les utilisateurs non-Owner lisent la configuration mais ne peuvent pas la modifier ;
- le menu rétracté/ouvert reste une préférence locale du navigateur ;
- aucune suppression ligne par ligne n'est proposée sur cette table : les clés techniques du menu doivent rester stables.

## Installation

1. Sauvegarder/copier le document Grist.
2. Configurer `GRIST_URL`, `DOC_ID`, `API_KEY` dans `migrate_menu_config_v10.py`.
3. Lancer `py migrate_menu_config_v10.py`.
4. Ajouter les ACL de `ACL_CONFIGURATION_MENU_V10.md`.
5. Déployer `app.js` et `styles.css` V10.

La migration ne modifie aucune table métier existante.
