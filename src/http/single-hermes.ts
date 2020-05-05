import { getParser, parseBody } from "../helpers/request-parser";
import { FetchParams, ResponseSuccess } from "../types";
import HttpHeaders from "./http-headers";
import timeoutError from "./timeout-error";
import { statusCodeRetry } from "./codes";

const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";

let fetch: ((input: RequestInfo, init?: RequestInit) => Promise<Response>) & {
	Headers: Headers;
	Response: Response;
};

if (!isBrowser) {
	fetch = require("node-fetch");
	global.fetch = fetch;
	global.Headers = fetch.Headers;
	global.Response = fetch.Response;
	global.AbortController = require("abort-controller");
}

export const hermes = async <T>(url: string, params: FetchParams): Promise<ResponseSuccess<T>> => {
	const args = {
		...params,
		url,
		statusCodeRetry: params.statusCodeRetry || statusCodeRetry,
		controller: params.controller || new AbortController(),
		method: params.method || "GET",
		retries: params.retries ?? 0,
		timeout: params.timeout || 0,
		headers: params.headers || new HttpHeaders(),
		retryInterval: params.retryInterval || 10000
	};
	return new Promise(async (resolve, reject) => {
		let timer: any = null;
		const promiseResponse = fetch(url, {
			signal: args.controller.signal,
			method: args.method,
			body: parseBody(args.body),
			redirect: args.redirect,
			referrer: args.referrer,
			referrerPolicy: args.referrerPolicy,
			cache: args.cache,
			credentials: args.credentials,
			headers: args.headers.get(),
			keepalive: true
		});

		let response = new Response();

		if (args.timeout > 0) {
			try {
				const race = await Promise.race([
					new Promise((_resolve, _raceReject) => {
						timer = setTimeout(() => {
							args.controller.abort();
							return reject(timeoutError);
						}, args.timeout);
					}),
					promiseResponse
				]);
				response = (await race) as Response;
			} catch (error) {
				return reject(timeoutError);
			} finally {
				if (timer !== null) {
					clearTimeout(timer as any);
				}
			}
		} else {
			try {
				response = (await promiseResponse) as Response;
			} catch (e) {
				return reject(e);
			}
		}

		const contentType = getParser(response.headers.get("content-type"));
		const bodyData = await response.clone()[contentType]();
		const headers: any = HttpHeaders.rawHeaders(response.headers);

		const common: ResponseSuccess<T> = {
			data: bodyData,
			error: null,
			headers,
			ok: response.ok,
			redirected: response.redirected,
			status: response.status,
			statusText: response.statusText || `${response.status}`,
			type: response.type,
			url
		};

		if (response.ok) {
			return resolve(common);
		}

		common.error = response.statusText ?? response.status ?? null;

		if (args.retries <= 1 || args.statusCodeRetry.includes(common.status)) {
			return reject(common);
		}

		return setTimeout(
			() =>
				hermes(url, { ...args, retries: args.retries - 1 })
					.then(resolve as any)
					.catch(reject),
			args.retryInterval
		);
	});
};

hermes.get = async <T>(url: string, params: FetchParams): Promise<ResponseSuccess<T>> => hermes(url, params);

hermes.post = async <T>(url: string, body: any, params: FetchParams): Promise<ResponseSuccess<T>> =>
	hermes(url, { ...params, body, method: "POST" });

hermes.put = async <T>(url: string, body: any, params: FetchParams): Promise<ResponseSuccess<T>> =>
	hermes(url, { ...params, body, method: "PUT" });

hermes.patch = async <T>(url: string, body: any, params: FetchParams): Promise<ResponseSuccess<T>> =>
	hermes(url, { ...params, body, method: "PATCH" });

hermes.delete = async <T>(url: string, params: FetchParams): Promise<ResponseSuccess<T>> =>
	hermes(url, { ...params, method: "DELETE" });
