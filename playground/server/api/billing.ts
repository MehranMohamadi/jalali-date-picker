import { handleBillingRequest } from '../../../src/server/billingApi'

export default defineEventHandler(async (event) => {
	setHeader(event, 'Cache-Control', 'no-store')
	const result = await handleBillingRequest({
		method: event.method,
		origin: getHeader(event, 'origin'),
		host: getHeader(event, 'host'),
		cookie: getHeader(event, 'cookie'),
		body: event.method === 'POST' ? await readRawBody(event) : undefined,
	})
	setResponseStatus(event, result.status)
	return JSON.parse(result.body)
})
