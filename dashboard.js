// Global file data from backend
let studyFiles = [], labsFiles = [], syllabusFiles = [], testsFiles = [];
let isLoading = false;
let avatarData = null;

// File size formatter (same as original)
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Get file icon (same as original)
function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) return '🖼️';
    if (['pdf'].includes(ext)) return '📚';
    if (['txt'].includes(ext)) return '📄';
    if (['zip'].includes(ext)) return '📦';
    if (['doc','docx'].includes(ext)) return '📝';
    return '📎';
}

// Show loading state
function showLoading(container) {
    container.innerHTML = '<div class="loading">Loading files...</div>';
}

// Show error state
function showError(container, message = 'Failed to load files') {
    container.innerHTML = `<div class="error-state">${message}</div>`;
}

// Snackbar notification (same as original)
function showSnackbar(message) {
    const snackbar = document.getElementById("snackbar");
    if (snackbar) {
        snackbar.textContent = message;
        snackbar.classList.add("show");
        setTimeout(() => snackbar.classList.remove("show"), 3000);
    }
}

// Load all files from backend API
async function loadAllFiles() {
    isLoading = true;
    try {
        const [studyRes, labsRes, syllabusRes, testsRes] = await Promise.all([
            fetch('/api/files/study'),
            fetch('/api/files/labs'),
            fetch('/api/files/syllabus'),
            fetch('/api/files/tests')
        ]);
        
        studyFiles = await studyRes.json();
        labsFiles = await labsRes.json();
        syllabusFiles = await syllabusRes.json();
        testsFiles = await testsRes.json();
        
        renderAllSections();
    } catch (error) {
        console.error('Failed to load files:', error);
        showSnackbar('⚠️ Failed to load files from server');
        showError(document.getElementById('subjectsList'));
    } finally {
        isLoading = false;
    }
}

// Render files in grid (same as original)
function renderFiles(container, files, countElement) {
    container.innerHTML = "";
    if (countElement) countElement.textContent = files.length;
    
    if (files.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:rgba(255,255,255,0.6);">No files yet. Upload to get started! 📤</div>';
        return;
    }
    
    files.slice(0, 8).forEach((file, index) => {
        const div = document.createElement("div");
        div.className = "file-item";
        div.innerHTML = `
            <div class="file-icon">${getFileIcon(file.name)}</div>
            <div class="file-name">${file.name}</div>
            <div class="file-size">${formatFileSize(file.size)}</div>
            <button class="delete-btn" onclick="deleteFile('${container.id}', ${index}); event.stopPropagation();">🗑️</button>
        `;
        div.onclick = (e) => {
            if (e.target.classList.contains('delete-btn')) return;
            openFile(file);
        };
        container.appendChild(div);
    });
}

// Render all sections
function renderAllSections() {
    const subjectsList = document.getElementById("subjectsList");
    const labsList = document.getElementById("labsList");
    const syllabusList = document.getElementById("syllabusList");
    const testsList = document.getElementById("testsList");
    const studyCount = document.getElementById("studyCount");
    const labsCount = document.getElementById("labsCount");
    const syllabusCount = document.getElementById("syllabusCount");
    const testsCount = document.getElementById("testsCount");
    
    renderFiles(subjectsList, studyFiles, studyCount);
    renderFiles(labsList, labsFiles, labsCount);
    renderFiles(syllabusList, syllabusFiles, syllabusCount);
    renderFiles(testsList, testsFiles, testsCount);
}

// Global delete function (Backend API)
window.deleteFile = async function(containerId, index) {
    const files = getFilesForSection(containerId);
    const file = files[index];
    
    if (confirm(`Delete "${file.name}"?`)) {
        try {
            const response = await fetch(`/api/files/${file.id}`, { 
                method: 'DELETE' 
            });
            
            if (response.ok) {
                await loadAllFiles(); // Refresh all data
                showSnackbar("✅ File deleted successfully!");
            } else {
                showSnackbar("❌ Delete failed!");
            }
        } catch (error) {
            console.error('Delete failed:', error);
            showSnackbar("❌ Delete failed!");
        }
    }
};

// Get files array for specific section
function getFilesForSection(containerId) {
    switch(containerId) {
        case 'subjectsList': return studyFiles;
        case 'labsList': return labsFiles;
        case 'syllabusList': return syllabusFiles;
        case 'testsList': return testsFiles;
        default: return [];
    }
}

// Open file (Backend URL)
function openFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
        showImagePreview(file.data);
    } else if (ext === 'pdf') {
        window.open(file.data, '_blank');
        showSnackbar(`📚 "${file.name}" opened in new tab!`);
    } else {
        const a = document.createElement('a');
        a.href = file.data;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showSnackbar(`📥 "${file.name}" downloaded!`);
    }
}

