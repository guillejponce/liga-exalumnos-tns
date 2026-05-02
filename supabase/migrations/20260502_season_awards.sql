-- Create season_awards table
CREATE TABLE public.season_awards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  award_type text NOT NULL,
  team_id uuid REFERENCES public.teams(id),
  player_id uuid REFERENCES public.players(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT season_awards_pkey PRIMARY KEY (id)
);

-- RLS: public read, editors can manage
ALTER TABLE public.season_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON public.season_awards
  FOR SELECT USING (true);

CREATE POLICY "Editors can manage" ON public.season_awards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.seasons s
      JOIN public.league_memberships lm ON lm.league_id = s.league_id
      WHERE s.id = season_awards.season_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner', 'admin', 'editor')
    )
  );
