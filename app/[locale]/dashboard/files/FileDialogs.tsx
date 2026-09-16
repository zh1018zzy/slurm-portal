'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { useT } from '@/lib/i18n-utils';

interface NewFolderDialogProps {
  onConfirm: (folderName: string) => void;
  onCancel: () => void;
}

export function NewFolderDialog({ onConfirm, onCancel }: NewFolderDialogProps) {
  const t = useT('files');
  const tCommon = useT('common');
  const [folderName, setFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!folderName.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(folderName.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('newFolder')}</span>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('folderName')}:
            </label>
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('folderNamePlaceholder')}
              autoFocus
              maxLength={255}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!folderName.trim() || isSubmitting}
            >
              {isSubmitting ? t('creating') : t('create')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}