'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

function revalidateTeams() {
  revalidatePath('/admin/equipos')
  revalidatePath('/equipos')
  revalidatePath('/admin/temporadas')
}

export async function createTeam(formData: FormData) {
  const supabase = createAdminClient()

  const name = formData.get('name') as string
  const short_name = formData.get('short_name') as string
  const league_id = formData.get('league_id') as string
  const crestFile = formData.get('crest') as File | null

  if (!name || !short_name || !league_id) {
    return { error: 'Nombre, nombre corto y liga son requeridos' }
  }

  const { data: team, error } = await supabase
    .from('teams')
    .insert({ name, short_name, league_id })
    .select('id')
    .single()

  if (error) return { error: error.message }

  if (crestFile && crestFile.size > 0) {
    const uploadResult = await uploadCrest(supabase, team.id, crestFile)
    if (uploadResult.error) return { error: uploadResult.error }
  }

  revalidateTeams()
  return { success: true }
}

export async function updateTeam(formData: FormData) {
  const supabase = createAdminClient()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const short_name = formData.get('short_name') as string
  const crestFile = formData.get('crest') as File | null

  if (!id || !name || !short_name) {
    return { error: 'Datos incompletos' }
  }

  const { error } = await supabase
    .from('teams')
    .update({ name, short_name })
    .eq('id', id)

  if (error) return { error: error.message }

  if (crestFile && crestFile.size > 0) {
    const uploadResult = await uploadCrest(supabase, id, crestFile)
    if (uploadResult.error) return { error: uploadResult.error }
  }

  revalidateTeams()
  return { success: true }
}

export async function deleteTeam(teamId: string) {
  const supabase = createAdminClient()

  // Remove crest files from storage
  const { data: files } = await supabase.storage
    .from('public')
    .list(`teams/${teamId}`)

  if (files && files.length > 0) {
    await supabase.storage
      .from('public')
      .remove(files.map((f) => `teams/${teamId}/${f.name}`))
  }

  const { error } = await supabase.from('teams').delete().eq('id', teamId)

  if (error) return { error: error.message }

  revalidateTeams()
  return { success: true }
}

async function uploadCrest(
  supabase: ReturnType<typeof createAdminClient>,
  teamId: string,
  file: File
) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const storagePath = `teams/${teamId}/crest.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('public')
    .upload(storagePath, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: `Error subiendo logo: ${uploadError.message}` }

  const { error: updateError } = await supabase
    .from('teams')
    .update({ crest_path: storagePath })
    .eq('id', teamId)

  if (updateError) return { error: `Error guardando ruta: ${updateError.message}` }

  return { success: true }
}

export async function removeCrest(teamId: string) {
  const supabase = createAdminClient()

  const { data: team } = await supabase
    .from('teams')
    .select('crest_path')
    .eq('id', teamId)
    .single()

  if (team?.crest_path) {
    await supabase.storage.from('public').remove([team.crest_path])
  }

  const { error } = await supabase
    .from('teams')
    .update({ crest_path: null })
    .eq('id', teamId)

  if (error) return { error: error.message }

  revalidateTeams()
  return { success: true }
}
