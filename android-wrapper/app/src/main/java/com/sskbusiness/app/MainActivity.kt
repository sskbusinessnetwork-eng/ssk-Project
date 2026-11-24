package com.sskbusiness.app

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
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
import com.sskbusiness.app.bridge.AndroidContactBridge
import com.sskbusiness.app.contacts.ContactsPickerCoordinator
import com.sskbusiness.app.databinding.ActivityMainBinding
import com.sskbusiness.app.webview.ExternalUrlHandler
import com.sskbusiness.app.webview.UrlRouteDecision

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var contactsCoordinator: ContactsPickerCoordinator

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var lastBackPressTime = 0L

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

        contactsCoordinator = ContactsPickerCoordinator(
            activity = this,
            webView = binding.webView,
            allowedHosts = allowedHosts
        )

        configureWebView(binding.webView)
        setupSwipeRefresh()
        setupOfflineRetry()
        setupBackNavigation()

        if (savedInstanceState != null) {
            binding.webView.restoreState(savedInstanceState)
        } else {
            binding.webView.loadUrl(BuildConfig.PRODUCTION_URL)
        }
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
                binding.offlineOverlay.visibility = View.GONE
                binding.progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                binding.swipeRefresh.isRefreshing = false
                binding.progressBar.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
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

    private fun handleUrlNavigation(url: String?): Boolean {
        val decision = ExternalUrlHandler.classifyUrl(url, allowedHosts)
        val parsedUri = url?.let { runCatching { Uri.parse(it) }.getOrNull() }

        return when (decision) {
            UrlRouteDecision.KEEP_IN_WEBVIEW -> false
            UrlRouteDecision.OPEN_DIAL_APP -> {
                if (parsedUri != null) launchSafeIntent(Intent(Intent.ACTION_DIAL, parsedUri))
                true
            }
            UrlRouteDecision.OPEN_EMAIL_APP -> {
                if (parsedUri != null) launchSafeIntent(Intent(Intent.ACTION_SENDTO, parsedUri))
                true
            }
            UrlRouteDecision.OPEN_NATIVE_APP -> {
                if (parsedUri != null) launchSafeIntent(Intent(Intent.ACTION_VIEW, parsedUri))
                true
            }
            UrlRouteDecision.OPEN_EXTERNAL_BROWSER -> {
                if (parsedUri != null) openInCustomTab(parsedUri)
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
            binding.webView.reload()
        }
    }

    private fun setupOfflineRetry() {
        binding.retryButton.setOnClickListener {
            binding.offlineOverlay.visibility = View.GONE
            if (binding.webView.url.isNullOrBlank()) {
                binding.webView.loadUrl(BuildConfig.PRODUCTION_URL)
            } else {
                binding.webView.reload()
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
        fileUploadCallback?.onReceiveValue(null)
        fileUploadCallback = null
        binding.webView.removeJavascriptInterface(BRIDGE_NAME)
        contactsCoordinator.shutdown()
        binding.webView.destroy()
        super.onDestroy()
    }

    companion object {
        private const val BRIDGE_NAME = "AndroidContactPicker"
    }
}
