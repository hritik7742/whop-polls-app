#!/usr/bin/env node

/**
 * Script to manually activate scheduled polls
 * This can be used for testing or as a backup to cron jobs
 */

const fetch = require('node-fetch');

async function activateScheduledPolls() {
  try {
    console.log('🔄 Activating scheduled polls...');
    
    const response = await fetch('http://localhost:3000/api/cron/activate-polls', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer your-secret-key', // Change this to match your CRON_SECRET
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Successfully activated ${result.activatedCount} scheduled polls`);
      if (result.activatedPolls && result.activatedPolls.length > 0) {
        console.log('📋 Activated polls:');
        result.activatedPolls.forEach((poll, index) => {
          console.log(`   ${index + 1}. ${poll.question}`);
        });
      }
    } else {
      console.error('❌ Failed to activate scheduled polls:', result.error);
    }

  } catch (error) {
    console.error('❌ Error activating scheduled polls:', error.message);
  }
}

// Run the script
activateScheduledPolls();
