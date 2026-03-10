export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer'

export type StageType = 'league_table' | 'groups' | 'knockout'

export type MatchStatus = 'scheduled' | 'played'

export type MatchEventType = 'goal' | 'assist' | 'yellow' | 'red'

export interface League {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface Season {
  id: string
  league_id: string
  name: string
  year: number
  semester: 1 | 2
  is_active: boolean
  created_at: string
}

export interface LeagueMembership {
  id: string
  league_id: string
  user_id: string
  role: MemberRole
  created_at: string
}

export interface Team {
  id: string
  league_id: string
  name: string
  short_name: string
  crest_path: string | null
  created_at: string
}

export interface Player {
  id: string
  league_id: string
  first_name: string
  last_name: string | null
  nickname: string | null
  rut: string
  photo_path: string | null
  created_at: string
}

export interface TeamPlayer {
  id: string
  team_id: string
  player_id: string
  shirt_number: number | null
  is_captain: boolean
  created_at: string
}

export interface TeamSeason {
  id: string
  team_id: string
  season_id: string
  created_at: string
}

export interface Competition {
  id: string
  season_id: string
  name: string
  created_at: string
}

export interface Stage {
  id: string
  competition_id: string
  name: string
  type: StageType
  order: number
  rules: Record<string, unknown> | null
  created_at: string
}

export interface StageGroup {
  id: string
  stage_id: string
  name: string
  created_at: string
}

export interface Match {
  id: string
  stage_id: string
  group_id: string | null
  home_team_season_id: string
  away_team_season_id: string
  home_score: number | null
  away_score: number | null
  status: MatchStatus
  round: number | null
  kickoff_at: string | null
  created_at: string
}

export interface MatchEvent {
  id: string
  match_id: string
  team_player_id: string
  event_type: MatchEventType
  minute: number | null
  created_at: string
}

// Joined/view types for convenience
export interface TeamWithPlayers extends Team {
  team_players: (TeamPlayer & { player: Player })[]
}

export interface MatchWithTeams extends Match {
  home_team_season: TeamSeason & { team: Team }
  away_team_season: TeamSeason & { team: Team }
}

export interface StandingRow {
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
}
