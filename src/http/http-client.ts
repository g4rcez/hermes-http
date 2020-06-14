import { getParser, parseBody } from "../helpers/request-parser";
import { FetchParams, HermesResponse, HttpMethods } from "../types";
import { statusCodeRetry as STATUS } from "./codes";
import HttpHeaders from "./http-headers";
import timeoutError from "./timeout-error";

const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
let fetch: any;
if (!isBrowser) {
	(fetch as any) = require("node-fetch");
	(global.fetch as any) = fetch;
	global.Headers = (fetch as any).Headers;
	global.Response = (fetch as any).Response;
	global.Request = (fetch as any).Request;
	global.AbortController = require("abort-controller");
} else {
	fetch = window.fetch;
}

const requestMapper = new Map<string, Promise<any>>();

export const hermes = async <T>(
	url: string,
	{
		retries = 0,
		retryInterval = 1000,
		timeout = 0,
		avoidDuplicateRequests = true,
		statusCodeRetry = STATUS,
		...params
	}: FetchParams
): Promise<HermesResponse<T>> =>
	new Promise(async (resolve, reject) => {
		let timer: any = null;
		const controller = params.controller || new AbortController();
		const hds = params.headers || new HttpHeaders();

		const request = new Request(url, {
			body: parseBody(params.body),
			cache: params.cache,
			credentials: params.credentials,
			headers: hds.get(),
			keepalive: true,
			method: params.method || "GET",
			redirect: params.redirect,
			referrer: params.referrer,
			referrerPolicy: params.referrerPolicy,
			signal: controller.signal
		});

		let promiseResponse;
		if (avoidDuplicateRequests && !requestMapper.has(url)) {
			promiseResponse = fetch(request);
			requestMapper.set(url, promiseResponse);
		} else {
			promiseResponse = requestMapper.get(url);
		}

		let res = new Response();

		if (timeout > 0) {
			try {
				const race = await Promise.race([
					new Promise(() => {
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
			res = (await promiseResponse) as Response;
		}

		const contentType = getParser(res.headers.get("content-type"));
		let bodyData;
		const cloneResponse = new Response(res.body).clone();
		if (contentType === "json") {
			bodyData = JSON.parse(await cloneResponse.text());
		} else {
			bodyData = await cloneResponse[contentType]();
		}
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

		requestMapper.delete(url);

		if (res.ok) {
			return resolve(response);
		}
		response.error = res.statusText || `${res.status}` || null;
		if (retries > 1 && statusCodeRetry.includes(response.status)) {
			return setTimeout(
				() =>
					hermes(url, {
						...request,
						headers: hds,
						method: request.method as HttpMethods,
						retries: retries - 1
					})
						.then(resolve as any)
						.catch(reject),
				retryInterval
			);
		}
		return resolve(response);
	});

hermes.get = async <T = any>(url: string, params: FetchParams): Promise<HermesResponse<T>> => hermes(url, params);

hermes.post = async <T = any>(url: string, body: any, params: FetchParams): Promise<HermesResponse<T>> =>
	hermes(url, { ...params, body, method: "POST" });

hermes.put = async <T = any>(url: string, body: any, params: FetchParams): Promise<HermesResponse<T>> =>
	hermes(url, { ...params, body, method: "PUT" });

hermes.patch = async <T = any>(url: string, body: any, params: FetchParams): Promise<HermesResponse<T>> =>
	hermes(url, { ...params, body, method: "PATCH" });

hermes.delete = async <T = any>(url: string, params: FetchParams): Promise<HermesResponse<T>> =>
	hermes(url, { ...params, method: "DELETE" });
