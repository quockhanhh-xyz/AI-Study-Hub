const fs = require('fs');

function processHtml(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(
        /<button class="btn btn-outline" onclick="clearFilters\(\)">Clear Filters<\/button>/,
        `<button class="btn btn-outline" onclick="clearFilters()">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: text-bottom;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Clear Filters
                    </button>`
    );
    fs.writeFileSync(filePath, content);
    console.log(`Processed ${filePath}`);
}

['frontend/admin-documents.html', 'frontend/admin-ai-usage.html', 'frontend/admin-subjects.html', 'frontend/admin-subject-requests.html'].forEach(processHtml);
