# 分区状态监控「暂无分区数据」原因分析

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 现象

`/zh/dashboard` 页面「分区状态监控」卡片显示：**暂无分区数据**。

## 数据流

1. **前端**：`app/[locale]/dashboard/components/SinfoPartitionStatus.tsx`
   - 请求：`GET /api/system/nodes?detailed=true`（带 Bearer token）
   - 成功条件：`result.success && result.data?.partitions` 为真
   - 展示条件：`partitionData.length > 0`；否则在**无错误**时显示「暂无分区数据」

2. **后端**：`app/api/system/nodes/route.ts`
   - 先执行脚本：`/opt/my-hpcapp/scripts/slurm-node-monitor.sh json true`
   - 再执行：`sinfo -o "%P|%D|%C|%G|%l|%t" --noheader` 得到分区列表
   - 解析每行得到 `partitions` 数组，再为每个分区执行 `sinfo -p <分区名> -o "%N" --noheader` 取节点列表
   - 返回：`{ success: true, data: { ..., partitions: partitionsWithNodes } }`

## 出现「暂无分区数据」的条件

界面逻辑为：

```ts
!loading && partitionData.length === 0 && !error  →  显示「暂无分区数据」
```

因此必须同时满足：

- 请求**未**处于 loading；
- **未**设置 error（即接口返回 200、且前端按成功分支处理）；
- `partitionData` 为空数组。

也就是说：**接口返回 200、success 为 true，且 `data.partitions` 是空数组 `[]`**。

## 根本原因归纳

**服务端 `GET /api/system/nodes?detailed=true` 返回的 `data.partitions` 为空数组。**

可能原因包括：

| 原因 | 说明 |
|------|------|
| Slurm 未配置分区 | `sinfo -o "%P|%D|%C|%G|%l|%t" --noheader` 无输出或仅有空行 |
| 环境无 Slurm / sinfo 不可用 | 若 `sinfo` 执行失败会抛错，接口返回 500，前端会显示错误而非「暂无分区数据」；只有 sinfo **执行成功但输出为空**时才会出现当前现象 |
| 权限/环境差异 | 执行脚本或 sinfo 的用户/环境与预期不符，导致看不到分区（但命令仍成功、输出为空） |

## 如何验证

在**运行 Next.js 应用的同机环境**下执行：

```bash
# 1. 分区列表是否为空
sinfo -o "%P|%D|%C|%G|%l|%t" --noheader

# 2. 若上面无输出，看默认 sinfo 是否有分区
sinfo -s
```

若上述命令没有输出或没有分区，则与「暂无分区数据」现象一致。

## 建议

1. **运维侧**：确认 Slurm 已安装、`sinfo` 可用，且已配置至少一个分区（如 `compute`、`graphics` 等）。
2. **前端增强（可选）**：当 `/api/system/nodes` 返回成功但 `partitions` 为空时，可再请求 `/api/jobs/partitions`，将结果映射为分区状态展示，作为降级数据源（例如作业提交页的分区列表来自该接口）。

文档中已记录上述结论与验证方法，便于后续排查与优化。
