import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
export const dynamic = 'force-dynamic'


/**
 * Update MATLAB application to English
 * POST /api/applications/update-matlab
 */
export async function POST() {
  try {
    console.log('[Update MATLAB] Starting update...')

    // Update MATLAB application metadata and interface
    const { data, error } = await supabase
      .from('hpc_applications')
      .update({
        metadata: {
          name: 'matlab',
          displayName: 'MATLAB',
          version: 'R2023b',
          description: 'Advanced numerical computing, visualization, and programming environment',
          author: 'MathWorks',
          homepage: 'https://www.mathworks.com/products/matlab.html',
          license: 'Commercial',
          tags: ['matlab', 'numerical-computing', 'scientific-computing', 'engineering'],
          category: 'scientific-computing',
          type: ['batch', 'interactive', 'gui']
        },
        interface: {
          form: [
            {
              name: 'jobName',
              label: 'Job Name',
              type: 'text',
              required: true,
              default: 'matlab-job',
              description: 'Specify a name for your MATLAB job',
              validation: {
                pattern: '^[a-zA-Z0-9_-]+$',
                maxLength: 50
              }
            },
            {
              name: 'executionMode',
              label: 'Execution Mode',
              type: 'select',
              required: true,
              default: 'batch',
              options: [
                { value: 'batch', label: 'Batch Mode', description: 'Submit script to queue' },
                { value: 'interactive', label: 'Interactive Mode', description: 'Allocate resources and execute interactively' },
                { value: 'gui', label: 'GUI Mode', description: 'Launch MATLAB GUI' }
              ]
            },
            {
              name: 'resourceProfile',
              label: 'Resource Profile',
              type: 'select',
              required: true,
              default: 'default',
              options: [
                { value: 'default', label: 'Default (4 cores, 16GB)' },
                { value: 'interactive', label: 'Interactive (2 cores, 8GB)' },
                { value: 'large-memory', label: 'Large Memory (16 cores, 128GB)' },
                { value: 'parallel', label: 'Parallel (32 cores, 64GB)' }
              ]
            },
            {
              name: 'inputType',
              label: 'Input Type',
              type: 'select',
              required: true,
              default: 'code',
              options: [
                { value: 'code', label: 'Enter code directly' },
                { value: 'file', label: 'Upload script file' }
              ],
              condition: {
                field: 'executionMode',
                value: 'batch'
              }
            },
            {
              name: 'matlabCode',
              label: 'MATLAB Code',
              type: 'textarea',
              required: true,
              placeholder: `% Enter your MATLAB code here
% Example:
x = linspace(0, 2*pi, 100);
y = sin(x);
plot(x, y);
title('Sine Function Plot');
saveas(gcf, 'sine_plot.png');`,
              condition: {
                field: 'inputType',
                value: 'code'
              },
              help: {
                text: 'Enter the MATLAB code to execute. Code will run in batch mode.',
                example: 'disp("Hello, MATLAB!");'
              }
            },
            {
              name: 'scriptFile',
              label: 'MATLAB Script File',
              type: 'file',
              accept: ['.m'],
              condition: {
                field: 'inputType',
                value: 'file'
              },
              help: {
                text: 'Upload .m format MATLAB script file'
              }
            },
            {
              name: 'dataFiles',
              label: 'Data Files',
              type: 'file',
              multiple: true,
              accept: ['.mat', '.txt', '.csv', '.xlsx'],
              required: false,
              description: 'Upload data files if your code needs to read them'
            },
            {
              name: 'walltime',
              label: 'Maximum Runtime',
              type: 'select',
              required: true,
              default: '2:00:00',
              options: [
                { value: '0:30:00', label: '30 minutes' },
                { value: '1:00:00', label: '1 hour' },
                { value: '2:00:00', label: '2 hours' },
                { value: '4:00:00', label: '4 hours' },
                { value: '8:00:00', label: '8 hours' },
                { value: '12:00:00', label: '12 hours' },
                { value: '24:00:00', label: '24 hours' }
              ]
            },
            {
              name: 'vncGeometry',
              label: 'VNC Resolution',
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
              ],
              condition: {
                field: 'executionMode',
                value: 'gui'
              }
            },
            {
              name: 'emailNotification',
              label: 'Email Notification',
              type: 'boolean',
              default: false,
              description: 'Send email notification when job completes'
            }
          ]
        },
        updated_at: new Date().toISOString()
      })
      .eq('metadata->>name', 'matlab')

    if (error) {
      console.error('[Update MATLAB] Error:', error)
      return NextResponse.json({
        success: false,
        message: 'Failed to update MATLAB application',
        error: error.message
      }, { status: 500 })
    }

    console.log('[Update MATLAB] Update completed successfully')

    return NextResponse.json({
      success: true,
      message: 'MATLAB application updated to English successfully',
      data
    })

  } catch (error) {
    console.error('[Update MATLAB] Unexpected error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to update MATLAB application',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/applications/update-matlab - Check current MATLAB application status
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('hpc_applications')
      .select('metadata, interface')
      .eq('metadata->>name', 'matlab')
      .single()

    if (error) {
      return NextResponse.json({
        success: false,
        message: 'MATLAB application not found',
        error: error.message
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
