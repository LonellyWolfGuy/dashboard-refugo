# 📊 Dashboard de Controle de Refugo

[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

Sistema web para controle e análise de refugo industrial. Permite lançar registros diários de produção e refugo, visualizar tendências por mês e ano, analisar motivos de refugo e exportar relatórios em PDF — com dados compartilhados em tempo real entre todos os usuários via Supabase. O acesso é protegido por autenticação via Supabase Auth.

---

## ✨ Funcionalidades

- **Login seguro** — tela de autenticação com e-mail e senha gerenciados pelo Supabase Auth
- **KPIs em tempo real** — total produzido, total refugo, percentual do mês e comparativo com a meta configurável
- **Gráfico mensal** — barras empilhadas de produção × refugo com linha de meta
- **Gráfico anual** — visão consolidada dos 12 meses do ano
- **Análise por motivo** — gráfico de pizza e ranking dos principais motivos de refugo
- **Lançamentos flexíveis** — adicionar, editar e excluir registros de qualquer data; ao digitar uma data de outro mês, o registro é automaticamente salvo no mês correto
- **Motivos de refugo** — lista customizável de motivos vinculados a cada lançamento
- **Exportação PDF** — relatório mensal gerado diretamente no navegador
- **Tema claro/escuro** — alternância manual pelo botão no cabeçalho
- **Responsivo** — funciona em desktop, tablet e celular
- **Dados em nuvem** — todos os usuários compartilham os mesmos dados via Supabase em tempo real

---

## 🏗️ Arquitetura

```
Navegador (React + Vite)
        │
        ▼
   Vercel (CDN)          ← hospedagem estática, sem servidor
        │
        ▼
  Supabase               ← banco de dados (app_data) + autenticação (Auth)
```

O frontend comunica diretamente com o Supabase usando as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY`. Não há servidor intermediário.

---

## 🗂️ Estrutura do Projeto

```
dashboard-refugo/
├── client/
│   ├── public/
│   │   └── logo.png                    # Logo da Implatec (exibida na tela de login)
│   └── src/
│       ├── components/
│       │   ├── ui/                     # Componentes base (shadcn/ui)
│       │   ├── KpiCards.tsx            # Cards de indicadores no topo
│       │   ├── GraficoMensal.tsx       # Gráfico de barras do mês
│       │   ├── GraficoAnual.tsx        # Gráfico de visão anual
│       │   ├── TabelaRegistros.tsx     # Tabela de lançamentos com CRUD
│       │   ├── AnaliseMotivoRefugo.tsx # Análise por motivo
│       │   ├── Sidebar.tsx             # Menu lateral com navegação por mês
│       │   ├── ModalConfiguracoes.tsx  # Configurações (meta, motivos)
│       │   └── ModalMotivoRefugo.tsx   # Modal de motivos por lançamento
│       ├── contexts/
│       │   ├── AuthContext.tsx         # Estado de autenticação + Supabase Auth
│       │   ├── DashboardContext.tsx    # Estado global + integração Supabase
│       │   └── ThemeContext.tsx        # Controle de tema claro/escuro
│       ├── lib/
│       │   ├── supabase.ts             # Cliente Supabase compartilhado
│       │   ├── initialData.ts          # Tipos, interfaces e dados iniciais
│       │   ├── generatePDF.ts          # Gerador de relatório PDF
│       │   └── utils.ts                # Funções utilitárias
│       └── pages/
│           ├── Home.tsx                # Página principal (dashboard)
│           ├── LoginPage.tsx           # Tela de login com logo Implatec
│           └── NotFound.tsx            # Página 404
├── server/
│   └── index.ts                        # Servidor Express (uso local apenas)
├── shared/
│   └── const.ts                        # Constantes compartilhadas
├── vercel.json                         # Configuração de deploy no Vercel
├── vite.config.ts                      # Configuração do Vite
└── package.json
```

---

## 🚀 Deploy (Produção)

### 1. Banco de dados e autenticação — Supabase

#### 1.1 Criar a tabela e configurar segurança

1. Acesse [supabase.com](https://supabase.com) e abra seu projeto
2. Vá em **SQL Editor → New query**
3. Cole o bloco abaixo **completo** e clique em **Run (▶️)**:

```sql
-- 1. Cria a tabela de dados do dashboard
CREATE TABLE app_data (
  key TEXT PRIMARY KEY,
  value JSONB
);

-- 2. Insere os registros iniciais vazios
INSERT INTO app_data (key, value)
VALUES ('meses', '[]'), ('config', '{}');

-- 3. Ativa a proteção por linha (RLS)
ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;

-- 4. Apenas usuários autenticados podem ler os dados
CREATE POLICY "Leitura autenticada"
  ON app_data FOR SELECT
  USING (auth.role() = 'authenticated');

-- 5. Apenas usuários autenticados podem salvar os dados
CREATE POLICY "Escrita autenticada"
  ON app_data FOR ALL
  USING (auth.role() = 'authenticated');
```

> ⚠️ **Importante:** execute sempre este bloco inteiro de uma vez. Rodar os passos separadamente pode causar erros, pois a proteção (RLS) depende da tabela já existir.

#### 1.2 Ativar autenticação por e-mail

1. Vá em **Authentication → Providers**
2. Confirme que **Email** está habilitado
3. Desmarque **"Confirm email"** para não precisar confirmar ao criar usuários

#### 1.4 Criar usuários de acesso

1. Vá em **Authentication → Users**
2. Clique em **+ Add user → Create new user**
3. Preencha e-mail e senha → **Create User**

Repita para cada pessoa que precisar acessar o sistema. Para desativar um usuário sem excluí-lo: clique no usuário → **Ban user**.

#### 1.5 Copiar as credenciais

Em **Settings → API**, copie:
- `Project URL` → será o valor de `VITE_SUPABASE_URL`
- `anon public` → será o valor de `VITE_SUPABASE_KEY`

---

### 2. Hospedagem — Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com o GitHub
2. Clique em **Add New → Project** e importe este repositório
3. Em **Settings → Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_KEY` | Chave `anon public` do Supabase |

4. Clique em **Deploy**

O Vercel detecta automaticamente qualquer novo push no GitHub e republica em 1–2 minutos.

---

## 💻 Desenvolvimento Local

### Pré-requisitos

- [Node.js](https://nodejs.org) 18+
- [pnpm](https://pnpm.io) 10+

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/dashboard-refugo.git
cd dashboard-refugo

# Instalar dependências
pnpm install

# Criar arquivo de variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas credenciais do Supabase
```

### Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Executar em desenvolvimento

```bash
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### Build para produção

```bash
# Build apenas do frontend (usado pelo Vercel)
pnpm run build:vercel
```

---

## 🔄 Como atualizar o código

O deploy é automático via GitHub + Vercel:

1. Edite os arquivos na pasta local do projeto
2. Abra o **GitHub Desktop**
3. Escreva uma descrição da mudança e clique em **Commit to main**
4. Clique em **Push origin**
5. O Vercel detecta e republica automaticamente em 1–2 minutos

---

## 🔐 Gerenciamento de Usuários

Todo o gerenciamento é feito diretamente no painel do Supabase, sem necessidade de código:

| Ação | Caminho no Supabase |
|---|---|
| Criar usuário | Authentication → Users → + Add user |
| Alterar senha | Authentication → Users → clique no usuário → altere Password → Update User |
| Desativar usuário | Authentication → Users → clique no usuário → Ban user |
| Reativar usuário | Authentication → Users → clique no usuário → Unban user |
| Excluir usuário | Authentication → Users → clique no usuário → Delete user |
| Enviar link de reset de senha | Authentication → Users → clique no usuário → Send password recovery |

> ⚠️ A sessão expira após 1 hora de inatividade e é renovada automaticamente enquanto o usuário estiver ativo. Para alterar esse tempo: **Authentication → Settings → JWT expiry**.

---

## 🖥️ Interface

### Cabeçalho (Header)

O cabeçalho do dashboard contém da esquerda para a direita:

- **Navegação de mês** — botões `‹` e `›` para alternar entre os meses
- **Exportar PDF** — gera o relatório mensal em PDF (botão verde)
- **Relógio** — data e hora em tempo real
- **Modo escuro/claro** — alterna o tema da interface
- **Usuário logado** — exibe o nome e e-mail, com botão de logout (🔓)

### Rodapé (Footer)

```
Controle de Refugos — 2026 — Implatec Perfis Plásticos ® — Todos os direitos reservados.
```

### Tela de Login

Exibe a logo da Implatec sobre fundo branco, com campos de e-mail e senha. Após autenticação bem-sucedida, o usuário é redirecionado automaticamente ao dashboard.

---

## 📦 Tecnologias

| Categoria | Tecnologia |
|---|---|
| Framework UI | [React 19](https://react.dev) |
| Linguagem | [TypeScript 5.6](https://www.typescriptlang.org) |
| Build | [Vite 7](https://vitejs.dev) |
| Estilização | [Tailwind CSS 4](https://tailwindcss.com) |
| Componentes | [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://radix-ui.com) |
| Gráficos | [Recharts](https://recharts.org) |
| Banco de dados | [Supabase](https://supabase.com) (PostgreSQL) |
| Autenticação | [Supabase Auth](https://supabase.com/docs/guides/auth) |
| Roteamento | [Wouter](https://github.com/molefrog/wouter) |
| Formulários | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| PDF | [jsPDF](https://github.com/parallax/jsPDF) |
| Animações | [Framer Motion](https://www.framer.com/motion) |
| Notificações | [Sonner](https://sonner.emilkowal.ski) |
| Hospedagem | [Vercel](https://vercel.com) |

---

## 📐 Modelo de Dados

### `DailyRecord` — Registro diário

```typescript
interface DailyRecord {
  id: string;               // Identificador único
  data: string;             // Data no formato YYYY-MM-DD
  producao: number;         // Quantidade produzida
  refugo: number;           // Quantidade refugada
  motivos?: RefugoMotivo[]; // Motivos opcionais
}
```

### `RefugoMotivo` — Motivo de refugo

```typescript
interface RefugoMotivo {
  id: string;
  motivo: string;      // Descrição do motivo
  quantidade: number;  // Quantidade atribuída a este motivo
}
```

### `MonthData` — Dados de um mês

```typescript
interface MonthData {
  mes: number;               // 1–12
  ano: number;               // Ex: 2026
  registros: DailyRecord[];  // Lançamentos do mês
}
```

### Estrutura no Supabase

Os dados são armazenados na tabela `app_data` com duas linhas:

| key | value |
|---|---|
| `meses` | Array JSON de `MonthData[]` com todos os registros |
| `config` | Objeto JSON com `{ metaRefugo: number, motivos: string[] }` |

---

## ⚙️ Configurações da Aplicação

Acessíveis pelo ícone de engrenagem (⚙️) na sidebar:

- **Meta de refugo (%)** — percentual alvo. Registros acima da meta são destacados em vermelho, abaixo em verde
- **Motivos de refugo** — lista customizável de motivos disponíveis ao lançar um registro

---

## 📄 Licença

MIT © Implatec Perfis Plásticos

---

<p align="center">
  Desenvolvido para controle de qualidade industrial — <strong>Implatec Perfis Plásticos ® 2026</strong>
</p>
