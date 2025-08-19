-- Script para adicionar campo last_sign_in_at à tabela profiles
-- e criar função para sincronizar com auth.users

-- Adicionar campo last_sign_in_at à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ;

-- Função para sincronizar last_sign_in_at da tabela auth.users
CREATE OR REPLACE FUNCTION sync_user_last_sign_in()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar o campo last_sign_in_at na tabela profiles
  -- quando o usuário faz login (last_sign_in_at é atualizado na auth.users)
  IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
    UPDATE public.profiles 
    SET last_sign_in_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para sincronizar automaticamente quando auth.users.last_sign_in_at é atualizado
DROP TRIGGER IF EXISTS sync_last_sign_in_trigger ON auth.users;
CREATE TRIGGER sync_last_sign_in_trigger
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_last_sign_in();

-- Sincronizar dados existentes (copiar last_sign_in_at de auth.users para profiles)
UPDATE public.profiles 
SET last_sign_in_at = auth_users.last_sign_in_at
FROM auth.users auth_users
WHERE profiles.id = auth_users.id
AND auth_users.last_sign_in_at IS NOT NULL;

-- Função para atualizar manualmente o último acesso
CREATE OR REPLACE FUNCTION update_user_last_sign_in(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles 
  SET last_sign_in_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;