# Regional metropolis expansion

Goal: expand land ninefold (32×32 to 96×96) while preserving the original city and its commercial network, then make the larger map useful through regional specialties, transport, tourism, exports and a new long campaign.

Map: retain all original coordinates and five districts within the original 32×32 square. Add eight 32×32 regions: agricultural plain, highland ranch, lakeside, CBD, science city, forest park, trade harbor and frontier. New districts have stage/cost and neighboring-region prerequisites. Lakes are deterministic, with corridors through regional centers; bridges permit crossing water.

Buildings: bridge, bus stop, metro station, large solar field, reservoir, resort, hotel, museum, trade port, greenhouse, residential block and business hub. Bus/metro coverage affects happiness and immigration; paired metro districts carry freight up to 60 per route/month. Hotels and attractions generate visitors and real tourism revenue. Ports export leftover local goods after retail, generating export revenue. Farming/ranching/CBD/harbor specialties affect yields or capacity.

Progression: keep the existing seven stages and projects. Add five metropolitan plans, ending in a 4,000-person regional city with all thirteen districts open. Large housing, jobs and utilities support this scale; immigration increases with population and transport coverage.

Compatibility: new v3 96×96 saves; migrate v1 (20×20) and v2 (32×32) tile-by-tile using each source stride. Preserve money, stages, projects, routes and all commodity quantities. Add empty new district inventories and default counters for older economic saves. Validate new state and supported old variants.

Navigation/performance: region atlas, clickable minimap, camera focus, original-core home view, zoom-to-region. Cache the simulation report between mutations; pointer hover and animation must not recompute a 9,216-tile economy. Cull offscreen terrain; use simplified overview drawing when zoomed out. Update minimap terrain only on city mutation.

Steps:
1. Failing tests for 96×96 land, v2 stride migration, bridged road connectivity, adjacency gates and tourism/transport effects.
2. Implement engine and economic expansion, migration and metro plans; verify old campaign remains reachable.
3. Add atlas/minimap, sprites, large-city controls, performance cache and explanations.
4. Verify old and new browser flows, migration, mobile navigation, real earned progression and large-city runtime.
5. Review, fix important findings, publish and smoke-test the public page.
