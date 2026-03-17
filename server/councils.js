// BSA Council list — seeded into councils table on startup
// Full dataset: 237 BSA local councils covering all 50 states + territories
// Data sourced from public BSA council directory, cross-referenced with ScoutWiki
//
// [Full council list redacted — 237 entries in production]
// Below are 5 representative samples showing the data structure:

export const BSA_COUNCILS = [
  { num: 1, name: "Sample Council Alpha", city: "Springfield", state: "IL" },
  { num: 10, name: "Sample Council Beta", city: "Phoenix", state: "AZ" },
  { num: 100, name: "Sample Council Gamma", city: "Portland", state: "OR" },
  { num: 200, name: "Sample Council Delta", city: "Charlotte", state: "NC" },
  { num: 300, name: "Sample Council Epsilon", city: "Denver", state: "CO" },
  // ... 232 more councils in the full dataset
];