// Image preview modal (same as original)
function showImagePreview(imageData) {
    let preview = document.getElementById('filePreview');
    preview.innerHTML = `
        <button id="previewClose">✕</button>
        <img src="${imageData}" alt="Preview">
    `;
    preview.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    preview.querySelector('#previewClose').addEventListener('click', () => {
        preview.style.display = 'none';
        document.body.style.overflow = 'auto';
    });
}

// Auto-categorize filename
function getCategoryFromFilename(filename) {
    const lower = filename.toLowerCase();
    if (lower.includes('lab') || lower.includes('practical')) return 'labs';
    if (lower.includes('syllabus') || lower.includes('syllabi')) return 'syllabus';
    if (lower.includes('test') || lower.includes('quiz') || lower.includes('exam')) return 'tests';
    return 'study';
}

// Upload file to backend
async function uploadFile(file, category = 'study') {
    if (!file || file.size > 15 * 1024 * 1024) {
        showSnackbar("❌ File too large (max 15MB)!");
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    try {
        showLoading(getContainerForCategory(category));
        const response = await fetch('/api/files/upload', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const fileData = await response.json();
            await loadAllFiles(); // Refresh data
            showSnackbar(`✅ "${file.name}" uploaded to ${category}!`);
        } else {
            const error = await response.json();
            showSnackbar(`❌ Upload failed: ${error.error}`);
        }
    } catch (error) {
        console.error('Upload failed:', error);
        showSnackbar('❌ Upload failed! Check console.');
    }
}

// Get container element for category
function getContainerForCategory(category) {
    switch(category) {
        case 'labs': return document.getElementById('labsList');
        case 'syllabus': return document.getElementById('syllabusList');
        case 'tests': return document.getElementById('testsList');
        default: return document.getElementById('subjectsList');
    }
}

// Section switching (same as original)
function showSection(sectionName) {
    const menuItems = document.querySelectorAll(".menu-item");
    const contentSections = document.querySelectorAll(".files-section");
    
    menuItems.forEach(item => item.classList.remove("active"));
    document.querySelector(`[data-section="${sectionName}"]`).classList.add("active");
    
    contentSections.forEach(section => {
        section.classList.toggle("active", section.id === `${sectionName}Section`);
    });
    
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Update avatar (localStorage fallback)
function updateAvatar(url) {
    const avatarHeader = document.getElementById("avatarHeader");
    const profileCenter = document.getElementById("profileCenter");
    if (avatarHeader) avatarHeader.src = url;
    if (profileCenter) profileCenter.src = url;
    localStorage.setItem("userAvatar", url);
}

// MAIN INITIALIZATION
window.addEventListener("DOMContentLoaded", async function () {
    // Elements
    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const mainContent = document.getElementById("mainContent");
    const menuItems = document.querySelectorAll(".menu-item");
    const welcomeMsg = document.getElementById("welcomeText");
    const logoutBtn = document.getElementById("logoutBtn");
    const homeBtn = document.getElementById("homeBtn");
    const imageUpload = document.getElementById("imageUpload");
    const fileUpload = document.getElementById("fileUpload");
    const labUpload = document.getElementById("labUpload");

    // Load avatar
    const storedAvatar = localStorage.getItem("userAvatar");
    if (storedAvatar) updateAvatar(storedAvatar);

    // Set welcome message
    if (welcomeMsg) {
        const username = localStorage.getItem("username") || "User";
        welcomeMsg.textContent = `Welcome ${username} to Study Dashboard 📚🌿`;
    }

    // Load files from backend
    showLoading(document.getElementById('subjectsList'));
    await loadAllFiles();

    // Menu clicks
    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            const section = item.getAttribute("data-section");
            showSection(section);
        });
    });

    // Mobile menu toggle
    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            sidebar.classList.toggle("active");
            mainContent.classList.toggle("expanded");
        });
    }

    // LAB-SPECIFIC UPLOAD
    if (labUpload) {
        labUpload.addEventListener("change", function(e) {
            const file = e.target.files[0];
            if (file) uploadFile(file, 'labs');
            labUpload.value = "";
        });
    }

    // GLOBAL UPLOAD (Auto-categorize)
    if (fileUpload) {
        fileUpload.addEventListener("change", function(e) {
            const file = e.target.files[0];
            if (file) {
                const category = getCategoryFromFilename(file.name);
                uploadFile(file, category);
            }
            fileUpload.value = "";
        });
    }

    // Profile image upload
    if (imageUpload) {
        imageUpload.addEventListener("change", function(e) {
            const file = e.target.files[0];
            if (!file || file.size > 5 * 1024 * 1024) {
                showSnackbar("❌ Profile image too large (max 5MB)!");
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                updateAvatar(e.target.result);
                showSnackbar("👤 Profile image set successfully!");
            };
            reader.readAsDataURL(file);
            imageUpload.value = "";
        });
    }

    // Event listeners
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("Logout? Profile image will be saved locally.")) {
                localStorage.removeItem("username");
                window.location.href = "/"; // Reload dashboard
            }
        });
    }

    if (homeBtn) {
        homeBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
});
