/**
 * test on https://deathmarch.fandom.com/wiki/Light_Novel_Volume_1
 */
(async function () {
  // Ask for confirmation first
  const images = document.getElementsByClassName('thumbimage lazyloaded');
  if (!confirm(`Found ${images.length} images. Do you want to download them?`)) {
    console.log('Download cancelled');
    return;
  }

  // Load JSZip from CDN
  console.log('Loading JSZip library...');
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const zip = new JSZip();
  const pageTitle = document.title.replace(/[^a-z0-9]/gi, '_');
  console.log(`Starting download for ${pageTitle}`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const imgUrl = img.src.split('/revision')[0];
    console.log(`Downloading ${i + 1}/${images.length}: ${imgUrl}`);

    try {
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const fileName = imgUrl.split('/').pop();
      zip.file(fileName, blob);
      successCount++;
      console.log(`✓ Successfully downloaded ${fileName}`);
    } catch (err) {
      console.error(`✗ Failed to fetch ${imgUrl}:`, err);
      failCount++;
    }
  }

  console.log(`\nDownload complete! Success: ${successCount}, Failed: ${failCount}`);
  console.log('Creating zip file...');

  const content = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = `${pageTitle}.zip`;
  link.click();

  console.log('Zip file download started!');
})();
