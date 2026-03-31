"""Parse all 2026 Philmont itineraries from the official Itinerary Guidebook PDF
and generate a JS seed data file for the TrailLog app."""

from pypdf import PdfReader
import re, json, sys

PDF_PATH = r'C:\Users\billm\.claude\projects\C--Users-billm-220claudsession-philmont-app-crew614\0c210e18-c76f-45f8-ba75-587b5baa6c20\tool-results\webfetch-1773205731648-afduzx.pdf'
OUTPUT_PATH = r'C:\Users\billm\220claudsession\philmont_app\crew614\server\itinerary_seed.js'

reader = PdfReader(PDF_PATH)

# Step 1: Extract itinerary pages
raw_itineraries = []
current = None

for i, page in enumerate(reader.pages):
    text = page.extract_text() or ''
    match = re.search(
        r'Itinerary (\d+-\d+)\s+(Challenging|Rugged|Strenuous|Super Strenuous)\s*\([^)]+\)\s*-\s*(\d+)\s*miles',
        text
    )
    if match:
        if current:
            raw_itineraries.append(current)
        current = {
            'id': match.group(1),
            'days': int(match.group(1).split('-')[0]),
            'miles': int(match.group(3)),
            'rating': match.group(2),
            'text': text,
        }
    elif current:
        current['text'] += "\n" + text

if current:
    raw_itineraries.append(current)

print(f"Extracted {len(raw_itineraries)} itineraries from PDF", file=sys.stderr)

# Step 2: Parse day-by-day route data from each itinerary
def parse_days(text, num_days):
    """Parse the day/camp/miles/gain/loss table from itinerary text."""
    days = []
    lines = text.split('\n')

    # Find the table area - starts after "Day Camp Miles Gain Loss"
    table_start = -1
    for idx, line in enumerate(lines):
        if 'Day Camp Miles' in line and 'Gain' in line:
            table_start = idx + 1
            break

    if table_start == -1:
        return days

    # Parse day rows - format: "N CampName   M.M G' L' Programs..."
    day_pattern = re.compile(
        r'^(\d+)\s+'           # day number
        r'(.+?)\s+'            # camp name (greedy but followed by spaces)
        r'(\d+\.\d+|\d+)\s*m?\s*'  # miles (with optional 'm' suffix)
        r"(\d+[,\d]*)\s*'\s+"  # gain with apostrophe
        r"(\d+[,\d]*)\s*'\s*"  # loss with apostrophe
        r'(.*)'                # programs/features
    )

    # Day 1 is always Camping HQ with 0 miles
    # Also handle days with 0.0 miles (layover days)
    day1_pattern = re.compile(r'^1\s+Camping HQ\s+(.*)')
    layover_pattern = re.compile(
        r'^(\d+)\s+'
        r'(.+?)\s+'
        r"0\.0\s+0\s*'\s+0\s*'\s*(.*)"
    )

    for idx in range(table_start, len(lines)):
        line = lines[idx].strip()
        if not line:
            continue
        # Break on footer lines
        if (line.startswith('(d)') or line.startswith('(s)') or
            line.startswith('Depart') or line.startswith('Hike back') or
            line.startswith('Returns') or line.startswith('This is') or
            line.startswith('Itinerary may') or line.startswith('Horse rides') or
            line.startswith('Campsite Elevations') or line.startswith('Conservation:') or
            line.startswith('Crews passing') or line.startswith('NO CHANGE')):
            break
        # Skip continuation lines (part of previous day's programs text)
        if not re.match(r'^\d+\s+', line):
            continue

        # Day 1 special case
        m1 = day1_pattern.match(line)
        if m1:
            days.append({
                'day': 1,
                'camp': 'Camping HQ',
                'miles': 0,
                'gain': 0,
                'loss': 0,
                'programs': m1.group(1).strip(),
            })
            continue

        # Layover day
        ml = layover_pattern.match(line)
        if ml:
            camp = ml.group(2).strip()
            camp = re.sub(r'\s*[sd]\s*$', '', camp)  # remove s/d suffix
            days.append({
                'day': int(ml.group(1)),
                'camp': camp,
                'miles': 0,
                'gain': 0,
                'loss': 0,
                'programs': ml.group(3).strip(),
            })
            continue

        # Regular day
        m = day_pattern.match(line)
        if m:
            camp = m.group(2).strip()
            # Remove trailing markers like 's', 'd', 'sd'
            camp = re.sub(r'\s+[sd]+\s*$', '', camp)
            miles = float(m.group(3))
            gain = int(m.group(4).replace(',', ''))
            loss = int(m.group(5).replace(',', ''))
            programs = m.group(6).strip()

            days.append({
                'day': int(m.group(1)),
                'camp': camp,
                'miles': miles,
                'gain': gain,
                'loss': loss,
                'programs': programs,
            })
            continue

    return days


