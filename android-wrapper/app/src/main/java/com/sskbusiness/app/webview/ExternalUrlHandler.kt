package com.sskbusiness.app.webview

import java.net.URI
import java.util.Locale

enum class UrlRouteDecision {
    KEEP_IN_WEBVIEW,
    OPEN_DIAL_APP,
    OPEN_EMAIL_APP,
    OPEN_NATIVE_APP,
    OPEN_EXTERNAL_BROWSER,
    BLOCK
}

object ExternalUrlHandler {

    private val externalAppSchemes = setOf(
        "whatsapp",
        "upi",
        "sms",
        "smsto",
        "geo"
    )

    private val externalAppHosts = setOf(
        "wa.me",
        "api.whatsapp.com",
        "chat.whatsapp.com"
    )

    fun classifyUrl(url: String?, trustedHosts: Set<String>): UrlRouteDecision {
        if (url.isNullOrBlank()) return UrlRouteDecision.BLOCK

        return try {
            val uri = URI(url.trim())
            val scheme = uri.scheme?.lowercase(Locale.US) ?: return UrlRouteDecision.BLOCK

            when (scheme) {
                "tel" -> UrlRouteDecision.OPEN_DIAL_APP
                "mailto" -> UrlRouteDecision.OPEN_EMAIL_APP
                in externalAppSchemes -> UrlRouteDecision.OPEN_NATIVE_APP
                "https", "http" -> {
                    val host = uri.host?.lowercase(Locale.US)?.trimEnd('.') ?: return UrlRouteDecision.BLOCK
                    val normalizedTrusted = trustedHosts
                        .map { it.lowercase(Locale.US).trim().trimEnd('.') }
                        .toSet()

                    when {
                        scheme == "https" && host in normalizedTrusted -> UrlRouteDecision.KEEP_IN_WEBVIEW
                        host in externalAppHosts -> UrlRouteDecision.OPEN_NATIVE_APP
                        else -> UrlRouteDecision.OPEN_EXTERNAL_BROWSER
                    }
                }
                else -> UrlRouteDecision.BLOCK
            }
        } catch (_: Exception) {
            UrlRouteDecision.BLOCK
        }
    }
}
