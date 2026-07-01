package com.demo.ai_study_hub;

import com.demo.ai_study_hub.service.SecureFileDownloader;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SecureFileDownloaderTest {

    private final SecureFileDownloader downloader = new SecureFileDownloader();
    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

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
    void download_WhenUrlIsNull_ShouldThrowDownloadExceptionNotNpe() {
        SecureFileDownloader.DownloadException ex = assertThrows(
                SecureFileDownloader.DownloadException.class,
                () -> downloader.download(null)
        );
        assertTrue(ex.getMessage().contains("must not be empty"));
    }

    @Test
    void download_WhenUrlIsBlank_ShouldThrowDownloadException() {
        assertThrows(
                SecureFileDownloader.DownloadException.class,
                () -> downloader.download("   ")
        );
    }

    @Test
    void download_WhenResponseExceedsMaxSize_ShouldThrowDownloadException() throws Exception {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/big-file", exchange -> {
            byte[] body = new byte[16 * 1024 * 1024]; // 16MB > 15MB limit
            exchange.getResponseHeaders().add("Content-Type", "application/octet-stream");
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });
        server.start();

        SecureFileDownloader localDownloader = downloaderWithLocalhostAllowed();
        int port = server.getAddress().getPort();

        assertThrows(
                SecureFileDownloader.DownloadException.class,
                () -> localDownloader.download("http://localhost:" + port + "/big-file")
        );
    }

    @Test
    void download_WhenTooManyRedirects_ShouldThrowDownloadException() throws Exception {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/redirect", exchange -> {
            int port = exchange.getLocalAddress().getPort();
            exchange.getResponseHeaders().add("Location", "http://localhost:" + port + "/redirect");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });
        server.start();

        SecureFileDownloader localDownloader = downloaderWithLocalhostAllowed();
        int port = server.getAddress().getPort();

        assertThrows(
                SecureFileDownloader.DownloadException.class,
                () -> localDownloader.download("http://localhost:" + port + "/redirect")
        );
    }

    @Test
    void download_WhenRedirectGoesToDisallowedHost_ShouldThrowDownloadException() throws Exception {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/redirect-out", exchange -> {
            exchange.getResponseHeaders().add("Location", "https://malicious-site.com/file.pdf");
            exchange.sendResponseHeaders(302, -1);
            exchange.close();
        });
        server.start();

        SecureFileDownloader localDownloader = downloaderWithLocalhostAllowed();
        int port = server.getAddress().getPort();

        SecureFileDownloader.DownloadException ex = assertThrows(
                SecureFileDownloader.DownloadException.class,
                () -> localDownloader.download("http://localhost:" + port + "/redirect-out")
        );
        assertTrue(ex.getMessage().contains("not in the allowed list"));
    }

    @Test
    void download_WhenServerReturnsNon200Status_ShouldThrowDownloadException() throws Exception {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/notfound", exchange -> {
            exchange.sendResponseHeaders(404, -1);
            exchange.close();
        });
        server.start();

        SecureFileDownloader localDownloader = downloaderWithLocalhostAllowed();
        int port = server.getAddress().getPort();

        SecureFileDownloader.DownloadException ex = assertThrows(
                SecureFileDownloader.DownloadException.class,
                () -> localDownloader.download("http://localhost:" + port + "/notfound")
        );
        assertTrue(ex.getMessage().contains("status"));
    }

    @Test
    void download_WhenServerRespondsSuccessfully_ShouldReturnBytes() throws Exception {
        byte[] content = "hello world".getBytes();
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/ok", exchange -> {
            exchange.sendResponseHeaders(200, content.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(content);
            }
        });
        server.start();

        SecureFileDownloader localDownloader = downloaderWithLocalhostAllowed();
        int port = server.getAddress().getPort();

        byte[] result = localDownloader.download("http://localhost:" + port + "/ok");
        assertArrayEquals(content, result);
    }

    private SecureFileDownloader downloaderWithLocalhostAllowed() {
        return new SecureFileDownloader(List.of("localhost"), false);
    }
}
