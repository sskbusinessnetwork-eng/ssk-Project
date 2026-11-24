package com.sskbusiness.app.webview

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

class WebsiteVersionCheckerTest {

    @Test
    fun buildsFingerprintFromEtagAndLastModified() {
        assertEquals(
            "etag=\"abc123\"|lm=Tue, 24 Nov 2026 08:02:30 GMT",
            WebsiteVersionChecker.buildFingerprint("\"abc123\"", "Tue, 24 Nov 2026 08:02:30 GMT")
        )
        assertEquals(
            "etag=\"abc123\"|lm=",
            WebsiteVersionChecker.buildFingerprint("  \"abc123\"  ", null)
        )
        assertNull(WebsiteVersionChecker.buildFingerprint(null, "   "))
    }

    @Test
    fun rejectsNonHttpsUrlsBeforeOpeningNetworkConnection() {
        val result = WebsiteVersionChecker.fetchFingerprint("http://www.sskbusiness.com")
        assertFalse(result.reachable)
        assertNull(result.fingerprint)
    }
}
