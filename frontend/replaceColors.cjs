const fs = require('fs');
const path = require('path');

const colorMap = {
  '#2c3e50': 'var(--text-primary)',
  '#7f8c8d': 'var(--text-secondary)',
  '#3498db': 'var(--accent-primary)',
  '#e74c3c': 'var(--danger)',
  '#c0392b': 'var(--danger)',
  '#27ae60': 'var(--success)',
  '#f39c12': 'var(--warning)',
  '#f1c40f': 'var(--warning)',
  '#e67e22': 'var(--warning)',
  '#9b59b6': 'var(--info)',
  '#ecf0f1': 'var(--bg-secondary)',
  '#fdf2e9': 'var(--bg-secondary)',
  '#e9f7ef': 'var(--bg-secondary)',
  '#fef9e7': 'var(--bg-secondary)',
  '#fadbd8': 'var(--bg-secondary)',
  '#ccc': 'var(--border-color)',
  '#eee': 'var(--border-color)',
  "'white'": "'var(--bg-surface)'",
  '"white"': "'var(--bg-surface)'",
  '#ffffff': 'var(--bg-surface)',
  '#f8f9fa': 'var(--bg-secondary)',
  '#dee2e6': 'var(--border-color)',
  '#bdc3c7': 'var(--border-color)',
  '#34495e': 'var(--text-primary)',
  'background: white': 'background: var(--bg-surface)',
  'color: white': 'color: var(--bg-surface)', // wait, color should be text-primary if bg is surface? usually white is for button text. In buttons, btn-primary handles it. Let's just remove hardcoded styles from buttons where possible.
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // We will do a generic regex replace for hex colors if they exist in the map
      for (const [hex, cssVar] of Object.entries(colorMap)) {
        if(hex.startsWith('#')) {
          const regex = new RegExp(hex, 'gi');
          content = content.replace(regex, cssVar);
        } else {
          content = content.split(hex).join(cssVar);
        }
      }
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

processDirectory(path.join(__dirname, 'src', 'pages'));
console.log('Replaced colors in pages');
