// Itinerary seed data — parsed from official guidebook PDF
// Full dataset: 48 itineraries (twelve 12-day, twelve 9-day, twelve 7-day treks)
// Each itinerary includes day-by-day route data with camps, mileage, elevation gain/loss, and programs
//
// Data pipeline: PDF → Python parser (scripts/parse_itineraries.py) → JSON → JS module
//
// [Full itinerary data redacted — 48 itineraries in production]
// Below are 2 representative samples showing the data structure:

export const PHILMONT_2026_ITINERARIES = [
  {
    "id": "12-SAMPLE-A",
    "name": "Sample Itinerary A (12-day)",
    "days": 12,
    "miles": 62,
    "rating": "Strenuous",
    "highlights": ["Sample Peak 9,400 ft", "Rock climbing", "Conservation project"],
    "description": "A twelve-day trek through varied terrain showcasing the itinerary data structure used by the application. Each itinerary contains day-by-day route data enabling pack weight calculations, hardest-day analysis, and AI readiness coaching.",
    "route_data": [
      { "day": 1, "camp": "Base Camp", "miles": 0, "gain": 0, "loss": 0, "programs": "Opening Campfire" },
      { "day": 2, "camp": "Camp Alpha", "miles": 3.2, "gain": 520, "loss": 300, "programs": "Ranger Training" },
      { "day": 3, "camp": "Camp Beta", "miles": 5.8, "gain": 1200, "loss": 400, "programs": "Trail Camp" },
      { "day": 4, "camp": "Camp Gamma", "miles": 7.9, "gain": 1800, "loss": 1200, "programs": "Peak Hike" },
      { "day": 5, "camp": "Camp Delta", "miles": 6.4, "gain": 900, "loss": 1500, "programs": "Conservation" },
      { "day": 6, "camp": "Camp Epsilon", "miles": 4.1, "gain": 600, "loss": 200, "programs": "Rock Climbing" },
      { "day": 7, "camp": "Camp Zeta", "miles": 5.5, "gain": 1100, "loss": 800, "programs": "Trail Camp" },
      { "day": 8, "camp": "Camp Eta", "miles": 8.2, "gain": 2100, "loss": 1600, "programs": "Summit Day" },
      { "day": 9, "camp": "Camp Theta", "miles": 6.0, "gain": 700, "loss": 1400, "programs": "Living History" },
      { "day": 10, "camp": "Camp Iota", "miles": 5.3, "gain": 500, "loss": 900, "programs": "Spar Pole" },
      { "day": 11, "camp": "Camp Kappa", "miles": 7.1, "gain": 1000, "loss": 1800, "programs": "Closing" },
      { "day": 12, "camp": "Base Camp", "miles": 2.5, "gain": 100, "loss": 600, "programs": "Return" }
    ]
  },
  {
    "id": "7-SAMPLE-B",
    "name": "Sample Itinerary B (7-day)",
    "days": 7,
    "miles": 38,
    "rating": "Moderate",
    "highlights": ["Scenic meadow", "Fishing"],
    "description": "A seven-day trek demonstrating the shorter itinerary format. The application uses trek duration for dynamic food weight estimates (1.75 lbs/day) and the hardest-day analysis for AI readiness coaching.",
    "route_data": [
      { "day": 1, "camp": "Base Camp", "miles": 0, "gain": 0, "loss": 0, "programs": "Opening Campfire" },
      { "day": 2, "camp": "Camp Lambda", "miles": 4.5, "gain": 800, "loss": 200, "programs": "Ranger Training" },
      { "day": 3, "camp": "Camp Mu", "miles": 6.8, "gain": 1500, "loss": 600, "programs": "Trail Camp" },
      { "day": 4, "camp": "Camp Nu", "miles": 7.2, "gain": 1200, "loss": 1000, "programs": "Fishing" },
      { "day": 5, "camp": "Camp Xi", "miles": 8.0, "gain": 1800, "loss": 1400, "programs": "Peak Day" },
      { "day": 6, "camp": "Camp Omicron", "miles": 6.5, "gain": 400, "loss": 1600, "programs": "Meadow" },
      { "day": 7, "camp": "Base Camp", "miles": 5.0, "gain": 200, "loss": 800, "programs": "Return" }
    ]
  }
  // ... 46 more itineraries in the full dataset (12-day, 9-day, and 7-day options)
];
