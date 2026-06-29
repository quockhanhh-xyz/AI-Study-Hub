# Step 9 - AI Document Processing Foundation

## 1. Mục tiêu

```text
Upload document
-> tạo trạng thái PENDING
-> backend tải file từ Cloudinary
-> trích xuất và làm sạch văn bản
-> chia văn bản thành chunks có thứ tự
-> lưu MySQL
-> frontend hiển thị trạng thái xử lý
-> chuẩn bị dữ liệu cho AI Document Q&A ở Step 10
```

Step 9 chỉ xây dựng nền xử lý tài liệu. Bước này chưa gọi OpenAI, chưa tạo
embeddings, chưa dùng vector database và chưa có chatbot.

## 2. Ngoài phạm vi

- AI Q&A, streaming và lịch sử chat.
- Multi-document chat và chat theo folder.
- Embeddings và vector database.
- Quiz/flashcard.
- OCR cho scanned PDF hoặc ảnh.
- XLS/XLSX extraction.
- Thực thi macro hoặc script từ file.

## 3. Định dạng MVP

### Bắt buộc

- TXT.
- PDF có text.

### Optional/bonus

- DOCX.
- PPTX.

Scanned PDF không có text trả `EMPTY_CONTENT`. File chưa hỗ trợ trả
`UNSUPPORTED`. Parser hỏng hoặc lỗi tải file trả `FAILED` và không được làm
backend crash.

## 4. Trạng thái và chuyển trạng thái

```text
PENDING        Document đã upload nhưng chưa xử lý.
PROCESSING     Background worker đang xử lý.
COMPLETED      Text và chunks mới đã được lưu thành công.
FAILED         Lần xử lý đầu tiên thất bại hoặc job bị gián đoạn.
UNSUPPORTED    Định dạng chưa hỗ trợ.
EMPTY_CONTENT  File đọc được nhưng không có text hữu ích.
```

Chuyển trạng thái hợp lệ:

```text
Upload                         -> PENDING
PENDING -> Process             -> PROCESSING
FAILED -> Process/Retry        -> PROCESSING
EMPTY_CONTENT -> Reprocess     -> PROCESSING
COMPLETED -> Reprocess         -> PROCESSING
PROCESSING -> Process/Reprocess -> HTTP 409
```

`POST /process` trên document đã `COMPLETED` trả `409` và yêu cầu dùng
`/reprocess`.

## 5. Database

### 5.1. document_contents

| Cột | Kiểu gợi ý | Rule |
| --- | --- | --- |
| content_id | BIGINT PK AUTO_INCREMENT | Primary key |
| document_id | BIGINT FK UNIQUE | Một content/document |
| extracted_text | LONGTEXT nullable | Không trả trong list API |
| processing_status | VARCHAR(30) | Enum ứng dụng |
| character_count | INT default 0 | Số ký tự thực tế đã lưu |
| original_character_count | INT default 0 | Số ký tự trước truncation |
| word_count | INT default 0 | Số từ trong text đã lưu |
| is_truncated | BOOLEAN default false | Có cắt giới hạn hay không |
| processing_started_at | DATETIME nullable | Phát hiện job bị treo |
| processed_at | DATETIME nullable | Lần thành công gần nhất |
| last_attempt_status | VARCHAR(30) nullable | Kết quả attempt gần nhất |
| last_attempt_error | VARCHAR(1000) nullable | Message an toàn |
| last_attempted_at | DATETIME nullable | Thời điểm attempt |
| created_at | DATETIME | Audit |
| updated_at | DATETIME | Audit/optimistic lock |
| version | BIGINT default 0 | `@Version` nếu dùng optimistic lock |

Constraint:

```sql
UNIQUE (document_id)
```

### 5.2. document_chunks

