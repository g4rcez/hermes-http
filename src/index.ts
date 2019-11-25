import QueryString from "query-string";
import { isEmpty, resolveUrl } from "./utils";
import Header from "./header";
import {
	Cache,
	Credentials,
	DownloadTracker,
	ExecRequest,
	HttpClientReturn,
	HttpMethods,
	ModeRequest,
	Redirect,
	RequestConfig,
	RequestInterceptors,
	RequestParameters,
	ResponseFetch,
	ResponseInterceptors,
	RawHeaders,
	FetchParseBodyMethods
} from "./hermes-http";

const timeoutError = {
	data: null,
	error: "timeout",
	headers: {},
	ok: false,
	status: 0,
	statusText: ""
};

const responseTypes = [
	["json", "application/json"],
	["text", "text/"],
	["formData", "multipart/form-data"],
	["arrayBuffer", "*/*"],
	["blob", "*/*"]
];

const defaultStatusCodeRetry = [408, 429, 451, 500, 502, 503, 504];

const defineParserFromMimeType = (value: string | undefined | null = ""): FetchParseBodyMethods => {
	if (value === undefined || value === null) {
		return "blob";
	}
	const lowerCase = value.toLowerCase();
	for (const [type] of responseTypes) {
		if (lowerCase.indexOf(type) >= 0) {
			return type as FetchParseBodyMethods;
		}
	}
	return "blob";
};

const parseBodyRequest = (body: Object | any) => {
	if (body === undefined || body === null) {
		return null;
	}
	if (Array.isArray(body) || body.toString() === "[Object object]") {
		return JSON.stringify(body);
	}
	return body;
};

const getItem = (config: RequestConfig | undefined, item: keyof RequestConfig, def?: any) => config![item] ?? def;

const mutateResponse = async <T extends Function>(response: ResponseFetch, interceptors: T[]): Promise<ResponseFetch> => {
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
	const totalBytes = Number(response.headers.get("content-length")) || 0;
	let amount = 0;
	const reader = response.body?.getReader();
	return new Response(
		new ReadableStream({
			start(controller) {
				onDownloadProgress({ percent: 0, transferred: 0, total: totalBytes, done: false }, new Uint8Array());
				async function read() {
					if (!!reader) {
						const { done, value } = await reader.read();
						if (done) {
							onDownloadProgress(
								{
									percent: 1,
									transferred: totalBytes,
									total: totalBytes,
									done
								},
								value
							);
							controller.close();
							return;
						}
						amount += value.byteLength;
						const percent = totalBytes === 0 ? 0 : amount / totalBytes;
						onDownloadProgress({ percent, transferred: amount, total: totalBytes, done }, value);
						controller.enqueue(value);
						read();
					}
				}
				read();
			}
		})
	);
};

