import { accountSession, getCloudConfig, proxyBackend, sameOrigin } from './cloudAccess.js'

interface BillingRequest { method?: string; origin?: string; host?: string; cookie?: string; body?: string }

export async function handleBillingRequest(request: BillingRequest) {
	if (request.method !== 'GET' && request.method !== 'POST') return { status: 405, body: JSON.stringify({ error: 'روش درخواست مجاز نیست' }) }
	const session = accountSession(request.cookie)
	if (!session) return { status: 401, body: JSON.stringify({ error: 'ابتدا وارد حساب شوید' }) }
	if (request.method === 'POST' && !sameOrigin(request.origin, request.host)) return { status: 403, body: JSON.stringify({ error: 'درخواست مجاز نیست' }) }
	if (request.method === 'POST' && (!request.body || Buffer.byteLength(request.body) > 4096)) return { status: 400, body: JSON.stringify({ error: 'درخواست معتبر نیست' }) }
	const config = getCloudConfig()
	if (!config) return { status: 503, body: JSON.stringify({ error: 'اتصال ابری در سرور تنظیم نشده است' }) }
	try { return await proxyBackend(config, '/api/billing', request.method, request.body, session) }
	catch { return { status: 502, body: JSON.stringify({ error: 'ارتباط با بک‌اند برقرار نشد' }) } }
}
