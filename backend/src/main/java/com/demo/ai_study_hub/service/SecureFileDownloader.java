package com.demo.ai_study_hub.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.util.List;

@Component
public class SecureFileDownloader {

    private static final Logger log = LoggerFactory.getLogger(SecureFileDownloader.class);

    private static final List<String> ALLOWED_HOSTS = List.of(
            "res.cloudinary.com"
    );

    private static final int CONNECT_TIMEOUT_MS = 10_000;
    private static final int READ_TIMEOUT_MS = 30_000;
    private static final long MAX_DOWNLOAD_SIZE_BYTES = 15 * 1024 * 1024;
    private static final int MAX_REDIRECTS = 2;

    public static class DownloadException extends RuntimeException {
        public DownloadException(String message) {
            super(message);
        }
    }

    /**
     * Downloads a file from a trusted Cloudinary URL with strict safety limits.
     * Throws DownloadException for any failure — callers must catch and map to FAILED.
     */
    public byte[] download(String fileUrl) {
        validateHost(fileUrl);

        String currentUrl = fileUrl;
        int redirectCount = 0;

        while (true) {
            HttpURLConnection connection = null;
            try {
                URL url = URI.create(currentUrl).toURL();
                connection = (HttpURLConnection) url.openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
                connection.setReadTimeout(READ_TIMEOUT_MS);
                connection.setRequestMethod("GET");

                int status = connection.getResponseCode();

                if (status == HttpURLConnection.HTTP_MOVED_PERM
                        || status == HttpURLConnection.HTTP_MOVED_TEMP
                        || status == HttpURLConnection.HTTP_SEE_OTHER
                        || status == 307 || status == 308) {
                    if (redirectCount >= MAX_REDIRECTS) {
                        throw new DownloadException("Too many redirects while downloading file");
                    }
                    String location = connection.getHeaderField("Location");
                    if (location == null) {
                        throw new DownloadException("Redirect without Location header");
                    }
                    validateHost(location);
                    currentUrl = location;
                    redirectCount++;
                    continue;
                }

                if (status != HttpURLConnection.HTTP_OK) {
                    throw new DownloadException("Unexpected HTTP status while downloading file: " + status);
                }

                long contentLength = connection.getContentLengthLong();
                if (contentLength > MAX_DOWNLOAD_SIZE_BYTES) {
                    throw new DownloadException("File exceeds maximum allowed download size");
                }

                return readBoundedStream(connection.getInputStream());

            } catch (DownloadException e) {
                throw e;
            } catch (IOException e) {
                log.warn("Failed to download file from Cloudinary: {}", e.getMessage());
                throw new DownloadException("Failed to download file: " + e.getMessage());
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        }
    }

    private byte[] readBoundedStream(InputStream in) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] data = new byte[8192];
        long totalRead = 0;
        int bytesRead;
        while ((bytesRead = in.read(data)) != -1) {
            totalRead += bytesRead;
            if (totalRead > MAX_DOWNLOAD_SIZE_BYTES) {
                throw new DownloadException("File exceeds maximum allowed download size during streaming");
            }
            buffer.write(data, 0, bytesRead);
        }
        return buffer.toByteArray();
    }

    private void validateHost(String urlString) {
        try {
            URI uri = URI.create(urlString);
            String host = uri.getHost();
            if (host == null || !ALLOWED_HOSTS.contains(host.toLowerCase())) {
                throw new DownloadException("File URL host is not in the allowed list: " + host);
            }
            if (!"https".equalsIgnoreCase(uri.getScheme())) {
                throw new DownloadException("File URL must use HTTPS");
            }
        } catch (IllegalArgumentException e) {
            throw new DownloadException("Invalid file URL");
        }
    }
}
