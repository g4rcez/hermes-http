import { RawHeaders, Txt } from "../types";

export default class HttpHeaders {
	public static rawHeaders(headers: Headers) {
		const responseHeaders: RawHeaders = {};
		headers.forEach((value: string, name: string) => {
			responseHeaders[name] = value;
		});
		return responseHeaders;
	}

	private headers: Headers;

	public constructor(headers: RawHeaders = {}) {
		this.headers = new Headers();
		this.headers.append("User-Agent", "hermes-http");
		this.headers.append("Accept-Encoding", "gzip, deflate");
		Object.entries(headers).forEach(([key, value]) => this.headers.append(key, `${value}`));
	}

	public addHeader(header: string, value: Txt = "") {
		this.headers.append(header, `${value}`);
	}
	public get = () => this.headers;
}
