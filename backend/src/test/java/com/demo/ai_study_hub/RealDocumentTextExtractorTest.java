package com.demo.ai_study_hub;

import com.demo.ai_study_hub.dto.ExtractionResult;
import com.demo.ai_study_hub.entity.Document;
import com.demo.ai_study_hub.entity.ProcessingStatus;
import com.demo.ai_study_hub.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.demo.ai_study_hub.service.DocxTextExtractor;
import com.demo.ai_study_hub.service.PptxTextExtractor;
import com.demo.ai_study_hub.service.XlsxTextExtractor;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.never;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RealDocumentTextExtractorTest {

    @Mock
    private SecureFileDownloader secureFileDownloader;
    @Mock
    private PdfTextExtractor pdfTextExtractor;
    @Mock
    private TxtTextExtractor txtTextExtractor;
    @Mock
    private DocxTextExtractor docxTextExtractor;
    @Mock
    private PptxTextExtractor pptxTextExtractor;
    @Mock
    private XlsxTextExtractor xlsxTextExtractor;

    private TextCleaner textCleaner;
    private TextChunker textChunker;

    private RealDocumentTextExtractor extractor;

    private Document mockDoc;

    @BeforeEach
    void setUp() {
        textCleaner = new TextCleaner();
        textChunker = new TextChunker();
        extractor = new RealDocumentTextExtractor(
            secureFileDownloader,
            pdfTextExtractor,
            txtTextExtractor,
            docxTextExtractor,
            pptxTextExtractor,
            xlsxTextExtractor,
            textCleaner,
            textChunker
        );

        mockDoc = new Document();
        mockDoc.setDocumentId(1);
        mockDoc.setFileUrl("https://res.cloudinary.com/demo/file.txt");
    }

    @Test
    void extract_WhenFileTypeUnsupported_ShouldReturnUnsupported() {
        mockDoc.setFileType("DOC");

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.UNSUPPORTED, result.getStatus());
        verify(secureFileDownloader, never()).download(anyString());
    }

    @Test
    void extract_WhenDownloadFails_ShouldReturnFailed() {
        mockDoc.setFileType("TXT");
        when(secureFileDownloader.download(anyString()))
                .thenThrow(new SecureFileDownloader.DownloadException("Connection refused"));

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.FAILED, result.getStatus());
    }

    @Test
    void extract_WhenTxtFileHasContent_ShouldReturnCompleted() {
        mockDoc.setFileType("TXT");
        byte[] fileBytes = "Hello world. This is a test document.".getBytes();
        when(secureFileDownloader.download(anyString())).thenReturn(fileBytes);
        when(txtTextExtractor.extract(fileBytes)).thenReturn("Hello world. This is a test document.");

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.COMPLETED, result.getStatus());
        assertNotNull(result.getExtractedText());
        assertFalse(result.getChunks().isEmpty());
    }

    @Test
    void extract_WhenTxtFileIsEmpty_ShouldReturnEmptyContent() {
        mockDoc.setFileType("TXT");
        byte[] fileBytes = "   ".getBytes();
        when(secureFileDownloader.download(anyString())).thenReturn(fileBytes);
        when(txtTextExtractor.extract(fileBytes)).thenReturn("   ");

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.EMPTY_CONTENT, result.getStatus());
    }

    @Test
    void extract_WhenPdfParsingFails_ShouldReturnFailed() {
        mockDoc.setFileType("PDF");
        byte[] fileBytes = new byte[]{1, 2, 3}; // corrupt PDF bytes
        when(secureFileDownloader.download(anyString())).thenReturn(fileBytes);
        when(pdfTextExtractor.extract(fileBytes))
                .thenReturn(PdfTextExtractor.PdfExtractionResult.failed("Corrupt PDF"));

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.FAILED, result.getStatus());
    }

    @Test
    void extract_WhenPdfHasNoExtractableText_ShouldReturnEmptyContent() {
        mockDoc.setFileType("PDF");
        byte[] fileBytes = new byte[]{1, 2, 3};
        when(secureFileDownloader.download(anyString())).thenReturn(fileBytes);
        when(pdfTextExtractor.extract(fileBytes))
                .thenReturn(PdfTextExtractor.PdfExtractionResult.ok(java.util.List.of("", "   ")));

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.EMPTY_CONTENT, result.getStatus());
    }

    @Test
    void extract_WhenPdfHasMultiplePagesWithText_ShouldReturnCompletedWithPageMetadata() {
        mockDoc.setFileType("PDF");
        byte[] fileBytes = new byte[]{1, 2, 3};
        when(secureFileDownloader.download(anyString())).thenReturn(fileBytes);
        when(pdfTextExtractor.extract(fileBytes)).thenReturn(
                PdfTextExtractor.PdfExtractionResult.ok(java.util.List.of(
                        "First page content here.",
                        "Second page content here."
                ))
        );

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.COMPLETED, result.getStatus());
        assertFalse(result.getChunks().isEmpty());
        assertNotNull(result.getChunks().get(0).getPageNumber());
    }

    @Test
    void extract_WhenParserThrowsUnexpectedException_ShouldReturnFailedNotCrash() {
        mockDoc.setFileType("PDF");
        byte[] fileBytes = new byte[]{1, 2, 3};
        when(secureFileDownloader.download(anyString())).thenReturn(fileBytes);
        when(pdfTextExtractor.extract(fileBytes)).thenThrow(new RuntimeException("Unexpected parser crash"));

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.FAILED, result.getStatus());
    }

    @Test
    void extract_WhenDocxFileType_ShouldRouteToDocxExtractor() {
        mockDoc.setFileType("DOCX");
        byte[] fileBytes = new byte[]{1, 2, 3};
        when(secureFileDownloader.download(anyString())).thenReturn(fileBytes);
        when(docxTextExtractor.extract(fileBytes))
            .thenReturn(DocxTextExtractor.DocxExtractionResult.ok("Docx content here."));

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.COMPLETED, result.getStatus());
        verify(docxTextExtractor, times(1)).extract(fileBytes);
        verify(pdfTextExtractor, never()).extract(any());
    }

    @Test
    void extract_WhenPptxFileType_ShouldRouteToPptxExtractor() {
        mockDoc.setFileType("PPTX");
        byte[] fileBytes = new byte[]{1, 2, 3};
        when(secureFileDownloader.download(anyString())).thenReturn(fileBytes);
        when(pptxTextExtractor.extract(fileBytes))
            .thenReturn(PptxTextExtractor.PptxExtractionResult.ok("Slide content here."));

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.COMPLETED, result.getStatus());
        verify(pptxTextExtractor, times(1)).extract(fileBytes);
        verify(pdfTextExtractor, never()).extract(any());
    }

    @Test
    void extract_WhenXlsxFileType_ShouldRouteToXlsxExtractor() {
        mockDoc.setFileType("XLSX");
        byte[] fileBytes = new byte[]{1, 2, 3};
        when(secureFileDownloader.download(anyString())).thenReturn(fileBytes);
        when(xlsxTextExtractor.extract(fileBytes))
            .thenReturn(XlsxTextExtractor.XlsxExtractionResult.ok("Cell data here."));

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.COMPLETED, result.getStatus());
        verify(xlsxTextExtractor, times(1)).extract(fileBytes);
        verify(pdfTextExtractor, never()).extract(any());
    }

    @Test
    void extract_WhenDocFileType_ShouldReturnUnsupported() {
        mockDoc.setFileType("DOC");

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.UNSUPPORTED, result.getStatus());
        verify(secureFileDownloader, never()).download(anyString());
    }

    @Test
    void extract_WhenPptFileType_ShouldReturnUnsupported() {
        mockDoc.setFileType("PPT");

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.UNSUPPORTED, result.getStatus());
    }

    @Test
    void extract_WhenXlsFileType_ShouldReturnUnsupported() {
        mockDoc.setFileType("XLS");

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.UNSUPPORTED, result.getStatus());
    }

    @Test
    void extract_WhenDocxExtractorReturnsFailed_ShouldReturnFailed() {
        mockDoc.setFileType("DOCX");
        byte[] fileBytes = new byte[]{1, 2, 3};
        when(secureFileDownloader.download(anyString())).thenReturn(fileBytes);
        when(docxTextExtractor.extract(fileBytes))
            .thenReturn(DocxTextExtractor.DocxExtractionResult.failed("Corrupt DOCX"));

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.FAILED, result.getStatus());
    }

    @Test
    void extract_WhenDocxHasNoText_ShouldReturnEmptyContent() {
        mockDoc.setFileType("DOCX");
        byte[] fileBytes = new byte[]{1, 2, 3};
        when(secureFileDownloader.download(anyString())).thenReturn(fileBytes);
        when(docxTextExtractor.extract(fileBytes))
            .thenReturn(DocxTextExtractor.DocxExtractionResult.ok("   "));

        ExtractionResult result = extractor.extract(mockDoc);

        assertEquals(ProcessingStatus.EMPTY_CONTENT, result.getStatus());
    }
}
