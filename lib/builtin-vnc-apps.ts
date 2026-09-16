export const BUILTIN_VNC_APPS = [
  {
    id: 'vnc-desktop',
    name: 'VNC Desktop',
    description: 'Full Linux desktop environment with graphical applications',
    category: 'Desktop',
    icon: '/icons/desktop.svg',
    command: 'mate-session',
    fields: [
      {
        name: 'geometry',
        label: 'Resolution',
        type: 'select',
        default: '1920x1080',
        options: [
          { value: '1024x768', label: '1024x768 (XGA)' },
          { value: '1280x800', label: '1280x800 (WXGA)' },
          { value: '1280x1024', label: '1280x1024 (SXGA)' },
          { value: '1440x900', label: '1440x900 (WXGA+)' },
          { value: '1600x900', label: '1600x900 (HD+)' },
          { value: '1920x1080', label: '1920x1080 (Full HD)' },
          { value: '2560x1440', label: '2560x1440 (2K QHD)' },
          { value: '3840x2160', label: '3840x2160 (4K UHD)' }
        ]
      }
    ]
  }
] 