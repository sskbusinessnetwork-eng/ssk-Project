# Preserve JavaScript bridge annotations and methods in release R8 builds
-keepattributes *Annotation*
-keepclassmembers class com.sskbusiness.app.bridge.AndroidContactBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.sskbusiness.app.bridge.AndroidContactBridge { *; }
