import { WhopServerSdk } from "@whop/api";

let whopSdkInstance: ReturnType<typeof WhopServerSdk> | null = null;

export function getWhopSdk() {
	if (!whopSdkInstance) {
		// Check if we're in a build environment or if required env vars are missing
		const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL;
		const hasRequiredEnvVars = process.env.NEXT_PUBLIC_WHOP_APP_ID && process.env.WHOP_API_KEY;
		
		if (isBuildTime || !hasRequiredEnvVars) {
			// Return a mock SDK during build time or when env vars are missing
			return {
				verifyUserToken: () => Promise.resolve({ userId: 'build-time-mock' }),
				access: {
					checkIfUserHasAccessToCompany: () => Promise.resolve({ hasAccess: true }),
					checkIfUserHasAccessToExperience: () => Promise.resolve({ hasAccess: true })
				},
				users: {
					getUser: () => Promise.resolve({ id: 'mock-user', name: 'Mock User' })
				},
				companies: {
					getCompany: () => Promise.resolve({ id: 'mock-company', name: 'Mock Company' })
				},
				experiences: {
					getExperience: () => Promise.resolve({ id: 'mock-experience', name: 'Mock Experience' })
				},
				notifications: {
					sendPushNotification: (payload: any) => {
						console.log('Mock notification sent:', payload);
						return Promise.resolve({ success: true });
					}
				}
			} as any;
		}

		whopSdkInstance = WhopServerSdk({
			// Add your app id here - this is required.
			// You can get this from the Whop dashboard after creating an app section.
			appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,

			// Add your app api key here - this is required.
			// You can get this from the Whop dashboard after creating an app section.
			appApiKey: process.env.WHOP_API_KEY!,

			// This will make api requests on behalf of this user.
			// This is optional, however most api requests need to be made on behalf of a user.
			// You can create an agent user for your app, and use their userId here.
			// You can also apply a different userId later with the `withUser` function.
			onBehalfOfUserId: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID,

			// This is the companyId that will be used for the api requests.
			// When making api requests that query or mutate data about a company, you need to specify the companyId.
			// This is optional, however if not specified certain requests will fail.
			// This can also be applied later with the `withCompany` function.
			companyId: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
		});
	}
	return whopSdkInstance;
}

// For backward compatibility, export a getter
export const whopSdk = new Proxy({} as ReturnType<typeof WhopServerSdk>, {
	get(target, prop) {
		return getWhopSdk()[prop as keyof ReturnType<typeof WhopServerSdk>];
	}
});
