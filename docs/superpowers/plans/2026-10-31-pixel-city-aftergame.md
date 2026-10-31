# Pixel City Aftergame Implementation Plan

**Goal:** Give completed cities new construction choices and repeatable challenges while keeping all previous saves usable.

**Design:** Four late-game buildings contribute housing, jobs, health and education through the existing connected-road and utility rules. Four independent city projects can be completed in any order for one-time rewards. Players can choose one of three repeatable contracts, each requiring three months of operation and different financial, population or service goals. Contracts can be abandoned; rewards and project completion persist in the existing v2 save format, whose older variants default to no aftergame progress.

**Files:** The engine owns rules, validation and migration; renderer draws sprites; HTML/CSS/JS expose project and contract controls in the city report; model and browser tests exercise claims, choice, timing and old saves.

1. Write failing model tests for late-game building effects, project claims, repeatable contracts and old v2 migration.
2. Implement model rules and strict save restoration; run all city model tests including the original full campaign.
3. Add sprites, report controls, explanations and cache version; test real desktop/mobile interactions and reload.
4. Review, verify and publish to GitHub Pages.
