# 🧩 AutoHelper

**AutoHelper** adalah userscript Tampermonkey yang menambahkan panel kecil di sudut kanan bawah halaman web.  
Fungsinya untuk **menyalin HTML bersih** dari elemen tertentu dan **mengambil screenshot** (download atau copy ke clipboard) dengan timestamp otomatis.

---

## 🚀 Fitur Utama

### 📋 1. Copy HTML
- Menyalin HTML sesuai target selector:
  - 🌐 **Full Page** (`<html>`)
  - 🧩 **Body Only** (`<body>`)
  - ✏️ **Custom Selector** (contoh: `#content`, `.main > section`)
- HTML yang disalin:
  - Otomatis menghapus elemen GUI AutoHelper.
  - Opsional menghapus semua `<script>` dari hasil salinan.

### 🧹 2. Hapus Semua `<script>`
- Checkbox opsional **"Hapus semua `<script>`"** tersedia di panel.
- Jika dicentang, semua tag `<script>` di area target akan dihapus.
- Berguna untuk menghasilkan HTML **bersih, statis, dan aman** dari kode JavaScript aktif.

### 📸 3. Screenshot (Download / Clipboard)
- Dapat mengambil screenshot:
  - 📄 **Full Page** atau elemen sesuai selector.
  - 🖼️ Menyimpan ke file PNG dengan nama otomatis:
    ```
    screenshot_YYYY-MM-DD_HH-MM-SS_domain.png
    ```
  - 📋 Menyalin hasil screenshot langsung ke clipboard.
- Panel AutoHelper otomatis disembunyikan saat proses screenshot agar tidak ikut tertangkap.

### 🧱 4. GUI Draggable + Auto Hide
- Panel bisa **dipindahkan (drag)** lewat header biru.
- Tombol ❌ untuk menutup panel.
- Tombol **“🔘 Show Panel”** muncul di sudut bawah untuk menampilkan kembali.

