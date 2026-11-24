package com.sskbusiness.app.contacts

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ContactPayloadBuilderTest {

    @Test
    fun buildsDeduplicatedMultiPhonePayloadPreservingOrder() {
        val json = ContactPayloadBuilder.success(
            name = "  Ramesh Sharma  ",
            phones = listOf("+91 98765 43210", "", "+91 98765 43210", "022-24567890")
        )
        assertEquals("Ramesh Sharma", json.getString("name"))
        val phones = json.getJSONArray("phones")
        assertEquals(2, phones.length())
        assertEquals("+91 98765 43210", phones.getString(0))
        assertEquals("022-24567890", phones.getString(1))
    }

    @Test
    fun buildsCancellationAndPermissionDeniedPayloads() {
        assertTrue(ContactPayloadBuilder.cancelled().getBoolean("cancelled"))
        assertTrue(ContactPayloadBuilder.permissionDenied().getBoolean("permissionDenied"))
        assertEquals("UNTRUSTED_ORIGIN", ContactPayloadBuilder.error("UNTRUSTED_ORIGIN").getString("error"))
    }
}
