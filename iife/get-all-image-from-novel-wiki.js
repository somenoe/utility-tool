/**
 * @fileoverview Image Downloader Module - Downloads and packages webpage images into a zip file
 * @see https://deathmarch.fandom.com/wiki/Light_Novel_Volume_1
 * @author Pridsadang Pansiri (https://github.com/somenoe)
 * @module ImageDownloader
 * @license MIT
 * @version 1.0.0
 */

(function () {
  class Config {
    constructor() {
      this.jszipLibraryUrl = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      this.imageClassName = 'thumbimage lazyloaded';
      this.downloadShortcut = { ctrl: true, alt: true, key: 'KeyD' };
      this.navigationShortcut = { ctrl: true, alt: true, key: 'KeyN' };
      this.autoNavigationEnabled = true;
      this.scrollEnabled = true;
    }
  }

  class NavigationService {
    findNextPageLink() {
      const nextPageCell = document.querySelector('td[data-source="next"]');
      return nextPageCell?.querySelector('a')?.href;
    }

    navigateToUrl(url) {
      window.location.href = url;
    }
  }

  class FileService {
    sanitizeFileName(fileName) {
      return fileName.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
    }

    async loadJSZipLibrary(libraryUrl) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = libraryUrl;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load JSZip'));
        document.head.appendChild(script);
      });
    }

    createDownloadLink(blobUrl, fileName) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      return link;
    }
  }

  class ImageDownloader {
    constructor(config, navigationService, fileService) {
      this.config = config;
      this.navigationService = navigationService;
      this.fileService = fileService;
    }

    async initialize() {
      try {
        if (this.config.scrollEnabled) {
          await this.scrollPageToLoadImages();
        }
        this.registerKeyboardShortcuts();
        console.info('Image Downloader initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Image Downloader:', error);
      }
    }

    async scrollPageToLoadImages() {
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.scrollTo(0, document.body.scrollHeight);
    }

    async startDownloadProcess() {
      try {
        const imagesToDownload = document.getElementsByClassName(this.config.imageClassName);
        if (!imagesToDownload.length) {
          throw new Error('No images found on the page');
        }

        if (!await this.confirmDownload(imagesToDownload.length)) return;

        await this.fileService.loadJSZipLibrary(this.config.jszipLibraryUrl);
        const zipArchive = new JSZip();
        const pageTitleForZip = this.fileService.sanitizeFileName(document.title);

        console.info(`Starting download process for "${pageTitleForZip}"`);
        const downloadStats = await this.downloadAndPackageImages(imagesToDownload, zipArchive);
        this.logDownloadResults(downloadStats);

        await this.createAndDownloadZipFile(zipArchive, pageTitleForZip);

        if (this.config.autoNavigationEnabled) {
          this.navigateToNextPage();
        }
      } catch (error) {
        console.error('Download process failed:', error);
      }
    }

    /**
     * Prompts user for download confirmation
     * @param {number} imageCount - Number of images to download
     * @returns {Promise<boolean>} User's confirmation
     */
    async confirmDownload(imageCount) {
      return confirm(`Found ${imageCount} images. Do you want to download them?`);
    }

    /**
     * Downloads images and adds them to zip
     * @async
     * @param {HTMLCollection} images - Collection of image elements
     * @param {JSZip} zip - JSZip instance
     * @returns {Promise<DownloadResult>}
     */
    async downloadAndPackageImages(images, zip) {
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
    async createAndDownloadZipFile(zip, pageTitle) {
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);

      try {
        const link = this.fileService.createDownloadLink(url, `${pageTitle}.zip`);
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
    logDownloadResults(results) {
      console.info(
        `Download complete!\n` +
        `Success: ${results.successCount}\n` +
        `Failed: ${results.failCount}`
      );
    }

    /**
     * Navigate to next page if available
     * @returns {boolean} True if navigation successful, false otherwise
     */
    navigateToNextPage() {
      const nextPageUrl = this.navigationService.findNextPageLink();
      if (!nextPageUrl) {
        alert('No next page available');
        return false;
      }

      this.navigationService.navigateToUrl(nextPageUrl);
      return true;
    }

    registerKeyboardShortcuts() {
      document.addEventListener('keydown', event => {
        if (this.isDownloadShortcutPressed(event)) {
          event.preventDefault();
          this.startDownloadProcess();
        }

        if (this.isNavigationShortcutPressed(event)) {
          event.preventDefault();
          this.navigateToNextPage();
        }
      });
    }

    isDownloadShortcutPressed(event) {
      const shortcut = this.config.downloadShortcut;
      return event.ctrlKey === shortcut.ctrl &&
        event.altKey === shortcut.alt &&
        event.code === shortcut.key;
    }

    isNavigationShortcutPressed(event) {
      const shortcut = this.config.navigationShortcut;
      return event.ctrlKey === shortcut.ctrl &&
        event.altKey === shortcut.alt &&
        event.code === shortcut.key;
    }
  }

  // Bootstrap the application
  const config = new Config();
  const navigationService = new NavigationService();
  const fileService = new FileService();
  const imageDownloader = new ImageDownloader(config, navigationService, fileService);
  imageDownloader.initialize();
})();
