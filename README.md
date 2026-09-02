# FinOps IA — V5 multi-fournisseurs + ROI N-1

Cette version reprend la V4 et ajoute le calcul d'économies par rapport à une baseline N-1 de collaborateurs facturés au TJM.

## Si la V4 est déjà installée

1. Faire une copie de sauvegarde du document Grist.
2. Renseigner la clé API dans `migrate_roi_v5.py`.
3. Lancer `py migrate_roi_v5.py`.
4. Ajouter les ACL de `Baseline_N_1` décrites dans `SECURITE_GRIST.md`.
5. Remplacer les fichiers du widget GitHub Pages par `index.html`, `styles.css`, `app.js`.

## Si la V4 n'est pas installée

Exécuter d'abord `migrate_multifournisseurs.py`, puis `migrate_roi_v5.py`.

## Nouveau dans l'interface

- Menu `ROI / Économies`.
- Saisie par domaine : nombre de collaborateurs N-1, TJM, surcharge éventuelle du nombre de jours ouvrés.
- Baseline annuelle N-1.
- Budget licences de la période et budget annualisé.
- Économie période et économie annuelle.
- Taux d'économie.
- Jours externes équivalents et ETP externes équivalents.
- Comparaison de scénarios enrichie avec les économies annuelles.

Le paramètre `Nb_Jours_Ouvres_Annuels` est ajouté aux scénarios. La migration l'initialise à 218 uniquement comme valeur de départ modifiable.


## V8
Le menu latéral est réordonnable par glisser-déposer et son ordre peut être enregistré dans le navigateur.


## V9
Les libellés des items du menu latéral peuvent être renommés et sauvegardés localement depuis le bouton **Renommer les menus**.


## V10
La configuration globale du menu (ordre, libellés, activation) est désormais stockée dans Grist et administrée depuis un écran réservé à l'Owner.


## V12
Support des utilisateurs multi-domaines via `Domaines_Autorises` (`RefList:Domaines`).


## V13
L'Owner peut maintenant choisir par onglet entre `Utilisateurs autorisés` et `Owner uniquement` depuis l'écran Configuration du menu.


## V15
Filtres Dashboard par domaine et fournisseur, combinables et sans modification de données Grist.


## V16
Ajout d'un gestionnaire ACL/Sécurité Owner avec audit, sauvegarde JSON et réconciliation des ACL FinOps via `grist.docApi.applyUserActions()`.


## V17
Création de domaines depuis l'interface Owner et filtre Dashboard multi-domaines.


## V18
CRUD complet sur Droits utilisateurs : création, modification, suppression et multi-domaines.


## V19
Synchronisation immédiate des noms de scénarios dans le filtre global après enregistrement.


## V20
Séparation Offre de service en lecture et Paramétrage offre de service en CRUD Owner, indépendants du scénario.


## V21
Le paramétrage de l'offre de service est strictement adossé aux colonnes persistées de la table Offres ; un script de réconciliation ajoute les champs manquants.


## V22
Même dictionnaire de colonnes Offres pour lecture/admin et visibilité persistée par vue.