| Cột | Kiểu gợi ý | Rule |
| --- | --- | --- |
| chunk_id | BIGINT PK AUTO_INCREMENT | Primary key |
| document_id | BIGINT FK | Chủ sở hữu chunk |
| chunk_index | INT | Bắt đầu từ 0 |
| chunk_text | TEXT/LONGTEXT | Không rỗng |
| character_count | INT | Bằng độ dài chunk_text |
| page_number | INT nullable | Citation PDF nếu parser hỗ trợ |
| source_label | VARCHAR(255) nullable | Page/slide/section |
| start_offset | INT nullable | Vị trí trong extracted text |
| end_offset | INT nullable | Vị trí trong extracted text |
| created_at | DATETIME | Audit |

Constraint:

```sql
UNIQUE (document_id, chunk_index)
INDEX (document_id)
```

Foreign key phải có quy tắc cascade rõ ràng. Nếu không dùng `ON DELETE
CASCADE`, permanent-delete service phải xóa chunks, content rồi mới xóa
document.

### 5.3. Tài liệu hiện có

Tài liệu cũ chưa có `DocumentContent` phải được hỗ trợ bằng một trong hai cách:

1. Migration/backfill tạo `PENDING` cho toàn bộ document hiện có; hoặc
2. `findOrCreatePending(documentId)` khi gọi status/process.

Không tự động process toàn bộ tài liệu cũ khi startup.

## 6. Upload integration

Sau khi document metadata được lưu thành công:

```text
Create DocumentContent
processingStatus = PENDING
characterCount = 0
originalCharacterCount = 0
wordCount = 0
isTruncated = false
```

Ưu tiên tạo document và content trong cùng transaction. Nếu dữ liệu cũ hoặc
lỗi lịch sử làm thiếu content, status API dùng `findOrCreatePending()`.

Document list/detail DTO phải có `processingStatus`, mặc định `PENDING` nếu
chưa có content. Không trả `extractedText` hoặc chunk trong list API và không
được tạo N+1 query khi lấy status.

## 7. Async processing

```http
POST /api/documents/{id}/process
POST /api/documents/{id}/reprocess
```

Flow:

```text
Check login, ownership và document ACTIVE
-> atomic transition sang PROCESSING
-> trả HTTP 202
-> worker riêng tải và parse file
-> tạo cleaned text/chunks trong memory
-> transaction lưu kết quả
-> chuyển trạng thái cuối
```

`DocumentProcessingService` xử lý permission, status và API orchestration.
`DocumentProcessingWorker` là bean riêng chứa method `@Async`; không gọi
`@Async` bằng self-invocation trong cùng service.

`TaskExecutor` phải có core/max pool, queue capacity và rejection policy giới
hạn. Step 9 dùng in-process worker, chưa cần distributed queue.

## 8. Atomic concurrency

Không dùng flow chỉ “đọc status rồi set status”, vì hai request có thể cùng
đọc `PENDING`. Dùng một trong các cách:

- Pessimistic row lock;
- Optimistic lock với `@Version`; hoặc
- Conditional update status hợp lệ sang `PROCESSING` và kiểm tra affected row.

Chỉ request chuyển trạng thái thành công mới được enqueue worker. Request còn
lại trả `409 Document is already being processed`.

## 9. Stale job recovery

Nếu `PROCESSING` lâu hơn 10 phút:

```text
processingStatus = FAILED
lastAttemptStatus = FAILED
lastAttemptError = "Processing was interrupted. Please reprocess the document."
```

Recovery có thể chạy lúc startup hoặc khi status được đọc, nhưng phải dùng
`processing_started_at`, không suy đoán từ một timestamp không liên quan.

## 10. Extraction và bảo mật file

- Backend lấy file từ Cloudinary; frontend không gửi lại file.
- Chỉ chấp nhận Cloudinary host/publicId hợp lệ, không tải URL tùy ý.
- Giới hạn redirect, connect timeout, read timeout và download size.
- Kiểm tra extension, MIME và signature khi có thể.
- Bảo vệ parser ZIP-based khỏi decompression bomb.
- TXT ưu tiên UTF-8, hỗ trợ BOM và lỗi encoding an toàn.
- Không thực thi macro/script.
- Không trả stack trace, local path hoặc secret về frontend.
- Không log extracted text vì có thể chứa dữ liệu riêng tư.
- Automated test phải mock Cloudinary; không phụ thuộc mạng thật.

