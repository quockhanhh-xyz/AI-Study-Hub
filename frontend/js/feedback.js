/**
 * Javascript logic for User Feedback Page
 */

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (typeof checkAuth === 'function') {
        checkAuth();
    }

    initStarRating();
    const feedbackCategory = document.getElementById('feedbackCategory');
    if (feedbackCategory && window.UIHelper && window.UIHelper.convertSelectToCustomDropdown) {
        window.UIHelper.convertSelectToCustomDropdown(feedbackCategory);
    }
    loadUserFeedback();

    const form = document.getElementById('feedbackForm');
    form.addEventListener('submit', handleFormSubmit);

    const btnDelete = document.getElementById('btnDeleteFeedback');
    btnDelete.addEventListener('click', handleFeedbackDelete);

    const btnSendReply = document.getElementById('btnSendReply');
    btnSendReply.addEventListener('click', handleSendReply);

    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendReply();
        }
    });
});

let currentReviewId = null;
let selectedRating = 0;

const ratingTexts = {
    1: 'Terrible',
    2: 'Poor',
    3: 'Average',
    4: 'Good',
    5: 'Excellent'
};

function initStarRating() {
    const stars = document.querySelectorAll('.star-btn');
    const ratingText = document.getElementById('ratingText');

    stars.forEach(star => {
        // Hover effect
        star.addEventListener('mouseover', () => {
            const val = parseInt(star.getAttribute('data-value'));
            highlightStars(val, true);
        });

        star.addEventListener('mouseout', () => {
            highlightStars(selectedRating, false);
        });

        // Click selection
        star.addEventListener('click', () => {
            const val = parseInt(star.getAttribute('data-value'));
            selectedRating = val;
            highlightStars(val, false);
            ratingText.textContent = ratingTexts[val] || 'Select rating';
        });
    });
}

function highlightStars(count, isHover = false) {
    const stars = document.querySelectorAll('.star-btn');
    stars.forEach(star => {
        const val = parseInt(star.getAttribute('data-value'));
        if (val <= count) {
            star.classList.add(isHover ? 'hover' : 'active');
            if (!isHover) star.classList.remove('hover');
        } else {
            star.classList.remove(isHover ? 'hover' : 'active');
        }
    });
}

