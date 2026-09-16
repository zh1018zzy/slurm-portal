// 内容已迁移到仪表盘首页 /dashboard/page.tsx

import { useT } from '@/lib/i18n-utils';

export default function ComputePage() {
  const t = useT('compute');

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">{t('migratedToDashboard')}</p>
    </div>
  );
}