## 11. Cleaning và giới hạn text

- Chuẩn hóa line ending và whitespace dư.
- Giữ paragraph/newline cần thiết cho chunking.
- Trim đầu/cuối và loại bỏ nội dung chỉ có whitespace.
- Max extracted text: `200,000` ký tự.
- Nếu vượt giới hạn, lưu 200,000 ký tự và đặt `is_truncated = true`.
- `original_character_count` lưu độ dài trước khi cắt.
- `character_count` lưu độ dài thực tế của `extracted_text`.

## 12. Chunking MVP

```text
Target size: 800-1200 ký tự
Overlap: 100-200 ký tự
Ưu tiên: paragraph -> sentence -> hard character limit
chunk_index bắt đầu từ 0 và tăng liên tục
```

Yêu cầu:

- Không tạo chunk rỗng hoặc chỉ whitespace.
- Overlap được phép trùng một phần nội dung; “không trùng chunk” nghĩa là
  không có row/index trùng do chạy lại job.
- Thuật toán luôn tiến con trỏ để không lặp vô hạn.
- Có giới hạn số chunk/document.
- Lưu page/source metadata nếu parser cung cấp.
- Batch insert chunks thay vì insert từng row nếu có thể.

## 13. Reprocess an toàn

```text
Check permission và atomic transition
-> extract/clean/chunk mới trong memory
-> nếu thành công, mở transaction
-> update DocumentContent
-> delete chunks cũ
-> batch insert chunks mới
-> set COMPLETED
```

Nếu lần xử lý đầu thất bại: status chuyển `FAILED`, `UNSUPPORTED` hoặc
`EMPTY_CONTENT`.

Nếu reprocess từ `COMPLETED` thất bại:

- Giữ extracted text/chunks cũ.
- Khôi phục `processing_status = COMPLETED`.
- Ghi kết quả lỗi vào `last_attempt_status/error/attempted_at`.
- Step 10 vẫn có thể dùng snapshot thành công gần nhất.

Transaction thay thế phải rollback toàn bộ nếu bất kỳ chunk nào lưu lỗi.

## 14. Lifecycle và race conditions

- Move to Trash: giữ content/chunks nhưng chặn mọi processing/content access.
- Restore: content cũ tiếp tục tồn tại; owner có thể reprocess.
- Permanent delete: xóa chunks/content theo FK rule.
- Worker phải kiểm tra lại document `ACTIVE` ngay trước transaction commit.
- Nếu document bị Trash/permanent delete trong lúc worker chạy, worker không
  được tạo lại dữ liệu hoặc hoàn tất trái phép.
- Share revoke phải làm mất quyền xem processing status ngay.
- Publish/unpublish không tự động process hoặc xóa content.

## 15. API contract

### Process

```http
POST /api/documents/{id}/process
HTTP 202 Accepted
```

```json
{
  "success": true,
  "message": "Document processing started",
  "data": { "documentId": 12, "processingStatus": "PROCESSING" }
}
```

### Reprocess

```http
POST /api/documents/{id}/reprocess
HTTP 202 Accepted
```

### Processing status

```http
GET /api/documents/{id}/processing-status
```

Trả status, counts, `isTruncated`, timestamps và message an toàn; không trả
full text. Owner hoặc user còn quyền xem document được gọi. Guest không gọi
processing API trong Step 9.

### Extracted content

```http
GET /api/documents/{id}/content
```

Chỉ owner được xem full extracted text. Shared user, group member và guest bị
chặn. Document Trash/Deleted trả `404`.

### Error mapping

```text
401 chưa login
403 authenticated nhưng không có quyền action
404 document không tồn tại/không được phép biết resource
409 trạng thái không hợp lệ hoặc đang PROCESSING
415 file type unsupported nếu chặn đồng bộ
500 lỗi không dự kiến, không lộ stack trace
```

