package com.sskbusiness.app.webview

import java.net.HttpURLConnection
import java.net.URL

data class VersionCheckResult(
    val fingerprint: String?,
    val reachable: Boolean
)

/**
 * Performs a lightweight cache-bypassing HEAD check against the trusted production URL
 * to detect newly deployed HTML/JS/CSS/logo versions without disabling WebView caching globally.
 */
object WebsiteVersionChecker {

    fun buildFingerprint(etag: String?, lastModified: String?): String? {
        val cleanEtag = etag?.trim().orEmpty()
        val cleanLastModified = lastModified?.trim().orEmpty()
        if (cleanEtag.isEmpty() && cleanLastModified.isEmpty()) {
            return null
        }
        return "etag=$cleanEtag|lm=$cleanLastModified"
    }

    fun fetchFingerprint(urlString: String, timeoutMs: Int = DEFAULT_TIMEOUT_MS): VersionCheckResult {
        if (!urlString.startsWith("https://", ignoreCase = true)) {
            return VersionCheckResult(fingerprint = null, reachable = false)
        }

        return try {
            val headResult = requestHeaders(urlString, method = "HEAD", timeoutMs = timeoutMs)
            if (headResult.statusCode == HttpURLConnection.HTTP_BAD_METHOD ||
                headResult.statusCode == HttpURLConnection.HTTP_NOT_IMPLEMENTED
            ) {
                val getResult = requestHeaders(urlString, method = "GET", timeoutMs = timeoutMs)
                VersionCheckResult(
                    fingerprint = getResult.fingerprint,
                    reachable = getResult.statusCode in 200..399
                )
            } else {
                VersionCheckResult(
                    fingerprint = headResult.fingerprint,
                    reachable = headResult.statusCode in 200..399
                )
            }
        } catch (_: Exception) {
            VersionCheckResult(fingerprint = null, reachable = false)
        }
    }

    private data class HeaderResponse(
        val statusCode: Int,
        val fingerprint: String?
    )

    private fun requestHeaders(
        urlString: String,
        method: String,
        timeoutMs: Int
    ): HeaderResponse {
        val connection = (URL(urlString).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            instanceFollowRedirects = true
            useCaches = false
            connectTimeout = timeoutMs
            readTimeout = timeoutMs
            setRequestProperty("Cache-Control", "no-cache, no-store, must-revalidate")
            setRequestProperty("Pragma", "no-cache")
        }

        return try {
            val statusCode = connection.responseCode
            val fingerprint = buildFingerprint(
                etag = connection.getHeaderField("ETag"),
                lastModified = connection.getHeaderField("Last-Modified")
            )
            HeaderResponse(statusCode = statusCode, fingerprint = fingerprint)
        } finally {
            connection.disconnect()
        }
    }

    private const val DEFAULT_TIMEOUT_MS = 4_000
}
