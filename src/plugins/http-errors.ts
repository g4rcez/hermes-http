import { HttpErrorEnum } from "../http/codes";
import { ResponseError } from "../types";

export class HttpError {
	public code: number;
	public name: string;
	public message: string | null;

	public constructor(response: ResponseError<unknown>) {
		this.code = response.status;
		this.name = this.code in HttpErrorEnum ? (HttpErrorEnum as any)[this.code] : "";
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
