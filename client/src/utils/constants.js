export const MONTHS_AHEAD = 5;

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

export const ADVENTURE_TYPES = [
  { id: "philmont", name: "Philmont Scout Ranch", location: "Cimarron, NM", icon: "🏔️", enabled: true,
    dateLabels: { depart: "Depart Home", arrive: "Arrive Philmont", return: "Depart Philmont", home: "Return Home" } },
  { id: "northern_tier", name: "Northern Tier", location: "Ely, MN", icon: "🛶", enabled: false,
    dateLabels: { depart: "Depart Home", arrive: "Arrive Base", return: "Depart Base", home: "Return Home" } },
  { id: "sea_base", name: "Florida Sea Base", location: "Islamorada, FL", icon: "⛵", enabled: false,
    dateLabels: { depart: "Depart Home", arrive: "Arrive Base", return: "Depart Base", home: "Return Home" } },
  { id: "summit", name: "Summit Bechtel Reserve", location: "Glen Jean, WV", icon: "🧗", enabled: false,
    dateLabels: { depart: "Depart Home", arrive: "Arrive Base", return: "Depart Base", home: "Return Home" } },
];

export const DAYS_ABBR = ["S", "M", "T", "W", "T", "F", "S"];
export const DAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
