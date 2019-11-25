//@ts-check
const Hermes = require("hermes-http").default;
const fetch = require("node-fetch");

global.fetch = fetch;
global.Headers = fetch.Headers;
global.Response = fetch.Response;
global.AbortController = require("abort-controller");

const hermes = Hermes({
	fetchInstance: fetch,
	timeout: 10000
});

hermes.get("https://api.postmon.com.br/v1/cep/38706400").then(e => console.log(e));
