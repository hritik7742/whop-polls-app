import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get('pollId');
    
    if (!pollId) {
      return NextResponse.json({
        success: false,
        error: 'pollId parameter is required'
      }, { status: 400 });
    }

    const headersList = request.headers;
    
    // Authenticate user
    let userId: string;
    try {
      const result = await whopSdk.verifyUserToken(headersList);
      userId = result.userId;
      console.log('🔐 User authenticated:', userId);
    } catch (tokenError) {
      return NextResponse.json({
        success: false,
        error: 'Authentication failed',
        details: tokenError instanceof Error ? tokenError.message : String(tokenError)
      }, { status: 401 });
    }

    // Get poll details
    const supabaseServer = createServerClient();
    const { data: poll, error: pollError } = await supabaseServer
      .from('polls')
      .select('id, question, company_id, experience_id, status, expires_at')
      .eq('id', pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json({
        success: false,
        error: 'Poll not found',
        details: pollError
      }, { status: 404 });
    }

    // Test access check
    const userSdk = whopSdk.withUser(userId);
    
    let experienceAccessResult;
    let companyAccessResult;
    
    try {
      experienceAccessResult = await userSdk.access.checkIfUserHasAccessToExperience({
        userId,
        experienceId: poll.experience_id,
      });
    } catch (error) {
      experienceAccessResult = { error: error instanceof Error ? error.message : String(error) };
    }

    try {
      companyAccessResult = await userSdk.access.checkIfUserHasAccessToCompany({
        userId,
        companyId: poll.company_id,
      });
    } catch (error) {
      companyAccessResult = { error: error instanceof Error ? error.message : String(error) };
    }

    return NextResponse.json({
      success: true,
      userId,
      poll: {
        id: poll.id,
        question: poll.question,
        company_id: poll.company_id,
        experience_id: poll.experience_id,
        status: poll.status
      },
      accessChecks: {
        experience: {
          experienceId: poll.experience_id,
          result: experienceAccessResult
        },
        company: {
          companyId: poll.company_id,
          result: companyAccessResult
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ DEBUG - Access check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
