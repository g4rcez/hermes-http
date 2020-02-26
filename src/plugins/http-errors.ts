import { ResponseError } from "../hermes-http-types";

export const HttpErrorEnum = {
	100: "CONTINUE",
	200: "OK",
	201: "CREATED",
	202: "ACCEPTED",
	203: "NON_AUTHORITATIVE_INFORMATION",
	204: "NO_CONTENT",
	205: "RESET_CONTENT",
	206: "PARTIAL_CONTENT",
	301: "MOVE_PERMANENTLY",
	302: "FOUND",
	307: "TEMPORARY_REDIRECT",
	308: "PERMANENT_REDIRECT",
	400: "BAD_REQUEST",
	401: "UNAUTHORIZED",
	402: "PAYMENT_REQUIRED",
	403: "FORBIDDEN",
	404: "NOT_FOUND",
	405: "METHOD_NOT_ALLOWED",
	406: "NOT_ACCEPTABLE",
	408: "REQUEST_TIMEOUT",
	409: "CONFLICT",
	429: "TOO_MANY_REQUESTS",
	500: "INTERNAL_SERVER_ERROR",
	501: "NOT_IMPLEMENTED",
	502: "BAD_GATEWAY",
	503: "SERVICE_UNAVAILABLE",
	504: "GATEWAY_TIMEOUT"
};

export class HttpError {
	public code: number;
	public name: string;
	public message: string | null;

	public constructor(response: ResponseError<unknown>) {
		this.code = response.status;
		this.name = this.code in HttpErrorEnum ? HttpErrorEnum[this.code] : "";
		this.message = response.statusText;
	}
}

const isHttpError = (response: ResponseError<unknown>) =>
	typeof response.status === "number" && response.status >= 100 && response.status <= 599;

export type HttpResponseError<T> = ResponseError<T> & {
	httpError: HttpError | null;
};

export const httpErrorInterceptor = async <T>(response: ResponseError<T>) => {
	const error = new HttpError(response);
	if (isHttpError(response)) {
		return { ...response, httpError: error };
	}
	return { ...response, httpError: null };
};
