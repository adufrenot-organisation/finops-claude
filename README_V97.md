# FinOps Claude — V97

La V97 ajoute les demandes exceptionnelles de réallocation de capacité entre groupes.

## Principe

- Chaque groupe conserve son `Enveloppe_Allouee` comme affectation budgétaire de référence.
- Chaque groupe possède un `Plafond_Groupe_Total` servant de capacité virtuelle de consommation.
- Un groupe en risque de surconsommation peut demander une capacité supplémentaire à un autre groupe de la même organisation.
- Une demande contient : groupe demandeur, groupe donneur, montant, motif, statut et dates.
- Tant qu'elle est **EN_ATTENTE**, aucun plafond ne change.
- Si elle est **ACCEPTEE** :
  - le plafond virtuel du groupe donneur est diminué du montant accepté ;
  - le plafond virtuel du groupe demandeur est augmenté du même montant ;
  - les affectations initiales ne changent pas ;
  - l'historique de la décision est conservé.
- Si elle est **REFUSEE**, aucun plafond ne change.

## Garde-fous

- demandeur et donneur doivent être différents ;
- ils doivent appartenir à la même organisation ;
- le montant doit être strictement positif ;
- à l'acceptation, le plafond virtuel du groupe donneur ne peut pas tomber sous son affectation budgétaire initiale.

## Installation depuis V96

1. Sauvegarder le document Grist.
2. Exécuter `migrate_claude_reallocations_v97.py`.
3. Déployer le nouvel `app.js`.
4. Recharger l'application et tester dans Claude Enterprise > Consommation.
