# FinOps V68 — correctif badge Synthèse

Le badge `Chiffré` affichait littéralement :

`${esc(uiLabelValue("compare","Chiffré"))}`

La cause était un fragment HTML entouré de quotes simples au lieu d'un template
literal JavaScript. L'expression n'était donc pas interprétée.

V68 corrige les occurrences concernées dans :
- cartes de Synthèse / Comparaison ;
- Dashboard offre ;
- détail d'un scénario.

Aucune migration Grist ni réconciliation ACL n'est nécessaire.
