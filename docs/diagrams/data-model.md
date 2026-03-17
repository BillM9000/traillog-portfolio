# Data Model

Multi-tenant entity relationship diagram showing the Troop → Adventure → Crew → Member hierarchy and related entities.

```mermaid
erDiagram
    USER {
        int id PK
        text email UK
        text name
        text password_hash
        text google_id
        int is_admin
        text age_confirmed
    }

    TROOP {
        int id PK
        text name
        int council_id FK
        text location
        int created_by FK
    }

    ADVENTURE {
        int id PK
        int troop_id FK
        text name
        text adventure_type
    }

    CREW {
        int id PK
        int adventure_id FK
        text name
        text itinerary_id FK
        text depart_date
        text arrive_date
        text return_date
        text home_date
        int leader_id FK
    }

    CREW_MEMBER {
        int id PK
        int crew_id FK
        int user_id FK
        text role
        text participation
        int linked_to FK
    }

    ITINERARY {
        text id PK
        text name
        int days
        real miles
        text rating
        text route_data
    }

    GEAR_CATALOG {
        int id PK
        text name
        text category
        text sharing_type
        real weight_oz
        text priority
    }

    MEMBER_GEAR {
        int id PK
        int crew_id FK
        int user_id FK
        int gear_item_id FK
        text status
        real custom_weight
    }

    READINESS_PLAN {
        int id PK
        int crew_id FK
        int user_id FK
        text plan_json
        text priorities_json
        int tokens_used
    }

    TROOP ||--o{ ADVENTURE : "has"
    ADVENTURE ||--o{ CREW : "contains"
    CREW ||--o{ CREW_MEMBER : "has"
    CREW_MEMBER }o--|| USER : "is"
    USER }o--o{ TROOP : "member of"
    CREW ||--o| ITINERARY : "follows"
    CREW_MEMBER ||--o{ MEMBER_GEAR : "tracks"
    MEMBER_GEAR }o--|| GEAR_CATALOG : "references"
    CREW_MEMBER ||--o| READINESS_PLAN : "has"
    TROOP }o--|| COUNCIL : "belongs to"
```

## Multi-Tenant Scoping

All database queries include tenant-scoping predicates (`WHERE troop_id = ?`, `WHERE crew_id = ?`) to prevent cross-tenant data access. This is enforced at the database function level in `server/db.js`, not just at the middleware level.
