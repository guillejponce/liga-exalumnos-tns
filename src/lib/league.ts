import { createClient } from '@/lib/supabase/server'

export async function getLeague() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .limit(1)
    .single()

  if (error) return null
  return data
}

export async function getActiveSeasonForLeague(leagueId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .eq('is_active', true)
    .single()

  return data
}
