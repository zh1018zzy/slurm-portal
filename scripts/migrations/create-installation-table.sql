-- 系统安装记录表 - 防止删除文件重置试用期
CREATE TABLE IF NOT EXISTS system_installation (
  id SERIAL PRIMARY KEY,
  install_id UUID NOT NULL UNIQUE,
  install_date TIMESTAMPTZ NOT NULL,
  hardware_fingerprint TEXT NOT NULL,
  security_markers JSONB NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,

  -- 防止重复安装
  CONSTRAINT unique_active_installation UNIQUE (is_active) WHERE is_active = TRUE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_install_id ON system_installation(install_id);
CREATE INDEX IF NOT EXISTS idx_hardware_fingerprint ON system_installation(hardware_fingerprint);
CREATE INDEX IF NOT EXISTS idx_is_active ON system_installation(is_active);
CREATE INDEX IF NOT EXISTS idx_install_date ON system_installation(install_date);

-- 表注释
COMMENT ON TABLE system_installation IS '系统安装记录 - 用于许可证试用期验证，防止删除文件重置试用期';
COMMENT ON COLUMN system_installation.install_id IS '唯一安装ID';
COMMENT ON COLUMN system_installation.install_date IS '首次安装日期 - 用于计算试用期';
COMMENT ON COLUMN system_installation.hardware_fingerprint IS '硬件指纹 - 用于防止许可证迁移';
COMMENT ON COLUMN system_installation.security_markers IS '安全标记 - 多重验证哈希';
COMMENT ON COLUMN system_installation.is_active IS '是否为当前活动安装 - 同时只能有一个';
