// controllers/Ocr.js
const Tesseract = require("tesseract.js");
const path = require("path");
const fs = require("fs");

exports.processImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Tidak ada file yang diupload" });
    }

    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

    const imagePath = path.join(uploadDir, req.file.filename);

    // Jalankan OCR (gunakan bahasa Inggris & Indonesia agar lebih akurat)
    const result = await Tesseract.recognize(imagePath, "eng+ind", {
      logger: (m) => console.log(m),
    });

    const text = result.data.text.replace(/\s+/g, " ").trim();
    console.log("=== Hasil OCR ===");
    console.log(text);

    // --- PARSING STRUK BRI ---
    const parsed = {};

    // Bank
    if (/bank\s*bri/i.test(text)) parsed.bank = "BRI";

    // Status transaksi
    if (/transaksi berhasil/i.test(text)) parsed.status = "Transaksi Berhasil";

    // Nomor referensi
    const matchRef = text.match(/\b\d{10,}\b/);
    if (matchRef) parsed.noref = matchRef[0];

    // Nominal (Rp 503.237)
    const matchNominal = text.match(/Rp\s*([\d\.]+)/i);
    if (matchNominal) parsed.nominal = parseInt(matchNominal[1].replace(/\./g, ""), 10);

    // Tanggal dan waktu
    const matchTanggal = text.match(/(\d{1,2}\s+\w+\s+\d{4}),?\s*(\d{1,2}:\d{2}:\d{2})/i);
    if (matchTanggal) parsed.tanggal = `${matchTanggal[1]}, ${matchTanggal[2]} WIB`;

    // Pengirim
    const matchPengirim = text.match(/Sumber Dana\s+([A-Z\s]+)/i);
    if (matchPengirim) {
      parsed.pengirim = matchPengirim[1].replace(/\s+$/, "").trim();
    } else {
      // cadangan
      const matchAltPengirim = text.match(/Sumber Dana\s+([A-Z\s]+)/i);
      if (matchAltPengirim) parsed.pengirim = matchAltPengirim[1].trim();
    }

    // Penerima + No Rekening
        const matchTujuan = text.match(/Tujuan\s+([A-Z\s]+)\s*(\d{4}\s*\d{4}\s*\d{4}\s*\d{0,4})/i);
        if (matchTujuan) {
        let penerima = matchTujuan[1].trim();
        let rekening = matchTujuan[2].replace(/\s+/g, "");

        // Bersihkan noise seperti "MA" atau "QM" dari OCR logo/inisial
       penerima = penerima
        .replace(/\b[A-Z]{2}\b/g, "") // hapus semua kata yang isinya 2 huruf kapital, misal AN, AR, QM, MA, dll
        .replace(/\s{2,}/g, " ") // hapus spasi ganda
        .trim();

        parsed.penerima = penerima;
        parsed.rekening_penerima = rekening;
        } else {
        // fallback: cari hanya nama tanpa rekening
        const matchNama = text.match(/Tujuan\s+([A-Z\s]+)/i);
        if (matchNama) {
            let penerima = matchNama[1].trim();
            penerima = penerima
            .replace(/\b(MA|QM|AN|AM|AQ|QA)\b/g, "")
            .replace(/\s{2,}/g, " ")
            .trim();
            parsed.penerima = penerima;
        }
        }


    // Hapus embel-embel “BANK BRI” kalau masih ada
    if (parsed.pengirim) parsed.pengirim = parsed.pengirim.replace(/BANK\s*BRI/i, "").trim();
    if (parsed.penerima) parsed.penerima = parsed.penerima.replace(/BANK\s*BRI/i, "").trim();

    // Hapus file upload setelah diproses
    try {
      fs.unlinkSync(imagePath);
    } catch (err) {
      console.warn("Gagal hapus file:", err.message);
    }

    return res.json({
      success: true,
      message: "Berhasil membaca dan memproses struk",
      text,
      parsed,
    });
  } catch (error) {
    console.error("OCR Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Gagal memproses gambar", error: error.message });
  }
};