async function loadUserFeedback() {
    try {
        const result = await getMySystemReview();
        
        if (result && result.success && result.data) {
            const review = result.data;
            currentReviewId = review.reviewId;
            selectedRating = review.rating;

            // Fill form
            highlightStars(review.rating, false);
            document.getElementById('ratingText').textContent = ratingTexts[review.rating];
            document.getElementById('feedbackCategory').value = review.category;
            const categorySelect = document.getElementById('feedbackCategory');
            if (categorySelect) {
                categorySelect.dispatchEvent(new Event("syncCustom"));
            }
            document.getElementById('feedbackTitle').value = review.title;
            document.getElementById('feedbackContent').value = review.content;

            // Update UI elements
            document.getElementById('formCardTitle').firstElementChild.textContent = 'Update System Review';
            document.getElementById('btnSubmitFeedback').textContent = 'Update Review';
            document.getElementById('btnDeleteFeedback').style.display = 'inline-block';
            const formActions = document.getElementById('feedbackFormActions');
            if (formActions) {
                formActions.classList.add('has-existing-review');
            }

            // Show status badge
            const badge = document.getElementById('reviewStatusBadge');
            badge.style.display = 'inline-block';
            badge.className = `status-badge status-${review.status.toLowerCase()}`;
            badge.textContent = review.status.replace('_', ' ');

            // Setup conversation timeline
            document.getElementById('noConversationState').style.display = 'none';
            document.getElementById('conversationTimeline').style.display = 'flex';

            renderTimelineMessages(review.replies || [], review.userEmail);
        } else {
            // Reset to default create state
            currentReviewId = null;
            selectedRating = 0;
            highlightStars(0, false);
            document.getElementById('ratingText').textContent = 'Select rating';
            document.getElementById('feedbackCategory').value = '';
            const categorySelect = document.getElementById('feedbackCategory');
            if (categorySelect) {
                categorySelect.dispatchEvent(new Event("syncCustom"));
            }
            document.getElementById('feedbackTitle').value = '';
            document.getElementById('feedbackContent').value = '';

            document.getElementById('formCardTitle').firstElementChild.textContent = 'Submit System Review';
            document.getElementById('btnSubmitFeedback').textContent = 'Submit Review';
            document.getElementById('btnDeleteFeedback').style.display = 'none';
            const formActions = document.getElementById('feedbackFormActions');
            if (formActions) {
                formActions.classList.remove('has-existing-review');
            }
            document.getElementById('reviewStatusBadge').style.display = 'none';

            document.getElementById('noConversationState').style.display = 'flex';
            document.getElementById('conversationTimeline').style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to load system review:', error);
        if (window.showToast) {
            window.showToast('Failed to load your review status.', 'error');
        }
    }
}

function renderTimelineMessages(replies, userEmail) {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';

    replies.forEach(r => {
        const isUser = r.senderEmail === userEmail;
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${isUser ? 'user' : 'admin'}`;
        
        // Escape HTML content dynamically
        const contentSpan = document.createElement('span');
        contentSpan.textContent = r.content;
        bubble.appendChild(contentSpan);

        const meta = document.createElement('div');
        meta.className = 'chat-meta';
        const senderLabel = isUser ? 'You' : (r.senderFullName || 'Support');
        meta.textContent = `${senderLabel} • ${formatDate(r.createdAt)}`;
        bubble.appendChild(meta);

        container.appendChild(bubble);
    });

    container.scrollTop = container.scrollHeight;
}

async function handleFormSubmit(e) {
    e.preventDefault();

    if (selectedRating === 0) {
        if (window.showToast) {
            window.showToast('Please select a star rating (1-5).', 'error');
        }
        return;
    }

    const data = {
        rating: selectedRating,
        category: document.getElementById('feedbackCategory').value,
        title: document.getElementById('feedbackTitle').value.trim(),
        content: document.getElementById('feedbackContent').value.trim()
    };

    if (data.content.length < 10) {
        if (window.showToast) {
            window.showToast('Comments must be at least 10 characters long.', 'error');
        }
        return;
    }

    try {
        let result;
        if (currentReviewId) {
            result = await updateSystemReview(currentReviewId, data);
        } else {
            result = await submitSystemReview(data);
        }

        if (result && result.success) {
            if (window.showToast) {
                window.showToast(currentReviewId ? 'Review updated successfully!' : 'Review submitted successfully!', 'success');
            }
            loadUserFeedback();
        } else {
            if (window.showToast) {
                window.showToast(result.message || 'Failed to submit review.', 'error');
            }
        }
    } catch (error) {
        console.error('Feedback submit error:', error);
        if (window.showToast) {
            window.showToast('An error occurred. Please try again.', 'error');
        }
    }
}

async function handleFeedbackDelete() {
    if (!currentReviewId) return;

    const confirmed = typeof window.confirmAction === 'function'
        ? await window.confirmAction({
            title: 'Delete Feedback Review?',
            message: 'Are you sure you want to delete your feedback review? This will soft-delete the conversation history.',
            confirmText: 'Delete',
            danger: true
        })
        : confirm('Are you sure you want to delete your feedback review?');

    if (!confirmed) return;

    try {
        const result = await deleteSystemReview(currentReviewId);
        if (result && result.success) {
            if (window.showToast) {
                window.showToast('Feedback review deleted successfully.', 'success');
            }
            loadUserFeedback();
        } else {
            if (window.showToast) {
                window.showToast(result.message || 'Failed to delete review.', 'error');
            }
        }
    } catch (error) {
        console.error('Delete feedback error:', error);
        if (window.showToast) {
            window.showToast('Failed to delete your feedback.', 'error');
        }
    }
}

async function handleSendReply() {
    if (!currentReviewId) return;

    const input = document.getElementById('chatInput');
    const content = input.value.trim();

    if (!content) return;

    try {
        const result = await addReviewReply(currentReviewId, content);
        if (result && result.success) {
            input.value = '';
            // Reload feedback to get the entire timeline
            loadUserFeedback();
        } else {
            if (window.showToast) {
                window.showToast(result.message || 'Failed to send reply.', 'error');
            }
        }
    } catch (error) {
        console.error('Send reply error:', error);
        if (window.showToast) {
            window.showToast('Failed to send response.', 'error');
        }
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString();
    } catch (e) {
        return dateStr;
    }
}
