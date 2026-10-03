import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleBillingRequest } from '../src/server/billingApi.js'

export default async function handler(request: IncomingMessage & { body?: unknown }, response: ServerResponse) {
	response.setHeader('Cache-Control', 'no-store')
	response.setHeader('Content-Type', 'application/json; charset=utf-8')
	let body: string | undefined
	if (request.method === 'POST') {
		if (request.body !== undefined) body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body)
		else {
			const chunks: Buffer[] = []
			let size = 0
			for await (const chunk of request) {
				const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
				size += bytes.length
				if (size > 4096) break
				chunks.push(bytes)
			}
			body = size > 4096 ? '' : Buffer.concat(chunks).toString('utf8')
		}
	}
	const result = await handleBillingRequest({ method: request.method, origin: request.headers.origin, host: request.headers.host, cookie: request.headers.cookie, body })
	response.statusCode = result.status
	response.end(result.body)
}
