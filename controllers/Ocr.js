// controllers/Ocr.js
const Tesseract = require("tesseract.js");
const path = require("path");
const fs = require("fs");

/* =========================================================
   🔧 HELPER: Parsing Spesifik per Bank
========================================================= */

// --- PARSER: STRUK BANK BRI ---
function parseBRI(text) {
  const parsed = { bank: "BRI" };

  // Status transaksi
  parsed.status = /transaksi berhasil/i.test(text) ? "Transaksi Berhasil" : "";

  // Nomor referensi
  parsed.noref = (text.match(/\b\d{10,}\b/) || [])[0] || "";

  // Nominal (Rp 503.237)
  const matchNominal = text.match(/Rp\s*([\d\.]+)/i);
  parsed.nominal = matchNominal ? parseInt(matchNominal[1].replace(/\./g, ""), 10) : 0;

  // Tanggal dan waktu
  const matchTanggal = text.match(/(\d{1,2}\s+\w+\s+\d{4}),?\s*(\d{1,2}:\d{2}:\d{2})/i);
  parsed.tanggal = matchTanggal ? `${matchTanggal[1]}, ${matchTanggal[2]} WIB` : "";

  // Pengirim
  const matchPengirim = text.match(/Sumber Dana\s+([A-Z\s]+)/i);
  parsed.pengirim = matchPengirim ? matchPengirim[1].trim() : "";

  // Tujuan (penerima dan rekening)
  const matchTujuan = text.match(/Tujuan\s+([A-Z\s]+)\s*(\d{4}\s*\d{4}\s*\d{4}\s*\d{0,4})/i);
  if (matchTujuan) {
    let penerima = matchTujuan[1].trim();
    let rekening = matchTujuan[2].replace(/\s+/g, "");

    // Bersihkan noise seperti “QM” “MA”
    penerima = penerima
      .replace(/\b[A-Z]{2}\b/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    parsed.penerima = penerima;
    parsed.rekening_penerima = rekening;
  } else {
    const matchNama = text.match(/Tujuan\s+([A-Z\s]+)/i);
    parsed.penerima = matchNama ? matchNama[1].trim() : "";
  }

  // Bersihkan sisa kata "BANK BRI"
  if (parsed.pengirim) parsed.pengirim = parsed.pengirim.replace(/BANK\s*BRI/i, "").trim();
  if (parsed.penerima && /BANK\s+[A-Z]+/i.test(parsed.penerima)) {
    const bankMatch = parsed.penerima.match(/BANK\s+([A-Z]+)/i);
    parsed.bank_tujuan = bankMatch ? bankMatch[1].toUpperCase() : "";
    parsed.penerima = parsed.penerima.replace(/BANK\s+[A-Z]+/i, "").trim();
  } else {
    // fallback: cari langsung di teks jika belum ditemukan
    const bankMatch = text.match(/BANK\s+([A-Z]+)/i);
    parsed.bank_tujuan = bankMatch ? bankMatch[1].toUpperCase() : "";
  }

  return parsed;
}

// --- PARSER: STRUK SEABANK ---
function parseSeaBank(text) {
  const parsed = { bank: "SeaBank" };

  // Status transaksi
  parsed.status = /pembayaran diterima/i.test(text) ? "Pembayaran Diterima" : "";

  // Nomor referensi
  parsed.noref = (text.match(/No\.?\s*Transaksi\s*([0-9]+)/i) || [])[1] || "";

  // Nominal
  const matchNominal = text.match(/Rp\s*([\d\.]+)/i);
  parsed.nominal = matchNominal ? parseInt(matchNominal[1].replace(/\./g, ""), 10) : 0;

  // Tanggal & waktu
  const matchTanggal = text.match(/(\d{1,2}\s+\w+\s+\d{4}),?\s*(\d{1,2}:\d{2})/i);
  parsed.tanggal = matchTanggal ? `${matchTanggal[1]}, ${matchTanggal[2]}` : "";

  // Pengirim
  parsed.pengirim = (text.match(/Dari\s+([A-Z][A-Za-z\s]+)/i)?.[1] || "").trim();

  // ============================
  // 🔹 Penerima + Bank + Rekening
  // ============================

  // Tangkap blok setelah "Ke"
  const penerimaBlock = text.match(/Ke\s+[^\w]?([\w\s\)\(\.\-:]+)/i)?.[1]?.trim() || "";

  // Tangkap nama penerima (huruf & spasi sebelum nama bank)
  const matchPenerima = penerimaBlock.match(/([A-Za-z\s\.]+?)(?=\s*(BRI|BCA|MANDIRI|BNI|SEABANK|BANK|:|$))/i);
  parsed.penerima = matchPenerima ? matchPenerima[1].trim() : "";

  // Tangkap nama bank tujuan
  const matchBank = penerimaBlock.match(/\b(BRI|BCA|MANDIRI|BNI|SEABANK)\b/i);
  parsed.bank_tujuan = matchBank ? matchBank[1].toUpperCase() : "UNKNOWN";

  // Tangkap rekening penerima
  const matchRek = penerimaBlock.match(/(\d{10,20})/);
  parsed.rekening_penerima = matchRek ? matchRek[1] : "";

  // Jika penerima kosong, fallback
  if (!parsed.penerima) {
    const fallback = text.match(/Ke\s+[^\w]?([A-Za-z\s]+)(?=\s*(BRI|BCA|MANDIRI|BNI|SEABANK|\d{10,}))/i);
    parsed.penerima = fallback ? fallback[1].trim() : "";
  }

  return parsed;
}



/* =========================================================
   🧠 FUNGSI UTAMA OCR HANDLER
========================================================= */

exports.processImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Tidak ada file yang diupload" });
    }

    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

    const imagePath = path.join(uploadDir, req.file.filename);

    // Jalankan OCR
    const result = await Tesseract.recognize(imagePath, "eng+ind", {
      logger: (m) => console.log(m),
    });

    const text = result.data.text.replace(/\s+/g, " ").trim();
    console.log("=== Hasil OCR ===");
    console.log(text);

    /* =========================================================
       🏦 DETEKSI BANK OTOMATIS
    ========================================================= */
    let parsed = {};

    if (/bank\s*bri/i.test(text)) {
      parsed = parseBRI(text);
    } else if (/seabank/i.test(text) || /bi-fast/i.test(text)) {
      parsed = parseSeaBank(text);
    } else {
      parsed = { bank: "UNKNOWN", note: "Format struk belum dikenali" };
    }

    /* =========================================================
       🧹 HAPUS FILE UPLOAD SETELAH DIPROSES
    ========================================================= */
    try {
      fs.unlinkSync(imagePath);
    } catch (err) {
      console.warn("Gagal hapus file:", err.message);
    }

    /* =========================================================
       📤 RESPONSE
    ========================================================= */
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
