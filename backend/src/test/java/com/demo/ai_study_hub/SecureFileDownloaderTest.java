package com.demo.ai_study_hub;

import com.demo.ai_study_hub.service.SecureFileDownloader;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SecureFileDownloaderTest {

    private final SecureFileDownloader downloader = new SecureFileDownloader();

    @Test
    void download_WhenHostNotAllowed_ShouldThrowDownloadException() {
        SecureFileDownloader.DownloadException ex = assertThrows(
                SecureFileDownloader.DownloadException.class,
                () -> downloader.download("https://malicious-site.com/file.pdf")
        );
        assertTrue(ex.getMessage().contains("not in the allowed list"));
    }

    @Test
    void download_WhenSchemeIsHttp_ShouldThrowDownloadException() {
        SecureFileDownloader.DownloadException ex = assertThrows(
                SecureFileDownloader.DownloadException.class,
                () -> downloader.download("http://res.cloudinary.com/demo/file.pdf")
        );
        assertTrue(ex.getMessage().contains("HTTPS"));
    }

    @Test
    void download_WhenUrlIsMalformed_ShouldThrowDownloadException() {
        assertThrows(
                SecureFileDownloader.DownloadException.class,
                () -> downloader.download("not-a-valid-url")
        );
    }

    @Test
    void download_WhenUrlIsNull_ShouldThrowDownloadException() {
        assertThrows(
                Exception.class,
                () -> downloader.download(null)
        );
    }
}
