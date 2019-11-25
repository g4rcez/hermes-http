import fetch from "node-fetch";
import Hermes, { ResponseFetch } from "../dist";

const hermes = Hermes({
	fetchInstance: fetch,
	responseType: "application/json",
	throwOnHttpError: false
});

describe("blah", () => {
	it("works", () => {
		const url = "https://api.postmon.com.br/v1/cep/38706400";
		hermes
			.get(url)
			.then((e) => e)
			.catch((e: ResponseFetch) => e.data);
	});
});
