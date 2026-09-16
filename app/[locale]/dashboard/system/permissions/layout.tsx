import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Shield, Users, Settings } from 'lucide-react';
import Link from 'next/link';

export default function PermissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {/* 子页面内容 */}
      {children}
    </div>
  );
} 