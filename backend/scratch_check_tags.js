const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/app/components/study-hub/study-pack/detail/study-pack-detail.component.html');

function checkTagsInfallible() {
  if (!fs.existsSync(filePath)) {
    console.error('File does not exist:', filePath);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  
  // Infallible regex to find starting and closing div tags
  const tagRegex = /(<\/div>|<div\b)/gi;
  
  const stack = [];
  const errors = [];
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[0];
    const index = match.index;
    
    // Find line number of this match
    const lineNum = content.substring(0, index).split('\n').length;

    if (tag.toLowerCase() === '</div>') {
      if (stack.length === 0) {
        errors.push({ line: lineNum, tag });
      } else {
        stack.pop();
      }
    } else {
      stack.push({ line: lineNum, tag });
    }
  }

  console.log('--- 📋 Infallible Tag Stack Analysis ---');
  if (errors.length > 0) {
    console.log('Orphan Closing Tags (</div> tags with no matching <div>):');
    errors.forEach(err => {
      console.log(`- Line ${err.line}: ${err.tag}`);
    });
  }

  if (stack.length > 0) {
    console.log('\nUnclosed Opening Tags (<div> tags never closed):');
    stack.forEach(op => {
      console.log(`- Line ${op.line}: <div>`);
    });
  }

  if (errors.length === 0 && stack.length === 0) {
    console.log('\n✅ All div tags are perfectly balanced!');
  }
}

checkTagsInfallible();
