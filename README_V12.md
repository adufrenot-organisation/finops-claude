# FinOps multi-fournisseurs — V12

Les utilisateurs autorisés peuvent maintenant être rattachés à plusieurs domaines.

- `Droits_Utilisateurs.Domaines_Autorises` devient la référence canonique (`RefList:Domaines`).
- L'ancien champ `Domaine` est conservé pour compatibilité et contient le premier domaine sélectionné.
- L'écran Owner `Droits utilisateurs` permet de cocher plusieurs domaines.
- Dashboard, Simulation, ROI et Comparaison utilisent l'ensemble du périmètre autorisé.
- Les Scénarios restent modifiables par les utilisateurs autorisés.
- Toutes les autres données restent en lecture seule pour eux.
- La configuration globale du menu reste Owner uniquement.

Déploiement :
1. sauvegarder le document Grist ;
2. lancer `migrate_multi_domaines_v12.py` ;
3. appliquer les ACL de `ACL_MULTI_DOMAINES_V12.md` ;
4. déployer `app.js` et `styles.css` V12.
