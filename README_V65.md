# FinOps V65 — libellés systématiques

La gestion des libellés ne repose plus sur une liste limitée de balises HTML.

## Nouveau moteur
- parcours systématique de tous les nœuds texte visibles du widget ;
- détection des libellés dans les cartes, spans, divs, modales, boutons, KPI, tableaux, etc. ;
- conservation du filtre par écran ;
- fallback global `*`.

## Écrans transitoires
Les textes qui n'existent pas en permanence dans le DOM sont maintenant déclarés
dans un catalogue permanent :
- Synthèse / Comparaison ;
- détail d'un scénario ;
- rapport HTML de synthèse ;
- pré-simulation nominative ;
- export HTML de pré-simulation ;
- actions globales courantes.

Ils apparaissent donc dans **Admin > Paramétrage des libellés > Textes des écrans**
même si la popup ou le rapport n'a jamais été ouvert auparavant.

## Application immédiate
Les libellés de Synthèse et de ses rapports HTML passent maintenant par
`Configuration_Libelles_UI` au moment du rendu, au lieu de dépendre uniquement
du MutationObserver.

Aucune migration Grist et aucune réconciliation ACL ne sont nécessaires.
