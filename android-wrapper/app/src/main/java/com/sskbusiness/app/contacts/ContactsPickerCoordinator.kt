package com.sskbusiness.app.contacts

import android.Manifest
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ContentResolver
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.ContactsContract
import android.webkit.WebView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.sskbusiness.app.R
import com.sskbusiness.app.security.OriginGuard
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors

object ContactPayloadBuilder {
    fun success(name: String, phones: List<String>): JSONObject {
        val uniquePhones = phones.map { it.trim() }.filter { it.isNotEmpty() }.distinct()
        return JSONObject().apply {
            put("name", name.trim())
            put("phones", JSONArray(uniquePhones))
        }
    }

    fun cancelled(): JSONObject = JSONObject().put("cancelled", true)

    fun permissionDenied(): JSONObject = JSONObject().put("permissionDenied", true)

    fun error(code: String): JSONObject = JSONObject().put("error", code)
}

class ContactsPickerCoordinator(
    private val activity: ComponentActivity,
    private val webView: WebView,
    private val allowedHosts: Set<String>,
    private val onPickerFlowStarted: (() -> Unit)? = null
) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val ioExecutor = Executors.newSingleThreadExecutor()

    @Volatile
    private var isPickerActive = false

    private enum class PickMode {
        FULL_CONTACT,
        PHONE_ROW_ONLY
    }

    private var activePickMode: PickMode = PickMode.FULL_CONTACT

    private val contactPickerLauncher: ActivityResultLauncher<Intent> =
        activity.registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val modeUsed = activePickMode
            if (result.resultCode != Activity.RESULT_OK || result.data?.data == null) {
                isPickerActive = false
                deliverPayloadToWeb(ContactPayloadBuilder.cancelled())
                return@registerForActivityResult
            }

            val contactUri = result.data!!.data!!
            resolveContactAsync(contactUri, modeUsed)
        }

    private val permissionLauncher: ActivityResultLauncher<String> =
        activity.registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (!OriginGuard.isTrustedBridgeUrl(webView.url, allowedHosts)) {
                isPickerActive = false
                deliverPayloadToWeb(ContactPayloadBuilder.error("UNTRUSTED_ORIGIN"))
                return@registerForActivityResult
            }

            if (granted) {
                launchSystemPicker(PickMode.FULL_CONTACT)
            } else {
                // Fall back to direct Phone row picker which grants one-time URI access
                // on Android without needing persistent READ_CONTACTS permission.
                launchSystemPicker(PickMode.PHONE_ROW_ONLY)
            }
        }

    fun requestContactPick() {
        if (!OriginGuard.isTrustedBridgeUrl(webView.url, allowedHosts)) {
            deliverPayloadToWeb(ContactPayloadBuilder.error("UNTRUSTED_ORIGIN"))
            return
        }

        if (isPickerActive) return
        isPickerActive = true
        onPickerFlowStarted?.invoke()

        val hasContactsPermission = ContextCompat.checkSelfPermission(
            activity,
            Manifest.permission.READ_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED

        if (hasContactsPermission) {
            launchSystemPicker(PickMode.FULL_CONTACT)
        } else {
            permissionLauncher.launch(Manifest.permission.READ_CONTACTS)
        }
    }

    private fun launchSystemPicker(mode: PickMode) {
        activePickMode = mode
        onPickerFlowStarted?.invoke()
        val intent = when (mode) {
            PickMode.FULL_CONTACT ->
                Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI)
            PickMode.PHONE_ROW_ONLY ->
                Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI)
        }

        try {
            contactPickerLauncher.launch(intent)
        } catch (_: ActivityNotFoundException) {
            isPickerActive = false
            Toast.makeText(activity, R.string.no_contact_app_found, Toast.LENGTH_SHORT).show()
            deliverPayloadToWeb(ContactPayloadBuilder.error("NO_CONTACTS_APP"))
        } catch (_: SecurityException) {
            isPickerActive = false
            deliverPayloadToWeb(ContactPayloadBuilder.permissionDenied())
        }
    }

    private fun resolveContactAsync(uri: Uri, mode: PickMode) {
        val resolver = activity.contentResolver
        ioExecutor.execute {
            val payload = try {
                when (mode) {
                    PickMode.FULL_CONTACT -> readFullContact(resolver, uri)
                    PickMode.PHONE_ROW_ONLY -> readPhoneRow(resolver, uri)
                }
            } catch (_: SecurityException) {
                ContactPayloadBuilder.permissionDenied()
            } catch (_: Exception) {
                ContactPayloadBuilder.error("CONTACT_READ_FAILED")
            }

            mainHandler.post {
                isPickerActive = false
                deliverPayloadToWeb(payload)
            }
        }
    }

    private fun readFullContact(resolver: ContentResolver, contactUri: Uri): JSONObject {
        var contactId: String? = null
        var displayName = ""
        val phones = linkedSetOf<String>()

        resolver.query(
            contactUri,
            arrayOf(ContactsContract.Contacts._ID, ContactsContract.Contacts.DISPLAY_NAME),
            null,
            null,
            null
        )?.use { cursor ->
            if (cursor.moveToFirst()) {
                val idIdx = cursor.getColumnIndex(ContactsContract.Contacts._ID)
                val nameIdx = cursor.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME)
                if (idIdx >= 0) contactId = cursor.getString(idIdx)
                if (nameIdx >= 0) displayName = cursor.getString(nameIdx) ?: ""
            }
        }

        if (!contactId.isNullOrBlank()) {
            queryPhonesByContactId(resolver, contactId!!, phones)
        }

        return ContactPayloadBuilder.success(displayName, phones.toList())
    }

    private fun readPhoneRow(resolver: ContentResolver, phoneUri: Uri): JSONObject {
        var contactId: String? = null
        var displayName = ""
        val phones = linkedSetOf<String>()

        resolver.query(
            phoneUri,
            arrayOf(
                ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER
            ),
            null,
            null,
            null
        )?.use { cursor ->
            if (cursor.moveToFirst()) {
                val idIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.CONTACT_ID)
                val nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                val numIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                if (idIdx >= 0) contactId = cursor.getString(idIdx)
                if (nameIdx >= 0) displayName = cursor.getString(nameIdx) ?: ""
                if (numIdx >= 0) {
                    cursor.getString(numIdx)?.takeIf { it.isNotBlank() }?.let { phones.add(it) }
                }
            }
        }

        // If READ_CONTACTS was granted later or accessible, gather sibling numbers too.
        if (!contactId.isNullOrBlank() && ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.READ_CONTACTS
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            try {
                queryPhonesByContactId(resolver, contactId!!, phones)
            } catch (_: SecurityException) {
                // Keep the single picked phone row cleanly.
            }
        }

        return ContactPayloadBuilder.success(displayName, phones.toList())
    }

    private fun queryPhonesByContactId(
        resolver: ContentResolver,
        contactId: String,
        target: MutableSet<String>
    ) {
        resolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
            arrayOf(ContactsContract.CommonDataKinds.Phone.NUMBER),
            "${ContactsContract.CommonDataKinds.Phone.CONTACT_ID} = ?",
            arrayOf(contactId),
            null
        )?.use { phoneCursor ->
            val numIdx = phoneCursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
            while (phoneCursor.moveToNext()) {
                if (numIdx >= 0) {
                    phoneCursor.getString(numIdx)?.takeIf { it.isNotBlank() }?.let { target.add(it) }
                }
            }
        }
    }

    private fun deliverPayloadToWeb(payload: JSONObject) {
        if (!OriginGuard.isTrustedBridgeUrl(webView.url, allowedHosts)) {
            return
        }
        val escapedJsonString = JSONObject.quote(payload.toString())
            .replace("\u2028", "\\u2028")
            .replace("\u2029", "\\u2029")
        webView.evaluateJavascript(
            "window.__sskReceiveNativeContact && window.__sskReceiveNativeContact($escapedJsonString);",
            null
        )
    }

    fun isPickerInFlight(): Boolean = isPickerActive

    fun shutdown() {
        ioExecutor.shutdownNow()
    }
}
