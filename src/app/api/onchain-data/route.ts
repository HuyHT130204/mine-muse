// API route for fetching comprehensive data

import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { ComprehensiveDataCollector } from '@/lib/comprehensive-data-collector';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
	try {
		console.log('📊 API: Fetching comprehensive data...');
		
		const dataCollector = new ComprehensiveDataCollector();
		const comprehensiveData = await dataCollector.collectComprehensiveData();
		
		// Remove verbose summary log to avoid exposing zero placeholders in logs
		console.log('✅ Comprehensive data fetched successfully');
		
		return new NextResponse(JSON.stringify({
			success: true,
			data: comprehensiveData,
			timestamp: new Date().toISOString()
		}), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
				'Pragma': 'no-cache',
				'Expires': '0',
				'Surrogate-Control': 'no-store'
			}
		});
		
	} catch (error) {
		console.error('❌ API Error:', error);
		
		return new NextResponse(JSON.stringify({
			success: false,
			message: 'Failed to fetch comprehensive data',
			error: error instanceof Error ? error.message : 'Unknown error'
		}), { status: 500, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
	}
}
