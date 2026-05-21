const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\teragroup\\Desktop\\sales-crm-web\\src';

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}]/u;

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

const results = {};

walkSync(dir, function(filePath, stat) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, i) => {
            if (emojiRegex.test(line)) {
                if (!results[filePath]) results[filePath] = [];
                results[filePath].push({ line: i + 1, content: line.trim() });
            }
        });
    }
});

fs.writeFileSync('C:\\Users\\teragroup\\Desktop\\sales-crm-web\\emoji-results.json', JSON.stringify(results, null, 2));
console.log('Done scanning emojis. Found emojis in ' + Object.keys(results).length + ' files.');
