# School - Major - Subject Mapping Test Cases

| ID | Scenario | Expected result |
|---|---|---|
| SMS-01 | Admin creates a SYSTEM subject with one or more active majors | Subject is created and each selected major is stored in `subject_major_mappings` |
| SMS-02 | Admin edits the mapped majors of a SYSTEM subject | Old mappings are replaced atomically by the submitted unique major IDs |
| SMS-03 | Admin maps a subject to an inactive major or a major whose school is inactive | Request is rejected with `400`; existing mappings remain unchanged |
| SMS-04 | User selects School A, then Major A1 on Upload/Edit | Subject list contains mapped active SYSTEM subjects plus the user's own active custom subjects |
| SMS-05 | User submits a SYSTEM subject that is not mapped to the selected major | Upload/update is rejected with `400` |
| SMS-06 | User selects a major that does not belong to the selected school | Upload/update is rejected with `400` |
| SMS-07 | User requests a new SYSTEM subject | Request stores `school_id` and `major_id`; the major must be active and belong to the school |
| SMS-08 | Admin approves a subject request | SYSTEM subject and requested Subject-Major mapping exist; matching personal documents for that major migrate to the SYSTEM subject |
| SMS-09 | User publishes a document with missing School/Major or invalid mapping | Publish is rejected; document remains private |
| SMS-10 | User publishes a correctly classified document | Document moves to PUBLIC/PENDING for moderation |
| SMS-11 | My Library and Document Detail render a classified document | School code/name, Major code/name, and Subject code/name match the stored foreign keys |
| SMS-12 | Existing classified documents are deployed before the mapping table exists | Backfill creates mappings from distinct valid SYSTEM subject-major pairs without duplicates |
| SMS-13 | User requests an existing active SYSTEM subject for a different major | Request is accepted when the mapping is missing; the same existing mapping is rejected with `409` |
