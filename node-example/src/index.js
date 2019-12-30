//@ts-check
const Hermes = require("hermes-http").default;

const hermes = Hermes({ timeout: 30000 });

hermes
	.get("https://api.postmon.com.br/v1/cep/38706400")
	.then((e) => console.log(e))
	.catch((e) => console.log(e));
hermes
	.get("https://api.github.com/users/octocat")
	.then((e) => console.log(e))
	.catch((e) => console.log(e));
