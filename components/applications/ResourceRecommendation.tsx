'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Lightbulb, Cpu, HardDrive, Clock, Zap } from 'lucide-react'
import { ResourceRecommendation as ResourceRecommendationType } from './DynamicForm'

interface ResourceRecommendationProps {
  recommendation: ResourceRecommendationType
  onApply: (profile: any) => void
}

export function ResourceRecommendation({ recommendation, onApply }: ResourceRecommendationProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return '高'
    if (confidence >= 0.6) return '中'
    return '低'
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-blue-600" />
          智能资源推荐
          <Badge 
            variant="outline" 
            className={`${getConfidenceColor(recommendation.confidence)} text-white border-0`}
          >
            置信度: {getConfidenceText(recommendation.confidence)} ({Math.round(recommendation.confidence * 100)}%)
          </Badge>
          <Badge variant="outline">
            来源: {getSourceText(recommendation.source)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* 推荐配置展示 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {recommendation.profile.nodes && (
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <div>
                <Label className="text-xs text-muted-foreground">节点数</Label>
                <div className="font-mono font-medium">{recommendation.profile.nodes}</div>
              </div>
            </div>
          )}
          
          {recommendation.profile.cpusPerTask && (
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-600" />
              <div>
                <Label className="text-xs text-muted-foreground">CPU核心</Label>
                <div className="font-mono font-medium">{recommendation.profile.cpusPerTask}</div>
              </div>
            </div>
          )}
          
          {recommendation.profile.memory && (
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-blue-600" />
              <div>
                <Label className="text-xs text-muted-foreground">内存</Label>
                <div className="font-mono font-medium">{recommendation.profile.memory}</div>
              </div>
            </div>
          )}
          
          {recommendation.profile.walltime && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <Label className="text-xs text-muted-foreground">运行时间</Label>
                <div className="font-mono font-medium">{recommendation.profile.walltime}</div>
              </div>
            </div>
          )}
        </div>

        {/* GPU配置 */}
        {recommendation.profile.gpu && (
          <div className="mb-6 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-green-600" />
              <Label className="font-medium text-green-800">GPU配置</Label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {recommendation.profile.gpu.count && (
                <div>
                  <span className="text-muted-foreground">数量:</span>
                  <span className="ml-2 font-mono">{recommendation.profile.gpu.count}</span>
                </div>
              )}
              {recommendation.profile.gpu.type && (
                <div>
                  <span className="text-muted-foreground">类型:</span>
                  <span className="ml-2 font-mono">{recommendation.profile.gpu.type}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 推荐理由 */}
        <div className="mb-6">
          <Label className="font-medium mb-2 block">推荐理由</Label>
          <ul className="space-y-1">
            {recommendation.reasoning.map((reason, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span className="text-muted-foreground">{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 资源优化提示 */}
        <div className="mb-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-yellow-600" />
            <Label className="font-medium text-yellow-800">优化建议</Label>
          </div>
          <div className="text-sm text-yellow-700">
            {getOptimizationTips(recommendation)}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button 
            onClick={() => onApply(recommendation.profile)}
            className="flex-1"
          >
            应用推荐配置
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              // 复制配置到剪贴板
              const config = JSON.stringify(recommendation.profile, null, 2)
              navigator.clipboard.writeText(config)
            }}
          >
            复制配置
          </Button>
        </div>

        {/* 性能预估 */}
        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <div className="flex justify-between items-center">
              <span>预估成本效益:</span>
              <span className="font-medium">{getCostEfficiency(recommendation.confidence)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>推荐适用场景:</span>
              <span className="font-medium">{getScenario(recommendation.source)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 获取来源文本
function getSourceText(source: string): string {
  const sourceMap: Record<string, string> = {
    'application-based': '应用特性',
    'cluster-based': '集群状态',
    'history-based': '历史数据',
    'user-input': '用户输入',
    'ml-prediction': '机器学习'
  }
  return sourceMap[source] || source
}

// 获取优化建议
function getOptimizationTips(recommendation: ResourceRecommendationType): string {
  const confidence = recommendation.confidence
  const source = recommendation.source

  if (confidence >= 0.8) {
    return '此配置基于充分的数据分析，推荐直接使用。'
  } else if (confidence >= 0.6) {
    return '此配置有一定参考价值，建议根据实际需求适当调整。'
  } else {
    return '此配置仅供参考，建议结合经验和测试进行调整。'
  }
}

// 获取成本效益
function getCostEfficiency(confidence: number): string {
  if (confidence >= 0.8) return '高效'
  if (confidence >= 0.6) return '均衡'
  return '需优化'
}

// 获取适用场景
function getScenario(source: string): string {
  const scenarioMap: Record<string, string> = {
    'application-based': '标准作业',
    'cluster-based': '当前集群',
    'history-based': '重复任务',
    'user-input': '自定义需求',
    'ml-prediction': '智能预测'
  }
  return scenarioMap[source] || '通用场景'
}