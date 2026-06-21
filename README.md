# Lagoinha Here!

Aplicacao web estatica para controle de presenca em aulas, cursos, palestras e eventos da Lagoinha Americana.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase Auth, Database e Storage
- QR Code publico por aula
- Exportacao CSV e XLSX
- GitHub Pages

## Rodando localmente

```bash
npm install
npm run dev
```

## Conectando no Supabase

O app precisa de duas variaveis publicas do Supabase:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Passo a passo:

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) e entre no projeto que voce criou.
2. No menu lateral do projeto, abra **Project Settings**.
3. Abra **API Keys** para encontrar as chaves. A documentacao oficial tambem indica que as chaves ficam em **Settings > API Keys**.
4. Copie a chave **anon** ou **publishable/anon public key**. Nao use `service_role` no front-end.
5. Para a URL, abra **Integrations > Data API** e copie a **API URL**, ou use a URL exibida no dialog **Connect** do projeto. Ela parece com `https://xxxx.supabase.co`.
6. Na raiz do projeto, crie um arquivo chamado `.env`:

```bash
copy .env.example .env
```

7. Abra `.env` e preencha assim:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

8. Pare e reinicie o servidor Vite:

```bash
npm run dev
```

Se o aviso amarelo da tela de login sumir, o front-end ja esta lendo as variaveis.

## Configurando o Supabase

1. No Supabase, abra **SQL Editor**.
2. Crie uma nova query.
3. Cole e execute todo o conteudo de `supabase/schema.sql`.
4. Abra **Authentication > Users**.
5. Clique em **Add user** ou crie o usuario pela tela de login, se preferir habilitar signup depois.
6. Copie o UUID do usuario.
7. No SQL Editor, marque esse usuario como admin:

```sql
update public.profiles
set is_admin = true, full_name = 'Seu Nome'
where id = 'UUID_DO_USUARIO';
```

8. Volte para o app e faca login com esse usuario.

O schema cria:

- `profiles`
- `app_settings`
- `courses`
- `class_sessions`
- `students`
- `checkins`
- bucket publico `media`
- indices, triggers `updated_at`, relacionamentos e politicas RLS

## Deploy no GitHub Pages

Repositorio alvo: `https://github.com/lagoinhahere/presenca`.

O workflow esta em `.github/workflows/deploy.yml`.

No repositorio do GitHub, configure:

- **Settings > Pages > Build and deployment > Source:** GitHub Actions
- **Settings > Secrets and variables > Actions > New repository secret:**
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

Depois faca push na branch `main`. O Vite ajusta o `base` automaticamente usando o nome do repositorio, entao o app sera publicado em:

```txt
https://lagoinhahere.github.io/presenca/
```

## Funcionalidades

- Login administrativo com sessao persistente
- Rotas protegidas
- Dashboard com cursos ativos, aulas, check-ins e presencas recentes
- CRUD de cursos/eventos com banner, cor, status, local e observacoes
- CRUD de aulas/encontros com QR Code unico
- Tela publica de QR Code para projetor/TV
- Check-in publico mobile-first
- Bloqueio de presenca duplicada por aula
- Historico com busca, periodo e exportacao CSV/XLSX
- Configuracoes de plataforma, logo, cores, imagem padrao e textos
- Upload de logos e banners no Supabase Storage
- Imagem individual por aula, com fallback para o banner do curso
- Fila de confirmacoes ao vivo no modo TV
- Comprovante de participacao opcional por e-mail
- Certificados premium com marca d'agua, frequencia e assinatura do professor

### Assinatura dos certificados

Em **Cursos > Editar**, preencha o campo **Professor / responsavel** e envie a assinatura correspondente. Para o melhor resultado no PDF, use PNG com fundo transparente e boa resolucao. A assinatura e armazenada no bucket `media` e aplicada somente aos certificados daquele curso.

## Comprovante por e-mail

O comprovante e enviado pela Edge Function `send-checkin-receipt`. O projeto usa o Brevo como provedor; a chave fica somente no Supabase e nunca e enviada ao navegador.

1. Crie uma conta no [Brevo](https://www.brevo.com/).
2. Em **Remetentes, dominio, IPs**, cadastre e valide o e-mail remetente.
3. Em **SMTP & API > Chaves API e MCP**, crie uma chave API.
4. No terminal, dentro deste projeto, configure os segredos:

```bash
supabase secrets set BREVO_API_KEY=sua_chave
supabase secrets set "CHECKIN_FROM_EMAIL=Lagoinha Here! <lagoinhahere@outlook.com>"
```

5. Aplique a migracao e publique a funcao:

```bash
supabase db push
supabase functions deploy send-checkin-receipt
```

As variaveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` ja existem automaticamente dentro das Edge Functions. Nao tente cadastra-las manualmente e nunca coloque a service role no front-end.

## Observacoes de seguranca

O app usa a chave anon/publishable publica do Supabase, como esperado em front-ends estaticos. A propria documentacao do Supabase descreve a chave anon como segura para navegador quando RLS esta habilitado. A chave `service_role` nunca deve ser colocada em `.env` do Vite, GitHub Pages ou qualquer codigo client-side.

A seguranca fica nas politicas RLS do banco. A tabela `students` permite leitura publica para viabilizar a verificacao de duplicidade no MVP; se quiser endurecer isso em producao, mova o fluxo de check-in para uma Edge Function com service role.

Referencias oficiais:

- [Supabase API Keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase Data API](https://supabase.com/docs/guides/api)
