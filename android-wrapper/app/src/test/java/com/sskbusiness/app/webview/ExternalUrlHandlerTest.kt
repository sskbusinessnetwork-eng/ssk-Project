package com.sskbusiness.app.webview

import org.junit.Assert.assertEquals
import org.junit.Test

class ExternalUrlHandlerTest {

    private val trustedHosts = setOf("www.sskbusiness.com", "sskbusiness.com")

    @Test
    fun keepsTrustedHttpsInWebView() {
        assertEquals(
            UrlRouteDecision.KEEP_IN_WEBVIEW,
            ExternalUrlHandler.classifyUrl("https://www.sskbusiness.com/referrals", trustedHosts)
        )
    }

    @Test
    fun routesDialEmailWhatsappAndUpiToNativeApps() {
        assertEquals(
            UrlRouteDecision.OPEN_DIAL_APP,
            ExternalUrlHandler.classifyUrl("tel:+919876543210", trustedHosts)
        )
        assertEquals(
            UrlRouteDecision.OPEN_EMAIL_APP,
            ExternalUrlHandler.classifyUrl("mailto:sskbusinessnetwork@gmail.com", trustedHosts)
        )
        assertEquals(
            UrlRouteDecision.OPEN_NATIVE_APP,
            ExternalUrlHandler.classifyUrl("https://wa.me/919876543210", trustedHosts)
        )
        assertEquals(
            UrlRouteDecision.OPEN_NATIVE_APP,
            ExternalUrlHandler.classifyUrl("upi://pay?pa=test@upi", trustedHosts)
        )
    }

    @Test
    fun routesUntrustedHttpsExternallyAndBlocksUnknownSchemes() {
        assertEquals(
            UrlRouteDecision.OPEN_EXTERNAL_BROWSER,
            ExternalUrlHandler.classifyUrl("https://example.com/terms", trustedHosts)
        )
        assertEquals(
            UrlRouteDecision.BLOCK,
            ExternalUrlHandler.classifyUrl("javascript:void(0)", trustedHosts)
        )
    }
}
