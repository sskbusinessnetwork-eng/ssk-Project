package com.sskbusiness.app

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Message
import android.view.View
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.Lifecycle
import com.sskbusiness.app.bridge.AndroidContactBridge
import com.sskbusiness.app.contacts.ContactsPickerCoordinator
import com.sskbusiness.app.databinding.ActivityMainBinding
import com.sskbusiness.app.security.OriginGuard
import com.sskbusiness.app.webview.CacheStrategy
import com.sskbusiness.app.webview.ExternalUrlHandler
import com.sskbusiness.app.webview.NetworkStatusHelper
import com.sskbusiness.app.webview.RefreshDecision
import com.sskbusiness.app.webview.UrlRouteDecision
import com.sskbusiness.app.webview.WebViewRefreshPolicy
import com.sskbusiness.app.webview.WebsiteVersionChecker
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var contactsCoordinator: ContactsPickerCoordinator
    private lateinit var refreshPolicy: WebViewRefreshPolicy

    private val versionCheckExecutor = Executors.newSingleThreadExecutor()
    private val cachePrefs by lazy {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var lastBackPressTime = 0L
    private var isPageLoading = false
    private var hasMainFrameError = false

    @Volatile
    private var isActivityDestroyed = false

    private val allowedHosts: Set<String> by lazy {
        BuildConfig.ALLOWED_BRIDGE_HOSTS.toSet()
    }

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = fileUploadCallback ?: return@registerForActivityResult
            fileUploadCallback = null

            val uris = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            callback.onReceiveValue(uris)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        applySystemBarInsets()

        val savedFingerprint = cachePrefs.getString(KEY_WEBSITE_VERSION_FINGERPRINT, null)
        refreshPolicy = WebViewRefreshPolicy(initialVersionFingerprint = savedFingerprint)

        contactsCoordinator = ContactsPickerCoordinator(
            activity = this,
            webView = binding.webView,
            allowedHosts = allowedHosts,
            onPickerFlowStarted = {
                refreshPolicy.suppressNextForegroundRefresh()
            }
        )

        configureWebView(binding.webView)
        setupSwipeRefresh()
        setupOfflineRetry()
        setupBackNavigation()

        val isOnline = NetworkStatusHelper.isNetworkAvailable(this)
        applyCacheModeForConnectivity(isOnline)

        if (savedInstanceState != null) {
            binding.webView.restoreState(savedInstanceState)
            refreshPolicy.markInitialLoad()
        } else {
            loadInitialProductionUrl(isOnline)
        }
    }

    override fun onResume() {
        super.onResume()
        binding.webView.onResume()
        binding.webView.resumeTimers()

        val wasInBackground = refreshPolicy.consumePendingBackgroundState()
        val wasSuppressed = refreshPolicy.consumeResumeSuppression()
        val isOnline = NetworkStatusHelper.isNetworkAvailable(this)
        applyCacheModeForConnectivity(isOnline)

        if (!wasInBackground) {
            return
        }

        if (wasSuppressed || contactsCoordinator.isPickerInFlight() || fileUploadCallback != null) {
            return
        }

        if (!isOnline) {
            return
        }

        if (binding.offlineOverlay.visibility == View.VISIBLE) {
            val now = System.currentTimeMillis()
            if (refreshPolicy.canTriggerCooldownRefresh(now)) {
                refreshPolicy.markRefreshTriggered(now)
                binding.offlineOverlay.visibility = View.GONE
                loadInitialProductionUrl(isOnline = true)
            }
            return
        }

        val currentUrl = binding.webView.url
        val isTrustedUrl = OriginGuard.isTrustedBridgeUrl(currentUrl, allowedHosts)
        if (!isTrustedUrl || isPageLoading) {
            return
        }

        checkAndRefreshOnReopen()
    }

    override fun onPause() {
        binding.webView.onPause()
        super.onPause()
    }

    override fun onStop() {
        refreshPolicy.onEnterBackground(System.currentTimeMillis())
        super.onStop()
    }

    private fun applySystemBarInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(binding.rootContainer) { view, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime()
            )
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView(webView: WebView) {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.loadsImagesAutomatically = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.setSupportMultipleWindows(true)
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        // Security hardening
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.safeBrowsingEnabled = true
        }
        settings.userAgentString = "${settings.userAgentString} SSKAndroidApp/${BuildConfig.VERSION_NAME}"

        webView.addJavascriptInterface(
            AndroidContactBridge(contactsCoordinator),
            BRIDGE_NAME
        )

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString()
                return handleUrlNavigation(url)
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                isPageLoading = true
                hasMainFrameError = false
                binding.offlineOverlay.visibility = View.GONE
                binding.progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                isPageLoading = false
                binding.swipeRefresh.isRefreshing = false
                binding.progressBar.visibility = View.GONE
                if (!hasMainFrameError && OriginGuard.isTrustedBridgeUrl(url, allowedHosts)) {
                    triggerServiceWorkerUpdateCheck(view)
                    if (NetworkStatusHelper.isNetworkAvailable(this@MainActivity)) {
                        checkColdStartVersionUpdate()
                    }
                }
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    isPageLoading = false
                    hasMainFrameError = true
                    binding.swipeRefresh.isRefreshing = false
                    binding.progressBar.visibility = View.GONE
                    binding.offlineOverlay.visibility = View.VISIBLE
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                binding.progressBar.progress = newProgress
                if (newProgress >= 100) {
                    binding.progressBar.visibility = View.GONE
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileUploadCallback?.onReceiveValue(null)
                fileUploadCallback = filePathCallback

                return try {
                    refreshPolicy.suppressNextForegroundRefresh()
                    val chooserIntent = fileChooserParams?.createIntent()
                        ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                            addCategory(Intent.CATEGORY_OPENABLE)
                            type = "*/*"
                        }
                    fileChooserLauncher.launch(chooserIntent)
                    true
                } catch (_: Exception) {
                    fileUploadCallback?.onReceiveValue(null)
                    fileUploadCallback = null
                    false
                }
            }

            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message?
            ): Boolean {
                val hitResult = view?.hitTestResult
                val targetUrl = hitResult?.extra
                if (!targetUrl.isNullOrBlank()) {
                    handleUrlNavigation(targetUrl)
                }
                return false
            }
        }
    }

    private fun applyCacheModeForConnectivity(isOnline: Boolean) {
        val strategy = refreshPolicy.recommendedCacheStrategy(isOnline)
        binding.webView.settings.cacheMode = when (strategy) {
            CacheStrategy.DEFAULT_REVALIDATE -> WebSettings.LOAD_DEFAULT
            CacheStrategy.OFFLINE_CACHE_FALLBACK -> WebSettings.LOAD_CACHE_ELSE_NETWORK
        }
    }

    private fun loadInitialProductionUrl(isOnline: Boolean) {
        applyCacheModeForConnectivity(isOnline)
        refreshPolicy.markInitialLoad()
        if (isOnline) {
            binding.webView.loadUrl(BuildConfig.PRODUCTION_URL, REVALIDATE_HTML_HEADERS)
        } else {
            binding.webView.loadUrl(BuildConfig.PRODUCTION_URL)
        }
    }

    private fun checkColdStartVersionUpdate() {
        if (!refreshPolicy.shouldRunColdStartCheck()) return
        versionCheckExecutor.execute {
            val result = WebsiteVersionChecker.fetchFingerprint(BuildConfig.PRODUCTION_URL)
            if (isActivityDestroyed || !result.reachable) return@execute

            runOnUiThread {
                if (isActivityDestroyed || isFinishing || isDestroyed) return@runOnUiThread
                if (!lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) return@runOnUiThread

                val versionChanged = refreshPolicy.recordVersionFingerprint(result.fingerprint)
                persistVersionFingerprint(refreshPolicy.currentVersionFingerprint())

                val decision = refreshPolicy.evaluateColdStartUpdate(
                    nowMs = System.currentTimeMillis(),
                    isOnline = NetworkStatusHelper.isNetworkAvailable(this),
                    isPickerInFlight = contactsCoordinator.isPickerInFlight() || fileUploadCallback != null,
                    isTrustedUrl = OriginGuard.isTrustedBridgeUrl(binding.webView.url, allowedHosts),
                    isOfflineOverlayVisible = binding.offlineOverlay.visibility == View.VISIBLE,
                    versionChanged = versionChanged
                )
                executeRefreshDecision(decision)
            }
        }
    }

    private fun checkAndRefreshOnReopen() {
        versionCheckExecutor.execute {
            val result = WebsiteVersionChecker.fetchFingerprint(BuildConfig.PRODUCTION_URL)
            if (isActivityDestroyed) return@execute

            runOnUiThread {
                if (isActivityDestroyed || isFinishing || isDestroyed) return@runOnUiThread
                if (!lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)) return@runOnUiThread

                val versionChanged = if (result.reachable) {
                    val changed = refreshPolicy.recordVersionFingerprint(result.fingerprint)
                    persistVersionFingerprint(refreshPolicy.currentVersionFingerprint())
                    changed
                } else {
                    false
                }

                val decision = refreshPolicy.evaluateResumeRefresh(
                    nowMs = System.currentTimeMillis(),
                    wasInBackground = true,
                    wasSuppressed = false,
                    isOnline = NetworkStatusHelper.isNetworkAvailable(this),
                    isPageLoading = isPageLoading,
                    isPickerInFlight = contactsCoordinator.isPickerInFlight() || fileUploadCallback != null,
                    isTrustedUrl = OriginGuard.isTrustedBridgeUrl(binding.webView.url, allowedHosts),
                    isOfflineOverlayVisible = binding.offlineOverlay.visibility == View.VISIBLE,
                    versionChanged = versionChanged,
                    hasVersionFingerprint = !result.fingerprint.isNullOrBlank()
                )
                executeRefreshDecision(decision)
            }
        }
    }

    private fun executeRefreshDecision(decision: RefreshDecision) {
        when (decision) {
            RefreshDecision.NONE -> return
            RefreshDecision.RELOAD_WITH_CACHE_CLEAR -> {
                refreshPolicy.markRefreshTriggered(System.currentTimeMillis())
                binding.webView.settings.cacheMode = WebSettings.LOAD_DEFAULT
                binding.webView.clearCache(true)
                reloadTrustedPage()
            }
            RefreshDecision.RELOAD_VALIDATE_CACHE -> {
                refreshPolicy.markRefreshTriggered(System.currentTimeMillis())
                binding.webView.settings.cacheMode = WebSettings.LOAD_DEFAULT
                binding.webView.clearCache(false)
                reloadTrustedPage()
            }
        }
    }

    private fun reloadTrustedPage() {
        val currentUrl = binding.webView.url
        if (OriginGuard.isTrustedBridgeUrl(currentUrl, allowedHosts)) {
            binding.webView.reload()
        } else {
            binding.webView.loadUrl(BuildConfig.PRODUCTION_URL, REVALIDATE_HTML_HEADERS)
        }
    }

    private fun persistVersionFingerprint(fingerprint: String?) {
        if (fingerprint.isNullOrBlank()) return
        cachePrefs.edit().putString(KEY_WEBSITE_VERSION_FINGERPRINT, fingerprint).apply()
    }

    private fun triggerServiceWorkerUpdateCheck(webView: WebView?) {
        val targetView = webView ?: return
        if (!OriginGuard.isTrustedBridgeUrl(targetView.url, allowedHosts)) return
        targetView.evaluateJavascript(
            "if (window.navigator && navigator.serviceWorker && navigator.serviceWorker.getRegistrations) { navigator.serviceWorker.getRegistrations().then(function(regs) { for (var i = 0; i < regs.length; i++) { regs[i].update(); } }); }",
            null
        )
    }

    private fun handleUrlNavigation(url: String?): Boolean {
        val decision = ExternalUrlHandler.classifyUrl(url, allowedHosts)
        val parsedUri = url?.let { runCatching { Uri.parse(it) }.getOrNull() }

        return when (decision) {
            UrlRouteDecision.KEEP_IN_WEBVIEW -> false
            UrlRouteDecision.OPEN_DIAL_APP -> {
                if (parsedUri != null) {
                    refreshPolicy.suppressNextForegroundRefresh()
                    launchSafeIntent(Intent(Intent.ACTION_DIAL, parsedUri))
                }
                true
            }
            UrlRouteDecision.OPEN_EMAIL_APP -> {
                if (parsedUri != null) {
                    refreshPolicy.suppressNextForegroundRefresh()
                    launchSafeIntent(Intent(Intent.ACTION_SENDTO, parsedUri))
                }
                true
            }
            UrlRouteDecision.OPEN_NATIVE_APP -> {
                if (parsedUri != null) {
                    refreshPolicy.suppressNextForegroundRefresh()
                    launchSafeIntent(Intent(Intent.ACTION_VIEW, parsedUri))
                }
                true
            }
            UrlRouteDecision.OPEN_EXTERNAL_BROWSER -> {
                if (parsedUri != null) {
                    refreshPolicy.suppressNextForegroundRefresh()
                    openInCustomTab(parsedUri)
                }
                true
            }
            UrlRouteDecision.BLOCK -> true
        }
    }

    private fun launchSafeIntent(intent: Intent) {
        try {
            startActivity(intent)
        } catch (_: ActivityNotFoundException) {
            // Silently ignore if no matching Android app is installed
        }
    }

    private fun openInCustomTab(uri: Uri) {
        try {
            val customTabsIntent = CustomTabsIntent.Builder()
                .setShowTitle(true)
                .build()
            customTabsIntent.launchUrl(this, uri)
        } catch (_: Exception) {
            launchSafeIntent(Intent(Intent.ACTION_VIEW, uri))
        }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.setColorSchemeResources(R.color.ssk_primary)
        binding.swipeRefresh.setOnChildScrollUpCallback { _, _ ->
            binding.webView.scrollY > 0
        }
        binding.swipeRefresh.setOnRefreshListener {
            val isOnline = NetworkStatusHelper.isNetworkAvailable(this)
            if (!isOnline) {
                binding.swipeRefresh.isRefreshing = false
                Toast.makeText(this, R.string.offline_refresh_unavailable, Toast.LENGTH_SHORT).show()
                return@setOnRefreshListener
            }

            refreshPolicy.markRefreshTriggered(System.currentTimeMillis())
            binding.webView.settings.cacheMode = WebSettings.LOAD_DEFAULT
            binding.webView.clearCache(false)
            reloadTrustedPage()
        }
    }

    private fun setupOfflineRetry() {
        binding.retryButton.setOnClickListener {
            val isOnline = NetworkStatusHelper.isNetworkAvailable(this)
            if (!isOnline) {
                Toast.makeText(this, R.string.offline_refresh_unavailable, Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            refreshPolicy.markRefreshTriggered(System.currentTimeMillis())
            applyCacheModeForConnectivity(isOnline = true)
            binding.offlineOverlay.visibility = View.GONE
            if (OriginGuard.isTrustedBridgeUrl(binding.webView.url, allowedHosts)) {
                binding.webView.reload()
            } else {
                binding.webView.loadUrl(BuildConfig.PRODUCTION_URL, REVALIDATE_HTML_HEADERS)
            }
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.webView.canGoBack()) {
                    binding.webView.goBack()
                    return
                }
                val now = System.currentTimeMillis()
                if (now - lastBackPressTime < 2000L) {
                    finish()
                } else {
                    lastBackPressTime = now
                    Toast.makeText(
                        this@MainActivity,
                        R.string.press_back_again_to_exit,
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        binding.webView.saveState(outState)
    }

    override fun onDestroy() {
        isActivityDestroyed = true
        fileUploadCallback?.onReceiveValue(null)
        fileUploadCallback = null
        versionCheckExecutor.shutdownNow()
        binding.webView.removeJavascriptInterface(BRIDGE_NAME)
        contactsCoordinator.shutdown()
        binding.webView.destroy()
        super.onDestroy()
    }

    companion object {
        private const val BRIDGE_NAME = "AndroidContactPicker"
        private const val PREFS_NAME = "ssk_webview_cache"
        private const val KEY_WEBSITE_VERSION_FINGERPRINT = "website_version_fingerprint"
        private val REVALIDATE_HTML_HEADERS = mapOf("Cache-Control" to "no-cache")
    }
}
