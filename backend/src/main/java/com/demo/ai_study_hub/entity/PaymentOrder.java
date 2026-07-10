package com.demo.ai_study_hub.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "payment_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id")
    private Long paymentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", nullable = false)
    private User user;

    @Column(name = "plan_code", nullable = false, length = 30)
    private String planCode;

    /** Snapshot of the target tier at order-creation time (PREMIUM/ULTRA). */
    @Column(name = "target_tier", length = 20)
    private String targetTier;

    /** Snapshot of the plan duration in months (always 1 for now). */
    @Column(name = "duration_months")
    private Integer durationMonths;

    @Column(name = "amount", nullable = false)
    private Long amount;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "payment_method", nullable = false, length = 30)
    private String paymentMethod;

    /** "MOCK" | "VNPAY_SANDBOX" — decides which endpoints may act on this order. */
    @Column(name = "payment_provider", length = 30)
    private String paymentProvider;

    /** VNPay checkout URL. Only ever populated while PENDING and not expired. */
    @Column(name = "payment_url", columnDefinition = "TEXT")
    private String paymentUrl;

    @Column(name = "vnp_txn_ref", length = 100)
    private String vnpTxnRef;

    @Column(name = "vnp_transaction_no", length = 100)
    private String vnpTransactionNo;

    @Column(name = "vnp_response_code", length = 20)
    private String vnpResponseCode;

    @Column(name = "vnp_transaction_status", length = 20)
    private String vnpTransactionStatus;

    @Column(name = "vnp_bank_code", length = 50)
    private String vnpBankCode;

    /** Raw vnp_PayDate string as received from VNPay (Asia/Ho_Chi_Minh, unparsed). */
    @Column(name = "vnp_pay_date", length = 30)
    private String vnpPayDate;

    /** vnp_PayDate parsed and converted to UTC. */
    @Column(name = "provider_paid_at")
    private LocalDateTime providerPaidAt;

    @Column(name = "review_reason", length = 100)
    private String reviewReason;

    @Column(name = "review_required_at")
    private LocalDateTime reviewRequiredAt;

    @Column(name = "expired_at")
    private LocalDateTime expiredAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now(java.time.ZoneOffset.UTC);
        }
    }
}