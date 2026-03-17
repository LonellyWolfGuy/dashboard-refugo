# 📊 Dashboard de Controle de Refugo

[![Deploy on Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

Sistema web para controle e análise de refugo industrial. Permite lançar registros diários de produção e refugo, visualizar tendências por mês e ano, analisar motivos de refugo e exportar relatórios em PDF — com dados compartilhados em tempo real entre todos os usuários via Supabase.

---

## ✨ Funcionalidades

- **KPIs em tempo real** — total produzido, total refugo, percentual do mês e comparativo com a meta configurável
- **Gráfico mensal** — barras empilhadas de produção × refugo com linha de meta
- **Gráfico anual** — visão consolidada dos 12 meses do ano
- **Análise por motivo** — gráfico de pizza e ranking dos principais motivos de refugo
- **Lançamentos flexíveis** — adicionar, editar e excluir registros de qualquer data (passado, presente ou futuro); ao digitar uma data de outro mês, o registro é automaticamente salvo no mês correto
- **Motivos de refugo** — lista customizável de motivos vinculados a cada lançamento
- **Exportação PDF** — relatório mensal gerado diretamente no navegador
- **Tema claro/escuro** — alternância automática ou manual
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
  Supabase (PostgreSQL)  ← banco de dados compartilhado
```

O frontend comunica diretamente com o Supabase usando as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_KEY`. Não há servidor intermediário.

---

## 🗂️ Estrutura do Projeto

```
dashboard-refugo/
├── client/                         # Aplicação React (frontend)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                 # Componentes base (shadcn/ui)
│   │   │   ├── KpiCards.tsx        # Cards de indicadores no topo
│   │   │   ├── GraficoMensal.tsx   # Gráfico de barras do mês
│   │   │   ├── GraficoAnual.tsx    # Gráfico de visão anual
│   │   │   ├── TabelaRegistros.tsx # Tabela de lançamentos com CRUD
│   │   │   ├── AnaliseMotivoRefugo.tsx # Análise por motivo
│   │   │   ├── Sidebar.tsx         # Menu lateral com navegação por mês
│   │   │   ├── ModalConfiguracoes.tsx  # Configurações (meta, motivos)
│   │   │   └── ModalMotivoRefugo.tsx   # Modal de motivos por lançamento
│   │   ├── contexts/
│   │   │   ├── DashboardContext.tsx # Estado global + integração Supabase
│   │   │   └── ThemeContext.tsx     # Controle de tema claro/escuro
│   │   ├── lib/
│   │   │   ├── initialData.ts      # Tipos, interfaces e dados iniciais
│   │   │   ├── generatePDF.ts      # Gerador de relatório PDF
│   │   │   └── utils.ts            # Funções utilitárias
│   │   └── pages/
│   │       └── Home.tsx            # Página principal
│   └── index.html
├── server/
│   └── index.ts                    # Servidor Express (uso local apenas)
├── shared/
│   └── const.ts                    # Constantes compartilhadas
├── vercel.json                     # Configuração de deploy no Vercel
├── vite.config.ts                  # Configuração do Vite
└── package.json
```

---

## 🚀 Deploy (Produção)

A aplicação usa **Vercel** para hospedagem e **Supabase** como banco de dados. Ambos são gratuitos.

### 1. Banco de dados — Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **SQL Editor** e execute:

```sql
CREATE TABLE app_data (
  key TEXT PRIMARY KEY,
  value JSONB
);

INSERT INTO app_data (key, value)
VALUES ('meses', '[]'), ('config', '{}');
```

3. Em **Project Settings → API**, copie:
   - `Project URL`
   - `anon public key`

### 2. Hospedagem — Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com o GitHub
2. Clique em **Add New → Project** e importe este repositório
3. Em **Environment Variables**, adicione:

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
cp .env.example .env
# Editar .env com suas credenciais do Supabase
```

### Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

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
# Build completo (frontend + servidor)
pnpm build

# Build apenas do frontend (usado pelo Vercel)
pnpm run build:vercel
```

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
| Roteamento | [Wouter](https://github.com/molefrog/wouter) |
| Formulários | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| PDF | [jsPDF](https://github.com/parallax/jsPDF) |
| Animações | [Framer Motion](https://www.framer.com/motion) |
| Notificações | [Sonner](https://sonner.emilkowal.ski) |
| Servidor (local) | [Express](https://expressjs.com) |
| Hospedagem | [Vercel](https://vercel.com) |

---

## 📐 Modelo de Dados

### `DailyRecord` — Registro diário

```typescript
interface DailyRecord {
  id: string;          // Identificador único
  data: string;        // Data no formato YYYY-MM-DD
  producao: number;    // Quantidade produzida
  refugo: number;      // Quantidade refugada
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
  mes: number;              // 1–12
  ano: number;              // Ex: 2026
  registros: DailyRecord[]; // Lançamentos do mês
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

Acessíveis pelo ícone de engrenagem na sidebar:

- **Meta de refugo (%)** — percentual alvo. Registros acima da meta são destacados em vermelho, abaixo em verde
- **Motivos de refugo** — lista customizável de motivos disponíveis ao lançar um registro

---

## 🔄 Como atualizar o código

O deploy é automático via GitHub + Vercel:

1. Edite os arquivos na pasta local do projeto
2. Abra o **GitHub Desktop**
3. Escreva uma descrição da mudança e clique em **Commit to main**
4. Clique em **Push origin**
5. O Vercel detecta e republica automaticamente em 1–2 minutos

---

## 📄 Licença

MIT © Thiago Fischer

---

<p align="center">
  Desenvolvido por <strong>Thiago Fischer</strong> para controle de qualidade industrial — Implatec 2026
</p>