Chọn thống nhất một flow unsupported. Bản chốt dùng detect sớm: backend đặt
`UNSUPPORTED` và trả `415`; FE không bắt đầu polling. Nếu lỗi chỉ phát hiện
trong worker, POST trả `202` và polling kết thúc ở `UNSUPPORTED`.

## 16. Permission matrix

| Actor | Process | Reprocess | Status | Full content |
| --- | --- | --- | --- | --- |
| Owner, ACTIVE document | Có | Có | Có | Có |
| Direct shared user | Không | Không | Có khi share ACTIVE | Không |
| Active group member | Không | Không | Có khi access ACTIVE | Không |
| Guest | Không | Không | Không | Không |
| Outsider | Không | Không | Không/404 | Không/404 |

Backend luôn là nguồn quyết định quyền; việc FE ẩn nút không thay thế kiểm tra
permission.

## 17. Phân công

### BE3 - Contract, database, orchestration và tests

Branch: `feature/ai-processing-contract-orchestration`

- Cập nhật `api-contract.md`, `database-design.md`, `demo-checklist.md`.
- Tạo `ai-processing-test-cases.md`.
- Tạo `DocumentContent`, `DocumentChunk`, repositories và status enum.
- Tạo migration/constraint/index và giải pháp cho document cũ.
- Tích hợp tạo `PENDING` vào upload.
- Thêm `processingStatus` vào list/detail DTO mà không gây N+1.
- Tạo extraction interface/result contract để BE2 implement.
- Implement permission, atomic status transition và HTTP 202/409.
- Tạo bounded TaskExecutor và worker bean riêng.
- Implement stale-job recovery, transactional replace và lifecycle integration.
- Không tự viết parser chi tiết.

Done khi contract, schema, status flow, permission, lifecycle và tests nền đã
hoạt động; project build được trước khi BE2 bắt đầu parser.

### BE2 - Download, parser, cleaner và chunker

Branch: `feature/backend-document-text-extraction`

- Implement extraction interface do BE3 định nghĩa.
- Tải file Cloudinary an toàn với timeout/size/host validation.
- Bắt buộc extract TXT và text-based PDF.
- DOCX/PPTX là optional/bonus.
- Implement cleaner, truncation và counts.
- Implement deterministic chunking, overlap và source metadata.
- Trả typed result cho success/unsupported/empty/failure.
- Không thay đổi API contract hoặc trực tiếp xóa dữ liệu cũ.
- Viết unit tests bằng file fixtures trong `src/test/resources`.

### FE3 - API helper, status mapping và polling

Branch: `feature/frontend-ai-processing-api`

- Tạo `processing-api.js` với `processDocument`, `reprocessDocument`,
  `getProcessingStatus`, `getDocumentContent`.
- Chỉ dùng `apiRequest()`, không viết raw `fetch` ở page scripts.
- Bảo đảm `api.js` coi mọi HTTP 2xx, bao gồm 202, là thành công.
- Chuẩn hóa labels cho sáu trạng thái.
- Tạo polling helper: 2 giây/lần, tối đa 30 lần, có stop/cancel.
- Không tạo nhiều timer cho cùng document.
- Dừng khi terminal status, logout, đổi document hoặc rời trang.
- Với 409, tiếp tục một polling session thay vì tạo timer mới.

### FE2 - Document Detail processing panel

Branch: `feature/frontend-document-processing-status`

- Thêm panel trạng thái trong Document Detail.
- PENDING: Process for AI.
- PROCESSING: loading và disable actions.
- COMPLETED: View extracted text và Reprocess.
- FAILED/EMPTY_CONTENT: Retry/Reprocess phù hợp.
- UNSUPPORTED: message rõ, không polling.
- Sau HTTP 202 chuyển UI ngay sang PROCESSING và bắt đầu polling.
- Render extracted text bằng `textContent`, dùng collapsible/scroll cho text dài.
- Chỉ owner thấy full content/actions.
- Polling timeout chỉ báo “taking longer than expected”, không tự đổi backend
  status thành FAILED.

