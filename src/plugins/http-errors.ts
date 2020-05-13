import { HttpErrorCodes } from "../http/codes";
import { HermesResponse } from "../types";

const getCode = (n: number) => Object.entries(HttpErrorCodes).find((x) => n === x[1]);

export class HttpError {
	public code: number;
	public name: string;
	public message: string | null;

	public constructor(response: HermesResponse<unknown>) {
		const code = getCode(response.status);
		this.code = response.status;
		this.name = code !== undefined ? code[0] : "";
		this.message = response.statusText;
	}
}

const isHttpError = (response: HermesResponse<unknown>) =>
	typeof response.status === "number" && response.status >= 100 && response.status <= 599;

export type HttpResponseError<T> = HermesResponse<T> & {
	httpError: HttpError | null;
};

export const httpErrorInterceptor = async <T>(response: HermesResponse<T>) => {
	const error = new HttpError(response);
	if (isHttpError(response)) {
		return { ...response, httpError: error };
	}
	return { ...response, httpError: null };
};
