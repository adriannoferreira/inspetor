-- Script para atualizar a tabela profiles existente
-- Adicionar colunas role e is_active se não existirem

-- Adicionar coluna role
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Adicionar coluna is_active
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Atualizar registros existentes para garantir que tenham valores padrão
UPDATE public.profiles 
SET role = 'user' 
WHERE role IS NULL;

UPDATE public.profiles 
SET is_active = true 
WHERE is_active IS NULL;

-- Criar um usuário admin se não existir
-- (substitua 'admin@example.com' pelo email do admin desejado)
-- UPDATE public.profiles 
-- SET role = 'admin' 
-- WHERE email = 'admin@example.com';