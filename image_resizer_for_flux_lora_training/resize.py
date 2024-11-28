from PIL import Image
import os

def process_image(file_path):
    # Read image
    img = Image.open(file_path)

    # Create square canvas with black background
    w, h = img.size
    max_dim = max(w, h)
    square = Image.new('RGB', (max_dim, max_dim), 'black')

    # Paste original image centered
    x = (max_dim - w) // 2
    y = (max_dim - h) // 2
    square.paste(img, (x, y))

    # Resize to 512x512
    resized = square.resize((512, 512))

    # Save to resized folder
    output_dir = os.path.join(os.path.dirname(os.path.dirname(file_path)))
    os.makedirs(output_dir, exist_ok=True)

    # Convert .jpg to .png if necessary
    base_filename, ext = os.path.splitext(os.path.basename(file_path))
    if ext.lower() == '.jpg':
        output_path = os.path.join(output_dir, base_filename + '.png')
    else:
        output_path = os.path.join(output_dir, os.path.basename(file_path))

    resized.save(output_path)

def main():
    input_dir = os.path.join(os.getcwd(), 'raw')
    for filename in os.listdir(input_dir):
        if filename.endswith('.png') or filename.endswith('.jpg'):
            file_path = os.path.join(input_dir, filename)
            process_image(file_path)

if __name__ == '__main__':
    main()