def parse_description(text):
    """Extract the descriptive paragraph from the itinerary text."""
    lines = text.split('\n')
    desc_lines = []
    collecting = False
    for line in lines:
        line = line.strip()
        if line.startswith('Updated from') or (line and not collecting and 'miles' not in line and 'Itinerary' not in line and '2026 PHILMONT' not in line and len(line) > 50):
            collecting = True
            if not line.startswith('Updated'):
                desc_lines.append(line)
            continue
        if collecting:
            if line.startswith('Day Camp Miles') or line.startswith('Updated from'):
                break
            if line:
                desc_lines.append(line)
    return ' '.join(desc_lines).strip()


def parse_highlights(text):
    """Extract camping/hiking highlights and program highlights."""
    highlights = []
    # Look for elevation highlights like "Mount Phillips - 11,736 ft."
    for m in re.finditer(r'([A-Z][A-Za-z\s]+?)\s*[-–]\s*([\d,]+)\s*ft', text):
        highlights.append(f"{m.group(1).strip()} {m.group(2)} ft")
    return highlights


def parse_camp_elevations(text):
    """Extract min/max camp elevations."""
    m = re.search(r"Campsite Elevations:\s*([\d,]+')\s*Minimum,\s*([\d,]+')\s*Maximum", text)
    if m:
        return {
            'min': int(m.group(1).replace("'", "").replace(",", "")),
            'max': int(m.group(2).replace("'", "").replace(",", "")),
        }
    return {'min': 0, 'max': 0}


def parse_camps_info(text):
    """Extract staffed/trail/dry camp counts."""
    m = re.search(r'Camps:\s*(.+?)(?:\n|Conservation)', text)
    if m:
        return m.group(1).strip()
    return ""


def parse_conservation(text):
    """Extract conservation project location."""
    m = re.search(r'Conservation:\s*(.+?)(?:\s+Sectional|\n)', text)
    if m:
        return m.group(1).strip()
    return ""


# Step 3: Process all itineraries
all_itineraries = []
for raw in raw_itineraries:
    days = parse_days(raw['text'], raw['days'])
    desc = parse_description(raw['text'])
    highlights = parse_highlights(raw['text'])
    elevations = parse_camp_elevations(raw['text'])
    camps_info = parse_camps_info(raw['text'])
    conservation = parse_conservation(raw['text'])

    itin = {
        'id': raw['id'],
        'name': f"Itinerary {raw['id']}",
        'days': raw['days'],
        'miles': raw['miles'],
        'rating': raw['rating'],
        'highlights': highlights,
        'description': desc,
        'route_data': days,
        'elevations': elevations,
        'camps_info': camps_info,
        'conservation': conservation,
    }
    all_itineraries.append(itin)

    # Debug: check parsing quality
    if len(days) < raw['days'] - 1:
        print(f"  WARNING: {raw['id']} has only {len(days)}/{raw['days']} days parsed", file=sys.stderr)

# Step 4: Generate JS seed file
js_lines = [
    '// Auto-generated from 2026 Philmont Itinerary Guidebook PDF',
    '// Source: https://www.philmontscoutranch.org/wp-content/uploads/2024/12/Itinerary-Guidebook.pdf',
    '',
    'export const PHILMONT_2026_ITINERARIES = ' + json.dumps(all_itineraries, indent=2) + ';',
]

with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    f.write('\n'.join(js_lines))

print(f"\nGenerated {OUTPUT_PATH} with {len(all_itineraries)} itineraries", file=sys.stderr)

# Summary
for it in all_itineraries:
    days_parsed = len(it['route_data'])
    print(f"  {it['id']}: {it['miles']}mi {it['rating']}, {days_parsed} days parsed, conservation: {it['conservation']}")
