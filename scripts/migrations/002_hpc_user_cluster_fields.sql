-- HPC 一站式用户管理：门户冻结 + SSH 公钥登记
-- 在 Supabase SQL Editor 或 psql 中执行一次

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_suspended BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS ssh_public_keys JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.users.account_suspended IS '为 true 时禁止平台门户登录；不自动修改 POSIX/Slurm 账号';
COMMENT ON COLUMN public.users.ssh_public_keys IS 'OpenSSH 公钥列表 JSON 数组，元素含 key、可选 comment';

CREATE INDEX IF NOT EXISTS idx_users_account_suspended ON public.users (account_suspended) WHERE account_suspended = true;
