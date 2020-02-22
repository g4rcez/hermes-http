import { AnyText, RawHeaders } from "./hermes-http-types";

export default class Header {
	private headers: Headers;

	public constructor(headers: RawHeaders & any) {
		this.headers = new Headers();
		this.headers.append("User-Agent", "hermes-http");
		this.headers.append("Accept-Encoding", "gzip, deflate");
		this.headers.append("Accept", "application/json, text/plain, */*");
		this.headers.append("Content-Type", "application/json;charset=UTF-8");
		Object.entries(headers).forEach(([key, value]) => this.headers.append(key, `${value}`));
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
