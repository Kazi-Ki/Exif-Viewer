const imageInput = document.getElementById('imageInput');
const output = document.getElementById('output');
const jsonOutput = document.getElementById('jsonOutput');
const toggleJsonBtn = document.getElementById('toggleJsonBtn');
const imagePreview = document.getElementById('imagePreview');
const loading = document.getElementById('loading');
const warningBox = document.getElementById('warningBox');
const downloadButtons = document.getElementById('downloadButtons');
const saveJsonBtn = document.getElementById('saveJsonBtn');
const saveTxtBtn = document.getElementById('saveTxtBtn');

toggleJsonBtn.addEventListener('click', () => {
  if (jsonOutput.style.display === 'none') {
    jsonOutput.style.display = 'block';
    toggleJsonBtn.textContent = 'JSON表示を隠す';
  } else {
    jsonOutput.style.display = 'none';
    toggleJsonBtn.textContent = 'JSON表示切替';
  }
});

function saveFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

saveJsonBtn.addEventListener('click', () => {
  if (!jsonOutput.textContent) return;
  const filename = `exif_${imageInput.files[0]?.name || 'unknown'}.json`;
  saveFile(filename, jsonOutput.textContent, 'application/json');
});

saveTxtBtn.addEventListener('click', () => {
  if (!output.textContent) return;
  const filename = `exif_${imageInput.files[0]?.name || 'unknown'}.txt`;
  saveFile(filename, output.textContent, 'text/plain');
});

function formatExifText(fileName, exifData) {
  let text = '';
  text += `ファイル名: ${fileName}\n`;
  text += `解像度: ${exifData.ExifImageWidth || '?'} × ${exifData.ExifImageHeight || '?'}\n`;
  text += `機種: ${exifData.Make || '-'} ${exifData.Model || '-'}\n`;
  text += `撮影日時: ${exifData.DateTimeOriginal || '-'}\n`;
  text += `レンズ: ${exifData.LensModel || '-'}\n`;
  text += `ISO: ${exifData.ISO || '-'} | f/${exifData.FNumber || '-'} | ${exifData.ExposureTime || '-'}s\n`;
  if (exifData.GPSLatitude && exifData.GPSLongitude) {
    const lat = exifData.GPSLatitude;
    const lon = exifData.GPSLongitude;
    text += `GPS: ${lat}, ${lon}\n`;
    text += `地図リンク: https://www.google.com/maps?q=${lat},${lon}\n`;
  }
  return text;
}

function showWarning(message) {
  warningBox.textContent = message;
  warningBox.classList.remove('hidden');
  setTimeout(() => {
    warningBox.classList.add('hidden');
  }, 8000);
}

imageInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  output.textContent = '';
  jsonOutput.textContent = '';
  toggleJsonBtn.style.display = 'none';
  downloadButtons.style.display = 'none';
  imagePreview.innerHTML = '';
  warningBox.classList.add('hidden');

  loading.classList.remove('hidden');

  try {
    const imgURL = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.src = imgURL;
    imagePreview.appendChild(img);

    let convertedFile = file;
    if (file.type === 'image/heic' || file.name.match(/\.heic$/i)) {
      const blob = await heic2any({ blob: file, toType: 'image/jpeg' });
      convertedFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
    }

    const exifData = await exifr.parse(convertedFile);

    loading.classList.add('hidden');

    if (!exifData) {
      output.innerHTML = `<span style="color: var(--danger);">この画像にはExifメタデータが含まれていません。</span>`;
      showWarning('警告：Exif情報がありません。スクリーンショットや加工画像の可能性があります。');
      return;
    }

    // 捏造 or スクショ判定（簡易）
    const isLikelyScreenshot =
      !exifData.Make && !exifData.Model &&
      (file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/bmp');

    if (isLikelyScreenshot) {
      showWarning('警告：撮影機種情報がありません。メタデータ除去またはスクリーンショットの可能性があります。');
    }

    const text = formatExifText(file.name, exifData);

    output.textContent = text;
    toggleJsonBtn.style.display = 'inline-block';
    downloadButtons.style.display = 'block';
    jsonOutput.textContent = JSON.stringify(exifData, null, 2);

    // GPSマップ埋め込み
    if (exifData.GPSLatitude && exifData.GPSLongitude) {
      const lat = exifData.GPSLatitude;
      const lon = exifData.GPSLongitude;
      const iframe = document.createElement('iframe');
      iframe.src = `https://maps.google.com/maps?q=${lat},${lon}&z=15&output=embed`;
      iframe.width = '100%';
      iframe.height = '300';
      iframe.style.border = '1px solid #333';
      output.appendChild(iframe);
    }
  } catch (e) {
    loading.classList.add('hidden');
    output.innerHTML = `<span style="color: var(--danger);">解析中にエラーが発生しました。</span>`;
    console.error(e);
  }
});
