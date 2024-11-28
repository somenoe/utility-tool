from PIL import Image
import os

def crop_vertical(img, target_ratio):
    w, h = img.size
    new_height = int(w / target_ratio)
    crops = []
    # Top/Start crop
    crops.append(img.crop((0, 0, w, new_height)))
    # Center crop
    y_center = (h - new_height) // 2
    crops.append(img.crop((0, y_center, w, y_center + new_height)))
    # Bottom/End crop
    crops.append(img.crop((0, h - new_height, w, h)))
    return crops, ['_S', '_C', '_E']

def crop_horizontal(img, target_ratio):
    w, h = img.size
    new_width = int(h * target_ratio)
    crops = []
    # Left crop
    crops.append(img.crop((0, 0, new_width, h)))
    # Center crop
    x_center = (w - new_width) // 2
    crops.append(img.crop((x_center, 0, x_center + new_width, h)))
    # Right crop
    crops.append(img.crop((w - new_width, 0, w, h)))
    return crops, ['_L', '_C', '_R']

def process_image(file_path):
    # Read image
    img = Image.open(file_path)
    w, h = img.size
    target_ratio = 1.0  # Square ratio

    crops = []
    suffixes = []
    if h > w:  # Vertical image
        crops, suffixes = crop_vertical(img, target_ratio)
    else:  # Horizontal image
        crops, suffixes = crop_horizontal(img, target_ratio)

    # Process each crop
    output_dir = os.path.join(os.path.dirname(os.path.dirname(file_path)))
    os.makedirs(output_dir, exist_ok=True)

    base_filename, ext = os.path.splitext(os.path.basename(file_path))
    for crop, suffix in zip(crops, suffixes):
        # Create square canvas with black background
        max_dim = max(crop.size)
        square = Image.new('RGB', (max_dim, max_dim), 'black')

        # Paste cropped image centered
        x = (max_dim - crop.size[0]) // 2
        y = (max_dim - crop.size[1]) // 2
        square.paste(crop, (x, y))

        # Resize to 512x512
        resized = square.resize((512, 512))

        # Save with appropriate suffix
        output_filename = base_filename + suffix + '.png'
        output_path = os.path.join(output_dir, output_filename)
        resized.save(output_path)

def main():
    input_dir = os.path.join(os.getcwd(), 'raw')
    for filename in os.listdir(input_dir):
        if filename.endswith('.png') or filename.endswith('.jpg'):
            file_path = os.path.join(input_dir, filename)
            process_image(file_path)

if __name__ == '__main__':
    main()
