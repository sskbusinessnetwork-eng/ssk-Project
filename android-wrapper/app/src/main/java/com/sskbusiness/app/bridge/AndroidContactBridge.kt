package com.sskbusiness.app.bridge

import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import com.sskbusiness.app.contacts.ContactsPickerCoordinator

/**
 * Native bridge exposed to WebView as `window.AndroidContactPicker`.
 * All requests run on the main thread and undergo strict HTTPS origin validation
 * inside ContactsPickerCoordinator before launching the Android Contacts picker.
 */
class AndroidContactBridge(
    private val coordinator: ContactsPickerCoordinator
) {
    private val mainHandler = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun pickContact() {
        mainHandler.post {
            coordinator.requestContactPick()
        }
    }

    @JavascriptInterface
    fun selectContact() {
        pickContact()
    }

    @JavascriptInterface
    fun openContactPicker() {
        pickContact()
    }
}
