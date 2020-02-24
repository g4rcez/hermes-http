export const HttpErrorEnum = {
	404: "NOT_FOUND"
};

type HttpCodes = keyof typeof HttpErrorEnum;
export abstract class HttpError extends Error {
	public code: number;

	public constructor(message: string, code: HttpCodes) {
		super(message);
		this.code = code;
		this.name = code in HttpErrorEnum ? HttpErrorEnum[code] : "";
	}
}
