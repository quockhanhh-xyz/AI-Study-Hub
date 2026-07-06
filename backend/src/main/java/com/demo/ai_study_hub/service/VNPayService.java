package com.demo.ai_study_hub.service;

import com.demo.ai_study_hub.config.VNPayProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class VNPayService {

    private static final DateTimeFormatter VNP_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final VNPayProperties vnPayProperties;

    /** Allowlisted bank codes accepted for Step 13B MVP. */
    private static final Set<String> ALLOWED_BANK_CODES = Set.of("VNPAYQR", "VNBANK", "INTCARD", "NCB");

    public boolean isValidBankCode(String bankCode) {
        return bankCode == null || bankCode.isBlank() || ALLOWED_BANK_CODES.contains(bankCode.toUpperCase());
    }

    /**
     * Builds the full VNPay Sandbox payment URL, including vnp_SecureHash.
     *
     * @param txnRef    unique transaction ref (letters/digits only, no dashes)
     * @param amount    order amount in VND (will be multiplied by 100 per VNPay spec)
     * @param orderInfo plain text order description, no diacritics/special chars
     * @param ipAddr    client IP address
     * @param bankCode  optional bank code (nullable)
     * @param locale    "vn" or "en"
     * @param expiresAt order expiry instant (UTC) — converted to GMT+7 for vnp_ExpireDate
     */
    public String buildPaymentUrl(String txnRef, long amount, String orderInfo,
                                  String ipAddr, String bankCode, String locale,
                                  LocalDateTime expiresAtUtc) {
        LocalDateTime nowVn = LocalDateTime.now(VN_ZONE);
        LocalDateTime expireVn = expiresAtUtc.atZone(ZoneOffset.UTC).withZoneSameInstant(VN_ZONE).toLocalDateTime();

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", "2.1.0");
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", vnPayProperties.getTmnCode());
        params.put("vnp_Amount", String.valueOf(amount * 100));
        params.put("vnp_CreateDate", nowVn.format(VNP_DATE_FORMAT));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_IpAddr", ipAddr != null ? ipAddr : "127.0.0.1");
        params.put("vnp_Locale", (locale == null || locale.isBlank()) ? "vn" : locale);
        params.put("vnp_OrderInfo", orderInfo);
        params.put("vnp_OrderType", "other");
        params.put("vnp_ReturnUrl", vnPayProperties.getReturnUrl());
        params.put("vnp_ExpireDate", expireVn.format(VNP_DATE_FORMAT));
        params.put("vnp_TxnRef", txnRef);
        if (bankCode != null && !bankCode.isBlank()) {
            params.put("vnp_BankCode", bankCode.toUpperCase());
        }

        String query = buildQueryString(params, true);
        String hashData = buildQueryString(params, false);
        String secureHash = hmacSha512(vnPayProperties.getHashSecret(), hashData);

        return vnPayProperties.getPaymentUrl() + "?" + query + "&vnp_SecureHash=" + secureHash;
    }

    /**
     * Verifies vnp_SecureHash against all other params (excluding the hash
     * fields themselves), using constant-time comparison.
     */
    public boolean verifyChecksum(Map<String, String> params) {
        String receivedHash = params.get("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isBlank()) {
            return false;
        }
        Map<String, String> toHash = new TreeMap<>(params);
        toHash.remove("vnp_SecureHash");
        toHash.remove("vnp_SecureHashType");

        String hashData = buildQueryString(toHash, false);
        String computedHash = hmacSha512(vnPayProperties.getHashSecret(), hashData);

        return constantTimeEquals(computedHash, receivedHash);
    }

    /**
     * Parses vnp_PayDate (format yyyyMMddHHmmss, Asia/Ho_Chi_Minh) into UTC.
     * Returns null if parsing fails — caller must treat this as PAY_DATE_PARSE_FAILED.
     */
    public LocalDateTime parsePayDateToUtc(String vnpPayDate) {
        if (vnpPayDate == null || vnpPayDate.isBlank()) {
            return null;
        }
        try {
            LocalDateTime vnTime = LocalDateTime.parse(vnpPayDate, VNP_DATE_FORMAT);
            return vnTime.atZone(VN_ZONE).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
        } catch (DateTimeParseException e) {
            log.warn("Failed to parse vnp_PayDate: {}", vnpPayDate);
            return null;
        }
    }

    private String buildQueryString(Map<String, String> params, boolean urlEncode) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (entry.getValue() == null || entry.getValue().isEmpty()) continue;
            if (sb.length() > 0) sb.append('&');
            if (urlEncode) {
                sb.append(urlEncode(entry.getKey())).append('=').append(urlEncode(entry.getValue()));
            } else {
                sb.append(entry.getKey()).append('=').append(entry.getValue());
            }
        }
        return sb.toString();
    }

    private String urlEncode(String value) {
        try {
            return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8.toString());
        } catch (Exception e) {
            return value;
        }
    }

    private String hmacSha512(String key, String data) {
        try {
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac512.init(secretKey);
            byte[] result = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : result) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            // Never leak the secret in error output.
            throw new IllegalStateException("Failed to compute VNPay signature");
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(
                a.toLowerCase().getBytes(StandardCharsets.UTF_8),
                b.toLowerCase().getBytes(StandardCharsets.UTF_8)
        );
    }

    public String generateTxnRef(Long paymentId) {
        LocalDateTime now = LocalDateTime.now(VN_ZONE);
        return "PAY" + now.format(VNP_DATE_FORMAT) + paymentId;
    }
}