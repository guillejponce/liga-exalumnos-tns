'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getTeams(leagueId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('league_id', leagueId)
    .order('name')

  if (error) throw error
  return data
}

export async function getTeam(teamId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('teams')
    .select('*, team_players(*, player:players(*))')
    .eq('id', teamId)
    .single()

  if (error) throw error
  return data
}

export async function createTeam(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const short_name = formData.get('short_name') as string
  const league_id = formData.get('league_id') as string

  if (!name || !short_name || !league_id) {
    return { error: 'Nombre, nombre corto y liga son requeridos' }
  }

  const { error } = await supabase.from('teams').insert({
    name,
    short_name,
    league_id,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/equipos')
  revalidatePath('/equipos')
  return { success: true }
}

export async function updateTeam(formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const short_name = formData.get('short_name') as string

  if (!id || !name || !short_name) {
    return { error: 'Datos incompletos' }
  }

  const { error } = await supabase
    .from('teams')
    .update({ name, short_name })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/equipos')
  revalidatePath('/equipos')
  return { success: true }
}

export async function deleteTeam(teamId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('teams').delete().eq('id', teamId)

  if (error) return { error: error.message }

  revalidatePath('/admin/equipos')
  revalidatePath('/equipos')
  return { success: true }
}
