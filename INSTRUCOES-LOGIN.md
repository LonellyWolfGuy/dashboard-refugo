# 🔐 Sistema de Login — Guia de Atualização

## O que foi adicionado

- Tela de login com logo da Implatec (fundo branco)
- Autenticação JWT com senha criptografada (bcrypt)
- Tabela `users` no banco de dados PostgreSQL
- Proteção de todas as rotas da API
- Botão de logout no cabeçalho com nome do usuário logado
- Gerenciamento de usuários via API (somente admin)
- Scripts de migração e criação de admin

---

## 📋 Passo a Passo para Atualizar

### 1. Substitua os arquivos do projeto

Copie os arquivos desta pasta para o seu projeto, substituindo os existentes:

```
client/src/App.tsx               ← atualizado
client/src/pages/Home.tsx        ← atualizado
client/src/pages/LoginPage.tsx   ← NOVO
client/src/contexts/AuthContext.tsx ← NOVO
client/public/logo.png           ← NOVO
schema.ts                        ← atualizado (tabela users)
index.ts                         ← atualizado (rotas auth)
package.json                     ← atualizado (bcryptjs, jsonwebtoken)
.env.example                     ← atualizado (JWT_SECRET)
scripts/migrate-auth.ts          ← NOVO
scripts/create-admin.ts          ← NOVO
```

---

### 2. Instale as novas dependências

```bash
pnpm install
```

> Isso instala `bcryptjs`, `jsonwebtoken`, `@types/bcryptjs` e `@types/jsonwebtoken`.

---

### 3. Configure o .env

Copie o `.env.example` para `.env` (se ainda não existir) e adicione a variável:

```bash
# Gere uma chave segura com:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Adicione ao seu `.env`:

```env
JWT_SECRET=cole-aqui-a-chave-gerada-acima
```

> ⚠️ Em produção (Railway), adicione essa variável também nas **variáveis de ambiente do serviço**.

---

### 4. Execute a migração do banco de dados

```bash
pnpm db:migrate
```

Isso cria a tabela `users` no PostgreSQL. Você verá:

```
✅  Tabela 'users' criada (ou já existia).
👉  Agora execute: pnpm create-admin
```

---

### 5. Crie o usuário administrador

Antes de executar, abra o arquivo `scripts/create-admin.ts` e personalize:

```ts
const ADMIN_USERNAME = "admin";        // login de acesso
const ADMIN_SENHA    = "Implatec@2026"; // ALTERE para sua senha
const ADMIN_NOME     = "Administrador";
```

Depois execute:

```bash
pnpm create-admin
```

Você verá:

```
✅  Usuário 'admin' criado com sucesso.

   Login  : admin
   Senha  : Implatec@2026
   Perfil : admin
```

---

### 6. Inicie o servidor

```bash
pnpm dev
```

Acesse `http://localhost:3000` — a tela de login será exibida.

---

## 👥 Gerenciar Usuários

### Criar novo usuário (via API)

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -d '{
    "username": "joao",
    "password": "senha123",
    "nome": "João Silva",
    "role": "viewer"
  }'
```

### Roles disponíveis

| Role     | Permissão                                |
|----------|------------------------------------------|
| `admin`  | Acesso total + gerenciamento de usuários |
| `viewer` | Acesso ao dashboard (somente leitura)    |

### Resetar senha de um usuário

```bash
curl -X PATCH http://localhost:3001/api/users/ID_DO_USUARIO \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -d '{"password": "nova-senha"}'
```

### Desativar um usuário (sem excluir)

```bash
curl -X PATCH http://localhost:3001/api/users/ID_DO_USUARIO \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -d '{"ativo": false}'
```

---

## 🚀 Deploy no Railway

1. Faça o build antes do deploy:
   ```bash
   pnpm build
   ```

2. Adicione `JWT_SECRET` nas variáveis de ambiente do Railway:
   - Acesse seu projeto → **Variables** → adicione `JWT_SECRET`

3. Após o deploy, execute a migração e crie o admin **uma única vez** apontando para o banco de produção:
   ```bash
   DATABASE_URL=postgresql://... pnpm db:migrate
   DATABASE_URL=postgresql://... pnpm create-admin
   ```

---

## 🔒 Segurança

- Senhas armazenadas com **bcrypt** (salt rounds: 12)
- Tokens JWT com expiração de **8 horas**
- Todas as rotas `/api/entries`, `/api/summaries`, `/api/metas` e `/api/analytics` requerem autenticação
- Apenas usuários com `role: "admin"` podem gerenciar outros usuários

---

## ❓ Recuperar acesso (esqueci a senha do admin)

Execute novamente o script de criação (ele atualiza a senha se o usuário já existir):

```bash
# Edite a ADMIN_SENHA em scripts/create-admin.ts e execute:
pnpm create-admin
```
