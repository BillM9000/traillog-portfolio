# TrailLog Automated Chrome Test Plan
**URL**: https://traillog.gracezero.ai
**Pre-requisite**: Already logged in as billm9000@gmail.com (Global Admin)
**Rules**: No logout steps, no printing, no user intervention, minimize screenshots

---

## Phase 1: Fresh State Verification
1. Navigate to https://traillog.gracezero.ai
2. Verify the Lobby page loads (should see "Create a Troop" or similar)
3. Verify no troops exist yet (clean slate)

## Phase 2: Create Troop
4. Click "Create a Troop" button
5. Fill in: Name = "Troop 614 Test", Council = "Great Plains Council", Location = "Wichita, KS"
6. Set visibility to Public
7. Submit the form
8. Verify troop was created and you're redirected to the adventure view or lobby

## Phase 3: Create Adventure
9. If not already in the adventure setup, navigate to the troop
10. Create a new Philmont adventure: Crew Name = "Crew 614-A Test"
11. Set dates: Depart = 2026-05-12, Arrive = 2026-05-14, Return = 2026-05-24, Home = 2026-05-26
12. Select itinerary "12-20" from the dropdown
13. Save/confirm the adventure
14. Verify the Header shows "Crew 614-A Test" with correct dates and countdown

## Phase 4: Age Gate & Profile Setup
15. If age gate appears, select "18+" and confirm
16. Select "Adult" role if prompted
17. Verify profile setup completes and main view loads

## Phase 5: Header & Navigation
18. Verify header shows: troop name, crew name, date range, countdown, member count
19. Tap the troop logo in the header — verify lightbox opens with large logo
20. Close lightbox (click backdrop)
21. Tap the progress card — verify Trail Guide modal opens
22. Verify waypoints and badges are listed in the Trail Guide
23. Close Trail Guide modal
24. Verify all 6 tabs visible in 3x2 grid: Training, Best Windows, Readiness, Itinerary, Gear, Reports

## Phase 6: Training Tab (Calendar)
25. Click "Training" tab
26. Verify calendar grid loads with current/future months
27. Click a date — verify it cycles through All Day (full fill)
28. Click same date again — verify Morning (top half)
29. Click same date again — verify Afternoon (bottom half)
30. Click same date again — verify Off (cleared)
31. Verify MemberBar shows calendar hint: "click or drag dates"

## Phase 7: Best Windows Tab
32. Click "Best Windows" tab
33. Verify Best Windows analysis loads (may show "not enough data" with 1 member)
34. Verify MemberBar hint disappears or changes

## Phase 8: Readiness Tab
35. Click "Readiness" tab
36. Verify Readiness dashboard loads with member cards
37. Verify MemberBar shows readiness hint
38. Click on own readiness card — verify skill checklist appears
39. Toggle a few skills on (check them)
40. Verify readiness percentage updates in real-time
41. Verify header progress card updates

## Phase 9: Itinerary Tab
42. Click "Itinerary" tab
43. Verify day-by-day itinerary loads for "12-20"
44. Verify camp names, miles, elevation data displayed
45. Verify filter tags work (click a tag, verify filtering)
46. Verify CSV export button exists (click it — should download CSV)

## Phase 10: Gear Tab
47. Click "Gear" tab
48. Verify gear list loads with 76+ items
49. Verify Gear Guide explainer card is visible
50. Click a gear item's status icon — cycle through NEED → OWN → PACKED
51. Click another item to OWN status
52. Verify status text labels show under icons (NEED/OWN/PACKED)
53. Verify sharing type badges show (CREW green, BUDDY blue, PROVIDED orange)
54. Verify Pack Weight Widget updates when items are marked as PACKED
55. Verify filter dropdown works (filter by category)
56. Verify CSV export button on gear tab
57. Verify "Still Need" export button on gear tab

## Phase 11: Reports Tab
58. Click "Reports" tab
59. Verify report guide card shows at top
60. Verify admin reports visible: Crew Roster, Gear Readiness Matrix, Pack Weight Summary, Training RSVP, Crew Readiness Overview
61. Verify personal reports visible: My Gear Checklist, My Still-Need List, Itinerary Cheat Sheet
62. Click "Crew Roster" CSV export — verify download triggers
63. Click "Gear Readiness Matrix" CSV — verify download
64. Click "My Still-Need List" CSV — verify download

## Phase 12: Admin Panel
65. Open Admin Panel (settings gear icon in header)
66. Verify tabs: Adventure Settings, Members, Troop Settings
67. **Adventure Settings**: Verify crew name, dates, itinerary dropdown visible
68. Change itinerary from "12-20" to "12-6" — verify confirmation modal appears
69. Confirm the change — verify itinerary updates
70. Change back to "12-20" — confirm again
71. **Members tab**: Verify member list shows (just you)
72. Verify participation dropdown (trekking/support)
73. **Troop Settings**: Verify troop name, council, location, visibility fields
74. Edit troop name to "Troop 614 Updated", save
75. Verify header updates with new troop name
76. Edit back to "Troop 614 Test", save
77. Close Admin Panel

## Phase 13: Global Admin
78. Navigate to Global Admin (should be accessible from header menu or URL)
79. Verify sections: Gear Catalog, Troop Overview, Affiliate Analytics, Platform Settings
80. **Gear Catalog**: Verify 76+ items listed
81. Click a gear item to edit — verify sharing type dropdown (personal/crew/buddy/provided)
82. Change one item's sharing type, save, verify it persists
83. Change it back
84. **Troop Overview**: Verify your test troop appears
85. **Platform Settings**: Verify settings page loads
86. Return to main app

## Phase 14: MemberBar Contextual Hints
87. Click Training tab — verify hint says "click or drag dates" or similar calendar instruction
88. Click Gear tab — verify hint changes to gear-related instruction
89. Click Readiness tab — verify hint changes to readiness instruction
90. Click Best Windows tab — verify no hint (or appropriate hint)
91. Click Itinerary tab — verify no hint
92. Click Reports tab — verify no hint

## Phase 15: Theme Toggle
93. Find theme toggle (sun/moon icon in header)
94. Click to toggle dark mode — verify background and text colors change
95. Click again to toggle back to light mode

## Phase 16: Profile Page
96. Open profile dropdown from header
97. Click "View Profile"
98. Verify sections: Account info, Troop Memberships
99. Verify email shows with auth badge (GOOGLE)
100. Verify troop membership listed with admin badge
101. Close/navigate back to main view

## Phase 17: Lobby Operations
102. Navigate back to Lobby
103. Verify your troop card appears with logo fallback (colored circle + letter)
104. Verify council and location shown on troop card
105. Click "Enter" on your troop to go back to adventure view

## Phase 18: Edge Cases
106. Verify 404/unknown routes redirect to lobby or show error
107. Verify health endpoint: navigate to /api/health, verify response
108. Return to main app

---

## Results Format
For each test, record:
- **PASS**: Test succeeded as expected
- **FAIL**: Test failed — describe what went wrong
- **SKIP**: Test could not be run — describe why

Total: 108 test cases across 18 phases
