-- ============================================================
-- Fix: grants ausentes + recursão infinita nas policies RLS
-- ============================================================

-- 1. Conceder privilégios ao role 'authenticated'
--    (sem isso todos os requests retornavam 403)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qrcodes   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_scans  TO authenticated;
GRANT SELECT                          ON public.qr_stats  TO authenticated;

-- anon: leitura de qrcodes (redirect QR dinâmico) + inserir scans
GRANT SELECT ON public.qrcodes  TO anon;
GRANT INSERT ON public.qr_scans TO anon;

-- 2. Função security definer para verificar se o usuário é admin
--    Evita a recursão infinita: policy SELECT em 'profiles'
--    consultava 'profiles' internamente → loop → HTTP 500
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 3. Corrigir policies de 'profiles'
DROP POLICY IF EXISTS "Admin vê todos os perfis"                    ON public.profiles;
DROP POLICY IF EXISTS "Usuário vê próprio perfil ou admin vê todos" ON public.profiles;
DROP POLICY IF EXISTS "Admin atualiza qualquer perfil"               ON public.profiles;
DROP POLICY IF EXISTS "Usuário atualiza próprio perfil"             ON public.profiles;

CREATE POLICY "Usuário vê próprio perfil ou admin vê todos"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Usuário atualiza próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin atualiza qualquer perfil"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Corrigir policies de 'qrcodes'
DROP POLICY IF EXISTS "Usuário vê próprios QRs"     ON public.qrcodes;
DROP POLICY IF EXISTS "Usuário cria QR para si"      ON public.qrcodes;
DROP POLICY IF EXISTS "Usuário atualiza próprio QR"  ON public.qrcodes;
DROP POLICY IF EXISTS "Usuário deleta próprio QR"    ON public.qrcodes;

CREATE POLICY "Usuário vê próprios QRs"
  ON public.qrcodes FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Usuário cria QR para si"
  ON public.qrcodes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuário atualiza próprio QR"
  ON public.qrcodes FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Usuário deleta próprio QR"
  ON public.qrcodes FOR DELETE
  USING (user_id = auth.uid() OR public.is_admin());

-- 5. Corrigir policies de 'qr_scans'
DROP POLICY IF EXISTS "Usuário vê scans dos próprios QRs" ON public.qr_scans;
DROP POLICY IF EXISTS "Service role insere scans"          ON public.qr_scans;
DROP POLICY IF EXISTS "Inserir scans livre"                ON public.qr_scans;

CREATE POLICY "Usuário vê scans dos próprios QRs"
  ON public.qr_scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.qrcodes q
      WHERE q.id = qr_id
        AND (q.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Inserir scans livre"
  ON public.qr_scans FOR INSERT
  WITH CHECK (true);
