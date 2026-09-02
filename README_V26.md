# V26 — création de scénarios

## Correction du bouton + Nouveau

Le bouton ne crée plus immédiatement une ligne Grist.

Il ajoute maintenant une **ligne brouillon** dans l'écran :
- elle est éditable avant écriture ;
- `Annuler` retire le brouillon ;
- `Enregistrer les modifications` envoie dans une même opération les mises à jour des scénarios existants et les créations des brouillons ;
- après écriture, la liste des scénarios et le sélecteur global sont automatiquement rechargés.

## Règle d'accès Scenarios

La configuration précédente donnait aux utilisateurs autorisés `+RU` sur `Scenarios`.
Cela permet de lire/modifier mais **pas de créer**.

La V26 attend désormais :
- Owner : `all`
- utilisateur autorisé actif : `+CRU`
- défaut : `none`

La suppression reste interdite aux utilisateurs autorisés.

Si l'ACL / Sécurité du widget est utilisé, le gestionnaire V26 applique `+CRU`.
Sinon, modifier manuellement la règle Scenarios de `+RU` vers `+CRU`.

Cache : `?v=26`.
