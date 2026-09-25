import { Capacitor, registerPlugin } from '@capacitor/core'

type CloudPath = '/api/account' | '/api/cloud-sync'

interface NativeCloudApi {
  request: (options: { path: CloudPath, method: string, body?: string }) => Promise<{ status: number, data: unknown }>
}

const nativeCloudApi = registerPlugin<NativeCloudApi>('BudgetyarApi')

export async function requestCloudApi(path: CloudPath, init: RequestInit = {}): Promise<Response> {
  if (Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform()) {
    const result = await nativeCloudApi.request({
      path,
      method: init.method || 'GET',
      body: typeof init.body === 'string' ? init.body : undefined,
    })
    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return fetch(path, { ...init, credentials: 'same-origin', cache: 'no-store' })
}
