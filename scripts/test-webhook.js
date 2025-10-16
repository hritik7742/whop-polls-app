#!/usr/bin/env node

/**
 * Webhook Testing Script
 * 
 * This script helps you test webhook functionality locally
 * Run: node scripts/test-webhook.js
 */

const https = require('https');
const http = require('http');

// Configuration
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks';
const TEST_WEBHOOK_URL = process.env.TEST_WEBHOOK_URL || 'http://localhost:3000/api/webhooks/test';

// Test data
const testEvents = {
  'membership.went_valid': {
    action: 'membership.went_valid',
    data: {
      user_id: 'user_test_123',
      access_pass_id: 'access_pass_456',
      company_id: 'biz_test_789',
      membership_id: 'membership_123'
    }
  },
  'membership.went_invalid': {
    action: 'membership.went_invalid',
    data: {
      user_id: 'user_test_123',
      company_id: 'biz_test_789',
      membership_id: 'membership_123'
    }
  },
  'payment.succeeded': {
    action: 'payment.succeeded',
    data: {
      id: 'payment_123',
      user_id: 'user_test_123',
      final_amount: 700, // $7.00 in cents
      currency: 'usd',
      amount_after_fees: 650,
      metadata: {
        plan_id: 'pro_plan'
      }
    }
  },
  'payment.failed': {
    action: 'payment.failed',
    data: {
      user_id: 'user_test_123',
      error_message: 'Card declined',
      payment_id: 'payment_123'
    }
  },
  'membership.cancel_at_period_end_changed': {
    action: 'membership.cancel_at_period_end_changed',
    data: {
      user_id: 'user_test_123',
      company_id: 'biz_test_789',
      cancel_at_period_end: true,
      membership_id: 'membership_123'
    }
  }
};

function makeRequest(url, data, isTest = false) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Whop-Webhook-Test/1.0'
      }
    };

    // Add webhook signature for real webhook (not test)
    if (!isTest && process.env.WHOP_WEBHOOK_SECRET) {
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', process.env.WHOP_WEBHOOK_SECRET)
        .update(postData)
        .digest('hex');
      options.headers['X-Whop-Signature'] = `sha256=${signature}`;
    }

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testWebhook(eventType, isTest = false) {
  const eventData = testEvents[eventType];
  if (!eventData) {
    console.error(`❌ Unknown event type: ${eventType}`);
    return;
  }

  const url = isTest ? TEST_WEBHOOK_URL : WEBHOOK_URL;
  
  console.log(`\n🧪 Testing ${isTest ? 'test' : 'real'} webhook: ${eventType}`);
  console.log(`📡 URL: ${url}`);
  console.log(`📦 Data:`, JSON.stringify(eventData, null, 2));

  try {
    const response = await makeRequest(url, eventData, isTest);
    
    console.log(`📊 Response Status: ${response.statusCode}`);
    console.log(`📋 Response Headers:`, response.headers);
    console.log(`📄 Response Body:`, response.body);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log(`✅ ${eventType} webhook test successful!`);
    } else {
      console.log(`❌ ${eventType} webhook test failed!`);
    }
    
  } catch (error) {
    console.error(`❌ Error testing ${eventType}:`, error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting webhook tests...\n');
  
  const eventTypes = Object.keys(testEvents);
  
  // Test with test endpoint first
  console.log('📝 Testing with test endpoint (no signature validation)...');
  for (const eventType of eventTypes) {
    await testWebhook(eventType, true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }
  
  // Test with real webhook endpoint
  console.log('\n🔐 Testing with real webhook endpoint (with signature validation)...');
  for (const eventType of eventTypes) {
    await testWebhook(eventType, false);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }
  
  console.log('\n🎉 All webhook tests completed!');
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];
const eventType = args[1];

if (command === 'test' && eventType) {
  testWebhook(eventType, false);
} else if (command === 'test-test' && eventType) {
  testWebhook(eventType, true);
} else if (command === 'all') {
  runAllTests();
} else {
  console.log(`
🔧 Webhook Testing Script

Usage:
  node scripts/test-webhook.js all                    # Run all tests
  node scripts/test-webhook.js test <eventType>       # Test real webhook
  node scripts/test-webhook.js test-test <eventType>  # Test test endpoint

Available event types:
  ${Object.keys(testEvents).join('\n  ')}

Environment variables:
  WEBHOOK_URL          # Real webhook URL (default: http://localhost:3000/api/webhooks)
  TEST_WEBHOOK_URL     # Test webhook URL (default: http://localhost:3000/api/webhooks/test)
  WHOP_WEBHOOK_SECRET  # Webhook secret for signature validation

Examples:
  node scripts/test-webhook.js all
  node scripts/test-webhook.js test membership_went_valid
  node scripts/test-webhook.js test-test payment_succeeded
`);
}
