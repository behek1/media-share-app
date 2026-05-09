document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const mediaInput = document.getElementById('media-input');
    const uploadForm = document.getElementById('upload-form');
    const submitBtn = document.getElementById('submit-btn');
    const messageEl = document.getElementById('message');
    
    const filePreview = document.getElementById('file-preview');
    const previewFilename = document.getElementById('preview-filename');
    const removeBtn = document.getElementById('remove-btn');
    
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    
    const galleryGrid = document.getElementById('gallery-grid');
    const galleryLoader = document.getElementById('gallery-loader');
    const emptyState = document.getElementById('empty-state');
    const refreshBtn = document.getElementById('refresh-btn');

    let currentFile = null;

    // Fetch initial files
    loadFiles();

    // Drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
    });

    dropArea.addEventListener('drop', handleDrop, false);
    dropArea.addEventListener('click', () => mediaInput.click());

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    mediaInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            currentFile = files[0];
            showPreview(currentFile);
            submitBtn.disabled = false;
            messageEl.textContent = '';
        }
    }

    function showPreview(file) {
        previewFilename.textContent = file.name;
        
        // Icon change based on type
        const iconEl = filePreview.querySelector('.preview-icon');
        if (file.type.startsWith('video/')) {
            iconEl.className = 'fa-solid fa-film preview-icon';
        } else {
            iconEl.className = 'fa-solid fa-image preview-icon';
        }
        
        filePreview.style.display = 'flex';
        dropArea.style.display = 'none';
    }

    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetUpload();
    });

    function resetUpload() {
        currentFile = null;
        mediaInput.value = '';
        filePreview.style.display = 'none';
        dropArea.style.display = 'block';
        submitBtn.disabled = true;
        progressContainer.style.display = 'none';
        progressBar.style.width = '0%';
    }

    // Form submission
    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!currentFile) return;

        const formData = new FormData();
        formData.append('media', currentFile);

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yükleniyor...';
        progressContainer.style.display = 'block';
        messageEl.textContent = '';

        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
            }
        });

        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                
                messageEl.textContent = response.msg;
                messageEl.className = 'msg-success';
                
                setTimeout(() => {
                    resetUpload();
                    submitBtn.innerHTML = '<span>Yükle</span> <i class="fa-solid fa-arrow-up"></i>';
                    messageEl.textContent = '';
                    loadFiles(); // Yükleme sonrası galeriyi güncelle
                }, 2000);
            } else {
                let errorMsg = 'Yükleme sırasında bir hata oluştu.';
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.msg) errorMsg = response.msg;
                } catch(e) {}
                
                messageEl.textContent = errorMsg;
                messageEl.className = 'msg-error';
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Yükle</span> <i class="fa-solid fa-arrow-up"></i>';
                progressContainer.style.display = 'none';
            }
        };

        xhr.onerror = function() {
            messageEl.textContent = 'Sunucuya bağlanılamadı.';
            messageEl.className = 'msg-error';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Yükle</span> <i class="fa-solid fa-arrow-up"></i>';
            progressContainer.style.display = 'none';
        };

        xhr.open('POST', '/upload', true);
        xhr.send(formData);
    });

    // Load gallery files
    refreshBtn.addEventListener('click', loadFiles);

    function loadFiles() {
        galleryLoader.style.display = 'block';
        galleryGrid.innerHTML = '';
        emptyState.style.display = 'none';
        
        // Add spin animation to button
        refreshBtn.querySelector('i').classList.add('fa-spin');

        fetch('/files')
            .then(response => response.json())
            .then(data => {
                galleryLoader.style.display = 'none';
                refreshBtn.querySelector('i').classList.remove('fa-spin');
                
                const filesList = Array.isArray(data) ? data : data.files;
                const isAdmin = !Array.isArray(data) ? data.isAdmin : false;
                
                if (isAdmin) {
                    document.querySelector('header h1').innerHTML = 'Medya <span style="color: #ef4444;">Admin</span>';
                    document.querySelector('.glass-panel').style.borderColor = 'rgba(239, 68, 68, 0.5)';
                }
                
                if (!filesList || filesList.length === 0) {
                    emptyState.style.display = 'block';
                    return;
                }
                
                filesList.forEach(file => {
                    const item = createMediaElement(file);
                    galleryGrid.appendChild(item);
                });
            })
            .catch(error => {
                console.error('Error fetching files:', error);
                galleryLoader.style.display = 'none';
                refreshBtn.querySelector('i').classList.remove('fa-spin');
            });
    }

    function createMediaElement(file) {
        const div = document.createElement('div');
        div.className = 'media-item';
        
        let previewHtml = '';
        if (file.isVideo) {
            previewHtml = `
                <div class="media-preview">
                    <video src="${file.url}" muted></video>
                    <i class="fa-solid fa-play video-icon"></i>
                </div>
            `;
        } else {
            previewHtml = `
                <div class="media-preview">
                    <img src="${file.url}" alt="${file.name}" loading="lazy">
                </div>
            `;
        }

        let deleteBtnHtml = '';
        if (file.canDelete) {
            deleteBtnHtml = `
                <button class="delete-btn" data-filename="${file.name}" title="Sil">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
        } else {
            const voteClass = file.hasVoted ? 'voted' : '';
            const voteText = file.hasVoted ? 'Oy Verildi' : 'Silme Oyu';
            deleteBtnHtml = `
                <button class="vote-btn ${voteClass}" data-filename="${file.name}" title="Bu dosyanın silinmesi için oy ver">
                    <i class="fa-solid fa-thumbs-down"></i> <span class="vote-text">${voteText}</span> <span class="vote-count">(${file.votes}/3)</span>
                </button>
            `;
        }

        div.innerHTML = `
            ${previewHtml}
            <div class="media-info">
                <div class="media-name" title="${file.name}">${file.name}</div>
                <div class="action-buttons">
                    <a href="${file.url}" download="${file.name}" class="download-btn">
                        <i class="fa-solid fa-download"></i> İndir
                    </a>
                    ${deleteBtnHtml}
                </div>
            </div>
        `;
        
        // Video hover preview functionality
        if (file.isVideo) {
            const videoEl = div.querySelector('video');
            div.addEventListener('mouseenter', () => {
                videoEl.play().catch(e => console.log(e));
            });
            div.addEventListener('mouseleave', () => {
                videoEl.pause();
                videoEl.currentTime = 0;
            });
        }

        // Delete functionality
        const deleteBtn = div.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if(confirm('Bu dosyayı silmek istediğinize emin misiniz?')) {
                    const filename = deleteBtn.getAttribute('data-filename');
                    deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                    
                    fetch(`/files/${filename}`, { method: 'DELETE' })
                        .then(res => res.json())
                        .then(data => {
                            if (data.msg === 'Dosya silindi!') {
                                div.style.display = 'none';
                            } else {
                                alert(data.msg);
                                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                            }
                        })
                        .catch(err => {
                            alert('Silme sırasında bir hata oluştu.');
                            deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                        });
                }
            });
        }

        // Vote functionality
        const voteBtn = div.querySelector('.vote-btn');
        if (voteBtn && !file.hasVoted) {
            voteBtn.addEventListener('click', () => {
                const filename = voteBtn.getAttribute('data-filename');
                const originalHtml = voteBtn.innerHTML;
                voteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                voteBtn.disabled = true;
                
                fetch(`/files/${filename}/vote`, { method: 'POST' })
                    .then(res => res.json())
                    .then(data => {
                        if (data.deleted) {
                            div.style.display = 'none';
                            alert('Dosya 3 oya ulaştı ve silindi!');
                        } else if (data.votes !== undefined) {
                            voteBtn.innerHTML = `<i class="fa-solid fa-thumbs-down"></i> <span class="vote-text">Oy Verildi</span> <span class="vote-count">(${data.votes}/3)</span>`;
                            voteBtn.classList.add('voted');
                        } else {
                            alert(data.msg);
                            voteBtn.innerHTML = originalHtml;
                            voteBtn.disabled = false;
                        }
                    })
                    .catch(err => {
                        alert('Oy verme sırasında hata oluştu.');
                        voteBtn.disabled = false;
                        voteBtn.innerHTML = originalHtml;
                    });
            });
        }
        
        return div;
    }

    // Admin Login Logic
    const adminBtn = document.getElementById('admin-login-btn');
    const adminPass = document.getElementById('admin-pass');
    
    if (adminBtn && adminPass) {
        adminBtn.addEventListener('click', () => {
            const password = adminPass.value;
            if (!password) return;
            
            adminBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            adminBtn.disabled = true;
            
            fetch('/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.isAdmin) {
                    alert(data.msg);
                    document.querySelector('header h1').innerHTML = 'Medya <span style="color: #ef4444;">Admin</span>';
                    document.querySelector('.glass-panel').style.borderColor = 'rgba(239, 68, 68, 0.5)';
                    adminPass.value = '';
                    loadFiles(); // Refresh files to see all delete buttons
                } else {
                    alert(data.msg);
                }
            })
            .catch(err => {
                alert('Bağlantı hatası!');
            })
            .finally(() => {
                adminBtn.innerHTML = '>';
                adminBtn.disabled = false;
            });
        });
        
        // Enter key support
        adminPass.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                adminBtn.click();
            }
        });
    }
});
