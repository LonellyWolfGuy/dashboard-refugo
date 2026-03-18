# 🔐 Guia de Instalação do Login — Supabase + Vercel

> Tempo estimado: 10 a 15 minutos  
> Sem linha de comando, sem servidor — tudo pelo painel.

---

## O que foi adicionado ao projeto

- Tela de login com logo da Implatec (fundo branco, campo e-mail + senha)
- Autenticação segura via Supabase Auth (senha criptografada pelo próprio Supabase)
- Botão de logout no cabeçalho com nome e e-mail do usuário logado
- Sessão que se mantém ao fechar e reabrir o navegador
- Proteção completa: ninguém acessa o dashboard sem fazer login

---

## PARTE 1 — Configurar o Supabase

### Passo 1 — Ativar autenticação por e-mail

1. Acesse supabase.com e abra seu projeto
2. Menu lateral → Authentication → Providers
3. Confirme que "Email" está HABILITADO
4. IMPORTANTE: desmarque "Confirm email" para não precisar confirmar ao criar usuários
   (Authentication → Providers → Email → desmarque "Confirm email")

---

### Passo 2 — Proteger os dados (copie e execute no SQL Editor)

1. Menu lateral → SQL Editor → + New query
2. Cole o código abaixo e clique em Run (▶️):

    ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Leitura autenticada"
      ON app_data FOR SELECT
      USING (auth.role() = 'authenticated');

    CREATE POLICY "Escrita autenticada"
      ON app_data FOR ALL
      USING (auth.role() = 'authenticated');

Isso garante que os dados só ficam acessíveis após o login.

---

### Passo 3 — Criar usuários de acesso

1. Supabase → Authentication → Users
2. Clique em "+ Add user" → "Create new user"
3. Preencha o e-mail e a senha
4. Clique em "Create User"

Repita para cada pessoa que precisar de acesso.

Para desativar um usuário: Authentication → Users → clique no usuário → "Ban user"
Para alterar senha: clique no usuário → altere o campo Password → "Update User"

---

## PARTE 2 — Configurar o Vercel

### Passo 4 — Adicionar variáveis de ambiente

1. vercel.com → abra seu projeto → Settings → Environment Variables
2. Adicione estas duas variáveis (marque Production + Preview + Development):

   VITE_SUPABASE_URL  →  https://xxxx.supabase.co
   VITE_SUPABASE_KEY  →  eyJ... (chave anon/public)

Onde encontrar esses valores no Supabase:
→ Settings → API → "Project URL" e "anon public"

---

### Passo 5 — Substituir os arquivos do projeto

Substitua no seu repositório:

  client/src/App.tsx                     (atualizado)
  client/src/pages/Home.tsx              (atualizado)
  client/src/pages/LoginPage.tsx         (NOVO)
  client/src/contexts/AuthContext.tsx    (NOVO)
  client/src/contexts/DashboardContext.tsx (atualizado)
  client/src/lib/supabase.ts             (NOVO)
  client/public/logo.png                 (NOVO)

---

### Passo 6 — Fazer o deploy

O Vercel detecta automaticamente quando você commita no GitHub/GitLab e faz o deploy.

Para acionar manualmente:
  Vercel → seu projeto → Deployments → ... → Redeploy

Após o deploy, acesse a URL — a tela de login aparecerá.

---

## PARTE 3 — Teste local (opcional)

Crie o arquivo .env.local na raiz do projeto:

  VITE_SUPABASE_URL=https://xxxx.supabase.co
  VITE_SUPABASE_KEY=eyJ...sua-chave-anon...

Execute:
  pnpm install
  pnpm dev

Acesse http://localhost:3000

---

## Perguntas frequentes

Esqueceu a senha?
→ Supabase → Authentication → Users → clique no usuário → "Send password recovery"
  Um e-mail de redefinição será enviado automaticamente.

Como mudar a senha de um usuário?
→ Authentication → Users → clique no usuário → altere Password → "Update User"

Posso ter vários usuários?
→ Sim, sem limite. Crie quantos quiser em Authentication → Users.

A sessão expira?
→ Após 1 hora de inatividade (renovada automaticamente se estiver usando).
  Para alterar: Authentication → Settings → JWT expiry.

Deu erro "Invalid login credentials"?
→ Verifique e-mail e senha. Se acabou de criar o usuário, aguarde alguns segundos.
