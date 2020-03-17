import Header from "./header";
import { HttpErrorCodes, statusCodeRetry } from "./helpers/http-codes";
import { intercept } from "./helpers/interceptors";
import {
	BodyParser,
	ErrorInterceptor,
	Hermes,
	HermesConfig,
	HttpMethods,
	RawHeaders,
	RequestConfig,
	RequestInterceptor,
	RequestParameters,
	ResponseError,
	ResponseSuccess,
	SuccessInterceptor
} from "./hermes-http-types";
import { concatUrl, qs } from "./utils";

const requestMap = new Map<string, Promise<any> | null>();

const timeoutError = {
	data: null,
	error: "timeout",
	headers: {},
	ok: false,
	status: HttpErrorCodes.REQUEST_TIMEOUT,
	statusText: ""
};

const mimeTypes = [
	["json", "application/json"],
	["formData", "multipart/form-data"],
	["text", "text/"],
	["blob", "*/*"]
];

const getParser = (value: string | undefined | null = ""): BodyParser => {
	if (value === undefined || value === null) {
		return "blob";
	}
	const lowerCase = value.toLowerCase();
	for (const [type] of mimeTypes) {
		if (lowerCase.indexOf(type) >= 0) {
			return type as BodyParser;
		}
	}
	return "blob";
};

const parseBody = (body: unknown | any) => {
	if (body === undefined || body === null) {
		return null;
	}
	if (Array.isArray(body) || body.toString().toLowerCase() === "[object object]") {
		return JSON.stringify(body);
	}
	return body;
};

const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";

let nodeFetch: any;

if (!isBrowser) {
	nodeFetch = require("node-fetch");
	global.fetch = nodeFetch;
	global.Headers = nodeFetch.Headers;
	global.Response = nodeFetch.Response;
	global.AbortController = require("abort-controller");
}

const getIsomorphicFetch = () => (isBrowser ? window.fetch : nodeFetch);

