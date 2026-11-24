package com.sskbusiness.app.security

import java.net.URI
import java.util.Locale

object OriginGuard {

    /**
     * Validates that the currently loaded WebView URL uses HTTPS and matches
     * one of the configured trusted hostnames before exposing native contact APIs
     * or delivering contact payloads to JavaScript.
     */
    fun isTrustedBridgeUrl(url: String?, allowedHosts: Set<String>): Boolean {
        if (url.isNullOrBlank()) return false
        return try {
            val uri = URI(url.trim())
            val scheme = uri.scheme?.lowercase(Locale.US) ?: return false
            if (scheme != "https") return false

            val host = uri.host?.lowercase(Locale.US)?.trimEnd('.') ?: return false
            if (host.isEmpty()) return false

            val normalizedAllowlist = allowedHosts
                .map { it.lowercase(Locale.US).trim().trimEnd('.') }
                .filter { it.isNotEmpty() }
                .toSet()

            host in normalizedAllowlist
        } catch (_: Exception) {
            false
        }
    }
}
