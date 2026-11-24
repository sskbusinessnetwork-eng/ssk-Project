package com.sskbusiness.app.security

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OriginGuardTest {

    private val allowlist = setOf("www.sskbusiness.com", "sskbusiness.com")

    @Test
    fun allowsTrustedHttpsUrls() {
        assertTrue(OriginGuard.isTrustedBridgeUrl("https://www.sskbusiness.com", allowlist))
        assertTrue(OriginGuard.isTrustedBridgeUrl("https://www.sskbusiness.com/referrals", allowlist))
        assertTrue(OriginGuard.isTrustedBridgeUrl("https://SSKBUSINESS.COM/register?ref=1", allowlist))
    }

    @Test
    fun rejectsHttpAndDangerousSchemes() {
        assertFalse(OriginGuard.isTrustedBridgeUrl("http://www.sskbusiness.com", allowlist))
        assertFalse(OriginGuard.isTrustedBridgeUrl("file:///android_asset/index.html", allowlist))
        assertFalse(OriginGuard.isTrustedBridgeUrl("javascript:alert(1)", allowlist))
        assertFalse(OriginGuard.isTrustedBridgeUrl("about:blank", allowlist))
        assertFalse(OriginGuard.isTrustedBridgeUrl(null, allowlist))
    }

    @Test
    fun rejectsUntrustedOrLookalikeHosts() {
        assertFalse(OriginGuard.isTrustedBridgeUrl("https://evil.com", allowlist))
        assertFalse(OriginGuard.isTrustedBridgeUrl("https://www.sskbusiness.com.evil.com", allowlist))
        assertFalse(OriginGuard.isTrustedBridgeUrl("https://fake-sskbusiness.com", allowlist))
    }
}
