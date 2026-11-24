package com.sskbusiness.app.webview

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WebViewRefreshPolicyTest {

    @Test
    fun usesDefaultCacheOnlineAndOfflineFallbackOffline() {
        val policy = WebViewRefreshPolicy()
        assertEquals(CacheStrategy.DEFAULT_REVALIDATE, policy.recommendedCacheStrategy(isOnline = true))
        assertEquals(CacheStrategy.OFFLINE_CACHE_FALLBACK, policy.recommendedCacheStrategy(isOnline = false))
    }

    @Test
    fun triggersCacheClearReloadWhenPublishedFingerprintChangesOnReopen() {
        val policy = WebViewRefreshPolicy(initialVersionFingerprint = "etag=\"v1\"|lm=Mon")
        policy.markInitialLoad()
        policy.onEnterBackground(nowMs = 1_000L)

        val wasInBackground = policy.consumePendingBackgroundState()
        val wasSuppressed = policy.consumeResumeSuppression()
        val versionChanged = policy.recordVersionFingerprint("etag=\"v2\"|lm=Tue")

        assertTrue(wasInBackground)
        assertFalse(wasSuppressed)
        assertTrue(versionChanged)

        val decision = policy.evaluateResumeRefresh(
            nowMs = 6_000L,
            wasInBackground = true,
            wasSuppressed = false,
            isOnline = true,
            isPageLoading = false,
            isPickerInFlight = false,
            isTrustedUrl = true,
            isOfflineOverlayVisible = false,
            versionChanged = versionChanged,
            hasVersionFingerprint = true
        )
        assertEquals(RefreshDecision.RELOAD_WITH_CACHE_CLEAR, decision)
    }

    @Test
    fun preservesOpenFormWhenFingerprintUnchangedAndBackgroundWasBrief() {
        val policy = WebViewRefreshPolicy(initialVersionFingerprint = "etag=\"v1\"|lm=Mon")
        policy.markInitialLoad()
        policy.onEnterBackground(nowMs = 10_000L)

        val wasInBackground = policy.consumePendingBackgroundState()
        val versionChanged = policy.recordVersionFingerprint("etag=\"v1\"|lm=Mon")

        assertTrue(wasInBackground)
        assertFalse(versionChanged)

        val decision = policy.evaluateResumeRefresh(
            nowMs = 25_000L,
            wasInBackground = true,
            wasSuppressed = false,
            isOnline = true,
            isPageLoading = false,
            isPickerInFlight = false,
            isTrustedUrl = true,
            isOfflineOverlayVisible = false,
            versionChanged = false,
            hasVersionFingerprint = true
        )
        assertEquals(RefreshDecision.NONE, decision)
    }

    @Test
    fun validatesCacheAfterLongBackgroundOrWithoutFingerprint() {
        val policy = WebViewRefreshPolicy(initialVersionFingerprint = "etag=\"v1\"|lm=Mon")
        policy.markInitialLoad()
        policy.onEnterBackground(nowMs = 1_000L)

        val longDecision = policy.evaluateResumeRefresh(
            nowMs = 1_000L + WebViewRefreshPolicy.DEFAULT_LONG_BACKGROUND_REFRESH_MS,
            wasInBackground = policy.consumePendingBackgroundState(),
            wasSuppressed = policy.consumeResumeSuppression(),
            isOnline = true,
            isPageLoading = false,
            isPickerInFlight = false,
            isTrustedUrl = true,
            isOfflineOverlayVisible = false,
            versionChanged = false,
            hasVersionFingerprint = true
        )
        assertEquals(RefreshDecision.RELOAD_VALIDATE_CACHE, longDecision)

        policy.onEnterBackground(nowMs = 400_000L)
        val noFingerprintDecision = policy.evaluateResumeRefresh(
            nowMs = 400_000L + WebViewRefreshPolicy.DEFAULT_REOPEN_FALLBACK_THRESHOLD_MS,
            wasInBackground = policy.consumePendingBackgroundState(),
            wasSuppressed = policy.consumeResumeSuppression(),
            isOnline = true,
            isPageLoading = false,
            isPickerInFlight = false,
            isTrustedUrl = true,
            isOfflineOverlayVisible = false,
            versionChanged = false,
            hasVersionFingerprint = false
        )
        assertEquals(RefreshDecision.RELOAD_VALIDATE_CACHE, noFingerprintDecision)
    }

    @Test
    fun neverReloadsWhenReturningFromContactsPickerOrOfflineOrUntrustedUrl() {
        val policy = WebViewRefreshPolicy(initialVersionFingerprint = "etag=\"v1\"|lm=Mon")
        policy.markInitialLoad()
        policy.onEnterBackground(nowMs = 1_000L)
        policy.suppressNextForegroundRefresh()

        val suppressedDecision = policy.evaluateResumeRefresh(
            nowMs = 600_000L,
            wasInBackground = policy.consumePendingBackgroundState(),
            wasSuppressed = policy.consumeResumeSuppression(),
            isOnline = true,
            isPageLoading = false,
            isPickerInFlight = false,
            isTrustedUrl = true,
            isOfflineOverlayVisible = false,
            versionChanged = true,
            hasVersionFingerprint = true
        )
        assertEquals(RefreshDecision.NONE, suppressedDecision)

        policy.onEnterBackground(nowMs = 610_000L)
        val offlineDecision = policy.evaluateResumeRefresh(
            nowMs = 950_000L,
            wasInBackground = policy.consumePendingBackgroundState(),
            wasSuppressed = policy.consumeResumeSuppression(),
            isOnline = false,
            isPageLoading = false,
            isPickerInFlight = false,
            isTrustedUrl = true,
            isOfflineOverlayVisible = false,
            versionChanged = true,
            hasVersionFingerprint = true
        )
        assertEquals(RefreshDecision.NONE, offlineDecision)

        policy.onEnterBackground(nowMs = 960_000L)
        val untrustedDecision = policy.evaluateResumeRefresh(
            nowMs = 1_300_000L,
            wasInBackground = policy.consumePendingBackgroundState(),
            wasSuppressed = policy.consumeResumeSuppression(),
            isOnline = true,
            isPageLoading = false,
            isPickerInFlight = false,
            isTrustedUrl = false,
            isOfflineOverlayVisible = false,
            versionChanged = true,
            hasVersionFingerprint = true
        )
        assertEquals(RefreshDecision.NONE, untrustedDecision)
    }

    @Test
    fun preventsRepeatedReloadLoopsWithinCooldownWindow() {
        val policy = WebViewRefreshPolicy(initialVersionFingerprint = "etag=\"v1\"|lm=Mon")
        policy.markInitialLoad()
        policy.markRefreshTriggered(nowMs = 10_000L)
        policy.onEnterBackground(nowMs = 12_000L)

        val tooSoon = policy.evaluateResumeRefresh(
            nowMs = 18_000L,
            wasInBackground = policy.consumePendingBackgroundState(),
            wasSuppressed = policy.consumeResumeSuppression(),
            isOnline = true,
            isPageLoading = false,
            isPickerInFlight = false,
            isTrustedUrl = true,
            isOfflineOverlayVisible = false,
            versionChanged = true,
            hasVersionFingerprint = true
        )
        assertEquals(RefreshDecision.NONE, tooSoon)
    }

    @Test
    fun coldStartUpdateTriggersOnceOnlyWhenPersistedVersionChanged() {
        val firstInstall = WebViewRefreshPolicy(initialVersionFingerprint = null)
        firstInstall.markInitialLoad()
        assertFalse(firstInstall.recordVersionFingerprint("etag=\"v1\"|lm=Mon"))
        assertEquals(
            RefreshDecision.NONE,
            firstInstall.evaluateColdStartUpdate(
                nowMs = 1_000L,
                isOnline = true,
                isPickerInFlight = false,
                isTrustedUrl = true,
                isOfflineOverlayVisible = false,
                versionChanged = false
            )
        )

        val updatedSite = WebViewRefreshPolicy(initialVersionFingerprint = "etag=\"v1\"|lm=Mon")
        updatedSite.markInitialLoad()
        val changed = updatedSite.recordVersionFingerprint("etag=\"v2\"|lm=Tue")
        assertTrue(changed)
        assertEquals(
            RefreshDecision.RELOAD_WITH_CACHE_CLEAR,
            updatedSite.evaluateColdStartUpdate(
                nowMs = 1_000L,
                isOnline = true,
                isPickerInFlight = false,
                isTrustedUrl = true,
                isOfflineOverlayVisible = false,
                versionChanged = changed
            )
        )
        // Second cold-start check cannot loop
        assertEquals(
            RefreshDecision.NONE,
            updatedSite.evaluateColdStartUpdate(
                nowMs = 2_000L,
                isOnline = true,
                isPickerInFlight = false,
                isTrustedUrl = true,
                isOfflineOverlayVisible = false,
                versionChanged = true
            )
        )
    }
}
