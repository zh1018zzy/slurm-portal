'use client';

import { useState, useEffect, useMemo } from 'react';

interface LightCodeHighlighterProps {
  code: string;
  language: string;
  className?: string;
}

// 简单的语法高亮器，只处理基本的语法
export function LightCodeHighlighter({ code, language, className = '' }: LightCodeHighlighterProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('');

  const highlightCode = useMemo(() => {
    if (!code) return '';

    // 基本的语法高亮规则
    let highlighted = code;

    if (language === 'javascript' || language === 'js' || language === 'typescript' || language === 'ts') {
      // JavaScript/TypeScript 关键词
      highlighted = highlighted.replace(
        /\b(const|let|var|function|class|if|else|for|while|return|import|export|from|default|async|await|try|catch|throw|new|this|super|extends|implements|interface|type|enum|namespace|module|declare|public|private|protected|readonly|static)\b/g,
        '<span class="text-blue-600 font-semibold">$1</span>'
      );
      
      // 字符串
      highlighted = highlighted.replace(
        /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g,
        '<span class="text-green-600">$1$2$1</span>'
      );
      
      // 注释
      highlighted = highlighted.replace(
        /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        '<span class="text-gray-500 italic">$1</span>'
      );
      
      // 数字
      highlighted = highlighted.replace(
        /\b(\d+(?:\.\d+)?)\b/g,
        '<span class="text-orange-600">$1</span>'
      );
    } else if (language === 'json') {
      // JSON 高亮
      highlighted = highlighted.replace(
        /(["'])((?:\\.|(?!\1)[^\\])*?)\1:/g,
        '<span class="text-blue-600">$1$2$1</span>:'
      );
      
      highlighted = highlighted.replace(
        /:\s*(["'])((?:\\.|(?!\1)[^\\])*?)\1/g,
        ': <span class="text-green-600">$1$2$1</span>'
      );
      
      highlighted = highlighted.replace(
        /\b(true|false|null)\b/g,
        '<span class="text-purple-600">$1</span>'
      );
      
      highlighted = highlighted.replace(
        /\b(\d+(?:\.\d+)?)\b/g,
        '<span class="text-orange-600">$1</span>'
      );
    } else if (language === 'python' || language === 'py') {
      // Python 关键词
      highlighted = highlighted.replace(
        /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|with|lambda|yield|async|await|pass|break|continue|global|nonlocal|True|False|None)\b/g,
        '<span class="text-blue-600 font-semibold">$1</span>'
      );
      
      // 字符串
      highlighted = highlighted.replace(
        /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g,
        '<span class="text-green-600">$1$2$1</span>'
      );
      
      // 注释
      highlighted = highlighted.replace(
        /(#.*$)/gm,
        '<span class="text-gray-500 italic">$1</span>'
      );
    }

    return highlighted;
  }, [code, language]);

  useEffect(() => {
    setHighlightedCode(highlightCode);
  }, [highlightCode]);

  return (
    <pre className={`bg-gray-50 p-4 rounded-lg overflow-auto text-sm font-mono ${className}`}>
      <code
        dangerouslySetInnerHTML={{ __html: highlightedCode || code }}
        className="block whitespace-pre-wrap break-all"
      />
    </pre>
  );
}