document.addEventListener("DOMContentLoaded", function () {
    // Elements
    const dashboard = document.getElementById("dashboard");
    const loginForm = document.getElementById("loginForm");
    const snackbar = document.getElementById("snackbar");
    const welcomeText = document.getElementById("welcomeText");
    const logoutBtn = document.getElementById("logoutBtn");
    const homeBtn = document.getElementById("homeBtn");
    const flashSnackbar = document.getElementById("flashSnackbar");

    // Flask session handling (NO sessionStorage needed)
    const usernameStored = sessionStorage.getItem("username"); // Fallback only

    // SNACKBAR UTILITY (shared)
    function showSnackbar(message) {
        if (snackbar) {
            snackbar.textContent = message;
            snackbar.classList.add("show");
            setTimeout(() => snackbar.classList.remove("show"), 3000);
        }
    }

    // AUTO-HIDE FLASH MESSAGES
    if (flashSnackbar) {
        setTimeout(() => flashSnackbar.classList.remove("show"), 3000);
    }

    // DASHBOARD LOGIC (dashboard.html)
    if (dashboard) {
        // Flask handles auth - no redirect needed
        if (welcomeText) {
            // Use Flask-passed username OR sessionStorage fallback
            const username = "{{ session.get('username', usernameStored or 'User') }}";
            welcomeText.innerText = `Welcome to Dashboard, ${username} 🎉🌿`;
        }

        // Show welcome snackbar
        showSnackbar("Welcome back! Files loaded from database 💾");

        // Logout (Flask route)
        if (logoutBtn) {
            logoutBtn.addEventListener("click", function () {
                sessionStorage.clear();
                window.location.href = "/logout"; // Flask logout route
            });
        }

        // Home scroll
        if (homeBtn) {
            homeBtn.addEventListener("click", function () {
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }
        return;
    }

    // LOGIN LOGIC (index.html) - HYBRID APPROACH
    if (loginForm) {
        // If already logged in (fallback), go to dashboard
        if (usernameStored) {
            window.location.href = "/dashboard";
            return;
        }

        loginForm.addEventListener("submit", function (event) {
            // Let Flask handle form submission normally (POST to /)
            showSnackbar("Logging in... 🔄");
            // NO preventDefault() - Flask will handle authentication
        });
    }
});