### FE1 - My Documents processing overview

Branch: `feature/frontend-processing-overview`

- Hiển thị badge nhỏ cho sáu trạng thái.
- Badge có text, không chỉ phân biệt bằng màu.
- Card chỉ giữ title, subject/file type, badge và metadata cơ bản.
- Click card mở Document Detail; không process trực tiếp từ card.
- Fallback `PENDING` cho response cũ thiếu status.
- Filter theo processing status là optional; nếu làm phải dùng đúng backend
  contract, không lọc sai dữ liệu phân trang.

## 18. Merge order

1. BE3 - contract/database/orchestration.
2. BE2 - extraction/cleaning/chunking.
3. FE3 - API helper/polling.
4. FE2 - Document Detail panel.
5. FE1 - My Documents badges.
6. Leader/BE3 - final integration regression.

Mỗi thành viên cập nhật branch từ `develop` sau khi dependency phía trước đã
merge. BE2 không đổi extraction interface; FE2/FE1 không sao chép API helper.

## 19. Automated tests

### Backend

- Status transition và permission matrix.
- Existing document không có content được khởi tạo PENDING.
- Upload tạo content PENDING.
- TXT UTF-8/BOM, PDF text, scanned PDF, unsupported và corrupt file.
- Cleaning Unicode, whitespace và paragraph preservation.
- Chunk short/long text, overlap, index, source metadata và max chunks.
- Text vượt 200,000 ký tự đặt `isTruncated` đúng.
- Hai process request đồng thời: chỉ một request enqueue job.
- Reprocess success/failure và transaction rollback.
- Stale PROCESSING recovery.
- Cloudinary timeout, invalid URL và oversized download.
- Trash/delete/revoke xảy ra khi worker đang chạy.
- Permanent delete và FK/cascade.
- DTO list có status, không có extracted text và không N+1 nghiêm trọng.

### Frontend

- 202 bắt đầu đúng một polling session.
- 409 không tạo polling trùng.
- Polling dừng ở terminal status, timeout và page unload.
- UI action đúng cho từng status và permission.
- Long extracted text không gây XSS hoặc vỡ layout.
- Badge fallback và accessibility.

## 20. Final regression checklist

- [ ] `mvn test` pass.
- [ ] Upload mới có `DocumentContent/PENDING`.
- [ ] Document cũ không lỗi vì thiếu content.
- [ ] Process/reprocess trả HTTP 202.
- [ ] Concurrent request sau trả 409.
- [ ] TXT và PDF text extract thành công.
- [ ] Scanned PDF trả EMPTY_CONTENT.
- [ ] Unsupported/corrupt/timeout không làm app crash.
- [ ] Truncation, overlap, ordering và unique constraints đúng.
- [ ] Reprocess failure giữ snapshot COMPLETED cũ.
- [ ] Restart không để PROCESSING mắc kẹt.
- [ ] Trash/delete/revoke chặn access đúng.
- [ ] List DTO trả status nhưng không trả extracted text.
- [ ] Owner xem content; shared user/group/guest không xem full content.
- [ ] FE polling không lặp vô hạn hoặc tạo timer trùng.
- [ ] Không có OpenAI key, embeddings hoặc chatbot UI.
- [ ] Không có console error nghiêm trọng hoặc request 5xx trong demo flow.
- [ ] Docs và demo checklist được cập nhật.

## 21. Tiêu chí hoàn thành

Step 9 hoàn thành khi backend xử lý bất đồng bộ được TXT/PDF thành cleaned text
và ordered chunks; trạng thái, concurrency, lifecycle và permission hoạt động
đúng; frontend hiển thị và polling đúng; dữ liệu sẵn sàng cho Step 10 nhưng hệ
thống chưa phụ thuộc bất kỳ AI provider nào.

