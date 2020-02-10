import Header from "./header";
import {
	Cache,
	Credentials,
	DownloadTracker,
	FetchBodyParser,
	HermesConfig,
	HermesResponse,
	HttpClientReturn,
	HttpMethods,
	ModeRequest,
	RawHeaders,
	Redirect,
	RequestConfig,
	RequestInterceptors,
	RequestParameters,
	ResponseInterceptors
} from "./hermes-http-types";
import { isEmpty, queryString, resolveUrl } from "./utils";

const timeoutError = {
	data: null,
	error: "timeout",
	headers: {},
	ok: false,
	status: 0,
	statusText: ""
};

const mimeTypes = [
	["json", "application/json"],
	["formData", "multipart/form-data"],
	["text", "text/"],
	["blob", "*/*"]
];

const defaultStatusCodeRetry = [408, 429, 451, 500, 502, 503, 504];

const getParserFromMimeType = (value: string | undefined | null = ""): FetchBodyParser => {
	if (value === undefined || value === null) {
		return "blob";
	}
	const lowerCase = value.toLowerCase();
	for (const [type] of mimeTypes) {
		if (lowerCase.indexOf(type) >= 0) {
			return type as FetchBodyParser;
		}
	}
	return "blob";
};

const parseBodyRequest = (body: unknown | any) => {
	if (body === undefined || body === null) {
		return null;
	}
	if (Array.isArray(body) || body.toString().toLowerCase() === "[object object]") {
		return JSON.stringify(body);
	}
	return body;
};

type Interceptor = (response: HermesResponse) => Promise<HermesResponse>;

const applyInterceptors = async <T extends Interceptor>(response: HermesResponse, interceptors: T[]): Promise<HermesResponse> => {
	for (const callback of interceptors) {
		try {
			const responseMutate = await callback(response);
			response = { ...response, ...responseMutate };
		} catch (error) {
			response = { ...response, ...error };
		}
	}
	return response;
};

const voidFn = () => {};

const downloadTracker = (response: Response, onDownloadProgress: DownloadTracker = voidFn) => {
	const total = Number(response.headers.get("content-length")) || 0;
	let amount = 0;
	const reader = response.body?.getReader();
	return new Response(
		new ReadableStream({
			start(controller) {
				onDownloadProgress({ percent: 0, transferred: 0, total, done: false }, new Uint8Array());
				async function read() {
					if (!!reader) {
						const { done, value } = await reader.read();
						if (done) {
							onDownloadProgress({ done, percent: 1, total, transferred: total }, value);
							controller.close();
							return;
						}
						amount += value.byteLength;
						const percent = total === 0 ? 0 : amount / total;
						onDownloadProgress({ percent, transferred: amount, total, done }, value);
						controller.enqueue(value);
						read();
					}
				}
				read();
			}
		})
	);
};

const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";

const getIsomorphicFetch = () => {
	if (isBrowser) {
		return window.fetch;
	}
	const nodeFetch = require("node-fetch");
	global.fetch = nodeFetch;
	global.Headers = nodeFetch.Headers;
	global.Response = nodeFetch.Response;
	global.AbortController = require("abort-controller");
	return nodeFetch;
};

