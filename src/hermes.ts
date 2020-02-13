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
	SuccessInterceptor
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

type Interceptor<T, E> = (response: HermesResponse<T, E>) => Promise<HermesResponse<T, E>>;

const applyInterceptors = async <T, E>(response: HermesResponse<T, E>, interceptors: Interceptor<T, E>[]): Promise<HermesResponse<T, E>> => {
	for (const callback of interceptors) {
		try {
			const responseMutate = await callback(response);
			response = { ...response, ...responseMutate };
		} catch (error) {
			response = { ...response, ...error };
		}
	}
	console.log("NEW RESPONSE", response);
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

const Hermes = ({
	throwOnHttpError = true,
	requestInterceptors = [],
	baseUrl = "",
	headers = {},
	globalTimeout = 0,
	retryStatusCode = defaultStatusCodeRetry
}: HermesConfig) => {
	let abortRequest = false;
	const isomorphicFetch = getIsomorphicFetch();
	const header = new Header(headers ?? {});

	const errorResponseInterceptors: any[] = [];
	const successResponseInterceptors: any[] = [];

	const requestMethod = async <SuccessBody, ErrorResponse>(
		{ url, body, method = "GET", retries, headers, retryOnCodes, retryAfter = 0, query = "", signal, onDownload }: RequestConfig<SuccessBody>,
		timeoutConcurrent?: NodeJS.Timeout | null
	): Promise<HermesResponse<SuccessBody, ErrorResponse>> =>
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
				} as any;
				return throwOnHttpError ? reject(abortResponse) : resolve(abortResponse as any);
			}
			let requestUrl = isEmpty(baseUrl) ? url : resolveUrl(baseUrl, url);

			if (!isEmpty(query)) {
				requestUrl += `?${query}`;
			}

			const response = (await isomorphicFetch!(requestUrl, request)) as Response;

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
			} as HermesResponse<SuccessBody, ErrorResponse>;

			if (response.ok) {
				return resolve(applyInterceptors<SuccessBody, ErrorResponse>(common as never, successResponseInterceptors));
			}
			const bodyError = (await applyInterceptors(
				{
					...common,
					error: response.statusText ?? response.status ?? null
				} as never,
				errorResponseInterceptors
			)) as HermesResponse<ErrorResponse, ErrorResponse>;
			if (retries <= 1) {
				return throwOnHttpError ? reject(bodyError) : resolve(bodyError as never);
			}
			return setTimeout(
				() =>
					requestMethod({
						body,
						headers,
						method,
						retries: retries - 1,
						retryAfter,
						retryOnCodes: retryOnCodes.concat(retryStatusCode),
						url
					})
						.then(resolve as any)
						.catch(reject),
				retryAfter
			);
		});

	const exec = async <T, E>(
		url: string,
		body: unknown,
		method: HttpMethods = "GET",
		{
			query = {},
			encodeQueryString = true,
			arrayQueryFormat: arrayFormatQueryString = "index",
			retries = 0,
			controller = new AbortController(),
			timeout = globalTimeout,
			retryCodes = retryStatusCode,
			headers = new Headers(),
			onDownload,
			retryAfter = 0,
			omitHeaders = []
		}: RequestParameters
	): Promise<HermesResponse<T, E>> => {
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
				if (!retryStatusCode.includes(x)) {
					retryStatusCode.push(x);
				}
			});
			return hermes;
		},
		delete: <T, E>(url: string, params: RequestParameters = {}) => exec<T, E>(url, null, "DELETE", params),
		get: <T, E>(url: string, params: RequestParameters = {}) => exec<T, E>(url, null, "GET", params),
		getHeaders: () => header.get(),
		getRetryCodes() {
			return [...retryStatusCode];
		},
		patch: <T, E>(url: string, body: unknown, params: RequestParameters = {}) => exec<T, E>(url, body, "PATCH", params),
		post: <T, E>(url: string, body: unknown, params: RequestParameters = {}) => exec<T, E>(url, body, "POST", params),
		put: <T, E>(url: string, body: unknown, params: RequestParameters = {}) => exec<T, E>(url, body, "PUT", params),
		requestInterceptor(interceptorFunction: RequestInterceptors) {
			requestInterceptors.push(interceptorFunction);
			return hermes;
		},
		successResponseInterceptor<T>(interceptorFunction: SuccessInterceptor<T>) {
			successResponseInterceptors.push(interceptorFunction);
			return hermes;
		}
	};
	return hermes;
};

export default Hermes;