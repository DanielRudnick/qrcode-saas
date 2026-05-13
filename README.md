# QR Manager — MVP SaaS

Plataforma de geração e gestão de QR Codes com painel admin e acesso para clientes.

## Stack

- **Frontend + Backend:** Next.js 14 (App Router)
- **Banco de dados + Auth:** Supabase (PostgreSQL + GoTrue)
- **Deploy:** Vercel
- **QR geração:** qrcode (npm)
- **Charts:** recharts

---

## Setup em 10 passos

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Anote a **URL** e as duas chaves API: `anon` e `service_role`

### 2. Rodar a migration

No Supabase, vá em **SQL Editor** e cole o conteúdo de:
```
supabase/migrations/001_initial.sql
```
Execute. Isso cria todas as tabelas, RLS, triggers e views.

### 3. Criar seu usuário admin

Ainda no SQL Editor, rode:
```sql
-- Primeiro crie o usuário pelo painel: Authentication > Users > Add user
-- Depois atualize o role para admin:
UPDATE public.profiles SET role = 'admin' WHERE email = 'seu@email.com';
```

Ou pelo painel do Supabase:
- Authentication → Users → Add user (com email + senha)
- Depois: Table Editor → profiles → edite o registro e mude `role` para `admin`

### 4. Clonar e instalar

```bash
git clone <seu-repo>
cd qrcode-saas
npm install
```

### 5. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha `.env.local` com suas chaves do Supabase.

### 6. Rodar em dev

```bash
npm run dev
# Acesse: http://localhost:3000
```

### 7. Deploy na Vercel

```bash
npx vercel
```

Ou conecte o repositório GitHub na Vercel e adicione as variáveis de ambiente no painel da Vercel.

---

## Fluxo de uso

### Como admin

1. Acesse `/login` com suas credenciais
2. Você é redirecionado para `/dashboard/admin`
3. Aba **Clientes**: veja todos os clientes, ative/desative
4. Aba **Todos os QR Codes**: visão geral de todos os QRs e scans
5. Aba **+ Novo cliente**: crie um cliente (e-mail + senha)
   - O cliente recebe as credenciais por WhatsApp/e-mail
   - Ele acessa `/login` e cai no dashboard de cliente

### Como cliente

1. Recebe credenciais do admin
2. Acessa `/login`
3. **Aba Gerar**: cria QR Codes (URL, WhatsApp, vCard, PDF, Texto)
   - Personaliza cor e ECL
   - Baixa PNG ou SVG
   - Salva com "Salvar QR Code"
4. **Aba Meus QR Codes**: histórico com contador de scans
   - Clica em "Analytics" para ver gráfico de scans por dia
   - QR dinâmico: clica em "Editar URL" para mudar o destino sem trocar o QR

### QR Dinâmico

Quando o cliente marca "QR Dinâmico":
- O QR aponta para `SEU_DOMINIO/r/slug-unico`
- Qualquer scan registra: IP, dispositivo, referrer
- O admin/cliente pode mudar a URL de destino a qualquer hora
- O QR físico (papel, banner, etc.) nunca precisa ser reimpresso

---

## Estrutura de arquivos

```
qrcode-saas/
├── app/
│   ├── layout.tsx              # Layout raiz
│   ├── page.tsx                # Redirect → /login
│   ├── auth/login/page.tsx     # Página de login
│   ├── dashboard/
│   │   ├── admin/page.tsx      # Painel admin
│   │   └── client/page.tsx     # Painel cliente
│   └── api/
│       ├── admin/create-client/route.ts
│       └── redirect/[slug]/route.ts
├── lib/
│   ├── supabase.ts             # Clientes Supabase
│   └── qr.ts                  # Helpers QR
├── types/index.ts              # TypeScript types
├── middleware.ts               # Proteção de rotas
├── supabase/migrations/
│   └── 001_initial.sql         # Schema completo
└── .env.example
```

---

## Próximos passos (pós-MVP)

- [ ] Upload de logo para QR personalizado (Supabase Storage)
- [ ] Geração bulk com download .zip
- [ ] E-mail de boas-vindas automático para novos clientes (Supabase Edge Functions)
- [ ] Dashboard de analytics mais completo (país, cidade via IP geolocation)
- [ ] Domínio customizado para redirects (`qr.seudominio.com.br`)
- [ ] White-label: logo da Rudnick Digital no painel dos clientes
- [ ] Planos com limite de QRs por mês (quando quiser monetizar)
