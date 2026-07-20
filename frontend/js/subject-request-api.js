/**
 * subject-request-api.js - FE API Helper for User Subject Requests
 */

function createSubjectRequest(data) {
    return post("/api/subject-requests", data);
}

function getMySubjectRequests() {
    return get("/api/subject-requests/my");
}
