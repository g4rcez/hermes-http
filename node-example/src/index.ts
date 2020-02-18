import { HermesHttp, ErrorResponse } from "hermes-http";
import { clearDedupe, dedupeRequest } from "../../src/plugins/dedupe";
type GithubUser = {
	login: string;
	id: 583231;
	node_id: string;
	avatar_url: string;
	gravatar_id: "";
	url: string;
	html_url: string;
	followers_url: string;
	following_url: string;
	gists_url: string;
	starred_url: string;
	subscriptions_url: string;
	organizations_url: string;
	repos_url: string;
	events_url: string;
	received_events_url: string;
	type: string;
	site_admin: false;
	name: string;
	company: string;
	blog: string;
	location: string;
	email: null;
	hireable: null;
	bio: string | null;
	public_repos: 8;
	public_gists: 8;
	followers: 2951;
	following: 9;
	created_at: string;
	updated_at: string;
};

const hermes = HermesHttp({ timeout: 30000, throwOnHttpError: true });

hermes.addHeader("authorization", "SECRET_TOKEN");

hermes.requestInterceptor(dedupeRequest);

hermes
	.successResponseInterceptor((e) => clearDedupe(e as any, 200))
	.errorResponseInterceptor((e) => clearDedupe(e as any, 200))
	.successResponseInterceptor<GithubUser>(async (e) => {
		return { ...e, data: { ...e.data, bio: "Bio mudada" } };
	})
	.errorResponseInterceptor<{ ok: true }>(async (e) => {
		return { ...e, data: { ...e.data, eu: "avisei" } };
	});

const request = (n: number) =>
	hermes
		.get<GithubUser>("https://api.github.com/users/octocat")
		.then((e) => {
			console.log(n, e);
		})
		.catch((e: ErrorResponse<{ ok: true }>) => console.log("falhou", e));

request(1).then(() => request(2));
