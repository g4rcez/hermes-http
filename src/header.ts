import { AnyText, HeaderPropsConstructor, RawHeaders } from "./hermes-http-types";

export default class Header {
	private headers: Headers;

	public constructor(headers: HeaderPropsConstructor & any) {
		this.headers = new Headers();
		this.headers.append("User-Agent", "hermes-http");
		this.headers.append("connection", "keep-alive");
		this.headers.append("Accept-Encoding", "gzip, deflate, br");
		this.headers.append("Accept", "application/json, text/plain, */*");
		Object.entries(headers).forEach(([key, value]) => this.headers.append(key, `${value}`));
	}

	public addAuthorization(token: string, authorizationName = "Authorization") {
		this.headers.append(authorizationName, token);
	}

	public addHeader(header: string, value: AnyText = "") {
		this.headers.append(header, `${value}`);
	}

	public getHeader(name: string) {
		return this.headers.get(name);
	}

	public getHeaders() {
		return this.headers;
	}

	public getPlainHeaders() {
		const headers: RawHeaders = {};
		this.headers.forEach((value, header) => {
			headers[header] = value;
		});
		return headers;
	}
}
