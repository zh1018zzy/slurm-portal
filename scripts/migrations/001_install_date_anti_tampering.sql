-- ================================================
-- 安装日期防篡改机制 - 数据库层面保护
-- ================================================

-- 1. 创建审计日志表
CREATE TABLE IF NOT EXISTS system_installation_audit (
  id BIGSERIAL PRIMARY KEY,
  install_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_install_date TIMESTAMPTZ,
  new_install_date TIMESTAMPTZ,
  changed_by VARCHAR(255),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  client_info JSONB,
  is_suspicious BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_installation_audit_install_id ON system_installation_audit(install_id);
CREATE INDEX IF NOT EXISTS idx_installation_audit_created_at ON system_installation_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_installation_audit_suspicious ON system_installation_audit(is_suspicious) WHERE is_suspicious = TRUE;

-- 2. 创建触发器函数：监控install_date修改
CREATE OR REPLACE FUNCTION check_installation_date_tampering()
RETURNS TRIGGER AS $$
DECLARE
  time_diff_days INTEGER;
  is_suspicious BOOLEAN := FALSE;
  change_reason TEXT := '';
BEGIN
  -- 只在install_date被修改时触发
  IF OLD.install_date IS DISTINCT FROM NEW.install_date THEN

    -- 计算时间差（天数）
    time_diff_days := EXTRACT(DAY FROM (NEW.install_date - OLD.install_date));

    -- 检测可疑修改
    IF time_diff_days > 0 THEN
      -- install_date被改到更晚的日期 = 延长试用期！
      is_suspicious := TRUE;
      change_reason := format('检测到试用期延长尝试: 安装日期从 %s 改为 %s (延长 %s 天)',
                             OLD.install_date, NEW.install_date, time_diff_days);

      -- 记录到审计日志
      INSERT INTO system_installation_audit (
        install_id,
        action,
        old_install_date,
        new_install_date,
        changed_by,
        client_info,
        is_suspicious
      ) VALUES (
        OLD.install_id,
        'UPDATE_INSTALL_DATE',
        OLD.install_date,
        NEW.install_date,
        current_user,
        jsonb_build_object(
          'reason', change_reason,
          'time_diff_days', time_diff_days,
          'session_user', session_user,
          'inet_client_addr', inet_client_addr(),
          'inet_server_addr', inet_server_addr()
        ),
        TRUE
      );

      -- 🔴 阻止修改！
      RAISE EXCEPTION '安全策略阻止: %', change_reason
        USING HINT = '试用期安装日期不能被修改到更晚的日期',
              ERRCODE = '42501'; -- insufficient_privilege

    ELSIF time_diff_days < -7 THEN
      -- 安装日期被改到超过7天前 - 也可疑
      is_suspicious := TRUE;
      change_reason := format('检测到可疑的安装日期修改: 从 %s 改为 %s (提前 %s 天)',
                             OLD.install_date, NEW.install_date, ABS(time_diff_days));

      -- 记录审计日志
      INSERT INTO system_installation_audit (
        install_id,
        action,
        old_install_date,
        new_install_date,
        changed_by,
        client_info,
        is_suspicious
      ) VALUES (
        OLD.install_id,
        'UPDATE_INSTALL_DATE',
        OLD.install_date,
        NEW.install_date,
        current_user,
        jsonb_build_object(
          'reason', change_reason,
          'time_diff_days', time_diff_days,
          'warning', 'Large date shift detected'
        ),
        TRUE
      );

      -- 警告但允许（可能是合法的修正）
      RAISE WARNING '安装日期修改警告: %', change_reason;
    ELSE
      -- 小幅度修改，记录但允许
      INSERT INTO system_installation_audit (
        install_id,
        action,
        old_install_date,
        new_install_date,
        changed_by,
        client_info,
        is_suspicious
      ) VALUES (
        OLD.install_id,
        'UPDATE_INSTALL_DATE',
        OLD.install_date,
        NEW.install_date,
        current_user,
        jsonb_build_object(
          'reason', 'Minor date adjustment',
          'time_diff_days', time_diff_days
        ),
        FALSE
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 创建触发器
DROP TRIGGER IF EXISTS prevent_installation_date_tampering ON system_installation;
CREATE TRIGGER prevent_installation_date_tampering
  BEFORE UPDATE ON system_installation
  FOR EACH ROW
  EXECUTE FUNCTION check_installation_date_tampering();

-- 4. 创建只读视图（供查询使用）
CREATE OR REPLACE VIEW system_installation_readonly AS
SELECT
  install_id,
  install_date,
  hardware_fingerprint,
  security_markers,
  version,
  is_active,
  EXTRACT(DAY FROM (NOW() - install_date)) AS days_since_install,
  90 - EXTRACT(DAY FROM (NOW() - install_date)) AS remaining_trial_days,
  CASE
    WHEN EXTRACT(DAY FROM (NOW() - install_date)) > 90 THEN 'expired'
    WHEN EXTRACT(DAY FROM (NOW() - install_date)) > 83 THEN 'expiring_soon'
    ELSE 'active'
  END AS trial_status,
  created_at,
  updated_at
FROM system_installation
WHERE is_active = TRUE;

-- 5. 创建函数：获取可疑修改记录
CREATE OR REPLACE FUNCTION get_suspicious_installation_changes()
RETURNS TABLE (
  audit_id BIGINT,
  install_id UUID,
  old_date TIMESTAMPTZ,
  new_date TIMESTAMPTZ,
  days_extended INTEGER,
  changed_at TIMESTAMPTZ,
  client_info JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id AS audit_id,
    sia.install_id,
    old_install_date AS old_date,
    new_install_date AS new_date,
    EXTRACT(DAY FROM (new_install_date - old_install_date))::INTEGER AS days_extended,
    sia.changed_at,
    sia.client_info
  FROM system_installation_audit sia
  WHERE is_suspicious = TRUE
  ORDER BY changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 创建函数：初始化审计日志（首次运行）
CREATE OR REPLACE FUNCTION initialize_installation_audit()
RETURNS VOID AS $$
BEGIN
  -- 为现有记录创建初始审计日志
  INSERT INTO system_installation_audit (
    install_id,
    action,
    new_install_date,
    changed_by,
    client_info,
    is_suspicious
  )
  SELECT
    install_id,
    'INITIAL_RECORD',
    install_date,
    'system',
    jsonb_build_object('note', 'Initial audit record created'),
    FALSE
  FROM system_installation
  WHERE NOT EXISTS (
    SELECT 1 FROM system_installation_audit
    WHERE system_installation_audit.install_id = system_installation.install_id
  );

  RAISE NOTICE '审计日志初始化完成';
END;
$$ LANGUAGE plpgsql;

-- 7. 添加注释
COMMENT ON TABLE system_installation_audit IS '安装记录审计日志 - 跟踪所有install_date修改';
COMMENT ON TRIGGER prevent_installation_date_tampering ON system_installation IS '防止试用期篡改 - 阻止将安装日期改到未来';
COMMENT ON FUNCTION check_installation_date_tampering() IS '检测并阻止试用期延长尝试';
COMMENT ON VIEW system_installation_readonly IS '只读视图 - 安全查询安装信息';

-- 8. 执行初始化
SELECT initialize_installation_audit();

-- ================================================
-- 安装完成提示
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ 安装日期防篡改机制已部署';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE '已创建:';
  RAISE NOTICE '  1. system_installation_audit 审计日志表';
  RAISE NOTICE '  2. prevent_installation_date_tampering 触发器';
  RAISE NOTICE '  3. system_installation_readonly 只读视图';
  RAISE NOTICE '  4. get_suspicious_installation_changes() 查询函数';
  RAISE NOTICE '';
  RAISE NOTICE '防护机制:';
  RAISE NOTICE '  - 禁止将install_date改到未来（延长试用期）';
  RAISE NOTICE '  - 记录所有修改到审计日志';
  RAISE NOTICE '  - 标记可疑操作';
  RAISE NOTICE '';
  RAISE NOTICE '查询可疑修改:';
  RAISE NOTICE '  SELECT * FROM get_suspicious_installation_changes();';
  RAISE NOTICE '================================================';
END $$;
