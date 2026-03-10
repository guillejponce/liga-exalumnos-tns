import { createAdminClient } from '@/lib/supabase/admin'

export async function getLeague() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('leagues')
    .select('*')
    .limit(1)
    .single()

  if (error) return null
  return data
}

export async function getActiveSeasonForLeague(leagueId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .eq('is_active', true)
    .single()

  return data
}
