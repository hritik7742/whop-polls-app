import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    console.log('Fetching experiences for company:', companyId);

    // Fetch experiences using server-side Whop SDK
    const experiencesResult = await whopSdk.experiences.listExperiences({ 
      companyId: companyId 
    });
    
    const experiences = experiencesResult?.experiencesV2?.nodes || [];
    
    console.log('Fetched experiences:', experiences.map(exp => ({ id: exp?.id, name: exp?.name })));

    return NextResponse.json({
      success: true,
      experiences: experiences
    });

  } catch (error) {
    console.error('Error fetching experiences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiences' },
      { status: 500 }
    );
  }
}
