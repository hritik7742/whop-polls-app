import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import { getPollsByCompany } from "@/lib/db/polls";
import { ExperienceView } from "../../experience-view";

export default async function PollDeepLinkPage({
	params,
}: {
	params: Promise<{ experienceId: string; pollId: string }>;
}) {
	// The headers contains the user token
	const headersList = await headers();

	// The experienceId and pollId are path params
	const { experienceId, pollId } = await params;

	// The user token is in the headers
	const { userId } = await whopSdk.verifyUserToken(headersList);

	const result = await whopSdk.access.checkIfUserHasAccessToExperience({
		userId,
		experienceId,
	});

	const user = await whopSdk.users.getUser({ userId });
	const experience = await whopSdk.experiences.getExperience({ experienceId });

	// Either: 'admin' | 'customer' | 'no_access';
	// 'admin' means the user is an admin of the whop, such as an owner or moderator
	// 'customer' means the user is a common member in this whop
	// 'no_access' means the user does not have access to the whop
	const { accessLevel } = result;

	if (!result.hasAccess) {
		return (
			<div className="flex justify-center items-center h-screen px-8">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-4">Access Denied</h1>
					<p className="text-muted-foreground">
						You do not have access to this experience.
					</p>
				</div>
			</div>
		);
	}

	// Get the company ID from the experience and fetch initial polls
	// Real-time updates will be handled by the client-side hook
	const companyId = experience.company.id;
	const polls = await getPollsByCompany(companyId, userId);

	// Pass headers to the client component
	const headersObject = Object.fromEntries(headersList.entries());
	
	return (
		<ExperienceView
			user={user}
			experience={experience}
			accessLevel={accessLevel}
			polls={polls}
			userId={userId}
			headers={headersObject}
			highlightPollId={pollId} // Pass the pollId to highlight the specific poll
		/>
	);
}
