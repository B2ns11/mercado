# Mercado - Documentação do Projeto

## 📋 Visão Geral

**Mercado** é um webapp inteligente de controle de compras residencial que utiliza visão computacional (Google Gemini API) e Supabase para automatizar a gestão de estoque doméstico.

### Objetivos Principais
1. Automatizar entrada de dados via foto (nota fiscal e produtos)
2. Gerenciar validade de produtos com alertas
3. Fornecer análises de gastos por categoria
4. Oferecer UI minimalista inspirada no iOS

## 🏗️ Arquitetura

### Tech Stack
- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **IA**: Google Gemini Vision API
- **Estado**: Zustand
- **Design**: Glassmorphism com inspiração iOS

### Estrutura de Pastas

```
mercado/
├── app/
│   ├── api/                    # Endpoints Next.js API Routes
│   │   ├── products/          # CRUD de produtos
│   │   ├── purchases/         # CRUD de compras
│   │   ├── extract-receipt/   # Gemini receipt extraction
│   │   ├── extract-expiry/    # Gemini date extraction
│   │   ├── analytics/         # Gastos por categoria no mês
│   │   ├── gemini-check/      # Diagnóstico da chave do Gemini
│   │   └── supabase-check/    # Diagnóstico do banco
│   ├── purchase/
│   │   └── new/page.tsx       # Fluxo guiado de nova compra
│   ├── analytics/
│   │   └── page.tsx           # Dashboard de gastos e histórico
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Home (estoque/dashboard)
│   └── globals.css            # Estilos globais
├── lib/
│   ├── supabase.ts            # Cliente Supabase
│   ├── gemini.ts              # Funções de integração Gemini
│   ├── store.ts               # Zustand store
│   └── utils.ts               # Funções utilitárias
├── types/
│   └── index.ts               # Tipos TypeScript
├── components/                # Componentes reutilizáveis (em desenvolvimento)
└── public/                    # Assets estáticos
```

## 🔑 Componentes-Chave

### 1. Página Home (Dashboard)
**Arquivo**: `app/page.tsx`

- Lista interativa de produtos em estoque
- Filtros por categoria e busca
- Controle de quantidade (incremento/decremento)
- Indicadores de validade (verde/amarelo/vermelho)
- Navegação rápida para novas compras

### 2. Fluxo de Compra (4 Etapas)
**Arquivo**: `app/purchase/new/page.tsx`

1. **Receipt** - Fotografar nota fiscal → Gemini extrai loja, data e, por item,
   descrição, quantidade, unidade, preço unitário e categoria
2. **Review** - Revisar e editar tudo: nome, categoria, quantidade, unidade e
   preço; remover itens e adicionar os que faltaram
3. **Expiry** - Registrar datas de validade (digitando ou por foto do rótulo)
4. **Done** - Confirmar e salvar

### 3. Analytics & Histórico
**Arquivo**: `app/analytics/page.tsx`

- Gastos totais do mês
- Gráficos de percentual por categoria
- Histórico de notas fiscais com filtro mensal
- Navegação por mês/ano

## 📱 Tipos de Dados

### Product
```typescript
{
  id: string;
  name: string;
  category: 'limpeza' | 'higiene' | 'alimentos' | 'laticinios' | 'lanches';
  quantity: number;
  unit: string;
  price: number;
  expiryDate?: string; // YYYY-MM-DD
  expiryDatePhoto?: string;
  createdAt: string;
  userId: string;
}
```

### Purchase
```typescript
{
  id: string;
  userId: string;
  receiptPhoto: string; // Base64 ou URL
  receiptDate: string; // YYYY-MM-DD
  products: Product[];
  totalAmount: number;
  createdAt: string;
}
```

## 🎨 Design System

### Glassmorphism
- Classe CSS: `.glass` → `backdrop-blur-8px` + `bg-white/70` + `border-white/20`
- Usado em cards, inputs, botões

### Categorias (5 Fixas)
| ID | Nome | Emoji | Cor | 
|----|------|-------|-----|
| limpeza | Limpeza e Lavanderia | 🧹 | blue-500 |
| higiene | Higiene Pessoal | 🧴 | pink-500 |
| alimentos | Alimentos Básicos | 🥗 | orange-500 |
| laticinios | Laticínios e Condimentos | 🧀 | yellow-500 |
| lanches | Biscoitos e Lanches | 🍪 | amber-500 |

