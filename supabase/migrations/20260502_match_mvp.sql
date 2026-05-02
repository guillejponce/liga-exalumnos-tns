-- Add MVP player reference to matches
ALTER TABLE public.matches
  ADD COLUMN mvp_player_id uuid REFERENCES public.players(id);
