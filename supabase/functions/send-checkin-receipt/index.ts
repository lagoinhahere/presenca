import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type StudentRecord = { full_name: string; email: string | null }
type CourseRecord = { name: string; location: string | null; banner_url: string | null }
type SessionRecord = {
  name: string
  description: string | null
  session_date: string | null
  starts_at: string | null
  location: string | null
  banner_url: string | null
  courses: CourseRecord | CourseRecord[] | null
}
type CheckinRecord = { id: string; checked_in_at: string }

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { checkinId } = await request.json()
    if (typeof checkinId !== 'string' || !/^[0-9a-f-]{36}$/i.test(checkinId)) {
      return json({ error: 'Check-in invalido.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('CHECKIN_FROM_EMAIL')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuracao interna do Supabase indisponivel.')
    }
    if (!resendApiKey || !fromEmail) {
      return json({ error: 'O envio de e-mail ainda nao foi configurado.' }, 503)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: checkin, error: queryError } = await admin
      .from('checkins')
      .select(`
        id,
        checked_in_at,
        receipt_requested,
        receipt_sent_at,
        students (full_name, email),
        class_sessions (
          name,
          description,
          session_date,
          starts_at,
          location,
          banner_url,
          courses (name, location, banner_url)
        )
      `)
      .eq('id', checkinId)
      .single()

    if (queryError || !checkin) {
      return json({ error: 'Check-in nao encontrado.' }, 404)
    }
    if (!checkin.receipt_requested) {
      return json({ error: 'O participante nao solicitou comprovante.' }, 403)
    }
    if (checkin.receipt_sent_at) {
      return json({ sent: true, alreadySent: true })
    }

    const student = relation(checkin.students) as StudentRecord | null
    const session = relation(checkin.class_sessions) as SessionRecord | null
    const course = relation(session?.courses)
    if (!student?.email) {
      return json({ error: 'O check-in nao possui e-mail.' }, 422)
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [student.email],
        subject: `Presenca confirmada | ${session?.name ?? 'Lagoinha Here!'}`,
        html: receiptHtml({ checkin, student, session, course }),
      }),
    })

    if (!emailResponse.ok) {
      const providerError = await emailResponse.text()
      console.error('Resend error:', providerError)
      await admin.from('checkins').update({ receipt_error: providerError.slice(0, 500) }).eq('id', checkinId)
      return json({ error: 'O provedor recusou o envio do e-mail.' }, 502)
    }

    await admin
      .from('checkins')
      .update({ receipt_sent_at: new Date().toISOString(), receipt_error: null })
      .eq('id', checkinId)

    return json({ sent: true })
  } catch (error) {
    console.error(error)
    return json({ error: 'Nao foi possivel enviar o comprovante.' }, 500)
  }
})

function relation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function receiptHtml({
  checkin,
  student,
  session,
  course,
}: {
  checkin: CheckinRecord
  student: StudentRecord
  session: SessionRecord | null
  course: CourseRecord | null
}) {
  const banner = session?.banner_url || course?.banner_url
  const location = session?.location || course?.location || 'Lagoinha Americana'
  const date = session?.session_date
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${session.session_date}T12:00:00Z`))
    : 'Data informada pela organizacao'
  const time = session?.starts_at ? String(session.starts_at).slice(0, 5) : null
  const receiptNumber = String(checkin.id).slice(0, 8).toUpperCase()

  return `<!doctype html>
  <html lang="pt-BR">
    <body style="margin:0;background:#080806;color:#f8f3df;font-family:Arial,Helvetica,sans-serif">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080806;padding:28px 12px">
        <tr><td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;overflow:hidden;border:1px solid #332b0b;background:#11110d">
            ${banner ? `<tr><td><img src="${escapeHtml(banner)}" alt="" width="640" style="display:block;width:100%;max-height:270px;object-fit:cover"></td></tr>` : ''}
            <tr><td style="padding:34px 34px 18px">
              <p style="margin:0 0 10px;color:#f4c400;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase">Lagoinha Americana</p>
              <h1 style="margin:0;color:#ffffff;font-size:32px;line-height:1.15">Presenca confirmada</h1>
              <p style="margin:16px 0 0;color:#c8bea0;font-size:16px;line-height:1.6">Ola, <strong style="color:#fff">${escapeHtml(student.full_name)}</strong>. Este e o seu comprovante de participacao.</p>
            </td></tr>
            <tr><td style="padding:8px 34px 28px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #3d3516;background:#090908">
                <tr><td style="padding:22px">
                  <p style="margin:0;color:#8f8569;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">Curso ou evento</p>
                  <p style="margin:7px 0 20px;color:#f4c400;font-size:19px;font-weight:800">${escapeHtml(course?.name || 'Lagoinha Americana')}</p>
                  <p style="margin:0;color:#8f8569;font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase">Aula</p>
                  <p style="margin:7px 0 20px;color:#fff;font-size:22px;font-weight:800">${escapeHtml(session?.name || 'Encontro')}</p>
                  <p style="margin:0;color:#d8cfb5;font-size:15px;line-height:1.7">${escapeHtml(date)}${time ? `, as ${escapeHtml(time)}` : ''}<br>${escapeHtml(location)}</p>
                </td></tr>
              </table>
            </td></tr>
            <tr><td style="padding:20px 34px;border-top:1px solid #2b2717;color:#82795f;font-size:12px;line-height:1.6">
              Comprovante #${escapeHtml(receiptNumber)}<br>
              Check-in registrado em ${escapeHtml(new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(checkin.checked_in_at)))}.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
  </html>`
}
