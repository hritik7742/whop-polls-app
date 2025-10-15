import { whopSdk } from "@/lib/whop-sdk";
import { headers } from "next/headers";
import { getPollsByCompany } from "@/lib/db/polls";
import { DashboardView } from "./dashboard-view";

export default async function DashboardPage({
	params,
}: {
	params: Promise<{ companyId: string }>;
}) {
	// The headers contains the user token
	const headersList = await headers();

	// The companyId is a path param
	const { companyId } = await params;

	// The user token is in the headers
	const { userId } = await whopSdk.verifyUserToken(headersList);

	const result = await whopSdk.access.checkIfUserHasAccessToCompany({
		userId,
		companyId,
	});

	const user = await whopSdk.users.getUser({ userId });
	const company = await whopSdk.companies.getCompany({ companyId });

	// For now, we'll use the company ID as the experience ID
	// This ensures polls created from dashboard will be visible in experience view
	const experiences = [{ id: companyId }];

	// Either: 'admin' | 'no_access';
	// 'admin' means the user is an admin of the company, such as an owner or moderator
	// 'no_access' means the user is not an authorized member of the company
	const { accessLevel } = result;

	if (!result.hasAccess || accessLevel !== 'admin') {
		return (
			<div className="flex justify-center items-center h-screen px-8">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-4">Access Denied</h1>
					<p className="text-muted-foreground">
						You do not have admin access to this company.
					</p>
				</div>
			</div>
		);
	}

	// Fetch polls for this company
	
	const polls = await getPollsByCompany(companyId, userId);

	// Pass headers to the client component
	const headersObject = Object.fromEntries(headersList.entries());
	
	return (
		<DashboardView
			user={user}
			company={company}
			accessLevel={accessLevel}
			polls={polls}
			userId={userId}
			companyId={companyId}
			experiences={experiences}
			headers={headersObject}
		/>
	);
}
