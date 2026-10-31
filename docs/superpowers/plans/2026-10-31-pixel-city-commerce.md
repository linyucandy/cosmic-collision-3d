# Regional commerce expansion

Goal: combine farming, ranching, food processing and shopping into the existing city, including completed saves.

References: Paradox's Cities: Skylines Industries announcement (2018-10-11) describes specialized areas and grain-to-bread chains; GIANTS' Farming Simulator 25 introduction and production manuals describe crops, husbandry, processing and shops. Borrow the general interactions, using original code and pixel drawings.

Design decisions: retain the existing 32×32 map and all built tiles. Five districts each own seven commodities (grain, vegetables, milk, eggs, flour, bread, cheese). Ten new buildings: grain field, vegetable plot, cattle barn, chicken coop, mill, bakery, dairy, warehouse, freight depot and mall. Crops vary by season; livestock needs feed; processors require inputs. Connected buildings only operate with full utilities. Storage has a district capacity; full stores stop production. Malls sell limited quantities based on population, earning real monthly revenue.

Commercial routes are directed, commodity-specific connections between open districts, requiring connected warehouses at both ends. Shared town-hall roads establish connectivity. Routes cost money to create and maintain; depots improve capacity. Transfers use source snapshots so goods cannot teleport through multiple routes within one month. Removing/disconnecting a warehouse pauses routes without deleting stock. District stock can exceed a reduced capacity after demolition but is preserved, blocking additional production until cleared.

UI: dedicated industry management dialog, original procedural sprites, category filters for the growing building palette, district stock panels, recipe guide, create/pause/remove routes, monthly delivery/sales and bottleneck explanations. Visible route overlay is optional. Pause simulation while any dialog is open, consistent with current dialogs; users can settle a month explicitly from the management dialog.

Implementation:
1. Failing model tests for real production, feed, recipes, limits, sales, interdistrict transport and old save migration.
2. Add independent pixel-city-economy.js, integrate forecasts and settlements in engine, whitelist asset for local server.
3. Add drawings, management UI, toolbar filters and save compatibility validation.
4. Extend campaign test to construct and operate an earned supply chain; exercise desktop/mobile actions and reload in browser.
5. Review, verify, commit, push and check GitHub Pages.
