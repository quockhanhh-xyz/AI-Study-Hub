package com.demo.ai_study_hub;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.web.servlet.MultipartProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.util.unit.DataSize;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
public class MultipartConfigIntegrationTest {

    @Autowired
    private MultipartProperties multipartProperties;

    @Test
    void testMultipartConfigurationLimits() {
        assertEquals(DataSize.ofMegabytes(100), multipartProperties.getMaxFileSize(), "Max file size should be 100MB");
        assertEquals(DataSize.ofMegabytes(105), multipartProperties.getMaxRequestSize(), "Max request size should be 105MB");
    }
}
