'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createPlayer(formData: FormData) {
  const supabase = createAdminClient()

  const first_name = formData.get('first_name') as string
  const last_name = (formData.get('last_name') as string) || null
  const nickname = (formData.get('nickname') as string) || null
  const rut = formData.get('rut') as string
  const league_id = formData.get('league_id') as string
  const team_id = (formData.get('team_id') as string) || null
  const shirt_number = formData.get('shirt_number') as string
  const is_captain = formData.get('is_captain') === 'on'

  if (!first_name || !rut || !league_id) {
    return { error: 'Nombre, RUT y liga son requeridos' }
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ first_name, last_name, nickname, rut, league_id })
    .select()
    .single()

  if (playerError) {
    if (playerError.code === '23505') {
      return { error: 'Ya existe un jugador con ese RUT en esta liga' }
    }
    return { error: playerError.message }
  }

  if (team_id) {
    const { error: rosterError } = await supabase
      .from('team_players')
      .insert({
        team_id,
        player_id: player.id,
        shirt_number: shirt_number ? parseInt(shirt_number) : null,
        is_captain,
      })

    if (rosterError) return { error: rosterError.message }
  }

  revalidatePath('/admin/jugadores')
  revalidatePath('/equipos')
  return { success: true }
}

export async function updatePlayer(formData: FormData) {
  const supabase = createAdminClient()

  const id = formData.get('id') as string
  const first_name = formData.get('first_name') as string
  const last_name = (formData.get('last_name') as string) || null
  const nickname = (formData.get('nickname') as string) || null
  const rut = formData.get('rut') as string

  if (!id || !first_name || !rut) {
    return { error: 'Datos incompletos' }
  }

  const { error } = await supabase
    .from('players')
    .update({ first_name, last_name, nickname, rut })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/jugadores')
  return { success: true }
}

export async function deletePlayer(playerId: string) {
  const supabase = createAdminClient()

  await supabase.from('team_players').delete().eq('player_id', playerId)
  const { error } = await supabase.from('players').delete().eq('id', playerId)

  if (error) return { error: error.message }

  revalidatePath('/admin/jugadores')
  revalidatePath('/equipos')
  return { success: true }
}

export async function assignPlayerToTeam(formData: FormData) {
  const supabase = createAdminClient()

  const player_id = formData.get('player_id') as string
  const team_id = formData.get('team_id') as string
  const shirt_number = formData.get('shirt_number') as string
  const is_captain = formData.get('is_captain') === 'on'

  if (!player_id || !team_id) {
    return { error: 'Jugador y equipo son requeridos' }
  }

  await supabase.from('team_players').delete().eq('player_id', player_id)

  const { error } = await supabase.from('team_players').insert({
    team_id,
    player_id,
    shirt_number: shirt_number ? parseInt(shirt_number) : null,
    is_captain,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/jugadores')
  revalidatePath('/equipos')
  return { success: true }
}
