# Autonomous civic council

Goal: named in-game citizens propose development plans, carry out real construction/business actions, and report measured progress periodically. Use deterministic local rules and existing city APIs, with no remote service or invented activity.

Six roles: mayor (strategy), planner (land/housing/roads), engineer (utilities/transport), industry director (food/commerce), welfare representative (services), treasurer (budget/reporting). Expose development focus, reserve and monthly budget fraction. Autonomy starts off for existing and new saves; enabling it starts visible-page operation and persists. Players may pause, inspect or manually intervene. Council inspection remains live while other game dialogs retain their normal simulation pause.

Plans have fixed baseline metrics, targets and a twelve-month horizon. Monthly actions are bounded by available funds, reserve and budget, plus a limit on construction/road actions. Quarterly/annual reports show actual before/after metrics, expenditures, actions, target completion and blocking reasons. History is bounded. No demolition or hidden money grants. Eligible existing city-stage/project rewards may be claimed once through normal APIs.

Implementation:
1. Add machine-readable metadata to phase goals without changing their numeric rules.
2. Test disabled mode, genuine construction/finance, budget limits, persisted plans/reports and multi-year autonomous development.
3. Add independent council rules module with safe normalization; invoke once per city month after ordinary settlement. Bounded road-path search connects planned plots through open land; existing buildings are preserved.
4. Add council panel, character portraits, actual role actions/proposals, live quarterly progress and road-walking pixel citizens. Cache walking routes separately from city computation.
5. Verify desktop/mobile controls, persistence, pause and real operating examples; review and publish.
