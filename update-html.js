const fs = require('fs');

function processHtml(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(
        /<button id="filterBtn" class="btn btn-secondary">Filter<\/button>/,
        '<button class="btn btn-outline" onclick="clearFilters()">Clear Filters</button>'
    );
    fs.writeFileSync(filePath, content);
    console.log(`Processed ${filePath}`);
}

['frontend/admin-documents.html', 'frontend/admin-ai-usage.html', 'frontend/admin-subjects.html', 'frontend/admin-subject-requests.html'].forEach(processHtml);
