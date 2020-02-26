import Hermes, { httpErrorInterceptor, HttpResponseError } from "hermes-http";
type GithubUser = {
	login: string;
	id: number;
	node_id: string;
	avatar_url: string;
	gravatar_id: string;
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
	public_repos: number;
	public_gists: number;
	followers: number;
	following: number;
	created_at: string;
	updated_at: string;
};

const hermes = Hermes({ avoidDuplicateRequests: true }).errorResponseInterceptor(httpErrorInterceptor);

const request = (n: number) =>
	hermes
		.get<GithubUser>("https://api.github.com/users/octocatx" + n, { timeout: 1000 })
		.then(console.info)
		.catch((e: HttpResponseError<unknown>) => {
			if (e.httpError !== null) {
				console.log({ ...e });
			}
		});

request(2).catch(console.error);
