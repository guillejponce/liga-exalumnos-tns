-- Bulk insert: Clausura 2025 (S2) – Fecha 1
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  v_league_id uuid;
  v_season_id uuid;
  v_comp_id uuid;
  v_stage_id uuid;
  -- team_season IDs
  ts_incus uuid;
  ts_bambino uuid;
  ts_pincharratas uuid;
  ts_exiliados uuid;
  ts_ivory uuid;
  ts_ingestionables uuid;
  ts_alziya uuid;
  ts_semasbros uuid;
BEGIN
  -- 1) Get the league
  SELECT id INTO v_league_id FROM leagues LIMIT 1;

  -- 2) Get or create the season
  SELECT id INTO v_season_id
    FROM seasons
    WHERE league_id = v_league_id AND year = 2025 AND semester = 2;

  IF v_season_id IS NULL THEN
    INSERT INTO seasons (league_id, name, year, semester, is_active)
    VALUES (v_league_id, 'Clausura 2025', 2025, 2, false)
    RETURNING id INTO v_season_id;
    RAISE NOTICE 'Created season: Clausura 2025';
  END IF;

  -- 3) Register teams in this season (if not already)
  -- Using ILIKE for flexible matching
  INSERT INTO team_season (season_id, team_id)
  SELECT v_season_id, t.id
  FROM teams t
  WHERE t.league_id = v_league_id
    AND NOT EXISTS (
      SELECT 1 FROM team_season ts
      WHERE ts.season_id = v_season_id AND ts.team_id = t.id
    );
  RAISE NOTICE 'Ensured all teams are registered in Clausura 2025';

  -- 4) Get or create competition "Torneo"
  SELECT id INTO v_comp_id
    FROM competitions
    WHERE season_id = v_season_id
    ORDER BY created_at
    LIMIT 1;

  IF v_comp_id IS NULL THEN
    INSERT INTO competitions (season_id, name)
    VALUES (v_season_id, 'Torneo Clausura')
    RETURNING id INTO v_comp_id;
    RAISE NOTICE 'Created competition: Torneo Clausura';
  END IF;

  -- 5) Get or create stage "Fase Regular" (league_table)
  SELECT id INTO v_stage_id
    FROM stages
    WHERE competition_id = v_comp_id
    ORDER BY stage_order
    LIMIT 1;

  IF v_stage_id IS NULL THEN
    INSERT INTO stages (competition_id, name, type, stage_order, rules)
    VALUES (v_comp_id, 'Fase Regular', 'league_table', 1,
            '{"points": {"win": 3, "draw": 1, "loss": 0}, "tiebreakers": ["points", "gd", "gf"]}'::jsonb)
    RETURNING id INTO v_stage_id;
    RAISE NOTICE 'Created stage: Fase Regular';
  END IF;

  -- 6) Resolve team_season IDs (adjust team name patterns if needed)
  SELECT ts.id INTO ts_incus
    FROM team_season ts JOIN teams t ON t.id = ts.team_id
    WHERE ts.season_id = v_season_id AND t.name ILIKE '%Incus%';

  SELECT ts.id INTO ts_bambino
    FROM team_season ts JOIN teams t ON t.id = ts.team_id
    WHERE ts.season_id = v_season_id AND t.name ILIKE '%Bambino%';

  SELECT ts.id INTO ts_pincharratas
    FROM team_season ts JOIN teams t ON t.id = ts.team_id
    WHERE ts.season_id = v_season_id AND t.name ILIKE '%Pincharrata%';

  SELECT ts.id INTO ts_exiliados
    FROM team_season ts JOIN teams t ON t.id = ts.team_id
    WHERE ts.season_id = v_season_id AND t.name ILIKE '%Exiliado%';

  SELECT ts.id INTO ts_ivory
    FROM team_season ts JOIN teams t ON t.id = ts.team_id
    WHERE ts.season_id = v_season_id AND t.name ILIKE '%Ivory%';

  SELECT ts.id INTO ts_ingestionables
    FROM team_season ts JOIN teams t ON t.id = ts.team_id
    WHERE ts.season_id = v_season_id AND t.name ILIKE '%Ingestion%';

  SELECT ts.id INTO ts_alziya
    FROM team_season ts JOIN teams t ON t.id = ts.team_id
    WHERE ts.season_id = v_season_id AND (t.name ILIKE '%Ziya%' OR t.name ILIKE '%Al Zi%');

  SELECT ts.id INTO ts_semasbros
    FROM team_season ts JOIN teams t ON t.id = ts.team_id
    WHERE ts.season_id = v_season_id AND t.name ILIKE '%Semas%';

  -- Verify all teams were found
  IF ts_incus IS NULL THEN RAISE EXCEPTION 'Team not found: Incus'; END IF;
  IF ts_bambino IS NULL THEN RAISE EXCEPTION 'Team not found: Los 7 del Bambino'; END IF;
  IF ts_pincharratas IS NULL THEN RAISE EXCEPTION 'Team not found: Pincharratas'; END IF;
  IF ts_exiliados IS NULL THEN RAISE EXCEPTION 'Team not found: Exiliados'; END IF;
  IF ts_ivory IS NULL THEN RAISE EXCEPTION 'Team not found: Ivory Toast'; END IF;
  IF ts_ingestionables IS NULL THEN RAISE EXCEPTION 'Team not found: Ingestionables FC'; END IF;
  IF ts_alziya IS NULL THEN RAISE EXCEPTION 'Team not found: Al Ziya'; END IF;
  IF ts_semasbros IS NULL THEN RAISE EXCEPTION 'Team not found: Semasbros'; END IF;

  RAISE NOTICE 'All 8 teams resolved successfully';

  -- 7) Insert matches – Fecha 1
  -- Incus 3 - 4 Los 7 del Bambino
  INSERT INTO matches (stage_id, home_team_season_id, away_team_season_id, home_score, away_score, round, status)
  VALUES (v_stage_id, ts_incus, ts_bambino, 3, 4, 1, 'played');

  -- Pincharratas 7 - 2 Exiliados
  INSERT INTO matches (stage_id, home_team_season_id, away_team_season_id, home_score, away_score, round, status)
  VALUES (v_stage_id, ts_pincharratas, ts_exiliados, 7, 2, 1, 'played');

  -- Ivory Toast 2 - 1 Ingestionables FC
  INSERT INTO matches (stage_id, home_team_season_id, away_team_season_id, home_score, away_score, round, status)
  VALUES (v_stage_id, ts_ivory, ts_ingestionables, 2, 1, 1, 'played');

  -- Al Ziya 3 - 0 Semasbros
  INSERT INTO matches (stage_id, home_team_season_id, away_team_season_id, home_score, away_score, round, status)
  VALUES (v_stage_id, ts_alziya, ts_semasbros, 3, 0, 1, 'played');

  RAISE NOTICE '4 matches inserted for Fecha 1';
  RAISE NOTICE 'Done! Clausura 2025 – Fecha 1 populated.';
END $$;
