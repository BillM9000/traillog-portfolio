# Gear System

The gear system composes four data layers into a personalized gear list for each crew member, with a dynamic pack weight calculation.

## 4-Layer Composition

```mermaid
flowchart TB
    GC["Global Gear Catalog<br/>(76 items, 12 categories)<br/>Managed by Global Admin"]
    TO{"Troop Overrides"}
    TCG["+ Troop Custom Gear<br/>(troop-specific additions)"]
    MS["Member Gear Selections<br/>(per-adventure, per-user)"]

    GC --> TO
    TO -->|"Hidden items"| X["Excluded from troop"]
    TO -->|"Visible items"| TCG
    TCG --> MS

    MS --> N["⬜ Needed<br/>(identified, not yet acquired)"]
    MS --> O["☑ Owned<br/>(acquired, not yet packed)"]
    MS --> P["🎒 Packed<br/>(ready for trek)"]

    style GC fill:#dbeafe,stroke:#2563eb
    style TCG fill:#dcfce7,stroke:#16a34a
    style MS fill:#fef3c7,stroke:#d97706
    style X fill:#fee2e2,stroke:#dc2626
```

## Sharing Types & Pack Weight

```mermaid
flowchart LR
    ITEM["Packed Item"] --> TYPE{"Sharing Type?"}
    TYPE -->|"personal"| PW["✅ Counted in<br/>pack weight"]
    TYPE -->|"crew"| NW1["❌ Shared among crew<br/>(stove, water filter, GPS)"]
    TYPE -->|"buddy"| NW2["❌ Split with tent partner<br/>(tent, footprint, stakes)"]
    TYPE -->|"provided"| NW3["❌ Supplied on-site<br/>(pots, bear bags, fuel, topo map)"]

    PW --> CALC["Pack Weight =<br/>Σ personal packed items<br/>+ food (1.75 lbs/day × trek days)<br/>+ water (6.6 lbs / 3L)"]

    style PW fill:#dcfce7,stroke:#16a34a
    style NW1 fill:#f0fdf4,stroke:#86efac
    style NW2 fill:#eff6ff,stroke:#93c5fd
    style NW3 fill:#fff7ed,stroke:#fdba74
    style CALC fill:#fef3c7,stroke:#d97706
```

## Data Flow

| Layer | Table | Managed By |
|-------|-------|-----------|
| Global Catalog | `gear_catalog` | Global Admin (76 seeded items) |
| Troop Overrides | `troop_gear_overrides` | Troop Admin (hide irrelevant items) |
| Troop Custom | `troop_custom_gear` | Troop Admin (add troop-specific gear) |
| Member Selections | `member_gear_items` | Individual Member (3-state tracking) |

## Pack Weight Formula

```
Pack Weight = Σ(personal items where status = "packed" AND custom_weight > 0)
            + Food Estimate (1.75 lbs/day × itinerary days)
            + Water Weight (6.6 lbs — 3L typical hiking carry)
```

- Only **personal** items with **packed** status count
- Food estimate uses itinerary days (dynamic — changes when itinerary changes)
- Crew, buddy, and provided items displayed but excluded from weight calculation
