> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`
```bash
cat /opt/my-hpcapp/.env | grep -i tz
```
```bash
node -e "console.log(require('os').hostname())"
```
```bash
node -e "require('child_process').execFile('sinfo', ['-h', '-o', '%P|%D|%C|%G|%t'], (err, stdout, stderr) => { console.log('STDOUT:', stdout); console.error('STDERR:', stderr); if (err) console.error('ERR:', err); })"
```
<sole.error('STDERR:', stderr); if (err) console.error('ERR:', err); })"
STDOUT: compute*|1|0/0/2/2|(null)|down*
compute*|1|0/2/0/2|(null)|idle

STDERR: 
root@haomgt:/opt/my-hpcapp#

```bash
curl -s http://localhost:3000/api/jobs/partitions | jq .
```
<sole.error('STDERR:', stderr); if (err) console.error('ERR:', err); })"
STDOUT: compute*|1|0/0/2/2|(null)|down*
compute*|1|0/2/0/2|(null)|idle

STDERR: 


后端 `/api/jobs/partitions` 实际返回如下（已聚合）：

```json
{
  "name": "compute*",
  "nodeCount": 2,
  "cpuCount": 4,
  "gpuCount": 0,
  "healthyNodes": 1,
  "unhealthyNodes": 1,
  "cpuTotal": 4,
  "cpuAlloc": 0,
  "cpuIdle": 2,
  "gpuTotal": 0,
  "gpuAlloc": 0,
  "status": "warning"
}
```

- **nodeCount = 2**（总节点数，正确）
- **healthyNodes = 1**（可用节点数，正确）
- **unhealthyNodes = 1**（不可用节点数，正确）

这与 `sinfo` 输出完全一致，后端聚合逻辑和API返回都没有问题。

---

## 结论

- **后端API数据是对的**，但前端依然显示为0，说明问题在前端数据解析或展示环节。

---

## 建议排查前端

1. **检查前端请求的API URL**，确保用的是 `/api/jobs/partitions`，且无缓存、无跨域、无mock。
2. **检查前端解析字段**，确认用的是 `nodeCount`、`healthyNodes` 字段，而不是其它字段或拼写错误。
3. **在前端加console.log**，打印API返回的 `partitions` 数据，确认拿到的内容和后端一致。

---

### 你可以在前端相关组件（如 PartitionTable、PartitionTableSkeleton、资源卡片等）里加：

```ts
useEffect(() => {
  fetch('/api/jobs/partitions')
    .then(res => res.json())
    .then(data => {
      console.log('分区API返回', data);
      console.log('partitionList', data.partitions);
      // 你的渲染逻辑...
    });
}, []);
```

---

如需我帮你定位具体前端文件和修复方法，请告知你用的前端组件/页面文件名，或贴出相关代码片段。

console.log('systemStats', systemStats)
