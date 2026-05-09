const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Set up storage engine for Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Init upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 100000000 }, // 100MB limit
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('media');

// Check File Type
function checkFileType(file, cb) {
    // Allowed ext
    const filetypes = /jpeg|jpg|png|gif|mp4|mkv|avi|mov|webm/;
    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Sadece resim ve video dosyalarına izin verilir! (Images and Videos Only!)');
    }
}

// Helpers for IP and Metadata
const metadataPath = path.join(uploadDir, 'metadata.json');

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    return forwarded ? forwarded.split(/, /)[0] : req.socket.remoteAddress;
}

function getMetadata() {
    if (fs.existsSync(metadataPath)) {
        try {
            return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        } catch (e) {
            return {};
        }
    }
    return {};
}

function saveMetadata(data) {
    fs.writeFileSync(metadataPath, JSON.stringify(data), 'utf8');
}

// Upload Endpoint
app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).json({ msg: err });
        }
        if (req.file == undefined) {
            return res.status(400).json({ msg: 'Lütfen bir dosya seçin!' });
        }
        
        // Save IP to metadata
        const ip = getClientIp(req);
        const metadata = getMetadata();
        metadata[req.file.filename] = ip;
        saveMetadata(metadata);

        res.json({
            msg: 'Dosya başarıyla yüklendi!',
            file: `uploads/${req.file.filename}`,
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype
        });
    });
});

// Get all files Endpoint
app.get('/files', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            return res.status(500).json({ msg: 'Dosyalar okunamadı!' });
        }
        
        let filesData = [];
        const ip = getClientIp(req);
        const metadata = getMetadata();

        files.forEach(file => {
            const ext = path.extname(file).toLowerCase();
            const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mkv', '.avi', '.mov', '.webm'];
            
            if (allowedExts.includes(ext)) {
                const isVideo = ['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(ext);
                const canDelete = metadata[file] === ip;
                filesData.push({
                    name: file,
                    url: `/uploads/${file}`,
                    isVideo: isVideo,
                    canDelete: canDelete
                });
            }
        });
        
        // Sort by newest (assuming filename has Date.now())
        filesData.sort((a, b) => b.name.localeCompare(a.name));
        
        res.json(filesData);
    });
});

// Delete Endpoint
app.delete('/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const ip = getClientIp(req);
    const metadata = getMetadata();
    
    if (metadata[filename] === ip) {
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            delete metadata[filename];
            saveMetadata(metadata);
            return res.json({ msg: 'Dosya silindi!' });
        }
    }
    return res.status(403).json({ msg: 'Bu dosyayı silme yetkiniz yok veya dosya bulunamadı!' });
});

app.listen(PORT, () => {
    console.log(`Server çalışıyor: http://localhost:${PORT}`);
});
