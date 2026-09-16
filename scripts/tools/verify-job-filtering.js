#!/usr/bin/env node

/**
 * 验证作业过滤逻辑
 * 模拟 sacct 输出并测试过滤逻辑
 */

// 模拟 sacct 输出数据
const mockSacctOutput = [
  '71|vnc-desktop-101|user1|RUNNING|graphics|2024-01-01T10:00:00|2024-01-01T10:05:00|vnc-desktop-101|2024-01-01T09:55:00',
  '71.batch|batch|user1|RUNNING|graphics|2024-01-01T10:00:00|2024-01-01T10:05:00|batch|2024-01-01T09:55:00',
  '71.extern|extern|user1|RUNNING|graphics|2024-01-01T10:00:00|2024-01-01T10:05:00|extern|2024-01-01T09:55:00',
  '72|test-job|user2|COMPLETED|compute|2024-01-01T11:00:00|2024-01-01T11:30:00|test-job|2024-01-01T10:55:00',
  '72.batch|batch|user2|COMPLETED|compute|2024-01-01T11:00:00|2024-01-01T11:30:00|batch|2024-01-01T10:55:00',
  '73|long-job|user3|PENDING|compute||||long-job|2024-01-01T12:00:00',
  '73.batch|batch|user3|PENDING|compute||||batch|2024-01-01T12:00:00',
  '74|failed-job|user4|FAILED|compute|2024-01-01T13:00:00|2024-01-01T13:05:00|failed-job|2024-01-01T12:55:00',
  '74.batch|batch|user4|FAILED|compute|2024-01-01T13:00:00|2024-01-01T13:05:00|batch|2024-01-01T12:55:00',
  '74.extern|extern|user4|FAILED|compute|2024-01-01T13:00:00|2024-01-01T13:05:00|extern|2024-01-01T12:55:00'
];

function testFilteringLogic() {
  console.log('🧪 验证作业过滤逻辑...\n');
  
  // 1. 显示原始数据
  console.log('1. 原始 sacct 输出:');
  mockSacctOutput.forEach((line, index) => {
    const [jobId, jobName, user, state] = line.split('|');
    console.log(`   ${index + 1}. JobID: ${jobId}, JobName: ${jobName}, State: ${state}`);
  });
  
  // 2. 应用过滤逻辑
  console.log('\n2. 应用过滤逻辑:');
  const processedJobs = new Set();
  const filteredJobs = [];
  
  for (const line of mockSacctOutput) {
    const [jobId, jobName, user, state, partition, startTime, endTime, jobName2, submitTime] = line.split('|');
    
    // 跳过无效的作业ID
    if (!jobId || jobId === 'Unknown' || jobId === '') {
      console.log(`   ❌ 跳过: ${jobId} (无效ID)`);
      continue;
    }
    
    // 跳过所有带后缀的记录（如 .batch, .extern 等），只保留主作业记录
    if (jobId.includes('.')) {
      console.log(`   ❌ 过滤掉: ${jobId} (包含后缀)`);
      continue;
    }
    
    // 去重：如果已经处理过这个作业ID，跳过
    if (processedJobs.has(jobId)) {
      console.log(`   ❌ 过滤掉: ${jobId} (重复)`);
      continue;
    }
    
    processedJobs.add(jobId);
    filteredJobs.push({ jobId, jobName, user, state, partition, startTime, endTime, submitTime });
    console.log(`   ✅ 保留: ${jobId} (${jobName})`);
  }
  
  // 3. 显示过滤结果
  console.log('\n3. 过滤结果:');
  console.log(`   原始记录数: ${mockSacctOutput.length}`);
  console.log(`   过滤后记录数: ${filteredJobs.length}`);
  console.log(`   过滤掉的记录数: ${mockSacctOutput.length - filteredJobs.length}`);
  
  console.log('\n   保留的作业:');
  filteredJobs.forEach(job => {
    console.log(`   - ${job.jobId}: ${job.jobName} (${job.state})`);
  });
  
  // 4. 验证结果
  console.log('\n4. 验证结果:');
  
  // 检查是否还有带后缀的记录
  const remainingSuffixRecords = filteredJobs.filter(job => job.jobId.includes('.'));
  if (remainingSuffixRecords.length === 0) {
    console.log('   ✅ 过滤逻辑正确：没有带后缀的记录');
  } else {
    console.log('   ❌ 过滤逻辑有问题：仍有带后缀的记录');
    remainingSuffixRecords.forEach(job => {
      console.log(`      - ${job.jobId}`);
    });
  }
  
  // 检查是否有重复记录
  const jobIds = filteredJobs.map(job => job.jobId);
  const uniqueJobIds = new Set(jobIds);
  if (jobIds.length === uniqueJobIds.size) {
    console.log('   ✅ 去重逻辑正确：没有重复记录');
  } else {
    console.log('   ❌ 去重逻辑有问题：仍有重复记录');
  }
  
  // 检查是否包含所有主作业
  const expectedMainJobs = ['71', '72', '73', '74'];
  const foundMainJobs = filteredJobs.map(job => job.jobId);
  const missingJobs = expectedMainJobs.filter(jobId => !foundMainJobs.includes(jobId));
  
  if (missingJobs.length === 0) {
    console.log('   ✅ 完整性检查：包含所有主作业');
  } else {
    console.log('   ❌ 完整性检查：缺少主作业');
    missingJobs.forEach(jobId => {
      console.log(`      - ${jobId}`);
    });
  }
  
  console.log('\n🎉 验证完成！');
  
  return {
    originalCount: mockSacctOutput.length,
    filteredCount: filteredJobs.length,
    filteredJobs: filteredJobs
  };
}

// 运行测试
const result = testFilteringLogic();

// 输出总结
console.log('\n📊 总结:');
console.log(`- 原始记录: ${result.originalCount} 条`);
console.log(`- 过滤后: ${result.filteredCount} 条`);
console.log(`- 过滤率: ${((result.originalCount - result.filteredCount) / result.originalCount * 100).toFixed(1)}%`);
console.log(`- 保留的主作业: ${result.filteredJobs.map(j => j.jobId).join(', ')}`); 