🏗 ARCHITECTURE.md

Liga Nico Sabag – Technical Architecture

1. System Overview

This project is a monolithic Next.js 15 application that uses Supabase as:

Database (PostgreSQL)

Authentication provider

File storage

Authorization via Row Level Security (RLS)

There is no separate backend server.

Next.js handles:

Public UI

Admin UI

Server actions (business logic)

Secure DB interactions

Supabase handles:

Persistence

Identity

Access control at row level

2. High-Level Architecture
Browser
   ↓
Next.js App Router
   ↓
Server Actions
   ↓
Supabase (Postgres + RLS + Auth)

All data writes happen through:

Server Components

Server Actions

No direct write access from client components.

3. Core Design Principles
1️⃣ Monolith First

Keep everything in one Next.js project.
Do not introduce microservices.

2️⃣ RLS as Security Layer

Authorization is enforced in Postgres via RLS.
Frontend is NOT trusted.

3️⃣ Domain Driven Structure

Data model follows football domain logic:

League → Seasons → Competitions → Stages → Matches

Roster is independent of season.

4️⃣ Flexibility in Tournament Format

Stages support:

league_table

groups

knockout

Rules stored as JSONB in stages.rules.

4. Domain Model
4.1 League

Top-level entity.

One project currently supports one main league, but schema supports multi-league.

4.2 Seasons

Represents a semester-based tournament.

Fields:

year

semester (1 or 2)

Unique:
(league_id, year, semester)

Seasons contain:

competitions

team registrations

4.3 Teams

Belong to a league.
Have global roster.
May or may not participate in a given season.

4.4 Players

Required:

first_name

rut (unique per league)

Optional:

last_name

nickname

photo_path

RUT is unique per league:
(league_id, rut)

4.5 Global Roster (team_players)

Plantel is NOT seasonal.

team_players:

team_id

player_id

shirt_number (nullable)

is_captain

Important:
Roster does not change per semester in current model.
If that changes in the future, introduce team_player_season.

4.6 team_season

Registers which teams participate in a semester.

Allows:

A team to skip a semester.

Flexible competition participation.

4.7 Competitions

A season may contain multiple competitions:

Torneo principal

Copa

Playoffs

4.8 Stages

A competition consists of ordered stages.

Types:

league_table

groups

knockout

Rules:
Stored as JSONB to allow:

Points configuration

Tie-breakers

Knockout seeding

Leg rules

Example rules:

{
  "points": { "win": 3, "draw": 1, "loss": 0 },
  "tiebreakers": ["points", "gd", "gf"]
}
4.9 Matches

Belong to a stage.
Optionally belong to a group.

Use team_season references, not team directly.

This ensures:
Only registered teams can play.

4.10 match_events

Optional detailed match tracking.
Used for:

Goals

Assists

Cards

5. Authorization Model
5.1 Auth

Supabase Auth with:

Email OTP

No password-based admin system.

5.2 Roles

Stored in league_memberships.

Roles:

owner

admin

editor

viewer

Editors can:

Manage teams

Manage players

Manage matches

Manage competitions

Viewers:

Access admin panel in read-only mode (optional)

5.3 RLS Strategy
Public Read Access

leagues

seasons

teams

players

team_players

matches

This allows full public website functionality.

Restricted Write Access

Only users with:
owner/admin/editor

Enforced by:
SQL functions:

is_league_editor()

is_league_member()

Never rely solely on frontend checks.

6. Next.js Architecture
6.1 Folder Structure
src/
  app/
    (public)/
    (admin)/
  actions/
  lib/supabase/
  types/
6.2 Supabase Clients

Three clients:

browser client

server client

middleware client

Use @supabase/ssr.

Never expose service role in browser.

6.3 Data Flow

Public:

Server components fetch read-only data.

Admin:

Server actions perform writes.

RLS validates permissions.

7. Standings Strategy

Currently:

Standings calculated in application layer.

Future:

SQL View for standings
OR

Cached standings table updated by triggers.

8. Storage

Bucket:

public

Used for:

Team crests

Player photos

Paths:
public/teams/{teamId}.png
public/players/{playerId}.png

9. Performance Considerations

Indexes exist for:

Foreign keys

league_id

season_id

stage_id

match_id

Future optimization:

Materialized view for standings

Index on kickoff_at DESC for homepage

10. Future Evolution

Potential features:

Player statistics per season

Transfer windows

Multi-league support

Match reports

Real-time updates

Bracket visualization

API layer for mobile

11. Important Development Rules

Always enable RLS on new tables.

Always define select policy intentionally.

Never bypass RLS using service role unless strictly necessary.

Always enforce domain logic in DB structure.

Do not mix seasonal and global roster logic.

12. AI Context Notes

When generating new code:

Respect RLS.

Respect league isolation.

Use team_season for matches.

Use team_players for roster.

Do not create new relations without considering season boundary.

Always check for league_id derivation through joins.

If needed, I can now generate:

A DATABASE_DIAGRAM.md

A full ER diagram text description

Or a production-hardening checklist for deployment 🚀