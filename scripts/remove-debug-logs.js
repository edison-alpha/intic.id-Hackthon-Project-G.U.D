import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files to clean up (based on grep results)
const filesToClean = [
  'src/pages/EOProfile.tsx',
  'src/hooks/useUserProfile.ts', 
  'src/pages/Settings.tsx',
  'src/components/AppLayout.tsx',
  'src/utils/requestManager.ts',
  'src/tests/contractFunctionsTest.ts',
  'src/services/pinataService.ts',
  'src/services/eventOrganizerContract.ts',
  'src/services/eventTicketContract.ts',
  'src/services/eventBrowseContract.ts',
  'src/services/emailReminderService.ts',
  'src/pages/TicketDetail.tsx',
  'src/pages/Settings_backup.tsx',
  'src/pages/MyTickets.tsx'
];

function removeDebugLogs(filePath) {
  try {
    console.log(`🧹 Cleaning ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalLineCount = content.split('\n').length;
    
    // Remove console.log statements with optional preceding whitespace
    content = content.replace(/^[ \t]*console\.log\([^;]*\);?\s*$/gm, '');
    
    // Remove console.log statements that span multiple lines (with parentheses)
    content = content.replace(/^[ \t]*console\.log\([^)]*\([^)]*\)[^)]*\);?\s*$/gm, '');
    
    // Remove forEach with console.log
    content = content.replace(/^[ \t]*.*\.forEach\([^}]*console\.log[^}]*\);?\s*$/gm, '');
    
    // Remove multi-line console.log with object literals
    content = content.replace(/^[ \t]*console\.log\([^{]*\{[^}]*\}\);?\s*$/gm, '');
    
    // Remove console.log with template literals
    content = content.replace(/^[ \t]*console\.log\(`[^`]*`[^)]*\);?\s*$/gm, '');
    
    // Remove console.log with string concatenation
    content = content.replace(/^[ \t]*console\.log\('[^']*'[^)]*\);?\s*$/gm, '');
    content = content.replace(/^[ \t]*console\.log\("[^"]*"[^)]*\);?\s*$/gm, '');
    
    // Clean up multiple empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    const newLineCount = content.split('\n').length;
    const linesRemoved = originalLineCount - newLineCount;
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${filePath}: ${linesRemoved} lines removed`);
    
    return linesRemoved;
  } catch (error) {
    console.error(`❌ Error cleaning ${filePath}:`, error.message);
    return 0;
  }
}

// Main execution
console.log('🚀 Starting debug log cleanup...\n');

let totalLinesRemoved = 0;

filesToClean.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    totalLinesRemoved += removeDebugLogs(fullPath);
  } else {
    console.log(`⚠️ File not found: ${file}`);
  }
});

console.log(`\n🎉 Cleanup complete! Total lines removed: ${totalLinesRemoved}`);
console.log('✨ Your code is now clean and production-ready!');