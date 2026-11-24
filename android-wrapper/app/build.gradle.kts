plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.sskbusiness.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.sskbusiness.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "PRODUCTION_URL", "\"https://www.sskbusiness.com\"")
        buildConfigField(
            "String[]",
            "ALLOWED_BRIDGE_HOSTS",
            "new String[]{\"www.sskbusiness.com\", \"sskbusiness.com\"}"
        )
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            buildConfigField(
                "String[]",
                "ALLOWED_BRIDGE_HOSTS",
                "new String[]{\"www.sskbusiness.com\", \"sskbusiness.com\", \"ais-pre-og3iw2rmrcll6uvw2j7olh-373525964172.asia-southeast1.run.app\", \"ais-dev-og3iw2rmrcll6uvw2j7olh-373525964172.asia-southeast1.run.app\"}"
            )
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.swiperefreshlayout:swiperefreshlayout:1.1.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.browser:browser:1.8.0")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
