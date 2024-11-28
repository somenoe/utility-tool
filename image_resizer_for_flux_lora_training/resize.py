from PIL import Image
import os
import argparse
from abc import ABC, abstractmethod
from typing import List, Tuple, Protocol
from enum import IntEnum

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

    def crop_vertical(self, img: Image.Image, target_ratio: float, mode: Mode = Mode.ALL) -> Tuple[List[Image.Image], List[str]]:
        w, h = img.size
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

def main():
    parser = argparse.ArgumentParser(description='Image cropping and resizing tool')
    parser.add_argument('mode', type=int, choices=[1, 2, 3],
                       help='1: Center only, 2: Non-center, 3: All crops')
    args = parser.parse_args()

    fs = FileSystemImpl()
    processor = ImageProcessor(fs)
    mode = Mode(args.mode)  # Convert int to Mode enum

    input_dir = fs.join_paths(fs.getcwd(), 'raw')
    for filename in fs.list_directory(input_dir):
        if filename.endswith(('.png', '.jpg')):
            file_path = fs.join_paths(input_dir, filename)
            processor.process_image(file_path, mode)

if __name__ == '__main__':
    main()
