# 🛒 Mercado - Controle de Compras Residencial

Um app inteligente de controle de estoque doméstico, gestão de validade de produtos e controle financeiro de compras, com integração de visão computacional via Google Gemini e backend com Supabase.

## ✨ Características Principais

### 🏠 Dashboard / Gestão de Estoque
- Visualização interativa de todos os produtos do estoque
- Filtro rápido por categoria (5 categorias pré-definidas)
- Busca por nome de produto
- Alertas para produtos próximos do vencimento
- Controle de consumo: decrementar quantidade conforme itens são consumidos

### 📸 Entrada Inteligente de Dados
Fluxo guiado com 4 etapas:
1. **Nota Fiscal** - Fotografe a nota fiscal
2. **Produtos** - Fotografe os produtos comprados
3. **Conciliação** - IA compara itens da nota com os identificados
4. **Validades** - Registre datas de validade (manual ou por foto)

### 📊 Analytics & Histórico
- Gráficos de gastos por categoria (percentuais)
- Histórico de notas fiscais com filtros por mês/ano
- Rastreamento de preços e locais de compra
- Métricas financeiras mensais

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14 + React 18 + TypeScript
- **Styling**: Tailwind CSS + Glassmorphism Design System
- **Estado**: Zustand
- **Backend**: Supabase (PostgreSQL)
- **IA/Visão Computacional**: Google Gemini API
- **Autenticação**: Supabase Auth

## 🚀 Setup e Instalação

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta Supabase
- Chave API do Google Gemini

### 1. Instalação de Dependências

```bash
npm install
```

### 2. Configuração de Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Preencha com suas credenciais:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Setup do Banco de Dados (Supabase)

Execute as migrations SQL para criar as tabelas:

```sql
-- Criar tabela de produtos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('limpeza', 'higiene', 'alimentos', 'laticinios', 'lanches')),
  quantity DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  price DECIMAL NOT NULL,
  expiry_date DATE,
  expiry_date_photo TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Criar tabela de compras
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  receipt_photo TEXT NOT NULL,
  receipt_date DATE NOT NULL,
  total_amount DECIMAL NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- RLS (Row Level Security)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can see own purchases"
  ON purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
  ON purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 4. Rodando o Servidor de Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
mercado/
├── app/
│   ├── api/              # Endpoints da API
│   ├── purchase/         # Páginas do fluxo de compra
│   ├── analytics/        # Página de analytics
│   ├── layout.tsx        # Layout root
│   ├── page.tsx          # Home (gestão de estoque)
│   └── globals.css       # Estilos globais
├── components/           # Componentes reutilizáveis
├── lib/
│   ├── supabase.ts       # Client do Supabase
│   ├── gemini.ts         # Integrações com Gemini API
│   ├── store.ts          # Zustand store
│   └── utils.ts          # Funções utilitárias
├── types/                # Tipos TypeScript
├── public/               # Assets estáticos
├── tsconfig.json         # Configuração TypeScript
├── tailwind.config.ts    # Configuração Tailwind
└── next.config.js        # Configuração Next.js
```

## 🎨 Design System

O app segue os Apple Human Interface Guidelines com:
- **Glassmorphism**: Superfícies de vidro fosco com desfoque
- **Tipografia Clara**: Hierarquia visual bem definida
- **Cores Minimalistas**: Paleta sutil com acentos de cor por categoria
- **Arredondamento**: Cantos amplamente arredondados (24px)

### Categorias de Produtos

| Categoria | Emoji | Cor |
|-----------|-------|-----|
| Limpeza e Lavanderia | 🧹 | Azul |
| Higiene Pessoal | 🧴 | Rosa |
| Alimentos Básicos | 🥗 | Laranja |
| Laticínios e Condimentos | 🧀 | Amarelo |
| Biscoitos e Lanches | 🍪 | Âmbar |

## 🔄 Fluxo de Dados

### Entrada de Compra
```
Foto Nota Fiscal 
  ↓ (Gemini Vision)
Extrai: loja, data, itens, preços
  ↓
Foto Produtos
  ↓ (Gemini Vision)
Identifica produtos e categorias
  ↓
Conciliação & Validação
  ↓
Registro de Validades
  ↓
Salva em Supabase
```

### Armazenamento de Imagens
- **Nota Fiscal**: Armazenada permanentemente (comprovante)
- **Fotos de Produtos**: Processamento efêmero (não salva)
- **Fotos de Validade**: Processamento efêmero (OCR apenas)

## 📝 APIs do Gemini Utilizadas

### `extractReceiptData()`
Extrai de foto de nota fiscal:
- Nome do estabelecimento
- Data da compra
- Lista de itens com preços individuais

### `identifyProductsFromPhoto()`
Identifica produtos em foto:
- Nome do produto
- Categoria (de 5 pré-definidas)
- Automaticamente agrupa por categoria

### `extractExpiryDate()`
Extrai data de validade de rótulo:
- OCR de datas em produtos
- Formata em YYYY-MM-DD

## 🔐 Autenticação e Segurança

- Autenticação via Supabase Auth
- Row Level Security (RLS) nas tabelas
- Variáveis de ambiente confidenciais não expostas
- Validação de entrada nos endpoints da API

## 📦 Build e Deploy

### Build para Produção

```bash
npm run build
npm start
```

### Deploy (Vercel recomendado)

```bash
vercel
```

A aplicação está otimizada para deploy em Vercel com Supabase como backend.

## 🐛 Conhecidas Limitações

- Autenticação ainda não totalmente integrada
- Reconciliação automática em desenvolvimento
- Fotos armazenadas em memória (implementar Supabase Storage)

## 🚧 Roadmap Futuro

- [ ] Implementar autenticação completa
- [ ] Adicionar suporte para armazenamento de fotos em Supabase Storage
- [ ] Reconciliação inteligente automática
- [ ] Notificações de produtos vencendo
- [ ] Relatórios PDF de gastos
- [ ] App mobile nativa (React Native)
- [ ] Compartilhamento de listas com família
- [ ] Integração com preços de mercado

## 📄 Licença

MIT

---

**Desenvolvido com ❤️ usando Next.js, Supabase e Google Gemini**
