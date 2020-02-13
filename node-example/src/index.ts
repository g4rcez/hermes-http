import { HermesHttp } from "hermes-http";

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

hermes.successResponseInterceptor<GithubUser>(async (e) => {
	console.log("->", e);
	return { ...e, data: { ...e.data, bio: "Bio mudada" } };
});

hermes
	.get<GithubUser, unknown>("https://api.github.com/users/octocat")
	.then((e) => {
		if (e.error === null) {
			console.log(e.data.bio);
		}
	})
	.catch((e) => console.log("falhou", e));
