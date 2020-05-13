import { getParser, parseBody } from "../helpers/request-parser";
import { FetchParams, HermesResponse, HttpMethods } from "../types";
import HttpHeaders from "./http-headers";
import timeoutError from "./timeout-error";
import { statusCodeRetry as STATUS } from "./codes";

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
	global.Request = (fetch as any).Request;
	global.AbortController = require("abort-controller");
}

export const hermes = async <T>(
	url: string,
	{ retries = 0, retryInterval = 1000, timeout = 0, statusCodeRetry = STATUS, ...params }: FetchParams
): Promise<HermesResponse<T>> =>
	new Promise(async (resolve, reject) => {
		let timer: any = null;
		const controller = params.controller || new AbortController();
		const hds = params.headers || new HttpHeaders();

		const request = new Request(url, {
			signal: controller.signal,
			method: params.method || "GET",
			body: parseBody(params.body),
			redirect: params.redirect,
			referrer: params.referrer,
			referrerPolicy: params.referrerPolicy,
			cache: params.cache,
			credentials: params.credentials,
			headers: hds.get(),
			keepalive: true
		});

		const promiseResponse = fetch(request);

		let res = new Response();

		if (timeout > 0) {
			try {
				const race = await Promise.race([
					new Promise((_resolve, _raceReject) => {
						timer = setTimeout(() => {
							controller.abort();
							return reject(timeoutError);
						}, timeout);
					}),
					promiseResponse
				]);
				res = (await race) as Response;
			} catch (error) {
				return reject(timeoutError);
			} finally {
				if (timer !== null) {
					clearTimeout(timer as any);
				}
			}
		} else {
			try {
				res = (await promiseResponse) as Response;
			} catch (e) {
				return reject(e);
			}
		}

		const contentType = getParser(res.headers.get("content-type"));
		const bodyData = await res.clone()[contentType]();
		const headers: any = HttpHeaders.rawHeaders(res.headers);

		const response: HermesResponse<T> = {
			data: bodyData,
			error: null,
			headers,
			ok: res.ok,
			redirected: res.redirected,
			status: res.status,
			statusText: res.statusText || `${res.status}`,
			type: res.type,
			url
		};

		if (res.ok) {
			return resolve(response);
		}
		response.error = res.statusText || `${res.status}` || null;
		if (retries > 1 && statusCodeRetry.includes(response.status)) {
			return setTimeout(
				() =>
					hermes(url, {
						...request,
						method: request.method as HttpMethods,
						headers: hds,
						retries: retries - 1
					})
						.then(resolve as any)
						.catch(reject),
				retryInterval
			);
		}
		return reject(response);
	});

hermes.get = async <T>(url: string, params: FetchParams): Promise<HermesResponse<T>> => hermes(url, params);

hermes.post = async <T>(url: string, body: any, params: FetchParams): Promise<HermesResponse<T>> =>
	hermes(url, { ...params, body, method: "POST" });

hermes.put = async <T>(url: string, body: any, params: FetchParams): Promise<HermesResponse<T>> =>
	hermes(url, { ...params, body, method: "PUT" });

hermes.patch = async <T>(url: string, body: any, params: FetchParams): Promise<HermesResponse<T>> =>
	hermes(url, { ...params, body, method: "PATCH" });

hermes.delete = async <T>(url: string, params: FetchParams): Promise<HermesResponse<T>> =>
	hermes(url, { ...params, method: "DELETE" });
