// supabase/functions/delete-user/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user_id_to_delete } = await req.json()
    if (!user_id_to_delete) {
      throw new Error("O 'user_id_to_delete' é obrigatório.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const supabaseUserClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
    )
    
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser()
    if (userError || !user) throw new Error("Autenticação falhou")
    
    // 4. VERIFICA se o chamador é um admin
    const { data: adminProfile, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (adminError || !adminProfile || !adminProfile.is_admin) {
         return new Response(JSON.stringify({ error: 'Acesso negado: Você não é um administrador.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401
        })
    }

    // 5. Impede que o admin delete a si mesmo
    if (user.id === user_id_to_delete) {
      throw new Error("Ação bloqueada: Você não pode deletar sua própria conta de administrador.")
    }

    // 6. [NOVA LÓGICA] Deleta o PERFIL do usuário primeiro
    // Isso vai acionar o ON DELETE CASCADE que você configurou.
    const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', user_id_to_delete);

    if (profileDeleteError && profileDeleteError.code !== '23503') {
        // 23503 é 'foreign key violation', o que é esperado se o CASCADE não estiver lá
        // Mas se for outro erro, lançamos.
         if (profileDeleteError.message.includes('foreign key constraint')) {
             throw new Error("Erro de Banco de Dados: O usuário ainda possui conteúdo (artigos, etc) e o 'ON DELETE CASCADE' não está configurado corretamente no Supabase. (Execute o SQL de CASCADE).");
         }
        throw profileDeleteError;
    }

    // 7. DELETA o usuário da autenticação
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id_to_delete)
    if (deleteError) {
      throw deleteError
    }

    return new Response(JSON.stringify({ message: 'Usuário e todo o seu conteúdo foram deletados com sucesso' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })

  } catch (e) {
    const error = e as Error 
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
  }
})