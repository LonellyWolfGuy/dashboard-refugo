# 📊 Dashboard de Controle de Refugo — V2 (Modernizado por Thiago Fischer)

> **Status: 🟢 Versão 2.1 Estável** (Maio 2026)

[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

Sistema web para controle e análise de refugo industrial. Permite lançar registros diários de produção e refugo, visualizar tendências por mês e ano, analisar motivos de refugo e exportar relatórios em PDF — com dados persistidos em tempo real no Supabase e acesso protegido por autenticação.

---

## 🚀 Novidades da Versão Atual (V2)

- **Ano Dinâmico** — Fim da amarra ao ano de 2026. O sistema identifica o ano nativamente. (Implementado por Thiago Fischer)
- **UX Premium** — Diálogos de confirmação Shadcn/UI para operações sensíveis e layout de cards responsivos para dispositivos móveis. (Implementado por Thiago Fischer)
- **Arquitetura 100% Supabase** — Remoção completa de dados "seed" locais.
- **Segurança Reforçada (RLS)** — Implantação de _Row Level Security_ para blindar acessos indevidos a dados de outras sessões (quando no Supabase).
- **Optimistic Updates** — Sincronização instantânea na UI; registros aparecem, editam e somem da tela no exato momento do clique, com tratamento de erro e rollback automático. (Implementado por Thiago Fischer)
- **Performance de Elite** — Memoização profunda de estados derivados e processamento de meses, garantindo fluidez mesmo com centenas de registros. (Implementado por Thiago Fischer)

---

## ✨ Funcionalidades

- **Login seguro** — autenticação com e-mail e senha via Supabase Auth
- **KPIs em tempo real** — total produzido, total refugo, percentual do mês e comparativo com a meta configurável
- **Gráfico mensal** — barras empilhadas de produção × refugo com linha de meta
- **Gráfico anual** — visão consolidada dos 12 meses do ano
- **Análise por motivo** — gráfico de pizza e ranking dos principais motivos de refugo
- **Lançamentos flexíveis** — adicionar, editar e excluir registros; ao digitar data de outro mês, o registro é salvo no mês correto automaticamente
- **Motivos customizáveis** — lista de motivos configurável, vinculados a cada lançamento
- **Exportação PDF completa** — relatório mensal com totais, tabela de registros e motivos gerado no navegador
- **Persistência instantânea** — cada alteração é enviada ao Supabase imediatamente, sem aguardar ciclos do React
- **Save garantido no logout** — ao clicar em Sair, todos os dados são sincronizados com o banco antes de encerrar a sessão
- **Dados preservados entre deploys** — atualizações de código nunca sobrescrevem os dados do banco; cada registro é uma linha independente no Supabase, eliminando race conditions e sobrescrita acidental
- **Tema claro/escuro** — alternância manual pelo cabeçalho
- **Totalmente Responsivo** — layout inteligente que alterna entre tabela (Desktop) e Cards (Mobile) para máxima usabilidade em qualquer tela

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
│   │   └── logo.png                    # Logo da Implatec
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
│       │   ├── DashboardContext.tsx    # Estado global + persistência instantânea no Supabase
│       │   └── ThemeContext.tsx        # Controle de tema claro/escuro
│       ├── lib/
│       │   ├── supabase.ts             # Cliente Supabase compartilhado
│       │   ├── initialData.ts          # Tipos, interfaces e dados iniciais
│       │   ├── generatePDF.ts          # Gerador de relatório PDF
│       │   └── utils.ts                # Funções utilitárias
│       └── pages/
│           ├── Home.tsx                # Página principal (dashboard)
│           ├── LoginPage.tsx           # Tela de login
│           └── NotFound.tsx            # Página 404
├── supabase-setup.sql                  # Script SQL para configurar o banco
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
3. Cole o conteúdo do arquivo `supabase-setup.sql` (incluído no repositório) e clique em **Run (▶️)**

O script realiza automaticamente:
- Cria a tabela `app_data` com coluna `value` do tipo `JSONB` e campo `updated_at` com atualização automática por trigger
- Habilita Row Level Security (RLS)
- Cria política permissiva para leitura e escrita

> ⚠️ Se preferir restringir o acesso apenas a usuários autenticados, substitua a política no script por:
> ```sql
> CREATE POLICY "auth_only" ON app_data FOR ALL
>   USING (auth.role() = 'authenticated')
>   WITH CHECK (auth.role() = 'authenticated');
> ```

#### 1.2 Ativar autenticação por e-mail

1. Vá em **Authentication → Providers**
2. Confirme que **Email** está habilitado
3. Desmarque **"Confirm email"** para não exigir confirmação ao criar usuários

#### 1.3 Criar usuários de acesso

1. Vá em **Authentication → Users**
2. Clique em **+ Add user → Create new user**
3. Preencha e-mail e senha → **Create User**

Repita para cada colaborador. Para desativar sem excluir: **clique no usuário → Ban user**.

#### 1.4 Copiar as credenciais

Em **Settings → API**, copie:
- `Project URL` → valor de `VITE_SUPABASE_URL`
- `anon public` → valor de `VITE_SUPABASE_KEY`

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

O Vercel republica automaticamente a cada push no GitHub em 1–2 minutos.

---

## 💻 Desenvolvimento Local

### Pré-requisitos

- [Node.js](https://nodejs.org) 18+
- [pnpm](https://pnpm.io) 10+

### Instalação

```bash
git clone https://github.com/seu-usuario/dashboard-refugo.git
cd dashboard-refugo
pnpm install
cp .env.example .env.local
# Editar .env.local com suas credenciais do Supabase
```

### Variáveis de ambiente

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Executar

```bash
pnpm dev        # Desenvolvimento (http://localhost:3000)
pnpm build      # Build de produção
```

---

## 🔄 Como atualizar o código

O deploy é automático via GitHub + Vercel:

1. Edite os arquivos localmente
2. Abra o **GitHub Desktop**
3. Escreva uma descrição e clique em **Commit to main**
4. Clique em **Push origin**
5. O Vercel republica automaticamente em 1–2 minutos

---

## 🔐 Gerenciamento de Usuários

Todo o gerenciamento é feito no painel do Supabase, sem código:

| Ação | Caminho no Supabase |
|---|---|
| Criar usuário | Authentication → Users → + Add user |
| Alterar senha | Authentication → Users → clique no usuário → altere Password → Update User |
| Desativar usuário | Authentication → Users → clique no usuário → Ban user |
| Reativar usuário | Authentication → Users → clique no usuário → Unban user |
| Excluir usuário | Authentication → Users → clique no usuário → Delete user |
| Enviar reset de senha | Authentication → Users → clique no usuário → Send password recovery |

> ⚠️ A sessão expira após 1 hora de inatividade e é renovada automaticamente enquanto o usuário estiver ativo. Para alterar: **Authentication → Settings → JWT expiry**.

---

## 🖥️ Interface

### Cabeçalho

- **Navegação de mês** — botões `‹` e `›` para alternar meses
- **Exportar PDF** — gera relatório mensal completo (botão verde)
- **Relógio** — data e hora em tempo real
- **Modo escuro/claro** — alterna o tema
- **Usuário logado** — nome, e-mail e botão de logout com save automático

### Botão Sair

Ao clicar em **Sair**, a aplicação exibe `"Salvando dados..."`, realiza um flush completo de todos os dados no Supabase e só então encerra a sessão. Se o save falhar, a sessão é encerrada mesmo assim com aviso.

### Sidebar

Menu lateral com navegação por mês. Cada mês exibe um indicador colorido de status:

| Cor | Significado |
|---|---|
| 🟢 Verde | % refugo ≤ 80% da meta |
| 🟡 Âmbar | % refugo entre 80% e 100% da meta |
| 🔴 Vermelho | % refugo acima da meta |
| ⚪ Cinza | Sem registros |

### Tabela de Lançamentos

- **Layout Híbrido** — Em telas grandes, exibe uma tabela técnica detalhada. Em celulares, os dados se reorganizam automaticamente em **Cards** (cartões) empilhados, eliminando a rolagem horizontal e facilitando o toque nos botões de ação.
- **Feedback Visual** — Badges coloridos indicam instantaneamente se o registro do dia está dentro ou fora da meta.

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
| Gerenciamento de Estado | [React Query](https://tanstack.com/query) |
| Banco de dados | [Supabase](https://supabase.com) (PostgreSQL + JSONB) |
| Autenticação | [Supabase Auth](https://supabase.com/docs/guides/auth) |
| Suporte Offline | [Vite PWA](https://vite-pwa-org.netlify.app/) |
| Roteamento | [Wouter](https://github.com/molefrog/wouter) |
| Formulários | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| PDF | [jsPDF](https://github.com/parallax/jsPDF) |
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

Veja a seção **Detalhes de Implementação → Estrutura das tabelas** para o schema completo. O script `supabase-setup.sql` cria e configura tudo automaticamente.

---

## ⚙️ Configurações da Aplicação

Acessíveis pelo ícone ⚙️ na sidebar:

- **Meta de refugo (%)** — percentual alvo. Registros acima da meta são destacados em vermelho
- **Motivos de refugo** — lista customizável disponível ao lançar um registro

---

## 🔧 Detalhes de Implementação

### Arquitetura de persistência — um registro por linha (`DashboardContext.tsx`)

A versão anterior guardava todos os meses num único campo JSONB (`app_data`), o que causava dois problemas fatais:

- **Race condition**: dois lançamentos rápidos → o segundo `upsert` chegava ao Supabase com snapshot antigo, sobrescrevendo o primeiro
- **Sobrescrita no deploy**: a cada abertura do app, se a leitura do Supabase falhasse silenciosamente, o estado vazio do código era persistido por cima dos dados reais

**Solução**: cada registro diário é uma linha independente na tabela `registros`. As operações agora são atômicas:

| Ação | Operação no banco |
|---|---|
| Adicionar registro | `INSERT` de uma única linha |
| Editar registro | `UPDATE` pelo `id` |
| Excluir registro | `DELETE` pelo `id` |
| Alterar meta / motivos | `UPSERT` na tabela `config` |

```
Usuário adiciona lançamento
        │
        ├── INSERT registros (id=xyz, data=...) → linha isolada, sem risco de sobrescrever outras
        └── setMeses(atualizado)               → atualiza a UI localmente
```

Nunca mais um save sobrescreve outro. Cada registro vive e morre de forma independente.

### Sincronização Otimista (Optimistic Updates)

A aplicação utiliza uma estratégia de **Optimistic UI** via React Query. Quando você adiciona, edita ou exclui um registro:
1. A interface é atualizada **instantaneamente** localmente (o registro aparece/some na hora).
2. O envio para o servidor acontece em segundo plano.
3. Se houver erro de rede, a aplicação realiza um **rollback** automático, restaurando o dado anterior e avisando o usuário.
Isso garante uma experiência de uso extremamente fluida, ideal para ambientes de fábrica com Wi-Fi oscilante.

### Estrutura das tabelas no Supabase

**Tabela `registros`**

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | ID único gerado no frontend |
| `data` | `DATE` | Data do registro (YYYY-MM-DD) |
| `mes` | `INTEGER` | Mês (1–12) |
| `ano` | `INTEGER` | Ano |
| `producao` | `NUMERIC(12,3)` | Quantidade produzida |
| `refugo` | `NUMERIC(12,3)` | Quantidade refugada |
| `motivos` | `JSONB` | Array de motivos com quantidades |
| `updated_at` | `TIMESTAMPTZ` | Atualizado automaticamente |

**Tabela `config`**

| chave | valor |
|---|---|
| `meta_refugo` | número (ex: `25`) |
| `motivos` | array JSON de strings |

### Save no logout (`Home.tsx`)

O botão Sair chama `salvarTudo()` silenciosamente (sem exibir erro ao usuário) antes de `logout()`. Como cada ação já persiste atomicamente no banco, o `salvarTudo` serve apenas como safety net — recarrega os dados do Supabase para confirmar consistência.

### Geração de PDF (`generatePDF.ts`)

- Registros chegam já filtrados por mês via `getMesData()` — sem re-filtragem interna
- Datas lidas diretamente da string `YYYY-MM-DD` (sem `new Date()`) para evitar erros de fuso horário
- Coluna Motivos com quebra de linha automática (`splitTextToSize`) e altura de linha dinâmica
- Proteção contra divisão por zero no cálculo de `% refugo` por linha

---

## 📄 Licença

MIT © Implatec Perfis Plásticos

---

---

## 🛠️ Créditos e Desenvolvimento

Esta versão modernizada (V2) foi concebida e implementada por **Thiago Fischer**, focando na robustez industrial, suporte temporal dinâmico e excelência em UX.

---

<p align="center">
  Desenvolvido para controle de qualidade industrial — <strong>Implatec Perfis Plásticos ®</strong>
</p>
