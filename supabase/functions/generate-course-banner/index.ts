const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const basePrompt = `Voce e um diretor de arte especializado em imagens cristas profissionais para websites institucionais.

Gere uma imagem para banner de site com o tema informado pelo usuario.

Contexto do site:
O banner sera usado em um site cristao ligado a igreja, formacao espiritual, discipulado, presenca de Deus e ensino biblico. A imagem deve parecer profissional, moderna, reverente e adequada para divulgacao de cursos, trilhas de estudo ou conteudos teologicos.

Especificacoes obrigatorias:
- Tamanho: 1600 x 900 px
- Formato: horizontal, proporcao 16:9
- Uso: banner principal ou secao visual de site
- Nao incluir texto na imagem
- Nao incluir logotipo
- Nao incluir marcas, nomes de igrejas ou palavras legiveis
- Manter espaco livre para aplicacao posterior de titulo, subtitulo e botao no site

Direcao visual:
Crie uma imagem com estetica cinematografica, realista e institucional, transmitindo profundidade biblica, sabedoria, acolhimento, espiritualidade crista e excelencia no ensino teologico.

Elementos visuais possiveis:
- Biblia aberta
- Livros teologicos
- Anotacoes de estudo
- Sala de aula crista
- Grupo de alunos estudando
- Luz quente entrando no ambiente
- Cruz discreta
- Igreja contemporanea
- Mesa de estudos
- Ambiente devocional profundo

Estilo:
- Premium
- Moderno
- Reverente
- Profissional
- Cristao contemporaneo
- Editorial
- Limpo e sofisticado

Paleta:
- Dourado suave
- Ambar
- Creme
- Marrom elegante
- Azul profundo
- Luz quente e espiritual

Composicao:
- Criar uma imagem impactante para hero banner
- Fundo com profundidade e leve desfoque
- Alta nitidez no ponto focal
- Sem poluicao visual

Evitar:
- Aparencia generica de banco de imagens
- Excesso de simbolos religiosos
- Maos ou rostos deformados
- Texto aleatorio
- Estilo infantil, cartoon ou ilustracao amadora
- Visual sombrio, pesado ou assustador

Resultado esperado:
Uma imagem profissional em 1600 x 900 px para banner de site cristao, pronta para receber textos sobrepostos no layout.`

type RequestBody = {
  description?: string
  courseName?: string
  areaText?: string
  focusVisual?: string
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (request.method !== 'POST') {
      return json({ error: 'Metodo nao permitido.' }, 405)
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!openAiKey || !supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Secrets da Edge Function nao configurados.' }, 500)
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Sessao administrativa nao encontrada.' }, 401)
    }

    const isAdmin = await verifyAdmin(supabaseUrl, serviceRoleKey, authHeader)
    if (!isAdmin) {
      return json({ error: 'Apenas administradores podem gerar banners.' }, 403)
    }

    const body = (await request.json()) as RequestBody
    const description = body.description?.trim()
    if (!description) {
      return json({ error: 'Descreva o banner antes de gerar.' }, 400)
    }

    const prompt = buildPrompt({
      description,
      courseName: body.courseName?.trim() || 'Curso ou evento cristao',
      areaText: body.areaText?.trim() || 'lado esquerdo',
      focusVisual: body.focusVisual?.trim() || 'lado direito ou centro-direita',
    })

    console.info('Generating banner image', { courseName: body.courseName, size: '1536x1024' })

    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1536x1024',
        quality: 'high',
      }),
    })

    const imagePayload = await imageResponse.json()
    if (!imageResponse.ok) {
      console.error('OpenAI image generation failed', imagePayload)
      return json({ error: imagePayload?.error?.message ?? 'Nao foi possivel gerar a imagem.' }, imageResponse.status)
    }

    const base64 = imagePayload?.data?.[0]?.b64_json
    if (!base64) {
      return json({ error: 'A OpenAI nao retornou a imagem em base64.' }, 502)
    }

    const bytes = base64ToBytes(base64)
    const filename = `${crypto.randomUUID()}.webp`
    const path = `banners/generated/${filename}`
    const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/media/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'image/webp',
        'x-upsert': 'false',
      },
      body: bytes,
    })

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text()
      console.error('Storage upload failed', uploadError)
      return json({ error: `Imagem gerada, mas o upload falhou: ${uploadError}` }, 502)
    }

    return json({
      banner_url: `${supabaseUrl}/storage/v1/object/public/media/${path}`,
      path,
      prompt,
    })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Erro inesperado ao gerar banner.' }, 500)
  }
})

async function verifyAdmin(supabaseUrl: string, serviceRoleKey: string, authHeader: string) {
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: serviceRoleKey,
    },
  })

  if (!userResponse.ok) return false

  const user = await userResponse.json()
  if (!user?.id) return false

  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=is_admin&limit=1`, {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
  })

  if (!profileResponse.ok) return false

  const profiles = await profileResponse.json()
  return profiles?.[0]?.is_admin === true
}

function buildPrompt({
  description,
  courseName,
  areaText,
  focusVisual,
}: {
  description: string
  courseName: string
  areaText: string
  focusVisual: string
}) {
  return `${basePrompt}

Tema do curso/evento:
"${courseName}"

Tema especifico informado pelo usuario:
"${description}"

Composicao obrigatoria:
- Deixar espaco negativo em "${areaText}" para sobrepor textos do site.
- Manter o assunto principal em "${focusVisual}".
- Evitar qualquer texto, letras, numeros, marca d'agua ou simbolos aleatorios dentro da imagem.
- Resultado final deve parecer fotografia/editorial premium, nao ilustracao amadora.`
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
