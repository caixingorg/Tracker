/**
 * AutoTracker SDK Legacy Code Cleanup Script
 * 
 * This script removes the legacy code in the src directory
 * after the project has been restructured with Lerna.
 */

import fs from 'fs';
import path from 'path';
import { rimraf } from 'rimraf';

console.log('Starting legacy code cleanup...');

// Check if src directory exists
if (!fs.existsSync('src')) {
  console.log('src directory does not exist. Nothing to clean up.');
  process.exit(0);
}

// Backup the src directory before removing it
const backupDir = 'src_backup_' + new Date().toISOString().replace(/[:.]/g, '-');
console.log(`Creating backup of src directory to ${backupDir}...`);

// Create backup directory
fs.mkdirSync(backupDir, { recursive: true });

// Copy all files from src to backup directory
const copyDir = (src, dest) => {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

try {
  copyDir('src', backupDir);
  console.log('Backup created successfully.');
  
  // Remove the src directory
  console.log('Removing src directory...');
  await rimraf('src');
  console.log('src directory removed successfully.');
  
  console.log(`Legacy code cleanup completed. A backup was created at ${backupDir}.`);
} catch (error) {
  console.error('Error during cleanup:', error);
  process.exit(1);
}
