# hermes-http

Um wrapper qualquer por cima do fetch (mas com um nome legal).

## Motivação

Para amenizar um pouco da "burocracia" ao usar o `fetch` ou `node-fetch`, acabei desenvolvendo
o `hermes-http`. Um pouco diferente do `axios` e do próprio `fetch`, `hermes-http` irá prover uma
instância de http-client para você realizar suas requisições, assim você pode aplicar middlewares/interceptors, configurar globalmente
headers e timeout (assim como `axios.create`).

## Instalação

```bash
npm i hermes-http
# ou se você usa yarn
yarn add hermes-http
# ou se você usa pnpm
pnpm add hermes-http
```

Você não precisa instalar os `@types`, hermes-http já é feito em Typescript e provê seus tipos

## Exemplos

Você pode conferir os tipos principais da biblioteca [neste arquivo](https://github.com/g4rcez/hermes-http/blob/master/src/hermes-http-types.ts) 

```typescript
import Hermes from "hermes-http";

const hermes = Hermes({
    /*
        baseUrl será concatenado a todas as Urls que você chamar
    */
    baseUrl: "",
    /*
        Caso `avoidDuplicateRequests` seja `true`, hermes irá gerenciar os
        request duplicados feitos ao mesmo tempo e resolver todos com somente
        um request, evitando consumo de dados do usuário
    */
    avoidDuplicateRequests: false,
    /*
        Headers compartilhados entre as instâncias de hermes
    */
    headers: {},
    /*
        Timeout padrão para todas as instâncias, você ainda poderá configurar para cada request.
        Caso seja 0, o timeout será dado pelo servidor, a cada requisição
    */
    globalTimeout: 0,
    /* 
        Caso você opte por fazer um retry em algum request, ele só será feito no caso
        o statusCode da requisição esteja presente neste array:
        [408, 429, 451, 500, 502, 503, 504]
    */ 
	retryStatusCode: statusCodeRetry
});


hermes
    .get<YOUR_BODY_RESPONSE_TYPE>("https://api.github.com/users/octocat", {
	query: {
        // um objeto para ser convertido em queryString e concatenado na url
        date: new Date()
    },
	encodeQueryString: true, // encoda a string do query string para evitar perdas de caracteres
	headers: {
        // cabeçalhos da requisição
    },
	redirect: "follow" | "error" | "manual", // por padrão usará follow
	cors: "same-origin" | "cors" | "no-cors", // por padrão usará cors
	credentials: "same-origin" | "cors" | "no-cors", // por padrão usará "same-origin"
    /*
        cria uma instância de AbortController para gerencia própria, caso não seja
        passado nenhum controller
    */
    controller: new AbortController(),
	retries: 1, // Número de tentativas do request
	retryAfter: 0, // delay entre tentativas falhas do request
	retryCodes: [], // array com statusCode para tentativas
	timeout: 0, // timeout da requisição, caso não definido, irá usar o timeout da instância
	omitHeaders: [], // headers omitidos por requisição
})
	.then((e: ResponseSuccess<YOUR_BODY_RESPONSE_TYPE>) => {
        /*
            O tipo da  nossa requisição é: 
 
            url: string;
            data: Body;
            error: null;
            headers: { [key: string]: string };
            ok: boolean;
            status: number;
            statusText: string | null;
        */
    })
    .catch(e => {
        /*
            Caso o erro seja de requisição, o atributo erro terá esse shape:
 
            url: string;
            data?: T;
            error: string | number;
            headers: { [key: string]: string };
            ok: false;
            status: number;
            statusText: string | null;
        */
    });

// Se quiser usar com async/await

try {
    const response = await hermes.get<YOUR_BODY_RESPONSE_TYPE>("https://api.github.com/users/octocat", {
        query: {
            // um objeto para ser convertido em queryString e concatenado na url
            date: new Date()
        },
        encodeQueryString: true, // encoda a string do query string para evitar perdas de caracteres
        headers: {
            // cabeçalhos da requisição
        },
        redirect: "follow",
        cors: "cors",
        credentials: "same-origin"
        controller: new AbortController(),
        retries: 1, 
        retryAfter: 0, 
        retryCodes: [], 
        timeout: 0, 
        omitHeaders: [], 
    });
} catch (error) {

}
```

## Plugins

Ainda irei documentar