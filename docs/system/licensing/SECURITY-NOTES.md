# 许可证安全说明（公开版）

> 适用范围：许可证模块公开说明
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-09-17`

## 公开范围

开源仓库仅提供许可证**使用与激活**文档，不包含漏洞细节、绕过步骤或内部加固报告。

请参阅：

- [LICENSE-WEB-ACTIVATION-GUIDE.md](./LICENSE-WEB-ACTIVATION-GUIDE.md)
- [LICENSE-ACTIVATION-GUIDE.md](./LICENSE-ACTIVATION-GUIDE.md)
- [LICENSE-AUTHORIZATION-FLOW.md](./LICENSE-AUTHORIZATION-FLOW.md)

## 运维建议

- 生产环境务必设置强随机 `JWT_SECRET`，勿使用文档中的示例值
- 许可证 RSA **私钥**与口令仅保存在离线/受控授权端，切勿提交到仓库
- `config/license/` 下的真实密钥与许可证文件已被 `.gitignore` 排除
- 若怀疑密钥或口令曾出现在文档/工单中，请立即轮换

## 安全问题报告

请按仓库根目录 [SECURITY.md](../../../SECURITY.md) 私下报告，勿在公开 Issue 中粘贴利用细节。
