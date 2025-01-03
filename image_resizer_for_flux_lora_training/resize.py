import logging
from PIL import Image
import os
import argparse
from abc import ABC, abstractmethod
from typing import List, Tuple, Protocol
from enum import IntEnum
import multiprocessing
from functools import partial

def setup_logger() -> logging.Logger:
    logger = logging.getLogger('ImageResizer')
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger

class FileSystem(Protocol):
    def list_directory(self, path: str) -> List[str]:
        ...
    def join_paths(self, *paths: str) -> str:
        ...
    def get_basename(self, path: str) -> str:
        ...
    def split_ext(self, path: str) -> Tuple[str, str]:
        ...
    def makedirs(self, path: str) -> None:
        ...
    def getcwd(self) -> str:
        ...

class FileSystemImpl:
    def list_directory(self, path: str) -> List[str]:
        return os.listdir(path)

    def join_paths(self, *paths: str) -> str:
        return os.path.join(*paths)

    def get_basename(self, path: str) -> str:
        return os.path.basename(path)

    def split_ext(self, path: str) -> Tuple[str, str]:
        return os.path.splitext(path)

    def makedirs(self, path: str) -> None:
        os.makedirs(path, exist_ok=True)

    def getcwd(self) -> str:
        return os.getcwd()

class Mode(IntEnum):
    CENTER_ONLY = 1
    NON_CENTER = 2
    ALL = 3

class ImageProcessor:
    def __init__(self, fs: FileSystem):
        self.fs = fs
        self.logger = logging.getLogger('ImageResizer')

    def crop_vertical(self, img: Image.Image, target_ratio: float, mode: Mode = Mode.ALL) -> Tuple[List[Image.Image], List[str]]:
        w, h = img.size
        self.logger.info(f"Performing vertical crop on image of size {w}x{h}")
        new_height = int(w / target_ratio)
        all_crops = [
            img.crop((0, 0, w, new_height)),
            img.crop((0, (h - new_height) // 2, w, (h - new_height) // 2 + new_height)),
            img.crop((0, h - new_height, w, h))
        ]
        all_suffixes = ['_S', '_C', '_E']

        if mode == Mode.CENTER_ONLY:
            return [all_crops[1]], [all_suffixes[1]]
        elif mode == Mode.NON_CENTER:
            return [all_crops[0], all_crops[2]], [all_suffixes[0], all_suffixes[2]]
        return all_crops, all_suffixes

    def crop_horizontal(self, img: Image.Image, target_ratio: float, mode: Mode = Mode.ALL) -> Tuple[List[Image.Image], List[str]]:
        w, h = img.size
        self.logger.info(f"Performing horizontal crop on image of size {w}x{h}")
        new_width = int(h * target_ratio)
        all_crops = [
            img.crop((0, 0, new_width, h)),
            img.crop(((w - new_width) // 2, 0, (w - new_width) // 2 + new_width, h)),
            img.crop((w - new_width, 0, w, h))
        ]
        all_suffixes = ['_L', '_C', '_R']

        if mode == Mode.CENTER_ONLY:
            return [all_crops[1]], [all_suffixes[1]]
        elif mode == Mode.NON_CENTER:
            return [all_crops[0], all_crops[2]], [all_suffixes[0], all_suffixes[2]]
        return all_crops, all_suffixes

    def process_image(self, file_path: str, mode: Mode = Mode.ALL) -> None:
        self.logger.info(f"Processing image: {file_path}")
        img = Image.open(file_path)
        w, h = img.size
        target_ratio = 1.0

        crops, suffixes = (self.crop_vertical(img, target_ratio, mode) if h > w
                         else self.crop_horizontal(img, target_ratio, mode))

        # Simplified output directory - just use the parent directory of the input file
        output_dir = self.fs.join_paths(os.path.dirname(file_path), '..')
        self.fs.makedirs(output_dir)

        base_filename, _ = self.fs.split_ext(self.fs.get_basename(file_path))

        for crop, suffix in zip(crops, suffixes):
            max_dim = max(crop.size)
            square = Image.new('RGB', (max_dim, max_dim), 'black')
            square.paste(crop, ((max_dim - crop.size[0]) // 2, (max_dim - crop.size[1]) // 2))
            resized = square.resize((512, 512))

            output_path = self.fs.join_paths(output_dir, f"{base_filename}{suffix}.png")
            resized.save(output_path)
            self.logger.debug(f"Saved processed image to: {output_path}")

def process_image_worker(file_info: Tuple[str, Mode], fs: FileSystem) -> None:
    file_path, mode = file_info
    try:
        processor = ImageProcessor(fs)
        processor.process_image(file_path, mode)
    except Exception as e:
        logging.error(f"Error processing {file_path}: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description='Image cropping and resizing tool')
    parser.add_argument('mode', type=int, choices=[1, 2, 3],
                       help='1: Center only, 2: Non-center, 3: All crops')
    parser.add_argument('--workers', type=int, default=multiprocessing.cpu_count(),
                       help='Number of worker processes')
    args = parser.parse_args()

    logger = setup_logger()
    logger.info("Starting image processing")

    fs = FileSystemImpl()
    mode = Mode(args.mode)
    logger.info(f"Processing mode: {mode.name}")

    input_dir = fs.join_paths(fs.getcwd(), 'raw')
    logger.info(f"Processing images from directory: {input_dir}")

    # Prepare work items
    work_items = []
    for filename in fs.list_directory(input_dir):
        if filename.endswith(('.png', '.jpg')):
            file_path = fs.join_paths(input_dir, filename)
            work_items.append((file_path, mode))

    # Process images in parallel
    with multiprocessing.Pool(processes=args.workers) as pool:
        worker_func = partial(process_image_worker, fs=fs)
        pool.map(worker_func, work_items)

    logger.info("Image processing completed")

if __name__ == '__main__':
    main()