const Hermes = (cfg?: HermesConfig) => {
	let abortRequest = false;
	const throwOnHttpError = cfg?.throwOnHttpError ?? true;
	const isomorphicFetch = getIsomorphicFetch();
	const baseUrl = cfg?.baseUrl ?? "";
	const globalTimeout = cfg?.timeout ?? 0;
	const globalRetryCodes = cfg?.retryStatusCode ?? defaultStatusCodeRetry;
	const requestInterceptors: RequestInterceptors[] = cfg?.requestInterceptors ?? [];
	const errorResponseInterceptors: ResponseInterceptors[] = cfg?.errorResponseInterceptors ?? [];
	const successResponseInterceptors: ResponseInterceptors[] = cfg?.successResponseInterceptors ?? [];
	const header = new Header(cfg?.headers ?? {});

	const requestMethod = async <T>(
		{ url, body, method = "GET", retries, headers, retryOnCodes, retryAfter = 0, query = "", signal, onDownload }: RequestConfig<T>,
		timeoutConcurrent?: NodeJS.Timeout | null
	): Promise<HermesResponse> =>
		new Promise(async (resolve, reject) => {
			headers.forEach((value: string, key: string) => header.get().set(key, value));
			let request = {
				body: parseBodyRequest(body),
				cache: "no-store" as Cache,
				credentials: "same-origin" as Credentials,
				headers: header.get(),
				keepalive: false,
				method,
				mode: "cors" as ModeRequest,
				redirect: "follow" as Redirect,
				referrer: "no-referrer",
				signal: signal!
			};
			for (const interceptor of requestInterceptors) {
				try {
					// @ts-ignore
					const promiseValue = await interceptor({ ...request, url });
					request = { ...request, ...promiseValue.request };
					abortRequest = promiseValue.abort ?? false;
				} catch (error) {
					request = { ...request, ...error.request };
					abortRequest = error.abort ?? false;
				}
			}

			if (abortRequest) {
				const abortResponse = {
					...new Response(),
					data: null,
					headers: {},
					error: "AbortRequest"
				} as HermesResponse;
				return throwOnHttpError ? reject(abortResponse) : resolve(abortResponse);
			}
			let requestUrl = isEmpty(baseUrl) ? url : resolveUrl(baseUrl, url);

			if (!isEmpty(query)) {
				requestUrl += `?${query}`;
			}

			const response = (await isomorphicFetch!(requestUrl, request)) as HermesResponse;

			if (timeoutConcurrent !== null) {
				clearTimeout(timeoutConcurrent as any);
			}
			const stream = isBrowser ? downloadTracker(response.clone(), onDownload) : response.clone();
			const contentType = getParserFromMimeType(response.headers.get("content-type"));
			const bodyData = await stream[contentType]();
			const responseHeaders: RawHeaders = {};
			response.headers.forEach((value: string, name: string) => {
				responseHeaders[name] = value;
			});
			const common = {
				data: bodyData,
				error: null,
				headers: responseHeaders,
				ok: response.ok,
				status: response.status,
				statusText: response.statusText,
				url: requestUrl
			} as HermesResponse;
			if (response.ok) {
				return resolve(applyInterceptors(common, successResponseInterceptors));
			}
			const bodyError = await applyInterceptors(
				{
					...common,
					error: response.statusText ?? response.status ?? null
				},
				errorResponseInterceptors
			);
			if (retries <= 1) {
				return throwOnHttpError ? reject(bodyError) : resolve(bodyError);
			}
			return setTimeout(
				() =>
					requestMethod({
						body,
						headers,
						method,
						retries: retries - 1,
						retryAfter,
						retryOnCodes: retryOnCodes.concat(globalRetryCodes),
						url
					})
						.then(resolve)
						.catch(reject),
				retryAfter
			);
		});

	const exec = async <T>(
		url: string,
		body: T | null,
		method: HttpMethods = "GET",
		{
			query = {},
			encodeQueryString = true,
			arrayQueryFormat: arrayFormatQueryString = "index",
			retries = 0,
			controller = new AbortController(),
			timeout = globalTimeout,
			retryCodes = globalRetryCodes,
			headers = new Headers(),
			onDownload,
			retryAfter = 0,
			omitHeaders = []
		}: RequestParameters
	): Promise<HermesResponse> => {
		const { signal } = controller;

		omitHeaders.forEach((x) => {
			if (headers.has(x)) {
				headers.delete(x);
			}
		});

		const queryStr = isEmpty(query)
			? ""
			: queryString(query, {
					array: arrayFormatQueryString,
					encode: encodeQueryString
			  });

		const parameters = {
			body,
			headers,
			method,
			onDownload,
			query: queryStr,
			retries,
			retryAfter,
			retryOnCodes: retryCodes,
			signal,
			url
		} as RequestConfig<T>;

		if (timeout <= 0) {
			return requestMethod(parameters);
		}

		let timer: NodeJS.Timeout | null = null;

		return Promise.race<any>([
			new Promise((_, reject) => {
				timer = setTimeout(() => {
					controller.abort();
					return reject(timeoutError);
				}, timeout);
			}),
			requestMethod(parameters, timer)
		]);
	};

	const hermes: HttpClientReturn = {
		addHeader(key: string, value: string) {
			header.addHeader(key, value);
			return hermes;
		},
		addRetryCodes(...code: number[]) {
			code.forEach((x) => {
				if (!globalRetryCodes.includes(x)) {
					globalRetryCodes.push(x);
				}
			});
			return hermes;
		},
		delete: (url: string, params: RequestParameters = {}) => exec(url, null, "DELETE", params),
		get: (url: string, params: RequestParameters = {}) => exec(url, null, "GET", params),
		getAuthorization: (key: string = "Authorization") => header.getHeader(key) || "",
		getHeader(key: string) {
			return header.getHeader(key);
		},
		getRetryCodes() {
			return [...globalRetryCodes];
		},
		patch: <T>(url: string, body: T, params: RequestParameters = {}) => exec(url, body, "PATCH", params),
		post: <T>(url: string, body: T, params: RequestParameters = {}) => exec(url, body, "POST", params),
		put: <T>(url: string, body: T, params: RequestParameters = {}) => exec(url, body, "PUT", params),
		requestInterceptor(interceptorFunction: RequestInterceptors) {
			requestInterceptors.push(interceptorFunction);
			return hermes;
		},
		responseInterceptor(interceptorFunction: ResponseInterceptors) {
			successResponseInterceptors.push(interceptorFunction);
			return hermes;
		},
		setAuthorization(token: string, headerName?: string) {
			header.addAuthorization(token, headerName);
			return hermes;
		}
	};
	return hermes;
};

export default Hermes;
