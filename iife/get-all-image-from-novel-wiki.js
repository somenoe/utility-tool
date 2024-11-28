/**
 * @fileoverview Image Downloader Module - Downloads and packages webpage images into a zip file
 * @see https://deathmarch.fandom.com/wiki/Light_Novel_Volume_1
 * @author Pridsadang Pansiri (https://github.com/somenoe)
 * @module ImageDownloader
 * @license MIT
 * @version 1.0.0
 */

(function ImageDownloader() {
  // Constants
  const CONFIG = Object.freeze({
    JSZIP_URL: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    IMAGE_CLASS: 'thumbimage lazyloaded',
    SHORTCUT: {
      ctrl: true,
      alt: true,
      key: 'KeyD'
    }
  });

  /**
   * @typedef {Object} DownloadResult
   * @property {number} successCount - Number of successfully downloaded images
   * @property {number} failCount - Number of failed downloads
   */

  /**
   * Initializes the image downloader
   * @throws {Error} If initialization fails
   */
  function initialize() {
    try {
      registerKeyboardShortcut();
      console.info('Image Downloader initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Image Downloader:', error);
    }
  }
  /**
   * Scrolls the page to bottom and back to top
   * @async
   * @returns {Promise<void>}
   */
  async function scrollPage() {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(resolve => setTimeout(resolve, 1000));
    window.scrollTo(0, 0);
  }

  /**
   * Initializes the image downloader with page scroll
   * @async
   * @throws {Error} If initialization fails
   */
  async function initialize() {
    try {
      await scrollPage();
      registerKeyboardShortcut();
      console.info('Image Downloader initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Image Downloader:', error);
    }
  }

  /**
   * Starts the download process
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If download process fails
   */
  async function startDownload() {
    try {
      const images = document.getElementsByClassName(CONFIG.IMAGE_CLASS);
      if (!images.length) {
        throw new Error('No images found on the page');
      }

      if (!await confirmDownload(images.length)) return;

      await loadJSZip();
      const zip = new JSZip();
      const pageTitle = sanitizeFileName(document.title);

      console.info(`Starting download process for "${pageTitle}"`);
      const results = await downloadImages(images, zip);
      logResults(results);

      await createAndDownloadZip(zip, pageTitle);
    } catch (error) {
      console.error('Download process failed:', error);
    }
  }

  /**
   * Sanitizes filename by removing invalid characters
   * @param {string} filename - The filename to sanitize
   * @returns {string} Sanitized filename
   */
  function sanitizeFileName(filename) {
    return filename.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  }

  /**
   * Prompts user for download confirmation
   * @param {number} imageCount - Number of images to download
   * @returns {Promise<boolean>} User's confirmation
   */
  async function confirmDownload(imageCount) {
    return confirm(`Found ${imageCount} images. Do you want to download them?`);
  }

  /**
   * Loads JSZip library dynamically
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If JSZip fails to load
   */
  async function loadJSZip() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CONFIG.JSZIP_URL;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load JSZip'));
      document.head.appendChild(script);
    });
  }

  /**
   * Downloads images and adds them to zip
   * @async
   * @param {HTMLCollection} images - Collection of image elements
   * @param {JSZip} zip - JSZip instance
   * @returns {Promise<DownloadResult>}
   */
  async function downloadImages(images, zip) {
    const results = { successCount: 0, failCount: 0 };

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const imgUrl = img.src.split('/revision')[0];
      const fileName = imgUrl.split('/').pop();

      try {
        const response = await fetch(imgUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const blob = await response.blob();
        zip.file(fileName, blob);
        results.successCount++;
        console.info(`✓ [${i + 1}/${images.length}] ${fileName}`);
      } catch (error) {
        results.failCount++;
        console.error(`✗ [${i + 1}/${images.length}] Failed: ${fileName}`, error);
      }
    }

    return results;
  }

  /**
   * Creates and triggers download of zip file
   * @async
   * @param {JSZip} zip - JSZip instance
   * @param {string} pageTitle - Title for the zip file
   * @returns {Promise<void>}
   */
  async function createAndDownloadZip(zip, pageTitle) {
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);

    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pageTitle}.zip`;
      link.click();
      console.info('Zip file download initiated');
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Logs download results
   * @param {DownloadResult} results - Download results
   */
  function logResults(results) {
    console.info(
      `Download complete!\n` +
      `Success: ${results.successCount}\n` +
      `Failed: ${results.failCount}`
    );
  }

  /**
   * Registers keyboard shortcut
   */
  function registerKeyboardShortcut() {
    document.addEventListener('keydown', event => {
      if (event.ctrlKey === CONFIG.SHORTCUT.ctrl &&
        event.altKey === CONFIG.SHORTCUT.alt &&
        event.code === CONFIG.SHORTCUT.key) {
        event.preventDefault();
        startDownload();
      }
    });
  }

  // Initialize the module
  initialize();
})();
