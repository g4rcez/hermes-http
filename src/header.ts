import { AnyText, HeaderPropsConstructor } from "./hermes-http-types";

export default class Header {
	private headers: Headers;

	public constructor(headers: HeaderPropsConstructor & any) {
		this.headers = new Headers();
		this.headers.append("User-Agent", "hermes-http");
		this.headers.append("connection", "keep-alive");
		this.headers.append("Accept-Encoding", "gzip, deflate");
		this.headers.append("Accept", "application/json, text/plain, */*");
		this.headers.append("Accept-language", "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7");
		this.headers.append("content-type", "application/json;charset=UTF-8");
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

	public get() {
		return this.headers;
	}
}