### Cores Primárias
- **Primary**: Blue-500 (ações, destaque)
- **Success**: Green-500 (validação, OK)
- **Warning**: Yellow-500 (atenção, vencimento próximo)
- **Error**: Red-500 (erro, vencido)
- **Neutral**: Slate (backgrounds, textos)

## 🔗 Integração Supabase

### Tabelas Necessárias

```sql
-- Produtos
CREATE TABLE products (
  id UUID PRIMARY KEY,
  user_id UUID (FK auth.users),
  name TEXT,
  category TEXT CHECK (IN limpeza, higiene, alimentos, laticinios, lanches),
  quantity DECIMAL,
  unit TEXT,
  price DECIMAL,
  expiry_date DATE,
  created_at TIMESTAMP
);

-- Compras
CREATE TABLE purchases (
  id UUID PRIMARY KEY,
  user_id UUID (FK auth.users),
  receipt_photo TEXT (URL ou Base64),
  receipt_date DATE,
  total_amount DECIMAL,
  created_at TIMESTAMP
);
```

### RLS Policies
- Cada usuário vê/edita apenas seus próprios dados
- SELECT, INSERT, UPDATE, DELETE controlados por `auth.uid() = user_id`

## 🤖 Integração Gemini API

### Funções (lib/gemini.ts)

1. **extractReceiptData(base64Image)**
   - Input: Foto da nota fiscal (base64)
   - Output: `{ store, date, items: [{ name, quantity, unit, unitPrice, category }] }`
   - A categoria é inferida do nome do produto na nota
   - Modelos tentados em ordem: gemini-2.0-flash → 2.5-flash → flash-latest →
     1.5-flash → 2.0-flash-lite

2. **extractExpiryDate(base64Image)**
   - Input: Foto da data no rótulo (base64)
   - Output: Data em formato YYYY-MM-DD ou null
   - Usa OCR integrado do Gemini

## 🔐 Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyxxx...
```

**Nota**: Variáveis `NEXT_PUBLIC_*` são expostas no frontend (use chaves públicas/anon keys)

## 📊 Estado Global (Zustand)

**Arquivo**: `lib/store.ts`

```typescript
useStore() → {
  products: Product[]
  purchases: Purchase[]
  setProducts, setPurchases
  addProduct, removeProduct, updateProduct
  addPurchase
}
```

## 🛠️ Utilitários Importantes

**Arquivo**: `lib/utils.ts`

- `CATEGORIES` - Mapa de todas as 5 categorias
- `formatCurrency()` - BRL (pt-BR)
- `formatDate()` - DD/MM/YYYY
- `getDaysUntilExpiry()` - Dias até vencimento
- `isExpiringSoon()`, `isExpired()`
- `fileToBase64()`, `base64ToDataUrl()`

## 🚀 Próximas Implementações

### Prioridade Alta
1. [ ] Conectar endpoints API com Supabase (remover TODOs)
2. [ ] Implementar autenticação com Supabase Auth
3. [ ] Implementar armazenamento de fotos em Supabase Storage
4. [ ] Conciliação completa (comparar itens NF vs produtos)

### Prioridade Média
1. [ ] Componentes reutilizáveis (Modal, Toast, Card)
2. [ ] Validação de formulários
3. [ ] Tratamento de erros global
4. [ ] Testes unitários e E2E

### Prioridade Baixa
1. [ ] PWA (installable app)
2. [ ] Dark mode completo
3. [ ] Internacionalização
4. [ ] Analytics/tracking

## 📖 Convenções de Código

- **TypeScript**: Strict mode ligado
- **Componentes**: `'use client'` para interatividade
- **Estilo**: Tailwind + utility-first
- **Nomes**: camelCase (JS), kebab-case (CSS)
- **Commit messages**: Convencional (feat:, fix:, refactor:, etc)

## 🐛 Debugging

### Ver erros do Gemini
- Adicionar logs em `lib/gemini.ts`
- Verificar prompt do modelo
- Usar playground do Gemini API

### Ver estado Zustand
- Instalar extensão Zustand DevTools
- `useStore.getState()` no console

### Supabase
- Dashboard: https://app.supabase.com
- Ver logs em "Logs" → "Postgres"
- Verificar RLS policies se acesso negado

## 📚 Recursos Externos

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Google Gemini API](https://ai.google.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Apple HIG](https://developer.apple.com/design/human-interface-guidelines)
