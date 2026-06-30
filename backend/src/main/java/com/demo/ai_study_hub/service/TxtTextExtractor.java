package com.demo.ai_study_hub.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

@Component
public class TxtTextExtractor {

    private static final Logger log = LoggerFactory.getLogger(TxtTextExtractor.class);


    private static final byte[] UTF8_BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

    public String extract(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return "";
        }

        byte[] content = stripBom(bytes);


        try {
            String text = new String(content, StandardCharsets.UTF_8);

            if (!text.contains("\uFFFD")) {
                return text;
            }
        } catch (Exception e) {
            log.warn("UTF-8 decoding failed, trying fallback");
        }


        log.warn("TXT file is not valid UTF-8, falling back to ISO-8859-1");
        return new String(content, Charset.forName("ISO-8859-1"));
    }

    private byte[] stripBom(byte[] bytes) {
        if (bytes.length >= 3
                && bytes[0] == UTF8_BOM[0]
                && bytes[1] == UTF8_BOM[1]
                && bytes[2] == UTF8_BOM[2]) {
            byte[] stripped = new byte[bytes.length - 3];
            System.arraycopy(bytes, 3, stripped, 0, stripped.length);
            return stripped;
        }
        return bytes;
    }
}
