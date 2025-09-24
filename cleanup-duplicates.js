#!/usr/bin/env node

/**
 * Cleanup Script for GalaSwap Trading Bot
 * Removes duplicate HTML files and organizes test files
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Starting cleanup of duplicate files...');

// Files to keep (the main production files)
const KEEP_FILES = [
    'galaswap-trading-bot-CLEAN.html',  // Main production file
    'index.html',                        // GitHub Pages landing page
    'real-trading-server.js',           // Main server
    'real-trading-server-optimized.js', // Optimized server
    'real-trading-server-clean.js'      // Clean server
];

// Files to remove (duplicates)
const DUPLICATE_FILES = [
    'galaswap-trading-bot-20250923-005104.html',
    'galaswap-trading-bot-FINAL-WORKING.html',
    'galaswap-trading-bot-FINAL.html',
    'galaswap-trading-bot-FIXED-FINAL.html',
    'galaswap-trading-bot-FIXED.html',
    'galaswap-trading-bot-LIVE.html',
    'galaswap-trading-bot-optimized.html',
    'galaswap-trading-bot-ORIGINAL.html',
    'galaswap-trading-bot-server.html',
    'galaswap-trading-bot-SIMPLE.html',
    'galaswap-trading-bot-v9.1.4.html',
    'galaswap-trading-bot-WORKING.html',
    'galaswap-trading-bot.html'
];

// Test files to organize
const TEST_FILES = [
    'test-buttons.html',
    'test-endpoints.html',
    'test-fix.html',
    'test-frontend-connection.html',
    'test-frontend-prices.html'
];

// Create tests directory if it doesn't exist
if (!fs.existsSync('tests')) {
    fs.mkdirSync('tests');
    console.log('📁 Created tests directory');
}

// Move test files to tests directory
console.log('📦 Moving test files to tests/ directory...');
TEST_FILES.forEach(file => {
    if (fs.existsSync(file)) {
        try {
            fs.renameSync(file, `tests/${file}`);
            console.log(`✅ Moved ${file} to tests/`);
        } catch (error) {
            console.log(`❌ Failed to move ${file}: ${error.message}`);
        }
    }
});

// Remove duplicate files
console.log('🗑️ Removing duplicate HTML files...');
let removedCount = 0;
DUPLICATE_FILES.forEach(file => {
    if (fs.existsSync(file)) {
        try {
            fs.unlinkSync(file);
            console.log(`✅ Removed ${file}`);
            removedCount++;
        } catch (error) {
            console.log(`❌ Failed to remove ${file}: ${error.message}`);
        }
    }
});

console.log(`\n🎉 Cleanup completed!`);
console.log(`📊 Summary:`);
console.log(`   - Removed ${removedCount} duplicate files`);
console.log(`   - Moved ${TEST_FILES.length} test files to tests/ directory`);
console.log(`   - Kept ${KEEP_FILES.length} essential files`);

// Create cleanup report
const report = {
    timestamp: new Date().toISOString(),
    removedFiles: DUPLICATE_FILES.filter(f => fs.existsSync(f)),
    movedFiles: TEST_FILES.filter(f => fs.existsSync(`tests/${f}`)),
    keptFiles: KEEP_FILES.filter(f => fs.existsSync(f))
};

fs.writeFileSync('cleanup-report.json', JSON.stringify(report, null, 2));
console.log('📄 Cleanup report saved to cleanup-report.json');

