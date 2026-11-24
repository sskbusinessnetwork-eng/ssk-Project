package com.sskbusiness.app.webview

enum class CacheStrategy {
    DEFAULT_REVALIDATE,
    OFFLINE_CACHE_FALLBACK
}

enum class RefreshDecision {
    NONE,
    RELOAD_VALIDATE_CACHE,
    RELOAD_WITH_CACHE_CLEAR
}

/**
 * Pure lifecycle and cache-refresh policy for the SSK WebView wrapper.
 * Ensures the app shows newly published website updates when reopened while:
 * - preserving normal HTTP caching when online,
 * - avoiding reload loops and offline blank screens,
 * - never wiping form state when returning from the native Contacts picker or file chooser.
 */
class WebViewRefreshPolicy(
    private val reopenFallbackThresholdMs: Long = DEFAULT_REOPEN_FALLBACK_THRESHOLD_MS,
    private val longBackgroundRefreshMs: Long = DEFAULT_LONG_BACKGROUND_REFRESH_MS,
    private val minRefreshIntervalMs: Long = DEFAULT_MIN_REFRESH_INTERVAL_MS,
    initialVersionFingerprint: String? = null
) {
    private var hasCompletedInitialLoad = false
    private var hasEvaluatedColdStartUpdate = false
    private var isInBackground = false
    private var backgroundedAtMs = 0L
    private var lastAutoRefreshAtMs = 0L
    private var suppressNextResumeRefresh = false
    private var lastKnownVersionFingerprint: String? = initialVersionFingerprint?.takeIf { it.isNotBlank() }

    fun markInitialLoad() {
        hasCompletedInitialLoad = true
    }

    fun onEnterBackground(nowMs: Long) {
        if (!hasCompletedInitialLoad) return
        if (!isInBackground) {
            isInBackground = true
            backgroundedAtMs = nowMs
        }
    }

    fun suppressNextForegroundRefresh() {
        suppressNextResumeRefresh = true
    }

    fun consumePendingBackgroundState(): Boolean {
        val wasInBackground = isInBackground
        isInBackground = false
        return wasInBackground
    }

    fun consumeResumeSuppression(): Boolean {
        val suppressed = suppressNextResumeRefresh
        suppressNextResumeRefresh = false
        return suppressed
    }

    fun currentVersionFingerprint(): String? = lastKnownVersionFingerprint

    /**
     * Updates the tracked website fingerprint and returns true if a previously known
     * fingerprint changed (indicating a new website deployment).
     */
    fun recordVersionFingerprint(newFingerprint: String?): Boolean {
        val normalized = newFingerprint?.trim()?.takeIf { it.isNotEmpty() } ?: return false
        val previous = lastKnownVersionFingerprint
        lastKnownVersionFingerprint = normalized
        return previous != null && previous != normalized
    }

    fun recommendedCacheStrategy(isOnline: Boolean): CacheStrategy {
        return if (isOnline) {
            CacheStrategy.DEFAULT_REVALIDATE
        } else {
            CacheStrategy.OFFLINE_CACHE_FALLBACK
        }
    }

    fun canTriggerCooldownRefresh(nowMs: Long): Boolean {
        return lastAutoRefreshAtMs == 0L || (nowMs - lastAutoRefreshAtMs) >= minRefreshIntervalMs
    }

    fun shouldRunColdStartCheck(): Boolean = !hasEvaluatedColdStartUpdate

    fun evaluateColdStartUpdate(
        nowMs: Long,
        isOnline: Boolean,
        isPickerInFlight: Boolean,
        isTrustedUrl: Boolean,
        isOfflineOverlayVisible: Boolean,
        versionChanged: Boolean
    ): RefreshDecision {
        if (hasEvaluatedColdStartUpdate) {
            return RefreshDecision.NONE
        }
        hasEvaluatedColdStartUpdate = true

        if (!isOnline || isPickerInFlight || !isTrustedUrl || isOfflineOverlayVisible) {
            return RefreshDecision.NONE
        }
        if (!versionChanged || !canTriggerCooldownRefresh(nowMs)) {
            return RefreshDecision.NONE
        }
        return RefreshDecision.RELOAD_WITH_CACHE_CLEAR
    }

    fun evaluateResumeRefresh(
        nowMs: Long,
        wasInBackground: Boolean,
        wasSuppressed: Boolean,
        isOnline: Boolean,
        isPageLoading: Boolean,
        isPickerInFlight: Boolean,
        isTrustedUrl: Boolean,
        isOfflineOverlayVisible: Boolean,
        versionChanged: Boolean,
        hasVersionFingerprint: Boolean
    ): RefreshDecision {
        if (!hasCompletedInitialLoad || !wasInBackground) {
            return RefreshDecision.NONE
        }
        if (wasSuppressed || isPickerInFlight) {
            return RefreshDecision.NONE
        }
        if (!isOnline || isPageLoading || isOfflineOverlayVisible || !isTrustedUrl) {
            return RefreshDecision.NONE
        }
        if (!canTriggerCooldownRefresh(nowMs)) {
            return RefreshDecision.NONE
        }

        if (versionChanged) {
            return RefreshDecision.RELOAD_WITH_CACHE_CLEAR
        }

        val elapsedBackgroundMs = (nowMs - backgroundedAtMs).coerceAtLeast(0L)
        if (!hasVersionFingerprint && elapsedBackgroundMs >= reopenFallbackThresholdMs) {
            return RefreshDecision.RELOAD_VALIDATE_CACHE
        }
        if (elapsedBackgroundMs >= longBackgroundRefreshMs) {
            return RefreshDecision.RELOAD_VALIDATE_CACHE
        }

        return RefreshDecision.NONE
    }

    fun markRefreshTriggered(nowMs: Long) {
        lastAutoRefreshAtMs = nowMs
    }

    companion object {
        const val DEFAULT_REOPEN_FALLBACK_THRESHOLD_MS = 30_000L
        const val DEFAULT_LONG_BACKGROUND_REFRESH_MS = 300_000L
        const val DEFAULT_MIN_REFRESH_INTERVAL_MS = 15_000L
    }
}