const HttpClient = (configuration: RequestConfig = {}) => {
	let abortRequest = false;
	const fetchInstance = getItem(configuration, "fetchInstance", fetch);
	let throwOnHttpError = getItem(configuration, "throwOnHttpError", true);
	let baseUrl = getItem(configuration, "baseUrl", "");
	let globalTimeout = getItem(configuration, "timeout", 0);
	let globalRetryCodes = getItem(configuration, "retryStatusCode", defaultStatusCodeRetry) as number[];

	const header = new Header(getItem(configuration, "headers", {}));

	const requestInterceptors: RequestInterceptors[] = getItem(configuration, "requestInterceptors", []);
	const errorResponseInterceptors: ResponseInterceptors[] = getItem(configuration, "errorResponseInterceptors", []);
	const successResponseInterceptors: ResponseInterceptors[] = getItem(configuration, "successResponseInterceptors", []);

	const requestMethod = async <T>({
		url,
		body,
		method = "GET",
		retries,
		rejectBase,
		headers,
		retryOnCodes,
		retryAfter = 0,
		query = "",
		signal,
		onDownload
	}: ExecRequest<T>): Promise<Response> => {
		return new Promise(async (resolve, reject) => {
			headers.forEach((value, key) => header.getHeaders().set(key, value));

			let request = {
				body: parseBodyRequest(body),
				cache: "no-store" as Cache,
				credentials: "same-origin" as Credentials,
				headers: header.getHeaders(),
				keepalive: false,
				method,
				mode: "cors" as ModeRequest,
				redirect: "follow" as Redirect,
				referrer: "no-referrer",
				signal
			};

			for (const callback of requestInterceptors) {
				try {
					const promiseValue = await callback({ ...request, url });
					request = { ...request, ...promiseValue.request };
					abortRequest = promiseValue.abort ?? false;
				} catch (error) {
					request = { ...request, ...error.request };
					abortRequest = error.abort ?? false;
				}
			}

			if (abortRequest) {
				const bodyError = new Response();
				return throwOnHttpError ? reject(bodyError) : resolve(bodyError);
			}

			let requestUrl = rejectBase ? url : resolveUrl(baseUrl, url);

			if (!isEmpty(query)) {
				requestUrl += `?${query}`;
			}

			const response = (await fetchInstance(requestUrl, { ...request })) as ResponseFetch;

			const streaming = downloadTracker(response.clone(), onDownload);
			const contentType = defineParserFromMimeType(response.headers.get("content-type"));
			const bodyData = await streaming[contentType]();

			const responseHeaders: RawHeaders = {};
			response.headers.forEach((value, name) => {
				responseHeaders[name] = value;
			});

			const common = {
				url: requestUrl,
				data: bodyData,
				error: null,
				headers: responseHeaders,
				ok: response.ok,
				status: response.status,
				statusText: response.statusText
			} as ResponseFetch;
			if (response.ok) {
				return resolve(mutateResponse(common, successResponseInterceptors));
			}

			const bodyError = await mutateResponse(
				{
					...common,
					error: response.statusText ?? response.status ?? null
				},
				errorResponseInterceptors
			);

			if (retries === 1) {
				return throwOnHttpError ? reject(bodyError) : resolve(bodyError);
			}
			setTimeout(
				() =>
					requestMethod({
						rejectBase,
						url,
						headers,
						retryAfter,
						body,
						method,
						retries: retries - 1,
						retryOnCodes: retryOnCodes.concat(globalRetryCodes)
					})
						.then(resolve)
						.catch(reject),
				retryAfter
			);
		});
	};

	const exec = async <T>(
		url: string,
		body: T | null,
		method: HttpMethods = "GET",
		{
			rejectBase = false,
			query = {},
			encodeQueryString = true,
			arrayFormatQueryString = "index",
			retries = 0,
			controller = new AbortController(),
			timeout = globalTimeout,
			retryCodes = globalRetryCodes,
			headers = new Headers(),
			onDownload,
			retryAfter = 0,
			omitHeaders = []
		}: RequestParameters
	): Promise<ResponseFetch | unknown> => {
		const signal = controller.signal;

		omitHeaders.forEach((x) => {
			if (headers.has(x)) {
				headers.delete(x);
			}
		});

		const queryString = isEmpty(query)
			? ""
			: QueryString.stringify(query, {
					encode: encodeQueryString,
					skipNull: true,
					arrayFormat: arrayFormatQueryString
			  });

		const parameters = {
			body,
			headers,
			method,
			onDownload,
			query: queryString,
			rejectBase,
			retries,
			retryAfter,
			retryOnCodes: retryCodes,
			signal,
			url
		} as ExecRequest<T>;

		if (timeout <= 0) {
			return requestMethod(parameters);
		}

		return Promise.race([
			requestMethod(parameters),
			new Promise((_, reject) =>
				setTimeout(() => {
					controller.abort();
					reject(timeoutError);
				}, timeout)
			)
		]);
	};

	const httpClientMethods: HttpClientReturn = {
		get: (url: string, params: RequestParameters = {}) => exec(url, null, "GET", params),
		put: <T>(url: string, body: T, params: RequestParameters = {}) => exec(url, body, "PUT", params),
		post: <T>(url: string, body: T, params: RequestParameters = {}) => exec(url, body, "POST", params),
		patch: <T>(url: string, body: T, params: RequestParameters = {}) => exec(url, body, "PATCH", params),
		delete: <T>(url: string, body?: T, params: RequestParameters = {}) => exec(url, body, "DELETE", params),
		throwOnHttpError(isThrow: boolean) {
			throwOnHttpError = isThrow;
			return httpClientMethods;
		},
		getRetryCodes() {
			return [...globalRetryCodes];
		},
		addRetryCodes(...code: number[]) {
			code.forEach((x) => {
				if (!globalRetryCodes.includes(x)) {
					globalRetryCodes.push(x);
				}
			});
			return httpClientMethods;
		},
		requestInterceptor(interceptorFunction: RequestInterceptors) {
			requestInterceptors.push(interceptorFunction);
			return httpClientMethods;
		},
		responseInterceptor(interceptorFunction: ResponseInterceptors) {
			successResponseInterceptors.push(interceptorFunction);
			return httpClientMethods;
		},
		addHeader(key: string, value: string) {
			header.addHeader(key, value);
			return httpClientMethods;
		},
		setAuthorization(token: string) {
			header.addAuthorization(token);
			return httpClientMethods;
		},
		getAuthorization: (key: string = "Authorization") => header.getHeader(key) || "",
		getHeader(key: string) {
			header.getHeader(key);
			return httpClientMethods;
		}
	};
	return Object.freeze(httpClientMethods);
};

HttpClient.get = HttpClient().get;
HttpClient.post = HttpClient().post;
HttpClient.patch = HttpClient().patch;
HttpClient.put = HttpClient().put;
HttpClient.delete = HttpClient().delete;

export default HttpClient;
