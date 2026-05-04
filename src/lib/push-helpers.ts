import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushForMatch } from '@/actions/push'

interface MatchContext {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  teamIds: string[]
}

export async function getMatchContext(matchId: string): Promise<MatchContext | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('matches')
    .select(`
      id, home_score, away_score,
      home_team_season:team_season!matches_home_team_season_id_fkey(team_id, team:teams(name)),
      away_team_season:team_season!matches_away_team_season_id_fkey(team_id, team:teams(name))
    `)
    .eq('id', matchId)
    .single()

  if (!data) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any
  const hts = Array.isArray(raw.home_team_season) ? raw.home_team_season[0] : raw.home_team_season
  const ats = Array.isArray(raw.away_team_season) ? raw.away_team_season[0] : raw.away_team_season
  const ht = Array.isArray(hts?.team) ? hts.team[0] : hts?.team
  const at = Array.isArray(ats?.team) ? ats.team[0] : ats?.team

  const teamIds: string[] = []
  if (hts?.team_id) teamIds.push(hts.team_id)
  if (ats?.team_id) teamIds.push(ats.team_id)

  return {
    id: matchId,
    homeTeam: ht?.name ?? '?',
    awayTeam: at?.name ?? '?',
    homeScore: raw.home_score ?? 0,
    awayScore: raw.away_score ?? 0,
    teamIds,
  }
}

export async function getPlayerName(playerId: string): Promise<string> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('players')
    .select('first_name, last_name, nickname')
    .eq('id', playerId)
    .single()

  if (!data) return '?'
  if (data.nickname) return `${data.first_name} "${data.nickname}"`
  return `${data.first_name} ${data.last_name ?? ''}`.trim()
}

export async function getTeamName(teamSeasonId: string): Promise<string> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('team_season')
    .select('team:teams(short_name)')
    .eq('id', teamSeasonId)
    .single()

  if (!data) return '?'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const team = Array.isArray((data as any).team) ? (data as any).team[0] : (data as any).team
  return team?.short_name ?? '?'
}

type EventType = 'goal' | 'assist' | 'yellow' | 'red'

const EVENT_LABELS: Record<EventType, { emoji: string; label: string }> = {
  goal: { emoji: '⚽', label: 'GOL' },
  assist: { emoji: '👟', label: 'Asistencia' },
  yellow: { emoji: '🟨', label: 'Tarjeta amarilla' },
  red: { emoji: '🟥', label: 'Tarjeta roja' },
}

export async function notifyMatchEvent(
  matchId: string,
  teamSeasonId: string,
  playerId: string,
  eventType: EventType
) {
  try {
    const [match, playerName, teamName] = await Promise.all([
      getMatchContext(matchId),
      getPlayerName(playerId),
      getTeamName(teamSeasonId),
    ])

    if (!match) return

    const ev = EVENT_LABELS[eventType]
    const score = `${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`

    if (eventType === 'goal') {
      await sendPushForMatch({
        title: `${ev.emoji} ${ev.label}! ${playerName}`,
        body: `${teamName} — ${score}`,
        url: `/fixture`,
        tag: `match-${matchId}-goal`,
      }, match.teamIds)
    } else {
      await sendPushForMatch({
        title: `${ev.emoji} ${ev.label}`,
        body: `${playerName} (${teamName}) — ${score}`,
        url: `/fixture`,
        tag: `match-${matchId}-${eventType}`,
      }, match.teamIds)
    }
  } catch {
    // Never block the main action
  }
}

export async function notifyScoreUpdate(matchId: string, homeScore: number, awayScore: number) {
  try {
    const match = await getMatchContext(matchId)
    if (!match) return

    await sendPushForMatch({
      title: `⚽ ${match.homeTeam} ${homeScore} - ${awayScore} ${match.awayTeam}`,
      body: 'Marcador actualizado',
      url: '/fixture',
      tag: `match-${matchId}-score`,
    }, match.teamIds)
  } catch {
    // Never block the main action
  }
}

export async function notifyMatchFinalized(matchId: string) {
  try {
    const match = await getMatchContext(matchId)
    if (!match) return

    await sendPushForMatch({
      title: '🏁 Partido finalizado',
      body: `${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`,
      url: `/fixture`,
      tag: `match-${matchId}-final`,
    }, match.teamIds)
  } catch {
    // Never block the main action
  }
}

export async function notifyMvpSelected(matchId: string, playerId: string) {
  try {
    const [match, playerName] = await Promise.all([
      getMatchContext(matchId),
      getPlayerName(playerId),
    ])
    if (!match) return

    await sendPushForMatch({
      title: '🏅 MVP del partido',
      body: `${playerName} — ${match.homeTeam} vs ${match.awayTeam}`,
      url: `/fixture`,
      tag: `match-${matchId}-mvp`,
    }, match.teamIds)
  } catch {
    // Never block the main action
  }
}
