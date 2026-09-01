# FinOps IA — Version de référence V5

Cette V5 reprend intégralement la V4 multi-fournisseurs et ajoute l'axe **ROI / économies par rapport à la situation N-1**.

## Héritage conservé

- Modèle Claude historique conservé et non écrasé.
- Claude Enterprise : **240 USD / siège / an** + usage selon les allocations existantes.
- Claude Pro : **20 USD / mois**.
- Claude Max 5x : **100 USD / mois**.
- Claude Max 20x : **200 USD / mois**.
- Fournisseurs et offres V4 : Claude, Mistral, Cursor.
- Tarifs négociés, engagement, mois facturés, usage inclus, overage et plafond.
- Projections 2026 / 2027 et ventilation par domaine.
- Comparaison de scénarios multi-fournisseurs.
- Droits Owner / domaine via les ACL Grist.

## Nouveau : baseline N-1 et économies

### Paramètre scénario

`Scenarios.Nb_Jours_Ouvres_Annuels`

Valeur initiale de migration : **218 jours**, entièrement modifiable. Le simulateur n'impose pas cette valeur : elle sert uniquement de valeur de départ.

### Table `Baseline_N_1`

Une ligne = `Scenario + Domaine` avec :

- `Nb_Collaborateurs_N_1`
- `TJM_EUR`
- `Jours_Ouvres_Override` (0 = utiliser le paramètre du scénario)
- `Jours_Ouvres_Effectifs`
- `Cout_Reference_N_1_Annuel_EUR`
- `Commentaire`

### Formules de référence

Coût N-1 annuel :

`Nb collaborateurs N-1 × TJM × jours ouvrés annuels`

Pour éviter de comparer un pilote de 4 mois à une baseline annuelle complète, la V5 distingue :

- **Budget licences période** : budget réel du scénario.
- **Budget licences annualisé** : budget période × 12 / nombre de mois du scénario.
- **Baseline N-1 période** : baseline annuelle × nombre de mois / 12.
- **Économie période** : baseline période − budget licences période.
- **Économie annuelle** : baseline annuelle − budget licences annualisé.
- **Taux d'économie annuel** : économie annuelle / baseline annuelle.
- **Jours externes équivalents** : économie annuelle / TJM (calculé par domaine).
- **ETP externes équivalents** : économie annuelle / (TJM × jours ouvrés).

Cette distinction est importante pour `Pilote 2026` (4 mois) et `Cible 2027` (12 mois).

## Interface V5

Le Dashboard conserve les vues budget et ajoute :

- Baseline N-1 annuelle
- Budget licences annualisé
- Économie annuelle
- Taux d'économie

Une nouvelle page **ROI / Économies** permet :

- de saisir le nombre de collaborateurs N-1 et le TJM par domaine ;
- de surcharger les jours ouvrés pour un domaine si nécessaire ;
- de visualiser baseline, budget période, budget annualisé, économies période/annuelle, jours et ETP équivalents ;
- d'agréger le ROI au niveau du scénario.

La page **Comparaison** inclut désormais l'économie annuelle et le taux d'économie en plus du budget.

## Migration

Si la V4 est déjà installée :

1. Faire une copie du document Grist.
2. Renseigner `API_KEY` dans `migrate_roi_v5.py`.
3. Lancer `py migrate_roi_v5.py`.
4. Ajouter les ACL Grist de `Baseline_N_1` sur le même modèle que `Allocations` : Owner complet, utilisateur domaine limité à son `Domaine`.
5. Déployer `index.html`, `styles.css`, `app.js` depuis cette V5.

Si la V4 n'est pas encore installée, exécuter d'abord `migrate_multifournisseurs.py`, puis `migrate_roi_v5.py`.
