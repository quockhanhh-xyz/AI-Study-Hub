package com.demo.ai_study_hub;

import com.demo.ai_study_hub.service.TextCleaner;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class TextCleanerTest {

    private final TextCleaner cleaner = new TextCleaner();

    @Test
    void clean_WhenNullInput_ShouldReturnEmpty() {
        TextCleaner.CleanResult result = cleaner.clean(null);
        assertNull(result.cleanedText);
        assertEquals(0, result.originalCharacterCount);
        assertFalse(result.isTruncated);
    }

    @Test
    void clean_WhenWhitespaceOnly_ShouldReturnNull() {
        TextCleaner.CleanResult result = cleaner.clean("   \n\t  ");
        assertNull(result.cleanedText);
    }

    @Test
    void clean_WhenNormalText_ShouldNormalizeLineEndings() {
        TextCleaner.CleanResult result = cleaner.clean("Hello\r\nWorld\rFoo");
        assertNotNull(result.cleanedText);
        assertFalse(result.cleanedText.contains("\r"));
    }

    @Test
    void clean_WhenMultipleSpaces_ShouldCollapse() {
        TextCleaner.CleanResult result = cleaner.clean("Hello   World");
        assertEquals("Hello World", result.cleanedText);
    }

    @Test
    void clean_WhenExceedsLimit_ShouldTruncate() {
        String longText = "a".repeat(210_000);
        TextCleaner.CleanResult result = cleaner.clean(longText);
        assertTrue(result.isTruncated);
        assertTrue(result.characterCount <= 200_000);
        assertEquals(210_000, result.originalCharacterCount);
    }

    @Test
    void clean_WhenBelowLimit_ShouldNotTruncate() {
        String text = "Hello World. This is a test.";
        TextCleaner.CleanResult result = cleaner.clean(text);
        assertFalse(result.isTruncated);
        assertEquals(result.characterCount, result.originalCharacterCount);
    }

    @Test
    void clean_ShouldCountWordsCorrectly() {
        TextCleaner.CleanResult result = cleaner.clean("one two three four five");
        assertEquals(5, result.wordCount);
    }

    @Test
    void cleanPages_WhenMultiplePages_ShouldProduceAccurateOffsets() {
        List<String> pages = List.of(
            "Page one content here.",
            "Page two content here.",
            "Page three content here."
        );

        TextCleaner.CleanPagesResult result = cleaner.cleanPages(pages);

        assertNotNull(result.cleanedText);
        assertEquals(3, result.pageStartOffsets.size());


        String page2Content = "Page two content here.";
        int page2Offset = result.pageStartOffsets.get(1);
        assertTrue(result.cleanedText.indexOf(page2Content, page2Offset - 5) >= page2Offset - 5);
    }

    @Test
    void cleanPages_WhenPageHasExcessWhitespace_ShouldCleanBeforeJoining() {
        List<String> pages = List.of(
            "First   page   with   extra   spaces.",
            "Second page normal."
        );

        TextCleaner.CleanPagesResult result = cleaner.cleanPages(pages);

        assertFalse(result.cleanedText.contains("   "));
    }

    @Test
    void cleanPages_WhenEmptyList_ShouldReturnNull() {
        TextCleaner.CleanPagesResult result = cleaner.cleanPages(List.of());
        assertNull(result.cleanedText);
    }

    @Test
    void cleanPages_WhenSomePagesAreBlank_ShouldSkipThemButKeepOffsetsConsistent() {
        List<String> pages = List.of(
            "Page one.",
            "   ", // blank page
            "Page three."
        );

        TextCleaner.CleanPagesResult result = cleaner.cleanPages(pages);

        assertNotNull(result.cleanedText);
        assertEquals(3, result.pageStartOffsets.size());
        assertTrue(result.cleanedText.contains("Page one."));
        assertTrue(result.cleanedText.contains("Page three."));
    }
}