const initial = {
	avoidDuplicateRequests: false,
	baseUrl: "",
	globalTimeout: 0,
	headers: {},
	retryStatusCode: statusCodeRetry
};
export const HermesHttp = ({
	avoidDuplicateRequests = false,
	baseUrl = "",
	globalTimeout = 0,
	headers = {},
	retryStatusCode = statusCodeRetry
}: HermesConfig = initial) => {
	const isomorphicFetch = getIsomorphicFetch();
	let abortRequest = false;
	const header = new Header(headers ?? {});

	const requestInterceptors: any[] = [];
	const errorResponseInterceptors: any[] = [];
	const successResponseInterceptors: any[] = [];

	const client = async <BodyType, ErrorResponse>(
		{
			url,
			body,
			method = "GET",
			retries,
			headers,
			retryOnCodes,
			retryAfter = 0,
			query = "",
			signal,
			cors = "cors",
			credentials = "same-origin",
			redirect = "follow"
		}: RequestConfig<BodyType>,
		raceTimeout?: NodeJS.Timeout | null
	): Promise<ResponseSuccess<BodyType>> =>
		new Promise(async (resolve, reject) => {
			headers.forEach((value: string, key: string) => header.get().set(key, value));
			let request = {
				body: parseBody(body),
				cache: "no-cache",
				credentials,
				headers: header.get(),
				keepalive: false,
				method,
				mode: cors,
				redirect,
				referrer: "no-referrer",
				signal: signal!
			};

			for (const interceptor of requestInterceptors) {
				try {
					// @ts-ignore
					const promiseValue = await interceptor({ ...request, url });
					request = { ...request, ...promiseValue.request };
					abortRequest = promiseValue.abort ?? false;
				} catch (e) {
					request = { ...request, ...e.request };
					abortRequest = e.abort ?? false;
				}
			}

			if (abortRequest) {
				const abortResponse = {
					...new Response(),
					data: null,
					headers: {},
					error: "aborted"
				} as never;
				return reject(abortResponse);
			}

			let requestUrl = baseUrl.trim() === "" ? url : concatUrl(baseUrl, url);

			if (query.trim() !== "") {
				requestUrl += `?${query}`;
			}

			let promiseResponse: Promise<any> | null = null;

			if (avoidDuplicateRequests) {
				if (requestMap.has(requestUrl)) {
					promiseResponse = requestMap.get(requestUrl) ?? null;
				} else {
					promiseResponse = isomorphicFetch(requestUrl, request);
					requestMap.set(requestUrl, promiseResponse);
				}
			} else {
				promiseResponse = isomorphicFetch(requestUrl, request);
			}

			let response: Response = new Response();
			try {
				response = (await promiseResponse) as Response;
			} catch (e) {
				return reject(e);
			}

			if (raceTimeout !== null) {
				clearTimeout(raceTimeout as any);
			}

			requestMap.delete(requestUrl);

			const contentType = getParser(response.headers.get("content-type"));
			const bodyData = await response.clone()[contentType]();
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
			};

			if (response.ok) {
				return resolve(intercept(common as never, successResponseInterceptors) as never);
			}
			const bodyError = (await intercept(
				{
					...common,
					error: response.statusText ?? response.status ?? null
				} as never,
				errorResponseInterceptors
			)) as ResponseError<ErrorResponse>;

			if (retries <= 1) {
				return reject(bodyError);
			}

			return setTimeout(
				() =>
					client({
						cors,
						credentials,
						query,
						redirect,
						signal,
						body,
						headers,
						method,
						retries: retries - 1,
						retryAfter,
						retryOnCodes,
						url
					})
						.then(resolve)
						.catch(reject),
				retryAfter
			);
		});

	const exec = async <T>(
		url: string,
		body: unknown,
		method: HttpMethods = "GET",
		{
			query = {},
			encodeQueryString = true,
			retries = 0,
			controller = new AbortController(),
			timeout = globalTimeout,
			retryCodes = retryStatusCode,
			headers = new Headers(),
			cors,
			credentials,
			redirect,
			retryAfter = 0,
			omitHeaders = []
		}: RequestParameters
	): Promise<ResponseSuccess<T>> => {
		const { signal } = controller;

		omitHeaders.forEach((x) => {
			if (headers.has(x)) {
				headers.delete(x);
			}
		});

		const queryStr = qs(query, { encode: encodeQueryString });
		console.log({ query, queryStr });

		const parameters = {
			body,
			headers,
			method,
			query: queryStr,
			retries,
			cors,
			credentials,
			redirect,
			retryAfter,
			retryOnCodes: retryCodes,
			signal,
			url
		} as RequestConfig<T>;

		if (timeout <= 0) {
			return client(parameters);
		}

		let timer: NodeJS.Timeout | null = null;

		try {
			return Promise.race<any>([
				new Promise((_resolve, reject) => {
					timer = setTimeout(() => {
						controller.abort();
						return reject(timeoutError);
					}, timeout);
				}),
				client(parameters, timer)
			]);
		} catch {
			return Promise.reject(timeoutError);
		}
	};

	const hermes: Hermes = {
		addHeader(key: string, value: string) {
			header.addHeader(key, value);
			return hermes;
		},
		delete: <T>(url: string, params: RequestParameters = {}) => exec<T>(url, null, "DELETE", params),
		get: <T extends any>(url: string, params: RequestParameters = {}) => exec<T>(url, null, "GET", params),
		getHeaders: () => header.get(),
		getRetryCodes: () => [...retryStatusCode],
		patch: <T>(url: string, body: unknown, params: RequestParameters = {}) => exec<T>(url, body, "PATCH", params),
		post: <T>(url: string, body: unknown, params: RequestParameters = {}) => exec<T>(url, body, "POST", params),
		put: <T>(url: string, body: unknown, params: RequestParameters = {}) => exec<T>(url, body, "PUT", params),
		requestInterceptor(interceptorFunction: RequestInterceptor) {
			requestInterceptors.push(interceptorFunction);
			return hermes;
		},
		successResponseInterceptor<T>(interceptorFunction: SuccessInterceptor<T>) {
			successResponseInterceptors.push(interceptorFunction);
			return hermes;
		},
		errorResponseInterceptor<T>(interceptorFunction: ErrorInterceptor<T>) {
			errorResponseInterceptors.push(interceptorFunction);
			return hermes;
		}
	};
	return hermes;
};
