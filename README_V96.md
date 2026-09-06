# FinOps Claude — V96

La V96 corrige la logique du plafond virtuel de groupe introduite en V95.

## Principe budgétaire

- `Enveloppe_Allouee` = part de l'enveloppe de l'organisation affectée/réservée au groupe.
- `Plafond_Groupe_Total` = plafond **virtuel de simulation** du groupe, et non un blocage technique.
- L'écart `Plafond_Groupe_Total - Enveloppe_Allouee` représente le besoin potentiel supplémentaire du groupe.
- Ce besoin potentiel est d'abord absorbé par la part non affectée de l'enveloppe de l'organisation.
- Le reliquat est affiché comme **risque potentiel sur les enveloppes des autres groupes**.
- La consommation réelle peut dépasser le plafond virtuel afin de simuler un scénario de stress. Cela génère une alerte mais ne bloque plus la saisie.
- Le blocage dur reste uniquement celui de la limite mensuelle effective par utilisateur (limite du groupe ou dérogation individuelle).

## Nouvelle vue groupe

La vue Consommation présente pour chaque groupe :

- affectation ;
- plafond virtuel ;
- risque théorique `plafond - affectation` ;
- consommation réelle et dépassement de l'affectation ;
- réserve non affectée de l'organisation mobilisable ;
- montant potentiel qui empiète sur les autres groupes ;
- marge encore disponible dans les autres groupes ;
- état de risque.

## Installation depuis V95

Aucune migration supplémentaire n'est nécessaire. Déployer uniquement le nouvel `app.js` de la V96.
