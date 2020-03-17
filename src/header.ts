import { Txt, RawHeaders } from "./hermes-http-types";

export default class Header {
	private headers: Headers;

	public constructor(headers: RawHeaders & any) {
		this.headers = new Headers();
		this.headers.append("User-Agent", "hermes-http");
		this.headers.append("Accept-Encoding", "gzip, deflate");
		Object.entries(headers).forEach(([key, value]) => this.headers.append(key, `${value}`));
	}

	public addHeader(header: string, value: Txt = "") {
		this.headers.append(header, `${value}`);
	}

	public get() {
		return this.headers;
	}
}
