import Hermes, { httpErrorInterceptor, HttpResponseError } from "hermes-http";

const hermes = new Hermes().errorResponseInterceptor(httpErrorInterceptor);

hermes
	.get("https://crt.sh/?output=json&q=example.com")
	.then(async (e) => {
		console.log("RESPONSE", e);
	})
	.catch((e: HttpResponseError<unknown>) => {
		if (e.httpError !== null) {
			console.log({ ...e });
		}
		console.error(e);
	});
